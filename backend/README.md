# Backend — Cuentra

API local en Python 3.11+ y FastAPI. Implementa CRUD de facturas y políticas, evaluación determinista, aprobación humana de casos escalados, extracción local de documentos y auditoría. No usa base de datos ni servicios externos: persiste en JSON local. Docker incluye Tesseract OCR con modelos inglés/español.

## Preparación y arranque

Ejecuta desde la raíz del repositorio, con PowerShell:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".\backend[dev]"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --env-file .env
```

El entorno virtual `.venv` se crea en la raíz. No actives un segundo entorno dentro de `backend`. Si `py -3.11` no existe, usa `python -m venv .venv`. Health: `http://127.0.0.1:8000/api/v1/health`; Swagger: `http://127.0.0.1:8000/docs`.

## Extracción local

`POST /api/v1/documents/extract` recibe un archivo multipart y devuelve campos sugeridos; no crea ni evalúa la factura. Formatos:

- PDF con texto seleccionable: `pypdf`.
- `.eml`: parser `email` de Python.
- `.txt`: UTF-8.
- PNG/JPG: Pillow + `pytesseract` + ejecutable nativo Tesseract OCR.

Los campos deben ser revisados por una persona antes de guardar y evaluar. Archivos binarios no se persisten; el texto extraído se guarda en el registro para auditoría. El tamaño máximo es 10 MB.

En Windows instala Tesseract desde el instalador recomendado por la documentación de Tesseract/UB Mannheim. La instalación típica está en `C:\Program Files\Tesseract-OCR\tesseract.exe` y el backend la detecta automáticamente. Para otra ruta, define `TESSERACT_CMD` en `.env`. `TESSERACT_LANG` acepta los códigos disponibles (por defecto `eng`); `TESSERACT_TESSDATA_DIR` apunta al directorio de modelos si no están junto al ejecutable. Comprueba con `& "$env:ProgramFiles\Tesseract-OCR\tesseract.exe" --version` y `& "$env:ProgramFiles\Tesseract-OCR\tesseract.exe" --list-langs`. Reinicia Uvicorn al cambiar el `.env`.

## Corpus sintético

Las 12 fuentes están en `synthetic-invoices/`, junto con manifiesto, política ficticia USD y matriz de resultados. En el frontend, cambia al espacio **Pruebas locales** y carga documentos desde **Facturas**. Se extraen, registran y evalúan en secuencia. Si faltan campos obligatorios, ese archivo queda sin registrar y el resultado explica qué falta. Para el caso de presupuesto, sigue el orden del README del corpus. No cargues los fixtures al espacio operativo.

## Endpoints principales

- `GET /api/v1/health`
- `/api/v1/invoices`: CRUD, evaluación e historial de decisiones.
- `/api/v1/policies`: reglas y términos contractuales configurados por la empresa.
- `/api/v1/approvals`: pendientes e historial, resolución humana con actor y motivo.
- `/api/v1/audit-events`: historial explicable.
- `POST /api/v1/documents/extract`: extracción preliminar.
- `/api/v1/local-test/*`: fixtures y reinicio del espacio aislado.

En Railway, las peticiones de Operativos deben incluir `X-Cuentra-Client-ID` con un UUID generado y guardado por el frontend en el perfil del navegador. Cada UUID obtiene su propio archivo persistente en `backend/data/clients/<uuid>.json`; así dos navegadores no comparten facturas, políticas, aprobaciones ni auditoría. La ausencia de ese encabezado se permite en desarrollo para facilitar Swagger y las llamadas directas locales; en producción se exige para todas las rutas salvo health y raíz.

`POST /api/v1/workspace/reset` deja vacío el espacio asociado al UUID de la petición y solo funciona en el espacio Operativo aislado del navegador; no afecta Pruebas locales ni otros UUID. La UI lo ejecuta con confirmación desde **Resumen**.

Las rutas `/local-test` requieren entorno local y `X-Cuentra-Workspace: test`; las acciones solo cambian `backend/data/test_state.json`, común a la instancia local. El identificador del navegador no convierte la demo pública en un sistema autenticado: usa únicamente datos sintéticos.

## Reglas importantes

Se usan `Decimal`, moneda exacta, lista de proveedores, límite por factura, presupuesto acumulado, detección de duplicados y umbral humano. Proveedor no autorizado, discrepancia contractual, duplicado, datos incompletos o límites excedidos nunca se convierten en aprobación automática. Las aprobaciones humanas vuelven a comprobar las versiones de factura/política y el presupuesto.

`actor_id` no autentica personas; es solo un dato de demostración. El almacenamiento JSON y su bloqueo son para una instancia local. No desplegar públicamente ni cargar datos reales.

## Carpetas

- `app/api/routes`: contratos HTTP.
- `app/application`: evaluación y extracción.
- `app/domain`: modelos y validación.
- `app/repositories/local_json.py`: persistencia local y auditoría.
- `data`: políticas/fixtures y estado runtime local.
- `scripts`: utilidades de demo y verificación de corpus.
- `tests`: pruebas API y reglas.

## Desarrollo

Desde la raíz:

```powershell
.\.venv\Scripts\python.exe -m pytest .\backend\tests -q
.\.venv\Scripts\ruff.exe check .\backend\app .\backend\tests
.\.venv\Scripts\python.exe .\backend\scripts\verify_synthetic_corpus.py
```

El verificador lee las 12 fuentes, extrae campos, evalúa los resultados del manifiesto en el orden requerido y usa un JSON temporal. No modifica `runtime_state.json` ni `test_state.json`.
