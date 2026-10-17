"""Endpoint de estado para comprobar que la API está activa."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    """Devuelve un estado básico de la aplicación."""
    return {"status": "ok"}
