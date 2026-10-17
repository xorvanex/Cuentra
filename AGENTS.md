# Guía para agentes — Blinka Guard

Antes de cambiar código, lee `docs/PRODUCT_SCOPE.md`, `docs/WORK_LOG.md` y la documentación relevante de `docs/`. Actualiza `docs/WORK_LOG.md` al finalizar con fecha, archivos tocados, decisiones, verificaciones ejecutadas y pendientes reales.

## Contexto de producto

- MVP local para decidir si una factura sintética se aprueba, bloquea o escala a una persona.
- No ejecutar pagos, llamar bancos, usar datos reales ni autoaprobar una extracción sin revisión.
- Cada decisión debe conservar motivo, evidencia y versión de política.
- Backend Python 3.11+ / FastAPI; frontend Next.js + TypeScript; estado local JSON.

## Arquitectura y espacios de datos

- Mantén capas de backend: API (`backend/app/api`), aplicación, dominio, repositorio local.
- `backend/data/runtime_state.json` es estado operativo local; no borrarlo, truncarlo ni reemplazarlo sin instrucción explícita del usuario.
- `backend/data/test_state.json` es el espacio de pruebas aislado y se puede reiniciar desde la UI/API de pruebas.
- Las 12 fuentes ficticias y su política/manifiesto están en `synthetic-invoices/`; no copiarlas al estado operativo.
- Usa `Decimal` para importes y reglas deterministas fail-closed.

## Herramientas y rutas

- Crear `.venv` en la raíz del repositorio, nunca dentro de `backend`.
- Dependencias Python fuente única: `backend/pyproject.toml`; `requirements.txt` raíz solo enlaza ese paquete.
- Dependencias del frontend y lockfile viven en `frontend/`.
- `.venv`, `node_modules`, `.next`, stores/cachés y archivos `.env*` locales son artefactos de máquina: no añadirlos al control de versiones.
- Antes de modificar Next.js, lee `frontend/AGENTS.md` y las guías instaladas en `frontend/node_modules/next/dist/docs/`.

## Verificación

Sigue comandos en los README. No afirmes pruebas ni OCR de imágenes como verificados si no se ejecutaron en el entorno actual. Mantén fixtures y scripts deterministas y aislados del JSON operativo.
