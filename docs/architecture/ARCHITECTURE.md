# Arquitectura — Cuentra MVP

**Estado:** implementada localmente · **Fecha:** 2026-10-17

## Contexto

Operador de finanzas → frontend web local → API FastAPI → motor determinista y repositorio JSON. El sistema no llama servicios externos ni inicia pagos. La carga por lote extrae, registra y evalúa automáticamente los documentos completos; la persona interviene al resolver escaladas o corregir archivos incompletos.

## Componentes

- **Frontend:** Next.js/React/TypeScript. Dashboard, facturas/carga, políticas, aprobaciones, actividad y pruebas locales.
- **API:** FastAPI versionada bajo `/api/v1`; valida modelos Pydantic y restringe CORS a orígenes locales configurados.
- **Application:** extracción local de PDF/texto/email e OCR opcional local; evaluación y reglas de presupuesto.
- **Domain:** modelos Pydantic, importes `Decimal`, outcomes `APPROVE/BLOCK/ESCALATE`, snapshots y términos de proveedores.
- **Repository:** almacenamiento JSON atómico para una sola instancia local. Un header interno de workspace selecciona estado operativo o estado de pruebas por petición.
- **Data:** `runtime_state.json` operativo; `test_state.json` sintético y separado; ambos excluidos de Git.

## Flujo de ingreso y decisión

```mermaid
sequenceDiagram
    actor U as Operador
    participant UI as Frontend
    participant API as FastAPI
    participant E as Extractor local
    participant P as Motor de políticas
    participant J as JSON local
    U->>UI: Selecciona uno o varios archivos
    UI->>API: POST /documents/extract (por archivo)
    API->>E: Detecta canal y extrae texto/campos
    E-->>UI: Campos detectados y faltantes
    UI->>UI: Detiene los incompletos; elige política por moneda
    UI->>API: POST /invoices y POST /invoices/{id}/evaluate
    API->>P: Verifica reglas deterministas
    P->>J: Guarda decisión, snapshot y auditoría
    P-->>UI: APPROVE, BLOCK o ESCALATE + explicación
```

## Persistencia y límites

Escrituras JSON temporales y reemplazo atómico; `RLock` coordina operaciones dentro de una instancia. No coordina procesos múltiples, no es base de datos productiva y no debe exponerse a Internet. Los binarios subidos se procesan en memoria y no se conservan; se almacena texto extraído con la factura. OCR de imagen requiere el ejecutable Tesseract local. No hay autenticación empresarial.

## Decisiones

- Monolito modular FastAPI: rápido para un MVP y fácil de depurar.
- JSON local: suficiente para demo de una sola instancia; SQLite queda como evolución si se requiere transacción real entre procesos.
- Frontend separado Next.js: interfaz moderna conectada por API HTTP local.
- Lógica de decisión determinista: una IA/OCR puede sugerir datos, no anular políticas.
- Los periodos de presupuesto aún no se reinician por calendario: el MVP compara contra el total aprobado conservado en el espacio local.
