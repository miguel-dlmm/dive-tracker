# ADR 0012 — Tarifas: coherencia de fila con Mi trabajo (RowMenu compartido)

**Fecha:** 2026-08-29
**Estado:** Aprobado e implementado.

## Contexto

Configuración → Tarifas ya compartía con Mi trabajo el patrón de
creación (FAB + hoja inferior) y el filtro colapsable "Filtrar" desde el
rediseño de Configuración (`ADR-0008`). Quedaba un gap concreto: cada
fila de tarifa mostraba dos iconos sueltos (lápiz + papelera) para
Editar/Eliminar, mientras que Mi trabajo ya había resuelto exactamente
ese mismo problema con un menú "⋯" (`RowMenu`, definido dentro de
`MiTrabajoTab.jsx`) que agrupa ambas acciones detrás de un único
control. El usuario pidió explícitamente "que el sistema se parezca
todo lo posible a Movimientos: mismo tipo de jerarquía, acciones
similares... si puedes reutilizar patrones, mejor".

## Decisión

`RowMenu` se extrae de `MiTrabajoTab.jsx` a `shared.jsx` (exportado,
sin cambios de comportamiento) y pasa a ser el componente de
Editar/Eliminar compartido por **ambas** pantallas. Reutiliza
`useFloatingDropdown`/`FloatingPanel`/`DeleteButton`, ya en `shared.jsx`
desde antes — pura extracción, no una reescritura.

La fila de `RatesTab.jsx` se reestructura para calcar exactamente la
forma de `EntryRow` en Mi trabajo: título + importe en la línea
superior, metadato (tipo de pago) + acciones en la inferior. Antes era
una estructura distinta (título arriba, importe+iconos en una tercera
línea alineada a la derecha).

**Por qué ahora sí extraerlo (y no cuando se creó `RowMenu`):** en el
momento en que `RowMenu` se creó, solo tenía un usuario — extraerlo
entonces habría sido una abstracción sin necesidad real todavía
(`CLAUDE.md`, principio de diseño: "extraer abstracciones solo cuando
exista una necesidad real"). Con un segundo usuario real y con el mismo
contrato exacto (`onEdit`, `onDelete`, `itemLabel`), la necesidad ya
existe.

**Efecto colateral aceptado, no un bug:** `DeleteButton` dentro de
`RowMenu` es siempre `optimistic` (cierra el diálogo de confirmación de
inmediato, antes de conocer el resultado real). Antes, el `DeleteButton`
suelto de Tarifas era la variante no-optimista (el diálogo se quedaba
abierto con el error visible si `deleteRate` lanzaba, p. ej. "hay
registros que usan esta tarifa"). Con el cambio, ese mismo error llega
igual (vía toast, `RowMenu`/`DeleteButton` capturan cualquier excepción
de `onConfirm`), pero el diálogo ya se ha cerrado para entonces — mismo
compromiso que Mi trabajo ya acepta para sus propias filas. Es
"coherencia", no una regresión: el objetivo explícito de este cambio es
que las dos pantallas se comporten igual, incluido este matiz.

## Consecuencias

- Una única fuente de verdad para el patrón "⋯ Editar/Eliminar" — una
  mejora futura (p. ej. añadir "Duplicar") se hace una vez y beneficia a
  las dos pantallas.
- `mobile-check.mjs` gana un recorrido de Tarifas (antes no tenía
  ninguno) que abre el menú "⋯" de una fila real y confirma que Editar/
  Eliminar aparecen.
- El resto de la coherencia Tarifas↔Mi trabajo (creación vía FAB+hoja,
  filtro colapsable, `EditActions` en la edición en línea,
  `DeleteButton`/`ConfirmDialog` para confirmaciones) ya estaba resuelta
  desde `ADR-0008` — este documento cierra el último gap señalado por el
  usuario.
