# Blinka Guard

MVP local para revisar facturas sintéticas y decidir, con reglas deterministas, si se pueden aprobar, se deben bloquear o requieren aprobación humana. Cada decisión conserva su motivo y la versión de la política utilizada. No ejecuta pagos ni se conecta a bancos.

## Inicio con Docker (recomendado para la demo)

Con Docker Desktop abierto, ejecuta desde la raíz del repositorio:

```powershell
docker compose up --build
```

Abre <http://localhost:3000>. Swagger está en <http://localhost:8000/docs>. El volumen Docker `blinka-data` conserva los estados operativo y de pruebas entre reinicios. Detén los servicios con `Ctrl+C` y `docker compose down`. `docker compose down -v` elimina también el volumen y los datos guardados.

Los puertos se publican solo en `localhost`. Esta configuración es para desarrollo/demo local, no despliegue público. Tesseract OCR con modelos inglés/español viene dentro de la imagen backend.

## Requisitos para ejecutar sin Docker

- Python 3.11.
- Node.js 20.9 o superior.
- pnpm 11 (o npm).
- Windows: Tesseract OCR para leer imágenes; PDF con texto, EML y TXT no lo requieren.

## Inicio desde VS Code

Abre la carpeta raíz `blinka-guard`. Usa dos terminales PowerShell y mantenlas abiertas.

### 1. Backend (Terminal 1, desde la raíz)

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".\backend[dev]"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --env-file .env
```

Si `py -3.11` no está disponible, crea el entorno con `python -m venv .venv`. El entorno virtual vive en la raíz; los comandos usan su ejecutable directamente, por lo que no es necesario activarlo.

API: <http://127.0.0.1:8000/api/v1/health> · Swagger: <http://127.0.0.1:8000/docs>.

### 2. Frontend (Terminal 2)

```powershell
Set-Location .\frontend
pnpm install
Copy-Item .env.local.example .env.local
pnpm dev
```

Abre <http://localhost:3000>. Si `pnpm` no está disponible, instala la versión fijada desde otra terminal con `npm install --global pnpm@11.25.0`, abre una terminal nueva y repite los comandos. Así no hace falta habilitar Corepack en `C:\Program Files`.

## OCR de imágenes en Windows

Instala Tesseract OCR por separado del paquete Python. El proyecto usa `pytesseract` como wrapper y busca por defecto `C:\Program Files\Tesseract-OCR\tesseract.exe`. Si instalas Tesseract en otra ubicación, configura `TESSERACT_CMD` en el `.env` local. Para idioma adicional configura `TESSERACT_LANG` y `TESSERACT_TESSDATA_DIR` según los modelos instalados. Reinicia Uvicorn después de cambiar la configuración.

Comprueba la instalación con `& "$env:ProgramFiles\Tesseract-OCR\tesseract.exe" --version` y `& "$env:ProgramFiles\Tesseract-OCR\tesseract.exe" --list-langs`. La guía oficial de Tesseract enlaza el instalador de Windows de UB Mannheim: <https://tesseract-ocr.github.io/tessdoc/Installation.html#windows>.

## Entrada de facturas y documentos

En **Facturas → Registrar factura**, selecciona uno o varios PDF, PNG/JPG, correo `.eml` o texto `.txt` y pulsa **Procesar**. El sistema detecta el canal, extrae los campos, crea cada factura y la evalúa con la política de su moneda. Los casos `ESCALATE` aparecen en **Aprobaciones**; los datos incompletos se detienen para revisión y no se registran como aprobaciones automáticas. Los binarios no se guardan; se conserva el texto extraído para explicar la decisión.

El corpus de 12 ejemplos está en [synthetic-invoices/](synthetic-invoices/). Consulta su [README](synthetic-invoices/README.md), `manifest.json` y `company_policy_usd.json`. Carga los casos desde el espacio **Pruebas locales**, nunca en el espacio operativo.

## Datos y seguridad de la demo

- `backend/data/runtime_state.json`: estado operativo local persistente.
- `backend/data/test_state.json`: estado separado para pruebas locales; reinícialo desde **Pruebas locales**.
- Los JSON locales, `.env` y `.env.local` están ignorados por Git. No borres `runtime_state.json` para limpiar la demo salvo que quieras descartar ese historial.
- Usa únicamente facturas y empresas ficticias. No hay autenticación empresarial ni movimiento de dinero.
- El JSON y su bloqueo sirven para una sola instancia local, no para varios workers o despliegue público.
- No hay agente/LLM remoto, base de datos gestionada, API de terceros, banco ni proveedor de pagos en runtime. OCR requiere Tesseract local; la imagen Docker ya lo incluye.

## Comprobaciones

Desde la raíz:

```powershell
.\.venv\Scripts\python.exe -m pytest .\backend\tests -q
.\.venv\Scripts\ruff.exe check .\backend\app .\backend\tests
.\.venv\Scripts\python.exe .\backend\scripts\verify_synthetic_corpus.py
```

Desde `frontend`:

```powershell
pnpm typecheck
pnpm build
```

## Estructura del repositorio

```text
backend/             API FastAPI, lógica, persistencia JSON, scripts y pruebas
frontend/            Interfaz Next.js + TypeScript
synthetic-invoices/  Corpus ficticio para demostración y verificación
docs/                Requisitos, arquitectura, seguridad, pruebas y entregables
AGENTS.md            Instrucciones de continuidad para agentes
```

Lee [AGENTS.md](AGENTS.md), [docs/WORK_LOG.md](docs/WORK_LOG.md), [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md) y [docs/VERIFICATION_CHECKLIST.md](docs/VERIFICATION_CHECKLIST.md) antes de continuar el desarrollo.
