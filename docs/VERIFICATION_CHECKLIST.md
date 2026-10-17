# Checklist de verificación para la demo

Marca cada punto durante la revisión final. Usa exclusivamente los datos ficticios de `synthetic-invoices/` y el espacio **Pruebas locales**.

## 1. Preparación y arranque

- [ ] Con Docker Desktop iniciado, desde la raíz ejecutar `docker compose up --build` y esperar el estado healthy del backend.
- [ ] Abrir `http://localhost:3000` y `http://localhost:8000/docs`.
- [ ] Subir una factura en Docker, reiniciar servicios con `docker compose down` y `docker compose up`; confirmar que los datos persisten.
- [ ] Para borrar el estado Docker al terminar, ejecutar `docker compose down -v`; esto elimina lo guardado en el volumen.

- [ ] Abrir la carpeta raíz `blinka-guard` en VS Code.
- [ ] Confirmar Python 3.11: `py -3.11 --version`.
- [ ] Confirmar Node.js 20.9+: `node --version`.
- [ ] Confirmar Tesseract si se probarán imágenes: `& "$env:ProgramFiles\Tesseract-OCR\tesseract.exe" --version`.
- [ ] Desde una terminal en la raíz, instalar backend si hace falta: `.\.venv\Scripts\python.exe -m pip install -e ".\backend[dev]"`.
- [ ] Desde la raíz, iniciar API: `.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --env-file .env`.
- [ ] Confirmar `http://127.0.0.1:8000/api/v1/health` y abrir `http://127.0.0.1:8000/docs`.
- [ ] En otra terminal, entrar a `frontend`, ejecutar `pnpm install` si hace falta y `pnpm dev`.
- [ ] Confirmar que la interfaz abre en `http://localhost:3000` y muestra API conectada.

> El entorno `.venv` está en la raíz del repositorio. Ejecuta esos comandos desde la raíz; no uses `backend\.venv` ni rutas relativas a `.venv` mientras la terminal está dentro de `backend`.

## 2. Reglas de decisión y aprobaciones

- [ ] En **Pruebas locales**, registrar y evaluar una factura permitida, dentro de límites y bajo el umbral: queda `APPROVE` automáticamente.
- [ ] Evaluar una factura de proveedor no permitido: queda `BLOCK`, sin aprobación pendiente.
- [ ] Evaluar una factura por encima del umbral humano: queda `ESCALATE` y aparece en **Aprobaciones**.
- [ ] Intentar aprobar sin motivo: la API/UI lo rechaza.
- [ ] Resolver la aprobación con actor y motivo permitidos: se registra la resolución y la factura no se reevalúa como aprobación automática fuera de política.
- [ ] Probar duplicado, discrepancia de acuerdo, máximo por factura y presupuesto insuficiente: ninguno termina en `APPROVE` automático.
- [ ] Revisar **Registro de actividad** y abrir un evento: se entienden el resultado, el motivo/regla y la factura fuente sin abrir el archivo original.

## 3. Entrada de documentos

- [ ] Seleccionar varios archivos y **Procesar**: cada uno se extrae, crea y evalúa secuencialmente.
- [ ] PDF con texto y correo `.eml`: comprobar creación automática, resultado y explicación.
- [ ] Imagen PNG/JPG: confirmar OCR local con Tesseract y revisión de los campos extraídos.
- [ ] Texto `.txt`: detectar correo por sus cabeceras o chat por defecto.
- [ ] Documento ambiguo o con campos requeridos faltantes: el archivo no se crea ni evalúa y se explica el campo faltante.
- [ ] Confirmar que `APPROVE`, `BLOCK` o `ESCALATE` se muestran por archivo y quedan en Registro de actividad.

## 4. Aislamiento y seguridad de la demo

- [ ] Cargar ejemplos solo dentro de **Pruebas locales**.
- [ ] Reiniciar el espacio de pruebas tras confirmar; se vacía `backend/data/test_state.json`.
- [ ] Confirmar que los datos operativos en `backend/data/runtime_state.json` permanecen intactos.
- [ ] Confirmar que no se envían pagos ni se conectan bancos, proveedores de pago, correo u otros sistemas externos.
- [ ] Confirmar que todos los datos mostrados son ficticios.

## 5. Presentación y cierre

- [ ] Recorrer dashboard, facturas, aprobaciones, auditoría y políticas sin errores visibles.
- [ ] Probar resolución de pantalla desktop y móvil; revisar menús, botones y textos truncados.
- [ ] Capturar evidencia de una aprobación automática, un bloqueo, una escalada resuelta y un evento de auditoría explicado.
- [ ] Registrar cualquier fallo o ajuste pendiente en `docs/WORK_LOG.md`.

## Verificaciones automatizadas (opcional antes de entregar)

Desde la raíz:

```powershell
.\.venv\Scripts\python.exe -m pytest .\backend\tests -q
.\.venv\Scripts\ruff.exe check .\backend\app .\backend\tests .\backend\scripts
.\.venv\Scripts\python.exe .\backend\scripts\verify_synthetic_corpus.py
```

Desde `frontend`:

```powershell
pnpm typecheck
pnpm build
```

El verificador del corpus usa el cliente de pruebas de la API y almacenamiento temporal, y restaura el estado local de pruebas al finalizar.
