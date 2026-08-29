# Ocean Flow — libro de estilo (práctico, no exhaustivo)

Inventario de los componentes/patrones compartidos que ya existen en
`src/shared.jsx` y en qué situación usar cada uno, para no reinventar (ni
duplicar con pequeñas variaciones) algo que ya está resuelto. No es un
Design System formal — ver la nota "Cosas que NO existen todavía" en
`CLAUDE.md` sobre el rediseño visual global pendiente. Esto es el mapa de
lo que hay hoy, escrito tras una auditoría real del código (bloque 14 de
`docs/SESSION-2026-08-30-bloques-nocturnos.md`), no un ideal aspiracional.

## Cuándo crear un componente nuevo vs. reusar uno de aquí

Antes de escribir un botón/tarjeta/menú/confirmación/lista nuevos,
comprobar si ya existe abajo. Si existe, usarlo. Si algo se parece pero no
encaja del todo, primero preguntarse si la diferencia es real (responsabilidad
distinta) o accidental (se copió y se tocó un poco) — solo lo segundo
justifica tocar el componente compartido; lo primero es una señal de que
debe seguir siendo un componente aparte (ver "Qué NO se ha consolidado y
por qué" al final).

## Creación de registros: FAB + Sheet

Patrón obligatorio (convención #3, `CLAUDE.md`) para toda pantalla de
lista con alta: Mi trabajo, Tarifas, y cada sub-lista de Configuración
(Escuelas, Actividades, Tipos de pago, Estados de pago, Monedas,
Secciones de navegación).

- **`Fab`** (`shared.jsx`): el botón flotante en sí — `fixed bottom-24
  right-4`, 52×52, color de acento de la sección. Antes copiado con la
  misma clase larga en cada pantalla (RatesTab, ConfigTab, MiTrabajoTab);
  extraído 2026-08-30 tras confirmar que las 3 pantallas activas lo
  reproducían byte a byte. Prop `visible` opcional (por defecto `true`,
  siempre interactivo) — solo Mi trabajo la usa hoy, para ocultar el FAB
  mientras el usuario hace scroll hacia abajo en una lista larga.
- **`Sheet`** (`shared.jsx`): la hoja inferior que el FAB abre —
  backdrop, animación de entrada/salida (Motion), arrastrar para cerrar,
  bloqueo de scroll del body. Úsalo para CUALQUIER hoja nueva, no solo
  alta/edición (ver Configuración: también lo usan `UserDetailSheet`,
  `ActivationLinkPanel`, `CreateUserSheet`).

## Menú de acciones por fila: `RowMenu`

El "⋯" que abre Editar/Eliminar en una fila de lista (Mi trabajo,
Tarifas, cada sub-lista de Configuración). Un único componente, no un
`<button>` + dropdown distinto por pantalla.

## Eliminar: `DeleteButton` + `ConfirmDialog`

Nunca un `window.confirm` ni un chip de confirmación inline (convención
#5). `DeleteButton` ya integra el diálogo centrado, el estado de carga y
el toast de resultado.

## Editar en línea: `EditActions`

Guardar/Cancelar unificado (convención #4) — nunca iconos de check/x
sueltos escritos a mano por pantalla.

## Cifras de dinero y cantidades

- **`Money`** / **`formatMoney`** (`shared.jsx`): única fuente de verdad
  para pintar un importe — símbolo de moneda más apagado, `tabular-nums`,
  `Number.toLocaleString("es-ES", …)`. Nunca interpolar un importe a mano
  (`` `${total}€` ``) ni usar `.toFixed(2)` fuera de estas dos funciones.
- **`fmtInt`** (`SummaryTab.jsx`): mismo criterio para recuentos
  agregados (personas) que pueden llegar a ser una cifra grande. Ver
  bloque 13 de la sesión — `es-ES` ya agrupa correctamente con `.` a
  partir de 10.000; no hace falta ninguna implementación propia.
- El recuento de personas de un movimiento (`{e.people}p`, badges
  puntuales) solo se pinta cuando el grupo representa a algo con
  concepto real de persona — ver bloque 11: Ajustes de curso nunca
  llevan ese badge, ni siquiera "0p".

## Formularios

- **`Field`**, **`Select`**, **`MultiSelect`**, **`SearchSelect`**,
  **`DatePicker`**, **`MoneyInput`**, **`CurrencySearchSelect`**: todos
  los desplegables/inputs de formulario. Usan `useDropdownFlip`/
  `useEscapeClose`/`useClickOutside` internamente — no reimplementar ese
  comportamiento en un input nuevo.
- Filtros de Actividad: siempre `MultiSelect`; el resto de filtros
  (Escuela, Estado, Tipo de pago), `Select` normal (convención #8).
- Filtro "Escuela": desde el bloque 10, se oculta automáticamente cuando
  `schools.rows.length <= 1` — mismo criterio en Tarifas, Mi trabajo y
  Resumen (`hasMultipleSchools`). Cualquier filtro nuevo que dependa de
  tener más de una escuela debe seguir el mismo criterio, no inventar uno
  propio.

## Estados y colores

- **`StatusPill`**, **`StatusSwitch`**: nunca un `<span>` de color suelto
  para representar un estado.
- **`colorFor(rows, name)`**: color de una entidad de negocio (escuela,
  actividad…), siempre leído de su propia tabla — nunca una paleta fija
  en JS (convención #2). Los 6-7 colores de marca (`NAVY`, `TEAL`,
  `CORAL`, `GREEN`…) exportados desde `App.jsx` son la única excepción
  (identidad visual de la app, no dato de negocio).

## Feedback de operaciones

`useToast().success(...)`/`.error(...)` con try/catch alrededor de toda
llamada a Supabase — nunca una operación silenciosa (convención #6).

## Qué NO se ha consolidado, y por qué

No todo lo que se parece es el mismo componente — forzarlo sería la
sobreingeniería que `CLAUDE.md` pide evitar explícitamente. Casos
revisados en el bloque 14 y dejados aparte a propósito:

- **Estado vacío de una lista sin resultados** (`"Sin resultados."`,
  `text-sm text-gray-400`, centrado) vs. **estado vacío "estás al día"**
  de Mi trabajo (icono `PartyPopper`, animación de aparición, botón
  "Limpiar filtros" condicional). El primero es neutro (no hay
  coincidencias); el segundo es una confirmación positiva (no hay nada
  pendiente, buena noticia) con una acción propia. Responsabilidad
  distinta → siguen siendo bloques de JSX distintos, no una sola
  `EmptyState` genérica con props para forzar ambos casos.
- **`RankedList`** (Por escuela/Por curso/desgloses de Comisiones en
  Resumen) vs. **`CrudTable`** (listas de Configuración): ambas son
  "listas con una fila por elemento", pero una es de solo lectura con
  expansión in-place y comparación de periodo, la otra es CRUD completo
  con hoja de edición — ninguna gana nada compartiendo implementación.
