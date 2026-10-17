from decimal import Decimal
from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pypdf import PdfWriter

from app.api.routes import local_test
from app.main import app
from app.repositories import local_json
from app.repositories.local_json import LocalJsonStore, store

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_store(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    store.set_path_for_testing(tmp_path / "state.json")
    test_path = tmp_path / "test-state.json"
    local_json._test_store.set_path_for_testing(test_path)
    monkeypatch.setattr(local_test, "TEST_STATE", test_path)


def create_policy(**overrides: object) -> dict:
    payload = {
        "name": "Demo",
        "currency": "COP",
        "allowed_vendors": ["proveedor demo"],
        "max_invoice_amount": "1000000.00",
        "period_budget": "2000000.00",
        "human_approval_threshold": "500000.00",
        "approver_ids": ["demo-approver"],
    }
    payload.update(overrides)
    response = client.post("/api/v1/policies", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def create_invoice(
    external_reference: str = "FAC-001",
    vendor_name: str = "Proveedor Demo",
    amount: str = "250000.00",
    currency: str = "COP",
) -> dict:
    response = client.post(
        "/api/v1/invoices",
        json={
            "external_reference": external_reference,
            "vendor_name": vendor_name,
            "amount": amount,
            "currency": currency,
            "due_date": "2026-10-31",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def evaluate(invoice: dict, policy: dict) -> dict:
    response = client.post(
        f"/api/v1/invoices/{invoice['id']}/evaluate",
        params={"policy_id": policy["id"]},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_root_returns_api_entrypoints() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["health"] == "/api/v1/health"
    assert response.json()["docs"] == "/docs"


def test_local_test_workspace_loads_resets_and_never_changes_main_state() -> None:
    main_policy = create_policy()
    main_invoice = create_invoice("MAIN-KEPT-001")
    test_headers = {"X-Blinka-Workspace": "test"}

    assert client.get("/api/v1/invoices").json() == [main_invoice]
    assert client.get("/api/v1/invoices", headers=test_headers).json() == []

    loaded = client.post("/api/v1/local-test/load", headers=test_headers)
    assert loaded.status_code == 200, loaded.text
    assert loaded.json()["invoices"] == 3
    assert loaded.json()["policies"] == 1
    assert client.post("/api/v1/local-test/load", headers=test_headers).json()["invoices"] == 3
    assert client.get("/api/v1/invoices", headers=test_headers).json()[0]["currency"] == "USD"

    reset = client.post("/api/v1/local-test/reset", headers=test_headers)
    assert reset.status_code == 200, reset.text
    assert reset.json()["invoices"] == 0
    assert reset.json()["policies"] == 0
    assert reset.json()["audit_events"] == 1
    assert client.get("/api/v1/invoices").json() == [main_invoice]
    assert client.get("/api/v1/policies").json() == [main_policy]


def test_local_test_reset_requires_test_workspace_header() -> None:
    response = client.post("/api/v1/local-test/reset")
    assert response.status_code == 403


def test_document_text_extraction_is_a_reviewable_suggestion() -> None:
    document = (
        "Supplier: Andes Field Services LLC\n"
        "Invoice Number: NS-INV-4101\n"
        "Total Due: USD 1,250.00\n"
        "Due Date: 2026-11-15\n"
        "Purchase Order: NS-PO-900\n"
        "Agreed Amount: USD 1,250.00\n"
    )
    response = client.post(
        "/api/v1/documents/extract",
        files={"file": ("sample.txt", document.encode("utf-8"), "text/plain")},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["fields"]["external_reference"] == "NS-INV-4101"
    assert result["fields"]["vendor_name"] == "Andes Field Services LLC"
    assert result["fields"]["amount"] == "1250.00"
    assert result["fields"]["currency"] == "USD"
    assert result["fields"]["due_date"] == "2026-11-15"
    assert result["fields"]["agreement_reference"] == "NS-PO-900"
    assert result["missing_fields"] == []
    assert result["auto_approval_allowed"] is False


def test_pdf_with_no_text_requires_review_instead_of_guessing() -> None:
    writer = PdfWriter()
    writer.add_blank_page(width=300, height=300)
    pdf = BytesIO()
    writer.write(pdf)
    response = client.post(
        "/api/v1/documents/extract",
        files={"file": ("blank.pdf", pdf.getvalue(), "application/pdf")},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["fields"]["amount"] is None
    assert result["auto_approval_allowed"] is False
    assert result["warnings"]


def test_image_without_local_ocr_returns_manual_review_warning(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import pytesseract

    monkeypatch.setattr(
        pytesseract.pytesseract,
        "tesseract_cmd",
        str(tmp_path / "missing-tesseract.exe"),
    )
    image = Image.new("RGB", (80, 40), "white")
    content = BytesIO()
    image.save(content, format="PNG")
    response = client.post(
        "/api/v1/documents/extract",
        files={"file": ("blank.png", content.getvalue(), "image/png")},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["fields"]["amount"] is None
    assert any("OCR local no disponible" in warning for warning in result["warnings"])


def test_ambiguous_document_amount_is_not_guessed() -> None:
    document = (
        "Supplier: Andes Field Services LLC\n"
        "Invoice Number: NS-INV-AMB-01\n"
        "Total Due: USD 1,2xx\n"
        "Due Date: 2026-11-15\n"
    )
    response = client.post(
        "/api/v1/documents/extract",
        files={"file": ("ambiguous.txt", document.encode("utf-8"), "text/plain")},
    )
    assert response.status_code == 200
    assert response.json()["fields"]["amount"] is None
    assert "amount" in response.json()["missing_fields"]


def test_invoice_mismatch_with_agreed_amount_is_blocked() -> None:
    policy = create_policy(
        vendor_terms=[
            {
                "vendor_name": "Proveedor Demo",
                "agreement_reference": "PO-DEMO-01",
                "currency": "COP",
                "agreed_amount": "250000.00",
            }
        ]
    )
    response = client.post(
        "/api/v1/invoices",
        json={
            "external_reference": "FAC-PO-MISMATCH",
            "vendor_name": "Proveedor Demo",
            "amount": "300000.00",
            "currency": "COP",
            "due_date": "2026-10-31",
            "agreement_reference": "PO-DEMO-01",
        },
    )
    assert response.status_code == 201
    decision = evaluate(response.json(), policy)
    assert decision["outcome"] == "BLOCK"
    assert "AGREEMENT_AMOUNT_MISMATCH" in decision["reason_codes"]


def test_crud_and_local_json_persistence() -> None:
    policy = create_policy()
    invoice = create_invoice()
    assert invoice["currency"] == "COP"
    assert client.get(f"/api/v1/invoices/{invoice['id']}").status_code == 200
    assert client.get("/api/v1/invoices").status_code == 200

    replacement = {
        "external_reference": "FAC-001",
        "vendor_name": "Proveedor Demo",
        "amount": "300000.00",
        "currency": "COP",
        "due_date": "2026-11-01",
    }
    updated_invoice = client.put(f"/api/v1/invoices/{invoice['id']}", json=replacement).json()
    assert updated_invoice["version"] == 2
    updated_policy = client.put(
        f"/api/v1/policies/{policy['id']}",
        json={
            **policy,
            "max_invoice_amount": "900000.00",
            "deleted_at": None,
        },
    )
    assert updated_policy.status_code == 200
    assert updated_policy.json()["version"] == 2

    restored = LocalJsonStore(store.path)
    assert len(restored.list_invoices()) == 1
    assert restored.list_invoices()[0].amount == Decimal(updated_invoice["amount"])
    assert restored.get_policy(restored.list_policies()[0].id).version == 2


def test_rules_block_vendor_currency_limit_duplicate_and_budget() -> None:
    policy = create_policy(
        max_invoice_amount="100.00",
        period_budget="100.00",
        human_approval_threshold="1000.00",
    )

    wrong_vendor = evaluate(create_invoice("FAC-X", "Desconocido", "10.00"), policy)
    assert wrong_vendor["outcome"] == "BLOCK"
    assert "VENDOR_NOT_ALLOWED" in wrong_vendor["reason_codes"]
    blocked_invoice = client.get("/api/v1/invoices").json()[0]
    first_block = client.post(
        f"/api/v1/invoices/{blocked_invoice['id']}/evaluate",
        params={"policy_id": policy["id"]},
    ).json()
    second_block = client.post(
        f"/api/v1/invoices/{blocked_invoice['id']}/evaluate",
        params={"policy_id": policy["id"]},
    ).json()
    assert first_block["id"] == second_block["id"]
    assert len(client.get(f"/api/v1/invoices/{blocked_invoice['id']}/decisions").json()) == 1

    wrong_currency = evaluate(create_invoice("FAC-Y", amount="10.00", currency="USD"), policy)
    assert "CURRENCY_MISMATCH" in wrong_currency["reason_codes"]

    over_limit = evaluate(create_invoice("FAC-Z", amount="101.00"), policy)
    assert "INVOICE_LIMIT_EXCEEDED" in over_limit["reason_codes"]

    first = create_invoice("FAC-BUDGET-1", amount="70.00")
    assert evaluate(first, policy)["outcome"] == "APPROVE"
    second = evaluate(create_invoice("FAC-BUDGET-2", amount="40.00"), policy)
    assert second["outcome"] == "BLOCK"
    assert "PERIOD_BUDGET_EXCEEDED" in second["reason_codes"]

    dup_a = create_invoice("FAC-DUP", amount="5.00")
    dup_b = create_invoice("FAC-DUP", amount="5.00")
    duplicate_first = evaluate(dup_a, policy)
    assert duplicate_first["outcome"] == "BLOCK"
    assert "DUPLICATE_INVOICE" in duplicate_first["reason_codes"]
    duplicate_result = evaluate(dup_b, policy)
    assert duplicate_result["outcome"] == "BLOCK"
    assert "DUPLICATE_INVOICE" in duplicate_result["reason_codes"]


def test_escalation_approval_authorization_and_audit() -> None:
    policy = create_policy(human_approval_threshold="200000.00")
    invoice = create_invoice(amount="250000.00")
    escalated = evaluate(invoice, policy)
    assert escalated["outcome"] == "ESCALATE"
    assert "HUMAN_APPROVAL_REQUIRED" in escalated["reason_codes"]

    pending = client.get("/api/v1/approvals").json()
    assert len(pending) == 1
    approval_id = pending[0]["id"]

    denied = client.post(
        f"/api/v1/approvals/{approval_id}/resolve",
        json={"outcome": "APPROVE", "actor_id": "intruso", "reason": "intento"},
    )
    assert denied.status_code == 403

    resolved = client.post(
        f"/api/v1/approvals/{approval_id}/resolve",
        json={
            "outcome": "APPROVE",
            "actor_id": "demo-approver",
            "reason": "Factura verificada para la demostración",
        },
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "APPROVED"
    decisions = client.get(f"/api/v1/invoices/{invoice['id']}/decisions").json()
    assert [item["outcome"] for item in decisions] == ["ESCALATE", "APPROVE"]
    immutable = client.put(
        f"/api/v1/invoices/{invoice['id']}",
        json={
            "external_reference": invoice["external_reference"],
            "vendor_name": invoice["vendor_name"],
            "amount": "250001.00",
            "currency": invoice["currency"],
            "due_date": invoice["due_date"],
        },
    )
    assert immutable.status_code == 409

    retry = client.post(
        f"/api/v1/approvals/{approval_id}/resolve",
        json={"outcome": "APPROVE", "actor_id": "demo-approver", "reason": "repetición"},
    )
    assert retry.status_code == 409
    actions = [event["action"] for event in client.get("/api/v1/audit-events").json()]
    assert "INVOICE_EVALUATED" in actions
    assert "APPROVAL_REQUESTED" in actions
    assert "APPROVAL_APPROVED" in actions


def test_stale_approval_is_rejected_and_delete_preserves_history() -> None:
    policy = create_policy(human_approval_threshold="200000.00")
    invoice = create_invoice(amount="250000.00")
    evaluate(invoice, policy)
    approval = client.get("/api/v1/approvals").json()[0]

    client.put(
        f"/api/v1/invoices/{invoice['id']}",
        json={
            "external_reference": invoice["external_reference"],
            "vendor_name": invoice["vendor_name"],
            "amount": "260000.00",
            "currency": invoice["currency"],
            "due_date": invoice["due_date"],
        },
    )
    stale = client.post(
        f"/api/v1/approvals/{approval['id']}/resolve",
        json={"outcome": "APPROVE", "actor_id": "demo-approver", "reason": "obsoleto"},
    )
    assert stale.status_code == 409

    deleted = client.delete(f"/api/v1/invoices/{invoice['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/invoices/{invoice['id']}").status_code == 404
    assert len(client.get(f"/api/v1/invoices/{invoice['id']}/decisions").json()) == 1


def test_human_approval_cannot_overrun_budget() -> None:
    policy = create_policy(
        max_invoice_amount="1000.00",
        period_budget="100.00",
        human_approval_threshold="1.00",
    )
    first = create_invoice("BUDGET-ESC-1", amount="60.00")
    second = create_invoice("BUDGET-ESC-2", amount="60.00")
    evaluate(first, policy)
    evaluate(second, policy)
    pending = client.get("/api/v1/approvals").json()
    first_approval = next(item for item in pending if item["invoice_id"] == first["id"])
    second_approval = next(item for item in pending if item["invoice_id"] == second["id"])
    payload = {
        "outcome": "APPROVE",
        "actor_id": "demo-approver",
        "reason": "Validación humana",
    }

    assert client.post(
        f"/api/v1/approvals/{first_approval['id']}/resolve", json=payload
    ).status_code == 200
    denied = client.post(f"/api/v1/approvals/{second_approval['id']}/resolve", json=payload)
    assert denied.status_code == 409
    assert "presupuesto" in denied.json()["detail"]


def test_human_can_reject_an_escalated_invoice() -> None:
    policy = create_policy(human_approval_threshold="100.00")
    invoice = create_invoice(amount="250.00")
    evaluate(invoice, policy)
    approval = client.get("/api/v1/approvals").json()[0]
    result = client.post(
        f"/api/v1/approvals/{approval['id']}/resolve",
        json={
            "outcome": "BLOCK",
            "actor_id": "demo-approver",
            "reason": "No se adjuntó soporte suficiente",
        },
    )
    assert result.status_code == 200
    assert result.json()["status"] == "REJECTED"
    decision = client.get(f"/api/v1/invoices/{invoice['id']}/decisions").json()[-1]
    assert decision["outcome"] == "BLOCK"
    assert decision["reason_codes"] == ["HUMAN_REJECTED"]
