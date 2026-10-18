# Registro de trabajo compartido

## 2026-10-18 — Cambio de identidad a Cuentra

- Se sustituyó la identidad visible del producto por **Cuentra** en la interfaz, metadatos, documentación y configuración versionada.
- Se creó un símbolo de marca original en SVG, aplicado al menú lateral y al favicon.
- Se renombraron los encabezados internos del espacio de trabajo (`X-Cuentra-Workspace`) y las variables de configuración de almacenamiento y pruebas locales.
- Se mantuvo el identificador físico anterior del volumen Docker para conservar los registros locales existentes; su nombre lógico en Compose ahora es `cuentra-data`.
- Se adaptó el comando del contenedor backend para escuchar `PORT` cuando lo proporciona el hosting, manteniendo `8000` como valor por defecto local.
- Se conservó el historial del proyecto y sus rutas de trabajo; la carpeta local y el repositorio Git mantienen por ahora sus nombres técnicos existentes.

## 2026-10-17 — README preparado para evaluación

- Se reescribió el README principal como guía de entrada para evaluadores: resumen del reto, diagrama de flujo, inicio Docker en un comando, URLs, demo con facturas sintéticas, dependencias, OCR dentro del contenedor, persistencia, solución inicial de problemas y límites del prototipo.
- Se añadieron insignias públicas de tecnologías; no forman parte del runtime ni condicionan la ejecución de la aplicación.
- Se aclaró que el primer build necesita Internet para descargar imágenes y dependencias, pero el equipo anfitrión solo necesita Docker Desktop para ejecutar la demo.
- Se contrastaron requisitos, nombres de carpetas y comandos con `docker-compose.yml`, los Dockerfiles, los archivos de entorno de ejemplo y los READMEs existentes. No se ejecutaron pruebas de la aplicación en esta edición documental.

## 2026-10-17 — Limpieza final para entrega

- Se redujo `docs/` a alcance del producto, arquitectura, seguridad y registro compartido; se retiraron checklist y guion de demo redundantes con los README y el flujo ya descrito en la app.
- Se actualizaron referencias de continuidad para que las siguientes personas/agentes usen solo documentación vigente.
- Se retiraron cachés reproducibles del repositorio (`.pytest_cache`, `.ruff_cache`, `__pycache__`, `.next` y `.pnpm-store`). Se conservaron `.venv` y `frontend/node_modules` como dependencias instaladas, los estados JSON locales, archivos de entorno, corpus sintético y configuraciones de ejecución.
- Se validó `docker compose config` y se construyeron ambas imágenes (`docker compose build`). Luego se hizo un smoke test con un proyecto/volumen aislado: API health `ok`, frontend HTTP `200`; al terminar se retiraron esos contenedores, red y volumen temporales. El volumen del proyecto normal no se tocó.
- `.pytest_cache` de backend permanece porque Windows denegó acceso incluso al intentar borrarlo; no contiene datos de usuario y queda ignorado por Git. Las demás cachés objetivo sí se retiraron.

## 2026-10-17 — Automatización de carga y empaquetado Docker

- En Facturas se añadió carga múltiple secuencial: detección local, extracción por archivo, validación de campos obligatorios, creación y evaluación automática con la política de la moneda extraída. Si falta información o política compatible, ese archivo no se crea y se indica el motivo. Las excepciones visibles van a Aprobaciones.
- `.txt` con cabeceras From/To/Subject se etiqueta como correo; otros `.txt` se clasifican como chat. `.eml`, PDF e imágenes se detectan por extensión.
- Se añadió ayuda contextual clicable a Facturas, Políticas, Aprobaciones, Registro de actividad y Pruebas locales. Se explicó que el presupuesto compara el acumulado guardado en el espacio y no se reinicia por mes.
- El menú móvil ahora usa el mismo botón hamburguesa para abrir/cerrar y se eliminó el cierre duplicado junto al logo. El selector de orden de auditoría ahora ordena realmente por fecha.
- Se añadieron Dockerfiles multi-stage, Docker Compose y modo standalone de Next.js. Docker incluye OCR inglés/español, limita los puertos a localhost y persiste los JSON en un volumen.
- Pendiente verificación: typecheck/build de frontend, suite backend, validar Docker Compose y recorrido manual en navegador.

