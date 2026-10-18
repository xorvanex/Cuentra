# Cuentra — alcance del producto y brechas

**Estado:** alcance acordado para el MVP de Hackatón 30X  
**Fecha:** 17 de octubre de 2026

## Problema que resuelve

Los equipos de finanzas reciben cuentas de cobro y facturas por distintos canales, revisan manualmente quién cobra, cuánto, en qué moneda y cuándo vence, comparan esos datos con las reglas internas y dejan constancia de la decisión. El proceso se repite y depende de la disponibilidad de una persona.

Cuentra debe recibir una factura simulada, presentar sus datos extraídos para revisión, aplicar reglas deterministas de una empresa ficticia y recomendar una decisión: aprobar para pago, bloquear o escalar a una persona. Debe explicar cada resultado y guardar el historial para poder entender la decisión sin volver al documento de origen.

La aprobación significa **autorizada para pago** en la simulación. Cuentra no crea ni ejecuta pagos.

## Alcance del MVP

- Ingresar documentos sintéticos como PDF, imagen y texto copiado de correo o chat. Para la demo se preparará un conjunto de 12 entradas: tres por cada uno de esos cuatro formatos/canales.
- Extraer o permitir corregir antes de evaluar: referencia, proveedor/beneficiario, importe, moneda, fecha de vencimiento y, cuando el documento lo incluya, conceptos o condiciones acordadas.
- Mostrar el documento y los campos detectados; la persona confirma/corrige los datos antes de que el motor de políticas decida. Datos incompletos o extracción incierta nunca pueden terminar en aprobación automática.
- Configurar políticas de una o más empresas ficticias: proveedores permitidos, monedas admitidas, máximo por factura, presupuesto del periodo, umbral de aprobación humana y términos de proveedor/acuerdo controlados por la empresa. La demo de referencia se expresará en USD; los importes deben conservar la moneda indicada y no se comparan entre monedas sin una tasa explícita/versionada.
- Aplicar el motor determinista y devolver `APPROVE`, `BLOCK` o `ESCALATE`, con códigos de regla y explicación legible.
- Permitir que una persona resuelva una escalada con motivo obligatorio. Registrar decisiones automáticas y humanas en la auditoría.
- Ofrecer un espacio local de pruebas con datos JSON separado de los datos actuales, carga de fixtures sintéticos y reinicio con confirmación.
- Incluir casos normales y casos trampa: factura válida, duplicado, beneficiario no permitido, desviación frente a condiciones acordadas, exceso del máximo, umbral humano, presupuesto insuficiente y extracción ambigua/incompleta.

## Fuera de alcance

- Enviar dinero, crear pagos reales, conectar bancos, tarjetas o proveedores de pago.
- Procesar datos reales de clientes, empresas, proveedores o cuentas bancarias.
- Verificar identidad/KYC, fraude o cumplimiento regulatorio.
- Autenticación empresarial, roles productivos, multiempresa con aislamiento de seguridad o despliegue a producción.
- Usar un LLM como autoridad para cambiar o saltarse las reglas. Si se incorpora asistencia de IA para extraer texto, sus resultados son sugerencias revisables; la decisión final permanece en el motor determinista.
- Replicar el diseño interno de la marca de referencia. Cuentra mantiene identidad e interfaz propias.

## Seguridad e invariantes de decisión

1. Ninguna factura que infrinja una regla obligatoria puede recibir aprobación automática.
2. Una decisión humana solo puede resolver una escalada permitida por la política; no puede anular una prohibición absoluta.
3. Una factura duplicada no debe producir una segunda aprobación.
4. Una moneda no configurada o una discrepancia de importe/condiciones no se aprueba automáticamente.
5. La extracción no es una decisión: se conserva el texto extraído y los campos finales que la persona confirmó. El importe pactado procede de términos controlados por la empresa, nunca del documento entrante.
6. Cada decisión explica qué regla se aplicó, el resultado, la política y versión usadas, y su fecha. El detalle debe poder consultarse desde actividad sin abrir el correo o chat de origen.
7. El conjunto de demostración usa exclusivamente datos sintéticos.

