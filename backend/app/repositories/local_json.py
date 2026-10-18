"""Persistencia local JSON, atómica y protegida por bloqueo para una instancia del API."""

import json
import os
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar, Token
from datetime import UTC, datetime
from pathlib import Path
from threading import RLock
from typing import Any
from uuid import UUID

from app.domain.models import ApprovalRequest, ApprovalStatus, AuditEvent, Decision, Invoice, Policy


class LocalJsonStore:
    def __init__(self, path: Path | None = None) -> None:
        default_path = Path(__file__).resolve().parents[2] / "data" / "runtime_state.json"
        self.path = path or Path(os.getenv("CUENTRA_DATA_FILE", default_path))
        self._lock = RLock()
        self._transaction_depth = 0
        self._dirty = False
        self.invoices: dict[UUID, Invoice] = {}
        self.policies: dict[UUID, Policy] = {}
        self.decisions: dict[UUID, list[Decision]] = {}
        self.approvals: dict[UUID, ApprovalRequest] = {}
        self.audit_events: list[AuditEvent] = []
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            self.invoices = {item.id: item for item in map(Invoice.model_validate, data["invoices"])}
            self.policies = {item.id: item for item in map(Policy.model_validate, data["policies"])}
            for raw in data["decisions"]:
                decision = Decision.model_validate(raw)
                self.decisions.setdefault(decision.invoice_id, []).append(decision)
            self.approvals = {
                item.id: item for item in map(ApprovalRequest.model_validate, data.get("approvals", []))
            }
            self.audit_events = list(map(AuditEvent.model_validate, data.get("audit_events", [])))
        except (OSError, ValueError, KeyError, TypeError) as exc:
            raise RuntimeError(f"No se pudo cargar el estado local {self.path}: {exc}") from exc

    def _mark_changed(self) -> None:
        self._dirty = True
        if self._transaction_depth == 0:
            self._save()

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "invoices": [item.model_dump(mode="json") for item in self.invoices.values()],
            "policies": [item.model_dump(mode="json") for item in self.policies.values()],
            "decisions": [
                item.model_dump(mode="json")
                for invoice_decisions in self.decisions.values()
                for item in invoice_decisions
            ],
            "approvals": [item.model_dump(mode="json") for item in self.approvals.values()],
            "audit_events": [item.model_dump(mode="json") for item in self.audit_events],
        }
        temp_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                "w", encoding="utf-8", dir=self.path.parent, delete=False, suffix=".tmp"
            ) as temp_file:
                temp_path = Path(temp_file.name)
                json.dump(payload, temp_file, ensure_ascii=False, indent=2)
                temp_file.write("\n")
                temp_file.flush()
                os.fsync(temp_file.fileno())
            os.replace(temp_path, self.path)
            self._dirty = False
        finally:
            if temp_path and temp_path.exists():
                temp_path.unlink()

    @contextmanager
    def transaction(self) -> Iterator[None]:
        """Agrupa escrituras y revierte el estado en memoria si ocurre un error."""
        with self._lock:
            outermost = self._transaction_depth == 0
            if outermost:
                snapshot = (
                    self.invoices.copy(),
                    self.policies.copy(),
                    {key: value.copy() for key, value in self.decisions.items()},
                    self.approvals.copy(),
                    self.audit_events.copy(),
                    self._dirty,
                )
            self._transaction_depth += 1
            try:
                yield
            except Exception:
                self._transaction_depth -= 1
                if outermost:
                    (
                        self.invoices,
                        self.policies,
                        self.decisions,
                        self.approvals,
                        self.audit_events,
                        self._dirty,
                    ) = snapshot
                raise
            else:
                self._transaction_depth -= 1
                if outermost and self._dirty:
                    try:
                        self._save()
                    except Exception:
                        (
                            self.invoices,
                            self.policies,
                            self.decisions,
                            self.approvals,
                            self.audit_events,
                            self._dirty,
                        ) = snapshot
                        raise

    def set_path_for_testing(self, path: Path) -> None:
        with self._lock:
            self.path = path
            self.invoices.clear()
            self.policies.clear()
            self.decisions.clear()
            self.approvals.clear()
            self.audit_events.clear()
            self._dirty = False

    def reset_state(self) -> None:
        """Limpia solo esta instancia de almacenamiento y persiste el estado vacío."""
        with self.transaction():
            self.invoices.clear()
            self.policies.clear()
            self.decisions.clear()
            self.approvals.clear()
            self.audit_events.clear()
            self._mark_changed()

    def add_invoice(self, invoice: Invoice, actor: str = "api") -> Invoice:
        with self.transaction():
            self.invoices[invoice.id] = invoice
            self.add_audit(actor, "INVOICE_CREATED", "invoice", str(invoice.id))
            self._mark_changed()
            return invoice

    def get_invoice(self, invoice_id: UUID, include_deleted: bool = False) -> Invoice | None:
        with self._lock:
            invoice = self.invoices.get(invoice_id)
            if invoice and invoice.deleted_at and not include_deleted:
                return None
            return invoice

    def list_invoices(self, include_deleted: bool = False) -> list[Invoice]:
        with self._lock:
            return [
                item for item in self.invoices.values() if include_deleted or item.deleted_at is None
            ]

    def update_invoice(self, invoice: Invoice, actor: str = "api") -> Invoice:
        with self.transaction():
            self.invoices[invoice.id] = invoice
            self._cancel_stale_approvals(invoice_id=invoice.id, reason="La factura fue modificada")
            self.add_audit(
                actor,
                "INVOICE_UPDATED",
                "invoice",
                str(invoice.id),
                {"version": invoice.version},
            )
            self._mark_changed()
            return invoice

    def delete_invoice(self, invoice_id: UUID, actor: str = "api") -> bool:
        with self.transaction():
            invoice = self.get_invoice(invoice_id)
            if invoice is None:
                return False
            self.invoices[invoice_id] = invoice.model_copy(update={"deleted_at": datetime.now(UTC)})
            self._cancel_stale_approvals(invoice_id=invoice_id, reason="La factura fue eliminada")
            self.add_audit(actor, "INVOICE_DELETED", "invoice", str(invoice_id))
            self._mark_changed()
            return True

    def add_policy(self, policy: Policy, actor: str = "api") -> Policy:
        with self.transaction():
            self.policies[policy.id] = policy
            self.add_audit(
                actor,
                "POLICY_CREATED",
                "policy",
                str(policy.id),
                {"version": policy.version, "name": policy.name},
            )
            self._mark_changed()
            return policy

    def get_policy(self, policy_id: UUID, include_deleted: bool = False) -> Policy | None:
        with self._lock:
            policy = self.policies.get(policy_id)
            if policy and policy.deleted_at and not include_deleted:
                return None
            return policy

    def list_policies(self, include_deleted: bool = False) -> list[Policy]:
        with self._lock:
            return [
                item for item in self.policies.values() if include_deleted or item.deleted_at is None
            ]

    def update_policy(self, policy: Policy, actor: str = "api") -> Policy:
        with self.transaction():
            self.policies[policy.id] = policy
            self._cancel_stale_approvals(policy_id=policy.id, reason="La política fue modificada")
            self.add_audit(
                actor,
                "POLICY_UPDATED",
                "policy",
                str(policy.id),
                {"version": policy.version, "name": policy.name},
            )
            self._mark_changed()
            return policy

    def delete_policy(self, policy_id: UUID, actor: str = "api") -> bool:
        with self.transaction():
            policy = self.get_policy(policy_id)
            if policy is None:
                return False
            self.policies[policy_id] = policy.model_copy(update={"deleted_at": datetime.now(UTC)})
            self._cancel_stale_approvals(policy_id=policy_id, reason="La política fue eliminada")
            self.add_audit(actor, "POLICY_DELETED", "policy", str(policy_id))
            self._mark_changed()
            return True

    def add_decision(self, decision: Decision) -> Decision:
        with self.transaction():
            self.decisions.setdefault(decision.invoice_id, []).append(decision)
            self.add_audit(
                "policy-engine",
                "INVOICE_EVALUATED",
                "decision",
                str(decision.id),
                {"invoice_id": str(decision.invoice_id), "outcome": decision.outcome.value},
            )
            self._mark_changed()
            return decision

    def list_decisions(self, invoice_id: UUID) -> list[Decision]:
        with self._lock:
            return list(self.decisions.get(invoice_id, []))

    def add_approval(self, approval: ApprovalRequest) -> ApprovalRequest:
        with self.transaction():
            self.approvals[approval.id] = approval
            self.add_audit(
                "policy-engine",
                "APPROVAL_REQUESTED",
                "approval",
                str(approval.id),
                {"invoice_id": str(approval.invoice_id)},
            )
            self._mark_changed()
            return approval

    def get_approval(self, approval_id: UUID) -> ApprovalRequest | None:
        with self._lock:
            return self.approvals.get(approval_id)

    def list_approvals(self, pending_only: bool = False) -> list[ApprovalRequest]:
        with self._lock:
            values = list(self.approvals.values())
            if pending_only:
                values = [item for item in values if item.status.value == "PENDING"]
            return values

    def resolve_approval(self, approval: ApprovalRequest, actor: str, reason: str) -> None:
        with self.transaction():
            self.approvals[approval.id] = approval
            self.add_audit(
                actor,
                f"APPROVAL_{approval.status.value}",
                "approval",
                str(approval.id),
                {"invoice_id": str(approval.invoice_id), "reason": reason},
            )
            self._mark_changed()

    def _cancel_stale_approvals(
        self,
        *,
        reason: str,
        invoice_id: UUID | None = None,
        policy_id: UUID | None = None,
    ) -> None:
        """Cierra solicitudes abiertas cuando sus entradas cambian o se eliminan."""
        for approval in list(self.approvals.values()):
            if approval.status != ApprovalStatus.PENDING:
                continue
            if invoice_id is not None and approval.invoice_id != invoice_id:
                continue
            if policy_id is not None and approval.policy_id != policy_id:
                continue
            updated = approval.model_copy(
                update={
                    "status": ApprovalStatus.CANCELED,
                    "resolved_at": datetime.now(UTC),
                    "resolved_by": "system",
                    "resolution_reason": reason,
                }
            )
            self.approvals[approval.id] = updated
            self.add_audit(
                "system",
                "APPROVAL_CANCELED",
                "approval",
                str(approval.id),
                {"invoice_id": str(approval.invoice_id), "reason": reason},
            )
            self._mark_changed()

    def add_audit(
        self,
        actor: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: dict[str, Any] | None = None,
    ) -> AuditEvent:
        with self.transaction():
            event = AuditEvent(
                actor=actor,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details or {},
            )
            self.audit_events.append(event)
            self._mark_changed()
            return event

    def list_audit_events(self, limit: int = 100) -> list[AuditEvent]:
        with self._lock:
            return list(reversed(self.audit_events[-limit:]))