## 2026-10-17 — Checklist de verificación para la demo

- Se añadió `docs/VERIFICATION_CHECKLIST.md` con pasos de arranque desde VS Code, reglas/API, extracción local de documentos, aislamiento de pruebas, revisión visual y comandos automatizados.
- Se aclaró que `.venv` está en la raíz y los comandos de backend deben ejecutarse desde la raíz del proyecto.
- No hay agente/LLM remoto, base de datos gestionada, API de terceros, banco ni proveedor de pagos en runtime. Tesseract es un motor nativo local opcional para OCR de imágenes; descargar e instalar las dependencias durante la preparación sí puede requerir Internet.

Este archivo permite que otra persona o agente retome el trabajo sin repetir la exploración. Añadir una entrada por cambio con fecha, alcance, archivos y pendientes. No declarar pruebas ejecutadas si no se corrieron.

## 2026-10-17 — Estructura inicial del backend

### Contexto consultado

- Se revisó el plan maestro y los documentos de arquitectura, modelo de datos y documentación del proyecto en la carpeta starter.
- La guía propone un monolito modular, datos sintéticos, API, dominio, evaluación determinista, repositorios y persistencia local SQLite.
- La carpeta destino del proyecto estaba casi vacía: contenía únicamente `LICENSE`.

### Cambios realizados

- Se inició el backend con FastAPI y Python 3.11 o superior.
- Se crearon módulos base para API, configuración, aplicación, dominio, políticas, repositorios y persistencia.
- Se añadió `GET /api/v1/health` y la entrada `app.main:app`.
- Se añadieron metadatos/dependencias del proyecto y dependencias opcionales de desarrollo en `backend/pyproject.toml`.
- Se añadieron README de raíz y backend, `.gitignore` y `.env.example`.
- Se anotó que SQLite está previsto, pero todavía no se conectó ni se crearon tablas.

### Pendiente para continuar

1. Se confirmó **Cuentra** como identidad visible del producto. La ruta local y el slug remoto del repositorio conservan sus nombres técnicos actuales.
2. Implementar entidades y tipos monetarios exactos (sin `float`) para factura, proveedor, política y decisión.
3. Implementar evaluador determinista fail-closed con códigos de motivo e idempotencia.
4. Añadir persistencia SQLite y registro de auditoría transaccional.
5. Crear fixtures exclusivamente sintéticos y pruebas para los casos críticos del plan.
6. Actualizar SRS, arquitectura, modelo de datos y README para reflejar solo lo implementado.

### Verificación

- En esta primera sesión solo se creó la estructura; no se instalaron dependencias ni se ejecutaron pruebas.

## 2026-10-17 — API funcional con almacenamiento en memoria

### Cambios realizados

- Se implementó CRUD HTTP para facturas y políticas.
- Se implementó evaluación determinista con resultados `APPROVE`, `BLOCK` y `ESCALATE`, códigos de motivo y explicación en español.
- Se añadieron reglas de moneda, proveedor permitido, máximo por factura, duplicados, presupuesto y umbral de aprobación humana.
- Se usa `Decimal` para importes, normalización de códigos de moneda, IDs UUID y validación de entradas con Pydantic.
- Se agregó consulta del historial de decisiones. Repetir la evaluación para la misma versión de política devuelve la decisión previa.
- Se serializa cada evaluación con un bloqueo local para mantener juntas la comprobación del presupuesto y el registro de decisión durante el proceso.
- Se eliminaron los supuestos de una URL de base de datos; no se configuró una base de datos ni una integración externa.
- Se actualizaron las instrucciones de raíz y backend, y se añadieron pruebas de API.

### Verificación

