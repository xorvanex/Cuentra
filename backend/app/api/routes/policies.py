"""CRUD de políticas de evaluación."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status

from app.application.evaluation import approved_spend
from app.domain.models import Policy, PolicyCreate
from app.repositories.local_json import store

router = APIRouter(prefix="/policies", tags=["policies"])


@router.post("", response_model=Policy, status_code=status.HTTP_201_CREATED)
def create_policy(payload: PolicyCreate) -> Policy:
    return store.add_policy(Policy(**payload.model_dump()))


@router.get("", response_model=list[Policy])
def list_policies() -> list[Policy]:
    return store.list_policies()


@router.get("/{policy_id}", response_model=Policy)
def get_policy(policy_id: UUID) -> Policy:
    policy = store.get_policy(policy_id)
    if policy is None:
        raise HTTPException(status_code=404, detail="Política no encontrada")
    return policy


@router.put("/{policy_id}", response_model=Policy)
def replace_policy(policy_id: UUID, payload: PolicyCreate) -> Policy:
    current = store.get_policy(policy_id)
    if current is None:
        raise HTTPException(status_code=404, detail="Política no encontrada")
    policy_decisions = [
        decision
        for invoice in store.list_invoices(include_deleted=True)
        for decision in store.list_decisions(invoice.id)
        if decision.policy_id == policy_id
    ]
    if policy_decisions and payload.currency != current.currency:
        raise HTTPException(status_code=409, detail="No se puede cambiar la moneda con historial existente")
    committed = approved_spend(store, policy_id)
    if payload.period_budget < committed:
        raise HTTPException(status_code=409, detail="El nuevo presupuesto es menor al gasto ya aprobado")
    updated = Policy(
        id=current.id,
        version=current.version + 1,
        created_at=current.created_at,
        **payload.model_dump(),
    )
    return store.update_policy(updated)


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_policy(policy_id: UUID) -> Response:
    if not store.delete_policy(policy_id):
        raise HTTPException(status_code=404, detail="Política no encontrada")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
