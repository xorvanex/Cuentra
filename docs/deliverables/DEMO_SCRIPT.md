# Guion de demostración — Blinka Guard

**Duración sugerida:** 5–7 minutos · **Entorno:** local · **Datos:** solo ficticios

## Preparación

1. Iniciar backend y frontend desde la raíz siguiendo el README.
2. Abrir **Datos → Pruebas** y usar **Cargar datos de prueba**. Confirmar política USD.
3. Revisar que la política tiene máximo USD 20,000, presupuesto USD 15,000, umbral USD 5,000 y términos de acuerdo de empresa. No mostrar el estado operativo en la demo.
4. Tener lista la carpeta de entrega de Antigravity y el manifest. Aún está pendiente de recibir e integrar.

## Recorrido

1. **Caso normal:** cargar PDF-01, revisar proveedor/referencia/importe/moneda/vencimiento y guardar. Evaluar: debe aprobarse automáticamente con explicación de reglas.
2. **Duplicado:** cargar PDF-02 con mismos proveedor y referencia que PDF-01. Evaluar: debe bloquearse como duplicado.
3. **Proveedor no autorizado:** cargar IMG-01. El motor debe bloquear antes de aprobar.
4. **Aprobación humana:** cargar PDF-03 por encima de USD 5,000 y debajo del máximo. Debe aparecer en Aprobaciones; resolver con actor autorizado y motivo.
5. **Términos acordados:** cargar EMAIL-02. Comparar `NS-PO-902` y el importe recibido contra el término de empresa en la política; el importe distinto debe bloquearse.
6. **Explicar decisión:** abrir Registro de actividad, expandir los eventos y mostrar outcome, reason codes, texto de origen y el término de política usado.
7. **Presupuesto:** aprobar automáticamente PDF-01, EMAIL-01 y CHAT-01 (USD 4,500 en conjunto). Luego evaluar IMG-03 por USD 12,000 contra presupuesto USD 15,000; se debe bloquear por exceder el saldo.
8. **Entrada ambigua:** cargar CHAT-03. Mostrar el campo ambiguo/faltante y que la UI exige revisión antes de guardar/evaluar; nunca se rellena por conjetura.
9. Reiniciar espacio de pruebas con confirmación y confirmar que el entorno operativo mantiene su estado.

## Resultado que comunicar

Blinka Guard toma decisiones simuladas, deterministas y explicables. La persona controla la política y resuelve excepciones; no se mueve dinero. La proporción de casos correctos automáticos se medirá con el corpus una vez integrado; no reportar métricas antes de ejecutar todo el set.

