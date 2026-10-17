"""Consulta y resolución de aprobaciones humanas para la demo local."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.application.evaluation import approved_spend
from app.domain.models import (
    ApprovalRequest,
    ApprovalResolution,
    ApprovalStatus,
    Decision,
    DecisionOutcome,
)
from app.repositories.local_json import store

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("", response_model=list[ApprovalRequest])
def list_approvals(pending_only: bool = Query(default=True)) -> list[ApprovalRequest]:
    return store.list_approvals(pending_only=pending_only)


@router.get("/{approval_id}", response_model=ApprovalRequest)
def get_approval(approval_id: UUID) -> ApprovalRequest:
    approval = store.get_approval(approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Solicitud de aprobación no encontrada")
    return approval


@router.post("/{approval_id}/resolve", response_model=ApprovalRequest)
def resolve_approval(approval_id: UUID, payload: ApprovalResolution) -> ApprovalRequest:
    with store.transaction():
        approval = store.get_approval(approval_id)
        if approval is None:
            raise HTTPException(status_code=404, detail="Solicitud de aprobación no encontrada")
        if approval.status != ApprovalStatus.PENDING:
            raise HTTPException(status_code=409, detail="La solicitud ya fue resuelta")

        invoice = store.get_invoice(approval.invoice_id)
        policy = store.get_policy(approval.policy_id)
        if invoice is None or policy is None:
            raise HTTPException(
                status_code=409,
                detail="La factura o política ya no está activa; vuelva a evaluarla",
            )
        original = next(
            (
                decision
                for decision in store.list_decisions(approval.invoice_id)
                if decision.id == approval.decision_id
            ),
            None,
        )
        if original is None or original.outcome != DecisionOutcome.ESCALATE:
            raise HTTPException(status_code=409, detail="La decisión ya no requiere aprobación")
        if invoice.version != original.invoice_version or policy.version != original.policy_version:
            raise HTTPException(
                status_code=409,
                detail="La factura o política cambió; vuelva a evaluar antes de resolver",
            )
        if payload.actor_id not in policy.approver_ids:
            raise HTTPException(status_code=403, detail="El actor no está autorizado por esta política")
        if (
            payload.outcome == DecisionOutcome.APPROVE
            and approved_spend(store, policy.id, exclude_invoice_id=invoice.id) + invoice.amount
            > policy.period_budget
        ):
            raise HTTPException(
                status_code=409,
                detail="La aprobación excedería el presupuesto disponible",
            )

        final_outcome = payload.outcome
        final_code = "HUMAN_APPROVED" if final_outcome == DecisionOutcome.APPROVE else "HUMAN_REJECTED"
        store.add_decision(
            Decision(
                invoice_id=original.invoice_id,
                policy_id=original.policy_id,
                policy_version=original.policy_version,
                invoice_version=original.invoice_version,
                invoice_snapshot=original.invoice_snapshot,
                policy_snapshot=original.policy_snapshot,
                outcome=final_outcome,
                reason_codes=[final_code],
                explanation=f"Resolución de {payload.actor_id}: {payload.reason}",
            )
        )
        resolved_status = (
            ApprovalStatus.APPROVED
            if final_outcome == DecisionOutcome.APPROVE
            else ApprovalStatus.REJECTED
        )
        updated = approval.model_copy(
            update={
                "status": resolved_status,
                "resolved_at": datetime.now(UTC),
                "resolved_by": payload.actor_id,
                "resolution_reason": payload.reason,
            }
        )
        store.resolve_approval(updated, payload.actor_id, payload.reason)
        return updated