- Se creó `backend/.venv` con el Python auxiliar disponible en esta sesión (3.12.14). El ejecutable local `py` no encontró una instalación de Python 3.11, así que la instalación no se hizo sobre el Python personal que indicó el usuario. El proyecto declara compatibilidad con Python 3.11 o superior.
- Se instalaron las dependencias del proyecto y extras de desarrollo en el entorno virtual local.
- `python -m pytest -q`: 2 pruebas aprobadas; cubren CRUD básico, normalización de moneda, evaluación, explicación, historial y repetición idempotente.
- `ruff check app tests`: correcto tras ordenar imports.
- pytest muestra una advertencia deprecada de Starlette respecto al uso de `httpx` con su `TestClient`; las pruebas pasan y la advertencia no afecta el servidor.

### Límites conocidos

- El repositorio es volátil: reiniciar el servidor borra facturas, políticas e historial.
- El flujo de aprobación humana y autenticación no está implementado.
- No se conserva un evento de auditoría de cada operación CRUD y el borrado elimina datos del store; el historial de decisiones es solo temporal.
- La sesión no detectó Python 3.11 instalado mediante `py`; la validación se hizo con Python 3.12.14 auxiliar. El usuario puede instalar en su 3.11 usando los mismos comandos, pues `requires-python` es `>=3.11`.
- La instalación de paquetes necesitó permitir acceso a PyPI; no se requiere ningún servicio remoto durante la ejecución de la API.

## 2026-10-17 — Entorno virtual en la raíz

- Se creó `.venv` en la raíz del repositorio y se reinstaló allí el backend editable con extras de desarrollo.
- Se actualizaron ambos README con comandos desde la raíz y ejecución directa del Python del entorno, sin requerir activación.
- Se confirmó desde la raíz: 2 pruebas aprobadas, Ruff limpio, aplicación importable y arranque real de Uvicorn; `GET /api/v1/health` respondió `{"status":"ok"}`.
- Se eliminó el entorno virtual anidado `backend/.venv` para dejar una única ubicación de entorno en la raíz.
- No se detectó Python 3.11 mediante `py -0p`; este entorno raíz usa el Python auxiliar 3.12.14. En el equipo del usuario, `py -3.11 -m venv .venv` seleccionará su Python 3.11 instalado.

## 2026-10-17 — Comando para terminal ubicada en backend

- Se aclaró en `backend/README.md` que el prompt del usuario estaba dentro de `backend`, por lo que `.venv` debe referenciarse como `..\.venv`.
- Se verificó desde esa carpeta que Uvicorn arranca y `GET /api/v1/health` responde correctamente.

## 2026-10-17 — Respuesta de bienvenida en la raíz de la API

- Se añadió `GET /` con el estado del servicio y rutas a `/api/v1/health` y `/docs`, para que abrir la URL base no produzca un 404 sin orientación.
- Se añadió una prueba para esta respuesta y se documentó la ruta.

## 2026-10-17 — Backend local listo para recorrido de demo

### Implementado

- Se sustituyó el almacenamiento volátil por `backend/data/runtime_state.json`, con escritura temporal + reemplazo atómico, carga al iniciar y serialización de escrituras por bloqueo local.
- Se agregaron snapshots de factura y política en cada decisión para conservar los datos evaluados y la versión de reglas.
- Las operaciones CRUD emiten eventos de auditoría; `GET /api/v1/audit-events` solo permite lectura. Las eliminaciones son lógicas y conservan decisiones.
- Una evaluación `ESCALATE` crea una solicitud pendiente. `GET /api/v1/approvals` consulta pendientes y `POST /api/v1/approvals/{id}/resolve` registra aprobación o rechazo, actor y motivo.
- La resolución solo permite aprobadores listados en la política, verifica que factura/política no hayan cambiado y vuelve a comprobar el presupuesto. No hay identidad autenticada; el actor del body no es una prueba de identidad.
- Las facturas aprobadas no se pueden editar. Los cambios o borrados de entradas cancelan solicitudes de aprobación obsoletas.
- Se añadieron fixtures sintéticos de tres resultados y `backend/scripts/load_demo_data.py`, idempotente para los registros existentes.
- Se actualizaron README y `.gitignore`; el estado operativo JSON y los archivos temporales no se publican en Git.

### Verificación de este avance

