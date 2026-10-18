# Frontend — Cuentra

Interfaz modular Next.js + TypeScript conectada al backend FastAPI local. No usa base de datos propia ni rellena errores de conexión con datos ficticios.

## Requisitos

- Node.js 20.9 o superior.
- pnpm 11 (recomendado) o npm.
- API iniciada en `http://127.0.0.1:8000`.

## Instalación y arranque

En VS Code abre una terminal en `frontend`:

```powershell
pnpm install
if (-not (Test-Path .env.local)) { Copy-Item .env.local.example .env.local }
pnpm dev
```

Abre <http://localhost:3000>. Para usar npm, ejecuta `npm install` y `npm run dev`. En desarrollo local el cliente usa `http://127.0.0.1:8000/api/v1`; `NEXT_PUBLIC_API_BASE_URL` permite cambiarlo. En Railway configura `NEXT_PUBLIC_API_BASE_URL=/api/v1` y `CUENTRA_API_ORIGIN=http://${{cuentra-api.RAILWAY_PRIVATE_DOMAIN}}:8080`. La ruta API de Next.js reenvía `/api/v1/*` al backend por la red privada en tiempo de ejecución; el navegador solo se comunica con el dominio del frontend. No publiques un dominio para `cuentra-api`.

Demo pública actual: <https://cuentra-web-production-a24b.up.railway.app/>. La ruta <https://cuentra-web-production-a24b.up.railway.app/api/v1/health> debe responder `{"status":"ok"}`. Usa solo datos sintéticos: la demo no tiene autenticación.

En otra terminal desde la raíz inicia el backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --env-file .env
```

## Flujo de entrada documental

1. Entra a **Facturas** y abre **Registrar factura**.
2. Selecciona uno o varios PDF, PNG/JPG, `.eml` o `.txt` y pulsa **Procesar**.
3. La aplicación detecta canal y formato, extrae campos, registra la factura y la evalúa con la política que coincide con su moneda.
4. Si faltan campos obligatorios, el documento se detiene sin alta y la interfaz señala los datos que requieren revisión. Una decisión `ESCALATE` sí requiere aprobación humana.

Los binarios no se almacenan; el texto extraído sí se conserva para explicar posteriormente la decisión. Para imagen se requiere Tesseract OCR instalado en el sistema y configurado en el backend; consulta la guía raíz.

## Espacio de pruebas y corpus

Al entrar a **Pruebas locales** en `localhost`, la interfaz cambia automáticamente a `X-Cuentra-Workspace: test` y mantiene ese espacio al navegar a Facturas, Aprobaciones y Registro de actividad. El botón **Cargar y abrir facturas** agrega fixtures sencillos y te lleva al primer paso; el reinicio pide confirmación. Para usar los 12 documentos de `synthetic-invoices/`, súbelos en lote desde Facturas dentro del mismo espacio; usa la política USD y sigue el orden de presupuesto en el README del corpus.

El backend restringe ese espacio a desarrollo local (`APP_ENV=development|test` y loopback, salvo habilitación local explícita). En Railway, la sección muestra una explicación y un botón para regresar a Operativos; no intenta enviar peticiones de test que el backend rechazará con 403.

La UI muestra decisiones APPROVE/BLOCK/ESCALATE, aprobaciones pendientes, historial y explicación. Solo ESCALATE crea una aprobación. La resolución requiere actor y motivo; en esta demo el actor configurado es `demo-approver` y no representa autenticación real.

## Estructura

- `app/`: ruta principal, layout, metadatos y estilos globales.
- `components/dashboard/`: shell, resumen, políticas y espacio de pruebas.
- `components/invoices/`: formulario, carga de documentos, tabla y detalle.
- `components/approvals/`: cola y resolución.
- `components/audit/`: historial de eventos.
- `components/ui/`: piezas compartidas.
- `lib/api.ts`: cliente y tipos HTTP.
- `lib/use-dashboard-data.ts`: consulta coordinada a API.

## Comprobaciones

```powershell
pnpm typecheck
pnpm build
```
