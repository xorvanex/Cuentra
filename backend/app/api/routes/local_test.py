"""Herramientas destructivas limitadas al espacio JSON de pruebas local."""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from app.core.config import settings
from app.domain.models import Invoice, Policy
from app.repositories.local_json import current_store, store

router = APIRouter(prefix="/local-test", tags=["local-test"])
DATA_DIR = Path(__file__).resolve().parents[3] / "data"
TEST_STATE = DATA_DIR / "test_state.json"


def _require_local_test_workspace(request: Request) -> None:
    client_host = request.client.host if request.client else ""
    if (
        request.headers.get("X-Blinka-Workspace", "").lower() != "test"
        or settings.app_env not in {"development", "test"}
        or (
            client_host not in {"127.0.0.1", "::1", "testclient"}
            and not settings.allow_local_test_non_loopback
        )
        or current_store().path.resolve() != TEST_STATE.resolve()
    ):
        raise HTTPException(
            status_code=403,
            detail="Esta acción solo funciona sobre el espacio de pruebas local",
        )


def _summary() -> dict[str, int | str]:
    return {
        "workspace": "test",
        "storage_file": "backend/data/test_state.json",
        "invoices": len(store.list_invoices()),
        "policies": len(store.list_policies()),
        "decisions": sum(
            len(store.list_decisions(invoice.id))
            for invoice in store.list_invoices(include_deleted=True)
        ),
        "approvals": len(store.list_approvals()),
        "audit_events": len(store.list_audit_events(limit=500)),
    }


@router.get("/status")
def test_workspace_status(request: Request) -> dict[str, int | str]:
    _require_local_test_workspace(request)
    return _summary()


@router.post("/load")
def load_test_fixtures(request: Request) -> dict[str, int | str]:
    _require_local_test_workspace(request)
    policy_data = json.loads((DATA_DIR / "test_policy_usd.json").read_text(encoding="utf-8"))
    invoice_data = json.loads((DATA_DIR / "test_invoices_usd.json").read_text(encoding="utf-8"))
    with store.transaction():
        policies_by_name = {item.name: item for item in store.list_policies()}
        if policy_data["name"] not in policies_by_name:
            store.add_policy(Policy(**policy_data), actor="local-test-fixtures")
        invoices_by_reference = {
            item.external_reference: item for item in store.list_invoices()
        }
        for fixture in invoice_data:
            if fixture["external_reference"] not in invoices_by_reference:
                store.add_invoice(Invoice(**fixture), actor="local-test-fixtures")
    return _summary()


@router.post("/reset")
def reset_test_workspace(request: Request) -> dict[str, int | str]:
    _require_local_test_workspace(request)
    with store.transaction():
        store.reset_state()
        store.add_audit(
            "local-test",
            "TEST_WORKSPACE_RESET",
            "workspace",
            "test",
            {"storage_file": "backend/data/test_state.json"},
        )
    return _summary()