- `pytest`: 7 pruebas aprobadas; cubren CRUD, persistencia/reinicio, reglas, duplicados, idempotencia, auditoría, resolución de aprobación y rechazo, actor no autorizado, aprobación obsoleta y control de presupuesto.
- `ruff check backend/app backend/tests backend/scripts`: sin errores.
- Se arrancó Uvicorn desde `backend`, se cargaron los fixtures dos veces y se confirmó que no duplicó registros.
- La demo produjo `APPROVE`, `BLOCK` y `ESCALATE`; se aprobó el escalado y se comprobaron los eventos de auditoría.
- Se reinició el servidor y facturas, solicitud resuelta e historial de decisión se recuperaron desde JSON.
- Después se limpió el estado local generado durante la verificación y se dejó cargada la política + 3 facturas sin evaluar (`0` decisiones), lista para repetir la demo desde el inicio.

### Límites restantes

- Persistencia JSON y lock solo coordinan una instancia de proceso local; no sirven para varias réplicas ni acceso concurrente entre procesos.
- La lista de aprobadores no sustituye login, autenticación ni autorización real. Mantener la API local y usar datos ficticios.
- El `period_budget` funciona como límite acumulado de aprobaciones para esa política; no hay ciclo automático de reinicio mensual.
- Se confirmó el nombre original del producto; el export anterior contenía restos de otra identidad, corregidos al integrar el frontend.

## 2026-10-17 — Verificación HTTP del flujo de aprobación

- Se probó el servidor real por HTTP en un estado JSON temporal aislado, sin modificar los fixtures operativos preparados para la demo.
- `POST /api/v1/invoices` creó la factura y `GET /api/v1/approvals` siguió vacío.
- `POST /api/v1/invoices/{id}/evaluate?policy_id={id}` devolvió `ESCALATE` y generó una aprobación pendiente.
- `POST /api/v1/approvals/{approval_id}/resolve` con actor autorizado la resolvió como `APPROVED`; el historial quedó `ESCALATE → APPROVE` y se generaron eventos de auditoría.
- Resultado: el recorrido de aprobación funciona. La aprobación se crea durante la evaluación, no al crear la factura.

## 2026-10-17 — Revisión inicial de referencias del frontend

- Se revisó la web pública de referencia: presenta conceptos de cuentas, tarjetas, pagos y back office; la página pública no expone el HTML de la aplicación autenticada.
- Se inventariaron los ZIP de la carpeta starter y sus ejemplos de dashboard; estaban íntegros e incluían documentos de diseño y un archivo de exportación del frontend.
- Los archivos `.fig` son documentos de diseño de Figma, no proyectos HTML exportados. El archivo Sketch incluye páginas “Cover” y “Assets”; su vista previa puede servir como referencia visual.
- El frontend exportado usa Next.js/React y contiene `lib/api.ts`, pero el componente principal no lo importa: facturas, aprobaciones y auditoría están en datos demo estáticos, y las acciones de aprobar/rechazar solo cambian estado local.
- Quedaban inconsistencias de marca en el export: contenido heredado de otro nombre, un avatar de muestra y datos ficticios en EUR. Se corrigieron al integrar el frontend.
- No se extrajeron archivos sobre la raíz del proyecto ni se modificó código del frontend; se inspeccionaron los ZIP sin alterar sus contenidos.

## 2026-10-17 — Frontend integrado con el backend

- Se integró el export del frontend como aplicación separada en `frontend/`, conservando Next.js, React y TypeScript. Se eliminaron el cliente de analytics, componentes del export no usados, mocks visuales y la opción que ignoraba errores TypeScript.
- Se separaron el shell/navegación, resumen, registro y detalle de facturas, cola/resolución de aprobaciones, auditoría, cliente HTTP tipado, carga de datos y formatos locales.
- La UI consulta health, facturas, políticas, decisiones, aprobaciones (incluido el historial) y eventos de auditoría reales. Permite registrar facturas, evaluar con la política elegida y resolver escaladas con motivo. No sustituye errores de API por datos ficticios.
- Se añadió CORS restringido a `localhost:3000` y `127.0.0.1:3000` para el frontend de desarrollo. El origen puede configurarse mediante `CORS_ORIGINS`.
- Se normalizaron nombres/estados a Cuentra y se documentaron comandos para levantar ambas aplicaciones.
- Dependencias frontend instaladas con pnpm 11.25.0; se añadió `.env.local.example`, ignorado el entorno local y conservado el lockfile.

