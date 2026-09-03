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

## Objetivo táctil 44×44 sin estirar el layout

`Field` (`shared.jsx`) tiene un icono de ayuda ("?") opcional junto a la
etiqueta — su área pulsable real es 44×44, pero **superpuesta con
`position: absolute`**, no en el flujo normal de la fila. Encontrado
como bug real 2026-09-02 (Release V1): un botón de 44×44 EN FLUJO
dentro de una fila de etiqueta la hace más alta que la de cualquier
campo vecino sin ese icono, descuadrando cualquier grid de columnas que
los ponga uno al lado del otro. Mismo criterio a seguir en cualquier
icono/control pequeño que necesite un objetivo táctil grande dentro de
una línea de texto corta: el tamaño visual del icono decide el alto de
la línea, el área pulsable de 44×44 se logra con un wrapper `relative`
+ un hijo `absolute -inset-[Npx]`, nunca agrandando el propio elemento
en el flujo.

## Contraseña: campos y requisitos — `src/auth/PasswordFields.jsx`

`PasswordField` (mostrar/ocultar) y `RequirementRow` (fila de requisito
con check en vivo) — usados por `CreatePasswordScreen.jsx`,
`ResetPasswordScreen.jsx` y `ForcedPasswordUpdateScreen.jsx`. Extraídos
aquí 2026-09-02 al aparecer el tercer sitio que los necesitaba (las dos
primeras pantallas los duplicaban a propósito mientras solo eran dos —
ver comentario en el propio archivo). Cualquier pantalla nueva que pida
una contraseña usa estos, nunca un campo de contraseña escrito a mano.
La política en sí (longitud/mayúscula/símbolo) vive aparte, en
`src/passwordPolicy.js` — única fuente de verdad, usada también por
`useSession.js` para decidir si forzar una actualización de contraseña.

## Catálogos cerrados de iconos: nunca forzar un número arbitrario

`avatarCatalog.js` (avatares de perfil) es un catálogo cerrado de
iconos de `lucide-react` + colores de marca — mismo criterio que el
icono de carga de la app. Al reducirlo a "solo animales marinos"
(2026-09-02), el catálogo pasó de 10 a 6 porque `lucide-react`
sencillamente no tiene más de 6 iconos que sean un animal marino real
(no hay ballena, delfín, pulpo, cangrejo, tiburón, estrella de mar ni
medusa). Principio a seguir con cualquier catálogo cerrado de iconos
futuro: el tamaño del catálogo lo decide lo que existe de verdad y
encaja con el criterio pedido, nunca rellenar hasta un número "redondo"
con algo que no cumple el criterio solo por completar.

## Panel de enlace de un solo uso: `ActivationLinkPanel` (`ConfigTab.jsx`)

Muestra un enlace de un solo uso para copiar/compartir — usado por
alta de usuario, activar/reactivar, regenerar contraseña, y (desde
2026-09-02) generar un enlace de invitación. Prop `hideMockEmailButton`
(default `false`): el botón "simular envío" temporal (ver comentario en
el propio componente) solo tiene sentido cuando el panel es el
FALLBACK de un intento real de enviar un email — un flujo que nunca
intenta enviar ningún email (como generar una invitación) debe pasar
`hideMockEmailButton`, para no confundir con un botón que no aplica ahí.

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
