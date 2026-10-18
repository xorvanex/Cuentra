"""Punto de entrada de la API."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.approvals import router as approvals_router
from app.api.routes.audit import router as audit_router
from app.api.routes.documents import router as documents_router
from app.api.routes.health import router as health_router
from app.api.routes.invoices import router as invoices_router
from app.api.routes.local_test import router as local_test_router
from app.api.routes.policies import router as policies_router
from app.core.config import settings
from app.repositories.local_json import restore_store, select_store

app = FastAPI(title=settings.app_name, version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "X-Cuentra-Workspace", "X-Cuentra-Client-ID"],
)
app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(approvals_router, prefix=settings.api_prefix)
app.include_router(audit_router, prefix=settings.api_prefix)
app.include_router(invoices_router, prefix=settings.api_prefix)
app.include_router(local_test_router, prefix=settings.api_prefix)
app.include_router(documents_router, prefix=settings.api_prefix)
app.include_router(policies_router, prefix=settings.api_prefix)


@app.middleware("http")
async def select_local_workspace(request: Request, call_next):
    """Rutea cada petición de demo al JSON local aislado de pruebas cuando se solicita."""
    workspace = request.headers.get("X-Cuentra-Workspace", "main").strip().lower()
    client_id = request.headers.get("X-Cuentra-Client-ID", "").strip()
    if workspace not in {"main", "test"}:
        return JSONResponse(status_code=400, content={"detail": "Espacio de trabajo inválido"})
    if workspace == "test":
        client_host = request.client.host if request.client else ""
        if settings.app_env not in {"development", "test"} or (
            client_host not in {"127.0.0.1", "::1", "testclient"}
            and not settings.allow_local_test_non_loopback
        ):
            return JSONResponse(
                status_code=403,
                content={"detail": "El espacio de pruebas solo está disponible en desarrollo local"},
            )
    if workspace == "main" and not client_id and settings.app_env.lower() in {"production", "prod"}:
        if request.url.path not in {f"{settings.api_prefix}/health", "/"}:
            return JSONResponse(
                status_code=400,
                content={"detail": "Falta el identificador del espacio de este navegador; recarga la aplicación."},
            )
    try:
        _, token = select_store(workspace, client_id or None)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"detail": str(exc)})
    try:
        return await call_next(request)
    finally:
        restore_store(token)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    """Guía breve al abrir la URL base del servidor."""
    return {
        "service": settings.app_name,
        "status": "ok",
        "health": f"{settings.api_prefix}/health",
        "docs": "/docs",
    }