## Estado actual frente al alcance

| Capacidad | Estado actual | Brecha |
|---|---|---|
| CRUD local de facturas y políticas | API implementada; persistencia JSON local | El editor de políticas ya está disponible en la interfaz; falta probar su flujo visual con el usuario |
| Aprobación automática, bloqueo y escalamiento | Motor determinista implementado y probado en la API | Revisar/añadir escenarios de evaluación y documentar resultados de demo |
| Aprobar o bloquear escalada con motivo | Flujo web y API implementados | Actor de demostración, sin autenticación real |
| Auditoría | API y lista de eventos implementadas | Ya se expande para explicar regla, fuente y términos de política; falta revisión visual y capturas |
| Ingreso de factura | Formulario manual y carga local PDF/imagen/EML/TXT | Revisión de campos conectada; OCR se ejecuta con Tesseract local. Archivos originales no se conservan |
| Política en USD | Moneda configurable en modelo e interfaz; acuerdos controlados por proveedor/ref | Política de pruebas y fixtures USD creados; revisar con los documentos generados por Antigravity |
| Pruebas repetibles aisladas | Zona UI y API local usan `test_state.json`; carga idempotente y reinicio con confirmación | Ejecutar recorrido con archivos sintéticos externos y conservar evidencia |
| Uso local sencillo | Instrucciones backend/frontend disponibles | Unificar guion, preparación de datos y verificación inicial |

## Próximas tareas priorizadas

### P0 — espacio local seguro de pruebas

- [x] Separar persistencia operativa y espacio JSON de pruebas (`test_state.json`).
- [x] Añadir carga idempotente de política USD y facturas sintéticas, y reinicio con confirmación desde la UI.
- [x] Limitar rutas de reinicio al modo de desarrollo y a solicitudes locales con el header del espacio de pruebas.
- [ ] Revisar con el usuario que su demo operativa sigue intacta y recorrer la zona de pruebas visualmente.

### P1 — entrada y revisión de documentos

- [x] Añadir carga local PDF, imagen, EML y TXT y un extractor sin API externa.
- [x] Mostrar texto/valores sugeridos y exigir completar campos necesarios; una ambigüedad no se convierte en dato ni decisión automática.
- [x] Los términos de compra se leen desde la política controlada por la empresa; el proveedor no valida su propio monto pactado.
- [x] Instalar/probar el OCR local de imágenes con Tesseract y los artefactos del corpus sintético.
- [ ] Incorporar el paquete sintético externo de tres casos por formato y validar sus outcomes.

### P2 — políticas y explicación visibles en la aplicación

- [x] Crear vista para consultar y editar políticas y acuerdos controlados.
- [x] Expandir auditoría para ver explicación, códigos, versiones, origen y resolución humana.
- [ ] Terminar revisión de lenguaje y estados en vistas/resumen y validar que el usuario entienda aprobación como autorización simulada, nunca pago ejecutado.

### P3 — validación y entrega

- Ejecutar matriz de casos normales y trampa desde el espacio aislado; guardar resultados y evidencia.
- Medir autonomía correcta y violaciones de política; el objetivo de violaciones aprobadas fuera de reglas es cero.
- Actualizar SRS, arquitectura, modelo de datos, plan/resultados de pruebas, seguridad, guion de demo y checklist de aceptación según el código real.
- Pulir responsive, estados vacíos/errores, accesibilidad, icono/branding, instalación desde un equipo limpio y guion de demo.

## Guion mínimo de aceptación

1. Cargar datos sintéticos y una política USD de la empresa ficticia.
2. Ingresar un documento válido permitido bajo el umbral; confirmar campos y obtener aprobación automática explicada.
3. Ingresar un duplicado, proveedor nuevo y factura que exceda las reglas; verificar bloqueo o escalamiento según política.
4. Resolver una escalada con motivo y verificar que actividad muestre la regla, resultado y actor.
5. Ingresar un documento con importe/moneda/beneficiario ambiguos; confirmar que solicita revisión y no aprueba.
6. Reiniciar el espacio de pruebas y verificar que los datos operativos previos permanecen intactos.