### Verificación

- `pnpm typecheck`: correcto.
- `pnpm build`: correcto, Next.js prerenderiza la ruta principal.
- Smoke test visual/API en navegador contra un servidor FastAPI con estado JSON temporal aislado: cargó facturas y políticas reales; desde la UI se evaluó `DEMO-ESCALATE-001`, se creó la solicitud, se aprobó con motivo y el estado/auditoría se actualizaron. Se observó el preflight CORS `OPTIONS` y el `POST` de resolución respondieron `200`.
- Los datos temporales se usaron solo para esta verificación; no se tocaron los fixtures operativos de la demo.
- Para entregar una vista utilizable, quedaron iniciados Uvicorn en `127.0.0.1:8000` y Next.js en `127.0.0.1:3000`; se confirmó que la interfaz cargó por lectura el estado operativo existente.

## 2026-10-17 — Revisión de navegación y flujo de demo

- El recorrido reportado confirmó que una factura de COP 300.000 se aprueba automáticamente por quedar bajo el umbral humano de COP 1.500.000; una factura de COP 2.500.000 escala a revisión, aparece en Aprobaciones y se resuelve con motivo. Este comportamiento coincide con la política activa.
- Se hicieron funcionales los accesos del espacio de trabajo y de la ruta “Operaciones”: ambos llevan al Resumen. La página seleccionada queda como indicador de ubicación.
- Se reforzaron los controles responsive del menú con estado expandido accesible y alternancia al pulsar el botón de menú; el botón X y la capa exterior cierran el panel, y navegar desde el panel también lo cierra.
- Se añadieron estados de foco/hover para los nuevos controles interactivos.
- Verificación pendiente en la sesión del usuario con la ventana responsive; no se iniciaron ni detuvieron servidores durante esta revisión.

## 2026-10-17 — Alcance del producto y brechas frente al reto

- Se revisó el plan maestro inicial en la carpeta starter y se contrastó con las rutas/API, formularios, motor determinista, auditoría y persistencia actuales.
- Se añadió `docs/PRODUCT_SCOPE.md` con el problema, alcance/exclusiones del reto, invariantes de seguridad, brechas observadas y backlog priorizado.
- El alcance ahora contempla como siguiente iteración: zona local de pruebas aislada del JSON operativo, fixtures con 3 PDFs + 3 imágenes + 3 textos de correo + 3 textos de chat, confirmación humana de campos extraídos, configuración visible de políticas USD, detalle explicable de auditoría y evidencia de aceptación.
- No se modificó ni reinició `backend/data/runtime_state.json`; no se implementaron todavía carga de documentos, OCR ni controles de reinicio. Esos trabajos quedan priorizados antes de la entrega.

## 2026-10-17 — Preparación de corpus Antigravity y avance del MVP