_default_store = LocalJsonStore()
_test_store = LocalJsonStore(
    Path(__file__).resolve().parents[2] / "data" / "test_state.json"
)
_active_store: ContextVar[LocalJsonStore] = ContextVar("cuentra_active_store", default=_default_store)
_client_stores: dict[str, LocalJsonStore] = {}
_client_stores_lock = RLock()


def select_store(
    workspace: str, client_id: str | None = None
) -> tuple[LocalJsonStore, Token[LocalJsonStore] | None]:
    """Selecciona persistencia por petición, aislando Operativos por perfil de navegador."""
    if workspace == "test":
        return _test_store, _active_store.set(_test_store)
    if workspace == "main":
        if not client_id:
            return _default_store, _active_store.set(_default_store)
        try:
            canonical_id = str(UUID(client_id))
        except ValueError as exc:
            raise ValueError("Identificador de navegador inválido") from exc
        with _client_stores_lock:
            client_store = _client_stores.get(canonical_id)
            if client_store is None:
                client_store = LocalJsonStore(
                    _default_store.path.parent / "clients" / f"{canonical_id}.json"
                )
                _client_stores[canonical_id] = client_store
        return client_store, _active_store.set(client_store)
    raise ValueError("Espacio de trabajo desconocido")


def restore_store(token: Token[LocalJsonStore] | None) -> None:
    if token is not None:
        _active_store.reset(token)


def current_store() -> LocalJsonStore:
    return _active_store.get()


class _StoreProxy:
    """Mantiene compatibilidad de las rutas existentes con almacenamiento contextual."""

    def __getattr__(self, name: str) -> object:
        return getattr(current_store(), name)


store = _StoreProxy()
