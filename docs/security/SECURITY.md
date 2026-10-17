# Seguridad y límites del prototipo

## Activos y amenazas

- Integridad de importes, políticas y decisiones.
- Separación entre documento entrante y términos contractuales controlados por la empresa.
- Posibles errores de OCR, duplicados, proveedor no permitido, presupuesto agotado, resolución humana obsoleta, destrucción accidental del estado operativo y carga de archivos inválidos.

## Controles

- Pydantic valida importes/moneda y longitudes; `Decimal` evita aritmética binaria de dinero.
- PDF, imagen, EML y TXT tienen allowlist y límite de 10 MB; los binarios se procesan en memoria y no se almacenan.
- OCR/extracción es sugerencia. Los campos necesarios se muestran para revisión; no existe autoevaluación durante el upload.
- Los términos acordados viven en `Policy.vendor_terms` y la factura solo trae referencia; la diferencia bloquea.
- Versiones/snapshots de reglas y facturas quedan en decisiones/auditoría.
- El reinicio afecta solo `test_state.json`, requiere header de pruebas, entorno desarrollo y origen local, y la UI exige confirmación.
- El JSON se escribe por archivo temporal + reemplazo atómico y operaciones dentro del proceso usan bloqueo.
- `.env`, estado JSON y temporales están excluidos de Git.

## Riesgos residuales

- No hay autenticación/identidad real; el actor de aprobador es de demo. No publicar la API.
- El almacenamiento JSON y el bloqueo son para un proceso local, no para concurrencia multi-instancia.
- Sin Tesseract en el equipo, las imágenes necesitan captura manual; OCR puede equivocarse incluso instalado.
- Sin cambio FX; una moneda distinta a la política se bloquea.
- El texto extraído se guarda localmente con la factura; solo usar fuentes ficticias. No se conserva binario.
- El reinicio local de pruebas es destructivo para la prueba, aunque aislado del estado operativo.

## Antes de producción

Reemplazar JSON por base de datos transaccional, añadir identidad/roles y autorización server-side, almacenamiento privado de documentos con retención/borrado, análisis de archivos, control de acceso multiempresa, logging/monitorización, revisión de seguridad independiente y política FX explícita si fuese necesaria. Ninguno de esos controles se declara implementado.