- Se creó `docs/ANTIGRAVITY_ASSET_BRIEF.md` para producir 12 fuentes sintéticas (3 PDF, 3 imágenes, 3 EML/correo, 3 TXT/chat), con resultados esperados, nombres exactos, política USD, archivo independiente de política/acuerdos, criterios de privacidad y orden de evaluación de presupuesto.
- Se implementó el selector de espacios operativo/pruebas. El header `X-Cuentra-Workspace: test` dirige cada petición al JSON aislado `backend/data/test_state.json`; solo se expone en desarrollo local. La zona de pruebas carga idempotentemente 3 facturas y política USD, y reinicia con confirmación, registrando el reinicio en su propia auditoría.
- Se implementó `/documents/extract`: PDF con texto seleccionable, `.txt`, `.eml` y OCR local opcional de PNG/JPG. Limita archivos a 10 MB, no guarda binarios, presenta advertencias/campos faltantes y nunca aprueba desde la extracción. `pytesseract` quedó instalado como dependencia Python; el ejecutable Tesseract no está presente en esta máquina, por lo que el OCR real de imagen sigue pendiente de instalar/verificar.
- Se añadieron `agreement_reference` y procedencia/texto de fuente a facturas. Los importes pactados viven en `Policy.vendor_terms`, controlada desde la vista Políticas; una discrepancia, referencia desconocida o referencia faltante para un proveedor con términos bloquea la evaluación. Así el documento entrante no puede afirmar su propio importe contractual.
- Se agregó editor UI de políticas/términos, expansión de actividad para explicar decisiones y acceso al texto extraído, y la pantalla de pruebas aisladas.
- Se escribieron SRS, arquitectura, modelo de datos, plan/resultados de pruebas, seguridad, ADR, guion de demo y checklist de aceptación; el README enlaza los entregables. El estado de integración del corpus y OCR está marcado pendiente, no como completado.
- `pytest backend/tests`: 14 aprobadas. `ruff check backend/app backend/tests`: correcto. `pnpm typecheck` y `pnpm build`: correctos tras los cambios del panel de políticas, auditoría y espacio de prueba. Advertencia existente deprecación Starlette/httpx en TestClient; no afecta las 14 aprobaciones.
- No se iniciaron servidores ni se modificó el JSON operativo actual. Los archivos fuente del corpus de Antigravity aún deben ser generados, recibidos e integrados.

## 2026-10-17 — Recepción y auditoría del corpus sintético

- Se recibió `synthetic-invoices/` generado por Antigravity: 12 fuentes (3 PDF, 3 PNG, 3 EML y 3 TXT), `manifest.json`, política USD y README.
- Se ejecutó una comprobación local de las 9 fuentes textuales con el extractor. Referencia, importe, moneda y vencimiento se extrajeron; CHAT-03 conservó importe/moneda faltantes como se esperaba. Se verificó que las 3 imágenes sean PNG RGB de 1000×1300 px. OCR sigue sin verificarse porque falta el ejecutable nativo Tesseract.
- Se detectó que CHAT-01 usaba Pacific Ledger Support LLC sin la referencia contractual obligatoria; eso habría producido `AGREEMENT_REFERENCE_MISSING` y quebrado la secuencia de presupuesto. Se cambió el proveedor sintético del chat a Andes Field Services LLC y se sincronizaron `manifest.json` y `README.md`.
- La salida de consola de esa comprobación se interpretó inicialmente como texto corrupto; la inspección de código Unicode confirmó U+00ED (`í`) correctamente extraído. No hizo falta normalizar esos nombres. La validación completa del corpus se registra en la entrada posterior.

## 2026-10-17 — Limpieza, OCR e integración del corpus

### Organización y documentación

- Se reemplazó el `requirements.txt` raíz que contenía un volcado de paquetes ajenos al proyecto por una referencia a `backend/pyproject.toml`, que queda como fuente única de dependencias.
- Se actualizaron README raíz, backend y frontend con requisitos, comandos de arranque desde VS Code, carga/revisión documental, espacios JSON, corpus y verificaciones.
- Se creó `AGENTS.md` con contexto del producto, arquitectura, invariantes de seguridad y pasos de continuidad. Conserva explícitamente `runtime_state.json` y `test_state.json`.
- Se eliminaron cachés/artefactos reproducibles: `.pytest_cache`, `.ruff_cache`, `__pycache__`, `backend/*.egg-info`, `frontend/.next` y `frontend/tsconfig.tsbuildinfo`. Se conservaron `.venv`, `frontend/node_modules`, `.pnpm-store`, configuraciones locales y JSON de estado para mantener el proyecto ejecutable. No se encontró una carpeta Rust dentro del proyecto.
- `.gitignore` cubre la caché Ruff raíz y los archivos TypeScript de compilación.

### Ingreso de documentos y Tesseract

