"""Consulta de solo lectura para los eventos de auditoría."""

from fastapi import APIRouter, Query

from app.domain.models import AuditEvent
from app.repositories.local_json import store

router = APIRouter(prefix="/audit-events", tags=["audit"])


@router.get("", response_model=list[AuditEvent])
def list_audit_events(limit: int = Query(default=100, ge=1, le=500)) -> list[AuditEvent]:
    return store.list_audit_events(limit=limit)
