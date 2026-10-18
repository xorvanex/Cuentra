"""Acciones del espacio Operativo asociado al navegador actual."""

from fastapi import APIRouter, HTTPException, Request

from app.repositories.local_json import current_store, store

router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.post("/reset", status_code=200)
def reset_current_workspace(request: Request) -> dict[str, str]:
    """Borra el estado del UUID actual; no permite reiniciar Operativos compartido ni Pruebas."""
    client_id = request.headers.get("X-Cuentra-Client-ID", "").strip()
    if (
        request.headers.get("X-Cuentra-Workspace", "main").strip().lower() != "main"
        or not client_id
        or current_store().path.parent.name != "clients"
    ):
        raise HTTPException(
            status_code=403,
            detail="El reinicio solo está disponible para el espacio Operativo de este navegador.",
        )
    store.reset_state()
    return {"status": "reset", "message": "El espacio de este navegador quedó vacío."}
