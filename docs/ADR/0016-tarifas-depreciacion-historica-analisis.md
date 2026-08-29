# ADR 0016 — Tarifas y depreciación histórica: análisis, sin implementar

**Fecha:** 2026-08-30
**Estado:** Análisis — decisión de si abordarlo y cuándo, pendiente del
usuario. Ninguna parte de este documento se ha implementado.

## Contexto

`worklog`, `comisiones` y `commission_rates`/`rates` (ver `schema.sql`) no
guardan nunca el importe ni la tarifa aplicada en el propio movimiento.
`rateCalc.js` (`computeRateTotal`) recalcula el total **en cada render**,
buscando en vivo la fila de `rates`/`commission_rates` cuya escuela+curso
coincida con la del movimiento (`ratesTable.rows.find(r => r.school ===
e.school && r.activity === e.activity)`). `colleague_payments` es la
excepción: ese sí guarda `amount` directamente, sin depender de ninguna
tarifa — no le afecta nada de este análisis.

**Consecuencia real, no hipotética:** editar una tarifa ya existente desde
Tarifas (`RatesTab.jsx` ya soporta "Editar", no solo "Nueva tarifa") cambia
retroactivamente el importe mostrado de **todo** movimiento pasado que
coincidiera con esa escuela+curso — Mi trabajo, Home y Resumen recalculan
sobre la marcha. Si el instructor sube el precio de "Open Water" en PADI
Cozumel hoy, los cursos de ese tipo impartidos el mes pasado cambian de
importe en la app sin que nadie los haya tocado. Borrar una tarifa tiene el
mismo efecto en sentido contrario: los movimientos que dependían de ella
quedan sin tarifa que los resuelva.

Esto es un problema de integridad de datos financieros, no una
particularidad menor: ningún sistema de facturación/contabilidad real deja
que el precio histórico de una venta cambie porque la lista de precios
cambió después (una factura de enero no cambia de importe si el precio de
lista sube en marzo).

## Opciones consideradas

### A. Snapshot del importe en el propio movimiento (estándar de facturación)

Al crear un `worklog`/`comisiones`, guardar la tarifa resuelta en ese
momento (columna `rate` o `total`) en la propia fila, igual que ya hace
`colleague_payments` con `amount`. El cálculo deja de depender de que la
tarifa original siga existiendo o no haya cambiado — es exactamente el
patrón que usa cualquier sistema de facturación/POS/e-commerce (una línea
de pedido guarda el precio unitario en el momento de la venta, no una
referencia viva al catálogo de precios).

- **A favor:** es el estándar de la industria para cualquier registro
  transaccional/financiero — un movimiento pasado es un hecho, no debería
  cambiar de valor solo porque el presente cambió. Modelo mental simple:
  "¿cuánto vale este movimiento?" tiene una única respuesta para siempre.
  Cambio de esquema pequeño (una columna nueva por tabla), migración de
  backfill sencilla (calcular y guardar el total actual de las filas
  existentes, una sola vez).
- **En contra:** requiere migración de esquema (aunque incremental y de
  bajo riesgo) y decidir qué pasa si el usuario edita people/fecha de un
  movimiento ya creado — la respuesta natural es recalcular con la tarifa
  ya guardada en esa fila, nunca volver a buscar en el catálogo vivo.

### B. Tarifas versionadas / vigencia temporal (activa/retirada/histórica)

Cada tarifa pasa a tener validez temporal (`valid_from`/`valid_until` o
estado activa/retirada), y el cálculo busca "la tarifa vigente en la fecha
del movimiento" en vez de "la única tarifa de esa escuela+curso hoy".
"Editar" una tarifa deja de mutar la fila existente — crea una nueva
versión y retira la anterior.

- **A favor:** más potente que A — permite recalcular correctamente desde
  cero en cualquier momento (auditoría, migración de datos), y modela de
  verdad el caso de negocio real de "el precio de este curso subió en
  julio" sin depender de que cada movimiento ya llevara su propio
  snapshot desde el principio.
- **En contra:** complejidad real y desproporcionada para el tamaño actual
  del negocio — instructor freelance individual, sin obligación de
  auditoría financiera externa, sin necesidad hoy de recalcular histórico
  desde cero. Requiere: modelo de datos con varias filas por escuela+curso,
  lógica de consulta temporal (elegir la vigente en cada fecha), y una UI
  de Tarifas que ya no sea "editar en la misma hoja" sino "retirar y crear
  versión nueva" — un cambio de flujo visible para el usuario sin que hoy
  exista una necesidad de negocio que lo justifique.

### C. Statu quo (no tocar nada)

Mantener el cálculo en vivo tal cual. Simple, pero dejamos activo el bug
de integridad ya descrito — no es aceptable mantenerlo indefinidamente en
una app cuyo propósito es llevar cuentas de ingresos reales.

## Recomendación

**A, no B**, y no implementarlo todavía sin decisión explícita del
usuario (este bloque es solo análisis). Snapshot del importe en el
movimiento resuelve el problema de integridad real (un movimiento pasado
no debe cambiar de valor) con la complejidad mínima proporcional al
tamaño y necesidades actuales de Ocean Flow. La versión con vigencia
temporal (B) es la solución "más completa" en abstracto, pero construir
esa complejidad antes de que exista una necesidad de negocio real
(p. ej. necesitar reconstruir un histórico de precios, o programar una
subida de precio con fecha futura) sería exactamente el tipo de
sobreingeniería que este proyecto evita a propósito (ver
`docs/ADR/0006` y las reglas de trabajo de `CLAUDE.md`).

## Relación con ADR-0003 (`eliminar payment_type`)

Ambas migraciones tocan el mismo cálculo (`computeRateTotal`) y las
mismas tablas (`worklog`/`comisiones`). Si en el futuro se aprueban las
dos, el orden razonable es primero ADR-0003 (`importe = tarifa ×
personas`, sin `payment_type`) y después esta — snapshotear un cálculo
ya simplificado es menos trabajo que snapshotear el actual y tener que
tocarlo otra vez enseguida.

## Migración (boceto, no aprobado ni implementado)

1. Añadir `rate numeric` a `worklog` y `comisiones` (nullable durante la
   migración).
2. Backfill: para cada fila existente, calcular su total actual con la
   lógica de hoy y guardarlo — acepta el sesgo de cualquier tarifa ya
   editada hasta ahora como coste de arranque único y documentado, no
   como una interpretación de negocio nueva.
3. `MovementSheet.jsx` sigue resolviendo la tarifa sugerida desde el
   catálogo vivo SOLO al crear un movimiento nuevo — a partir de ahí, el
   valor guardado en la fila es la fuente de verdad, no una referencia.
4. `computeRateTotal` dejaría de necesitar `ratesTable` en absoluto para
   movimientos ya creados — se simplifica a `rate_snapshot × personas`.
5. Editar people/fecha de un movimiento existente recalcula con su propio
   `rate` guardado, nunca con una nueva búsqueda en el catálogo.

Como cualquier cambio de esquema de este proyecto: migración incremental,
plan propuesto antes de tocar nada, no en un único paso (regla ya
existente en `CLAUDE.md`, "For database and architecture changes").