- Se instaló Tesseract OCR 5.4.0.20240606 en Windows desde el lanzamiento de UB Mannheim en GitHub. El SHA-256 del instalador se comparó con el manifiesto de Microsoft; la firma Authenticode identifica a Universität Mannheim pero Windows reporta el certificado vencido.
- El backend detecta `C:\Program Files\Tesseract-OCR\tesseract.exe` en Windows; también admite `TESSERACT_CMD`, `TESSERACT_LANG` y `TESSERACT_TESSDATA_DIR`. El modelo presente es `eng`; etiquetas y campos de factura del corpus se reconocen.
- Se reforzó la separación de campos cuando OCR coloca dos etiquetas en una misma línea (por ejemplo, proveedor + cliente o referencia + atención). El flujo de UI existente deja revisar/corregir datos y luego guardar/evaluar; la extracción nunca decide por sí sola.
- CHAT-01 se ajustó a Andes Field Services LLC y se sincronizó en el manifiesto/README/brief porque Pacific Ledger Support tiene términos configurados y exigiría referencia de acuerdo.
- Se añadió `backend/scripts/verify_synthetic_corpus.py`. Llama a los endpoints de extracción, creación y evaluación con `TestClient`, prepara casos en un JSON temporal, sigue el orden de presupuesto y restaura el store de pruebas al finalizar.

### Verificación

- `pytest backend/tests`: 14 aprobadas. Una advertencia de compatibilidad de Starlette/httpx permanece.
- Ruff en `backend/app`, `backend/tests` y `backend/scripts`: correcto.
- Verificación por API del corpus: **12/12** resultados esperados; cubre PDF, EML, TXT y OCR PNG, duplicado, proveedor, términos, máximo, presupuesto, escaladas y CHAT-03 manual. Se confirmó que los datos quedan en un store temporal y se restauran los estados JSON locales.
- No se iniciaron servidores ni se ejecutó build de Next.js en esta sesión. No se cambió código del frontend; se mantuvo su `node_modules` local para que siga ejecutable.
- Pendiente para cierre: recorrer manualmente en navegador los 12 documentos dentro del workspace de pruebas y capturar evidencia visual de aceptación.

# 2026-10-18 — Despliegue Railway y API privada

- Se configuró el proyecto Railway `Cuentra` y el servicio `cuentra-api` conectado a `xorvanex/blinka-guard`, rama `main`, usando `/backend/Dockerfile`.
- Se montó `cuentra-api-volume` en `/app/backend/data` y se configuró `RAILWAY_RUN_UID=0` para permitir la escritura en el volumen montado por Railway.
- El backend se construyó con Python 3.11 y Tesseract inglés/español; Railway confirmó que pasó `/api/v1/health`. La API sigue privada.
- Se creó el servicio `cuentra-web`, conectado a la misma rama, con raíz `/frontend` y Dockerfile `/frontend/Dockerfile`.
- Para evitar publicar una API sin autenticación, el frontend expone una ruta proxy de Next.js que manda `/api/v1/*` hacia `CUENTRA_API_ORIGIN` en tiempo de ejecución. Railway debe resolver ese origen mediante `${{cuentra-api.RAILWAY_PRIVATE_DOMAIN}}:8000`, y el cliente público debe apuntar a `/api/v1`.
- Actualizados los README y documentos de arquitectura/seguridad para indicar los ajustes de Railway y el riesgo residual de una demo pública sin autenticación. Usar solo datos sintéticos.
- Railway: dominio público del frontend `https://cuentra-web-production-a24b.up.railway.app`, con target port `8080`; backend sin dominio público.
- Se detectó que la reescritura configurada no se estaba aplicando al despliegue y el cliente recibía 404. Se cambió a una route handler proxy para evaluar `CUENTRA_API_ORIGIN` en runtime.
- Los logs confirmaron que FastAPI escucha en el puerto `8080`, no `8000`; se actualizó `CUENTRA_API_ORIGIN` a `http://${{cuentra-api.RAILWAY_PRIVATE_DOMAIN}}:8080` en `cuentra-web` y se aplicó el cambio.
- Verificación pública: `/api/v1/health` devolvió `{"status":"ok"}` por medio del proxy; la página principal confirmó `API conectada` y `API en línea`. El dominio previo `cuentra-web-production.up.railway.app` sigue configurado con target port 3000 y no debe compartirse; usar el dominio `...-a24b`.
- Commit `d6d94fb fix: proxy Railway API calls at runtime` subido a `origin/main`. Los README se actualizaron con la URL y el puerto. No generar dominio público para `cuentra-api`.
