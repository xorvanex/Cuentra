"""Casos de uso de evaluación y presupuesto."""

from decimal import Decimal
from uuid import UUID

from app.domain.models import Decision, DecisionOutcome, Invoice, Policy
from app.repositories.local_json import LocalJsonStore


def approved_spend(
    store: LocalJsonStore,
    policy_id: UUID,
    exclude_invoice_id: UUID | None = None,
) -> Decimal:
    """Suma solo la decisión vigente de cada factura para una política."""
    total = Decimal(0)
    for other_invoice in store.list_invoices(include_deleted=True):
        if other_invoice.id == exclude_invoice_id:
            continue
        previous = [
            decision
            for decision in store.list_decisions(other_invoice.id)
            if decision.policy_id == policy_id
        ]
        if previous and previous[-1].outcome == DecisionOutcome.APPROVE:
            total += previous[-1].invoice_snapshot.amount
    return total


def evaluate_invoice(store: LocalJsonStore, invoice: Invoice, policy: Policy) -> Decision:
    reasons: list[str] = []
    outcome = DecisionOutcome.APPROVE

    if invoice.currency != policy.currency:
        outcome = DecisionOutcome.BLOCK
        reasons.append("CURRENCY_MISMATCH")
    if invoice.vendor_name.casefold() not in policy.allowed_vendors:
        outcome = DecisionOutcome.BLOCK
        reasons.append("VENDOR_NOT_ALLOWED")
    if invoice.amount > policy.max_invoice_amount:
        outcome = DecisionOutcome.BLOCK
        reasons.append("INVOICE_LIMIT_EXCEEDED")
    vendor_terms = [
        term for term in policy.vendor_terms if term.vendor_name.casefold() == invoice.vendor_name.casefold()
    ]
    if invoice.agreement_reference:
        agreement = next(
            (
                term
                for term in vendor_terms
                if term.agreement_reference.casefold() == invoice.agreement_reference.casefold()
            ),
            None,
        )
        if agreement is None:
            outcome = DecisionOutcome.BLOCK
            reasons.append("AGREEMENT_NOT_CONFIGURED")
        elif agreement.currency != invoice.currency:
            outcome = DecisionOutcome.BLOCK
            reasons.append("AGREEMENT_CURRENCY_MISMATCH")
        elif invoice.amount != agreement.agreed_amount:
            outcome = DecisionOutcome.BLOCK
            reasons.append("AGREEMENT_AMOUNT_MISMATCH")
    elif vendor_terms:
        outcome = DecisionOutcome.BLOCK
        reasons.append("AGREEMENT_REFERENCE_MISSING")

    duplicate = any(
        other.id != invoice.id
        and other.external_reference.casefold() == invoice.external_reference.casefold()
        and other.vendor_name.casefold() == invoice.vendor_name.casefold()
        for other in store.list_invoices(include_deleted=True)
    )
    if duplicate:
        outcome = DecisionOutcome.BLOCK
        reasons.append("DUPLICATE_INVOICE")

    approved_total = approved_spend(store, policy.id, exclude_invoice_id=invoice.id)
    if outcome == DecisionOutcome.APPROVE and approved_total + invoice.amount > policy.period_budget:
        outcome = DecisionOutcome.BLOCK
        reasons.append("PERIOD_BUDGET_EXCEEDED")

    if outcome == DecisionOutcome.APPROVE and invoice.amount >= policy.human_approval_threshold:
        outcome = DecisionOutcome.ESCALATE
        reasons.append("HUMAN_APPROVAL_REQUIRED")

    if outcome == DecisionOutcome.APPROVE:
        reasons.append("POLICY_CHECKS_PASSED")

    explanations = {
        "CURRENCY_MISMATCH": "La moneda de la factura no coincide con la política.",
        "VENDOR_NOT_ALLOWED": "El proveedor no está en la lista permitida.",
        "INVOICE_LIMIT_EXCEEDED": "El importe supera el máximo por factura.",
        "AGREEMENT_NOT_CONFIGURED": "La referencia del acuerdo no coincide con un término configurado por la empresa.",
        "AGREEMENT_CURRENCY_MISMATCH": "La moneda de la factura no coincide con la moneda del acuerdo configurado.",
        "AGREEMENT_AMOUNT_MISMATCH": "El importe no coincide con el valor del acuerdo indicado.",
        "AGREEMENT_REFERENCE_MISSING": "El proveedor tiene un acuerdo configurado, pero la factura no incluye su referencia.",
        "DUPLICATE_INVOICE": "Ya existe una factura con el mismo proveedor y referencia.",
        "PERIOD_BUDGET_EXCEEDED": "El presupuesto del periodo no alcanza para esta factura.",
        "HUMAN_APPROVAL_REQUIRED": "El importe requiere aprobación humana.",
        "POLICY_CHECKS_PASSED": "La factura cumple las reglas automáticas de la política.",
    }
    explanation = " ".join(explanations[code] for code in reasons)
    return Decision(
        invoice_id=invoice.id,
        policy_id=policy.id,
        policy_version=policy.version,
        invoice_version=invoice.version,
        invoice_snapshot=invoice.model_dump(exclude={"deleted_at"}),
        policy_snapshot=policy.model_dump(exclude={"deleted_at"}),
        outcome=outcome,
        reason_codes=reasons,
        explanation=explanation,
    )
