# Checklist de aceptación — Hackatón 30X

| ID | Criterio | Evidencia | Estado |
|---|---|---|---|
| A-01 | Frontend y backend arrancan localmente con instrucciones reproducibles. | README + ejecución en equipo limpio | Documentación actualizada; confirmar arranque en otra máquina |
| A-02 | Facturas sintéticas entran por PDF, imagen, correo y chat. | 12 archivos + manifest + recorrido UI | Verificador local cubre extracción y resultados esperados; falta recorrido manual de UI para aceptación final |
| A-03 | Persona revisa/corrige campos extraídos antes de evaluación. | Captura del formulario con un campo ambiguo | Implementado; falta evidencia visual |
| A-04 | Caso válido bajo umbral y con presupuesto se aprueba automáticamente. | Decisión + reason codes + evento | Verificado con corpus local |
| A-05 | Proveedor no permitido, duplicado, límite, acuerdo discrepante o presupuesto excedido no se aprueban. | Resultados por escenario | Verificado con corpus local |
| A-06 | Importe que requiere autorización se escala y solo actor permitido resuelve con motivo. | Approval + evento de auditoría | API/UI implementadas y API probada; captura pendiente |
| A-07 | Una decisión se explica sin abrir documento original. | Evento expandible con motivo, regla, fuente y snapshot | Implementado; revisión visual pendiente |
| A-08 | Autonomía correcta se calcula con casos esperados del manifest. | Tabla de outcome esperado/real | El verificador compara extracción/outcomes y reporta fallos; métricas de autonomía agregadas pendientes |
| A-09 | Cero pagos fuera de reglas quedan aprobados. | Suite de reglas + comparación de outcomes | Verificado con corpus local; sin ejecución de pagos reales |
| A-10 | Reinicio de test preserva datos operativos. | Test API de aislamiento + recorrido UI | API probado; confirmar manualmente con estado actual |
| A-11 | No se ejecutan pagos ni se usan datos reales. | README, dataset ficticio y demo | Cumple por alcance y corpus ficticio |
| A-12 | Documentación técnica y entrega está lista y concuerda con código. | README, alcance, arquitectura, seguridad, demo, checklist y registro | Actualizada con el flujo automatizado; falta revisión final de la demo |
| A-13 | Interfaz legible, responsive y con branding propio. | Capturas en desktop/móvil | Ajustes iniciales integrados; revisión final pendiente |
| A-14 | Carga por lote extrae, crea y evalúa automáticamente cada archivo completo. | Resultado por archivo + evento en auditoría | Integrado; pendiente recorrido final en UI |
| A-15 | Documentos incompletos se detienen sin crear una decisión insegura. | Mensaje con campos faltantes | Integrado; pendiente recorrido final |
| A-16 | Arranque de demo con Docker Compose en un comando. | `docker compose up --build` | Configuración añadida; pendiente construir en equipo con Docker disponible |

