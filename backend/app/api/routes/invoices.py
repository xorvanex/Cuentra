"""Operaciones CRUD y evaluación de facturas."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status

from app.application.evaluation import evaluate_invoice
from app.domain.models import ApprovalRequest, Decision, Invoice, InvoiceCreate
from app.repositories.local_json import store

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.post("", response_model=Invoice, status_code=status.HTTP_201_CREATED)
def create_invoice(payload: InvoiceCreate) -> Invoice:
    return store.add_invoice(Invoice(**payload.model_dump()))


@router.get("", response_model=list[Invoice])
def list_invoices() -> list[Invoice]:
    return store.list_invoices()


@router.get("/{invoice_id}", response_model=Invoice)
def get_invoice(invoice_id: UUID) -> Invoice:
    invoice = store.get_invoice(invoice_id)
    if invoice is None:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return invoice


@router.put("/{invoice_id}", response_model=Invoice)
def replace_invoice(invoice_id: UUID, payload: InvoiceCreate) -> Invoice:
    current = store.get_invoice(invoice_id)
    if current is None:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if any(
        decision.outcome.value == "APPROVE"
        for decision in store.list_decisions(invoice_id)
    ):
        raise HTTPException(status_code=409, detail="Una factura aprobada no se puede editar")
    updated = Invoice(
        id=current.id,
        version=current.version + 1,
        created_at=current.created_at,
        **payload.model_dump(),
    )
    return store.update_invoice(updated)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(invoice_id: UUID) -> Response:
    if not store.delete_invoice(invoice_id):
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{invoice_id}/evaluate", response_model=Decision, status_code=status.HTTP_201_CREATED)
def evaluate(invoice_id: UUID, policy_id: UUID) -> Decision:
    with store.transaction():
        invoice = store.get_invoice(invoice_id)
        if invoice is None:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        policy = store.get_policy(policy_id)
        if policy is None:
            raise HTTPException(status_code=404, detail="Política no encontrada")
        previous = store.list_decisions(invoice_id)
        same_evaluation = [
            item
            for item in previous
            if item.policy_id == policy.id
            and item.policy_version == policy.version
            and item.invoice_version == invoice.version
        ]
        if same_evaluation:
            return same_evaluation[-1]
        decision = evaluate_invoice(store, invoice, policy)
        store.add_decision(decision)
        if decision.outcome.value == "ESCALATE":
            store.add_approval(
                ApprovalRequest(
                    decision_id=decision.id,
                    invoice_id=invoice.id,
                    policy_id=policy.id,
                    policy_version=policy.version,
                )
            )
        return decision


@router.get("/{invoice_id}/decisions", response_model=list[Decision])
def list_decisions(invoice_id: UUID) -> list[Decision]:
    if store.get_invoice(invoice_id, include_deleted=True) is None:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return store.list_decisions(invoice_id)
