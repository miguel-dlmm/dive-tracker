# ADR 0005 — "Mi trabajo": unificación de la gestión económica del instructor

**Fecha:** 2026-08-28
**Estado:** Aprobado — Fase 1 implementada (nueva pantalla en producción, sustituye a Registro/Comisiones/Compañeros en la barra de navegación). Fase 2 pendiente, condicionada a evidencia de uso real.

## Contexto

Tras rediseñar Pagos (`ADR-0004`), se detectó un problema mayor: la app
refleja su estructura interna (Registro/Comisiones/Compañeros/Pagos como
4 superficies separadas) en vez del modelo mental real del instructor:
*"mi actividad como instructor genera dinero, algunos importes están
pendientes, otros cobrados, y a veces tengo ajustes económicos con otros
instructores."* Esto es, en esencia, la hipótesis "Movimiento" que
`docs/BACKLOG.md` tenía registrada como "No hacer (por ahora)" — su
condición de reactivación ("que la duplicación de código y el gap de
Pagos sigan doliendo") se ha cumplido con evidencia real, no solo con
sospecha inicial.

## Problema evaluado

¿Debe la app seguir presentando Registro/Comisiones/Compañeros como
conceptos separados, o debe unificarse en una única experiencia — y si
es así, con qué nombre, qué estructura y qué estrategia de migración
técnica?

## Decisión

**Nueva pantalla "Mi trabajo"**, que sustituye conceptualmente a Registro,
Comisiones y Compañeros (Pagos se trata aparte, ver más abajo).

### Nombre

**"Mi trabajo"** es el nombre de producto/UX — no necesariamente el
nombre final de componentes, archivos o variables internas, que pueden
seguir llamándose como hoy (`WorkLogTab`, `worklog`, `colleaguePayments`,
etc.) hasta que exista una razón real para renombrarlos.

Alternativas evaluadas y descartadas: **Movimientos** y **Operaciones**
(término bancario/contable), **Actividad económica** (término fiscal
literal — "alta de actividad económica" — el más burocrático de todos),
**Gestión** (vacío de contenido), **Finanzas** (menos burocrático pero
sigue enmarcando esto como app de contabilidad genérica, y encaja mal con
un ajuste negativo), **Mi actividad** (aunque la colisión con el rename
Actividades→Cursos se resuelve si ambos cambios coinciden en el tiempo,
"Actividad" connota feed de notificaciones en apps de consumo — riesgo de
expectativa equivocada).

### Tipos visibles

**Curso · Comisión · Ajuste de curso.** "Compañeros" desaparece del
lenguaje visible de esta pantalla — no es "un pago a un compañero", es un
ajuste económico derivado de que varios instructores participan en el
mismo curso (ejemplo real: un curso de 3 días, tú das el día 1, otro
instructor los días 2-3, la escuela te paga el curso completo a ti, y
después ajustáis entre vosotros). Campos: escuela, curso, fecha,
instructor relacionado, importe (+/-), nota opcional. Importe manual e
intencionado — cada escuela valora los días de forma distinta y no se
introduce reparto automático ni tarifas compartidas en esta fase.

**El tipo no es un selector de primer nivel.** Cada fila se auto-describe
(sin etiqueta para Curso, "· Comisión"/"· Ajuste" para los otros dos, más
color de importe distinto en Ajuste porque es el único que puede ser
negativo) — el filtro por tipo existe, pero dentro del panel "Filtrar"
junto a escuela/curso/fecha, no como control permanente. Motivo: un
instructor no navega su día por categorías técnicas, y la necesidad de
"ver solo comisiones" ya está resuelta en Resumen (su selector
Ganado/Comisión/Compañeros).

### Estructura de pantalla

Cabecera "Pendiente de cobrar" (mismo componente que Home/Pagos, con el
mismo alcance estrecho: solo lo que te deben, un ajuste negativo pendiente
no la altera) → pestañas de texto Pendientes/Cobrados con contador →
filtros avanzados (fecha/escuela/curso/tipo) detrás de "Filtrar" → lista
única cronológica, sin bloques ni bullets (la lista sí incluye los
ajustes negativos, con color e icono de signo propio) → FAB con selector
de tipo previo ("Curso impartido" / "Comisión" / "Ajuste de curso") →
formulario específico reutilizado de las pantallas actuales.

**Revisado durante la implementación de Fase 1:** se reevaluó "Comisión"
frente a "Cliente referido" y se optó finalmente por **"Comisión"**. El
argumento inicial (dos opciones-acción + una categoría) no se sostenía del
todo: "Ajuste de curso" ya era una categoría, no una acción, así que el
selector nunca fue plenamente consistente en ese eje. El argumento
decisivo es otro: cada fila de la lista ya se auto-describe con "·
Comisión" (ver más abajo) — usar "Cliente referido" en el FAB y
"Comisión" en la fila resultante son dos palabras distintas para el mismo
concepto en el mismo flujo (creas con una palabra, lo ves etiquetado con
otra). Usar "Comisión" en ambos sitios evita esa inconsistencia y es,
además, el término que el propio instructor usa en la práctica.

### Jerarquía de acciones en la fila (revisado tras el primer uso)

El patrón heredado de Pagos ("Confirmar cobro" como píldora sólida +
lápiz + papelera, los 3 siempre visibles) resultó tener demasiado peso
una vez conviven con el FAB de crear en la misma pantalla: competían por
la misma atención y el mismo color. Rediseño aplicado:

- **Cambiar estado** (la acción de mayor frecuencia) pasa a texto+icono
  sin relleno de color — deja de compartir el bloque sólido con el FAB,
  que así queda como la única acción con fondo sólido de toda la
  pantalla.
- **Editar/Eliminar** (menor frecuencia) se agrupan detrás de un único
  menú "⋯" — dejan de ocupar espacio permanente en cada fila sin perder
  alcance (un toque de distancia). `DeleteButton` (`shared.jsx`) gana una
  variante `menuItem` para poder vivir dentro de ese menú sin duplicar su
  lógica de confirmación.
- **FAB con comportamiento dinámico**: al estar en `bottom-right`, pasa
  literalmente por encima de las acciones de cada fila durante el scroll.
  Se aparta (se desvanece) durante el scroll activo hacia abajo y vuelve
  al subir o al llegar arriba — mismo patrón que el FAB de Gmail o el
  botón de tuitear en X — en vez de reposicionarlo o encogerlo de forma
  fija.

### Paridad funcional

Auditada explícitamente contra las 4 pantallas actuales — **ninguna
capacidad se pierde**. Dos mejoran de forma real, no solo se trasladan:
cambiar el estado pendiente/cobrado y filtrar por estado, que hoy **no
existen en absoluto para Comisiones ni Compañeros** (ni el formulario de
edición de esas dos pantallas incluye el campo `status`, ni hay ningún
control para cambiarlo desde la UI) — solo Registro los tenía, y solo
desde Pagos.

### Pagos: redefinida como herramienta de liquidación por escuela

En cuanto "Mi trabajo" quedó construida, se hizo evidente el problema que
esta sección dejaba pendiente: Pagos y Mi trabajo resolvían casi lo mismo
(ver/filtrar pendientes, cambiar estado) desde dos pantallas distintas —
redundancia real, no solo percibida.

**Se replanteó el propósito de Pagos desde cero, no se parcheó.** Ya no es
una segunda lista de la misma actividad — pasa a ser una **herramienta de
liquidación por lotes**, con un modelo de interacción distinto:

- **Se agrupa por escuela** (no por periodo ni por tipo): es el eje real
  por el que un instructor cierra cuentas — "lo que me debe PADI Cozumel",
  no "lo de agosto". Cada grupo muestra su total y un botón "Cobrar todo"
  con peso visual real (aquí sí, porque en esta pantalla no hay ningún FAB
  con el que competir — es la única acción de la pantalla).
- **Solo ingresos** (`buildIncomeEntries`, no `buildActivityEntries`): un
  ajuste negativo de compañero no es algo que "cobras", así que no entra
  en esta herramienta — sigue viviendo y gestionándose en Mi trabajo.
- **Sin crear/editar/borrar y sin pestaña "Cobrados"**: esas capacidades
  quedan exclusivamente en Mi trabajo, que ya las cubre con más detalle
  (línea a línea, con filtro por tipo). Repetirlas aquí era precisamente
  la redundancia a resolver — no es pérdida de funcionalidad, es quitar
  una segunda puerta a la misma habitación.
- **Filtro de periodo siempre visible** (Desde/Hasta, sin ocultar detrás
  de "Filtrar"): aquí sí es la interacción primaria, al contrario que en
  Mi trabajo.

Pagos y Mi trabajo comparten los mismos hooks de `useSupabaseTable` desde
`AppShell`, así que no hay riesgo de desincronización de datos entre
ambas — la diferencia es puramente de propósito e interacción, no de
origen de datos.

### Selección multi-escuela (revisado tras el primer uso — "termina Pagos")

El primer borrador de Pagos tenía dos formas de cobrar en bloque que no
se relacionaban entre sí: un botón por escuela ("Cobrar todo") y un
"Confirmar todos" global suelto, sin nada entre medias — si querías
cerrar 2 de 3 escuelas hoy y la tercera mañana, no había manera.

**Se sustituyó por un único modelo de selección**, más propio de una
herramienta administrativa (Gmail, Stripe payouts): cada tarjeta de
escuela es seleccionable (el punto de color hace doble función como
checkbox — no se añade un elemento nuevo a la fila, se reutiliza uno que
ya estaba), "Seleccionar todas" arriba, y una barra inferior fija con el
total conjunto y "Cobrar seleccionadas" en cuanto hay ≥1 seleccionada.
"Cobrar todo" por escuela se mantiene como atajo de 1 toque para el caso
más común (cerrar con una sola escuela); la selección cubre el caso de
varias a la vez o un subconjunto concreto. El antiguo "Confirmar todos"
desaparece — seleccionar todas + cobrar seleccionadas cubre exactamente
lo mismo, con un único modelo de interacción en vez de dos superpuestos.

**Por qué escuela y no periodo como eje de agrupación** (se evaluó
explícitamente, per encargo): un instructor no "cierra enero", cierra
cuentas con una escuela concreta cuando coincide con ella — el periodo
sigue disponible como filtro (para acotar qué entra en cada grupo), pero
convertirlo en un segundo modo de agrupación (una vista "por escuela" y
otra "por mes" intercambiables) añadía una superficie de interfaz
paralela sin una necesidad real detrás — el instructor freelance de este
producto no factura por periodos cerrados tipo nómina. Se descarta como
sobreingeniería, no por falta de tiempo.

### Coherencia entre Mi trabajo y Pagos

Comparten paleta, tipografía y componentes (`PendingCollectionCard`,
`Money`, `MoneyLine`, `colorFor`) — se leen como la misma app. Difieren
deliberadamente en una cosa: Mi trabajo evita el relleno de color sólido
en las filas porque el FAB ya reclama ese peso visual; Pagos sí lo usa
con libertad ("Cobrar todo", la barra de selección) porque no tiene
ningún FAB con el que competir — es su única acción global. No es una
inconsistencia, es la misma regla de jerarquía visual (un solo elemento
con peso máximo por pantalla) aplicada a dos pantallas con distinta
composición.

## Impactos ocultos identificados (sin resolver todavía, solo detectados)

- **Home:** IDs de pestaña `"log"`/`"comisiones"`/`"colegas"` hardcodeados
  en `App.jsx` y en filas de `nav_sections` quedan huérfanos. El
  calendario de Home sigue hablando en "Ganado"/"Comisión"/"Compañeros"
  (`SOURCE_META`) — si no se actualiza a la vez, convive lenguaje viejo y
  nuevo dentro de la misma app.
- **Resumen:** usa exactamente el mismo `SOURCE_META` en su selector y en
  la sección "Pagos de compañeros — por escuela". **"Compañeros" no
  desaparece de verdad de toda la interfaz mientras Resumen no se toque**
  — contradicción real con el objetivo de esta decisión, deliberadamente
  fuera de alcance de esta fase.
- **Tarifas (`RatesTab`):** lee `worklog`/`comisiones` en crudo para
  impedir borrar una tarifa en uso — sin impacto en Fase 1, sí sería
  una dependencia real a revisar si llega la Fase 2.
- **Componentes compartidos:** `EntryTitle` (con bullets) sigue viva
  mientras las pantallas actuales existan — convivencia visual esperable
  (bullets en unas, sin bullets en "Mi trabajo") durante la transición.
- **Exportaciones/informes:** no existen hoy — sin impacto.

## Estrategia técnica — vista/adaptador antes que migración

```
UI nueva → Adaptador/Controlador → Modelo actual (Supabase, sin tocar)
```

No se empieza por base de datos. `buildActivityEntries()` (nombre
provisional, en `rateCalc.js`) transforma `worklog`/`comisiones`/
`colleague_payments` a una forma normalizada para la UI — función pura,
sin cambio de esquema. Una futura migración de modelo real (fusión física
en una tabla) solo se plantea si el adaptador demuestra no ser suficiente
— tendría su propio ADR, no forma parte de esta decisión.

### Fases

1. **Nueva experiencia/UI, con paridad funcional completa** — pantalla
   "Mi trabajo" (`MiTrabajoTab.jsx`) con listar/filtrar/ver estado **y**
   crear/editar/borrar/cambiar estado (individual y en bloque), sobre un
   adaptador puro (`buildActivityEntries()` en `rateCalc.js`, del que
   `buildIncomeEntries()` pasa a derivar como filtro) que sigue
   escribiendo sobre `worklog`/`comisiones`/`colleague_payments` de
   siempre — sin migración de datos ni cambio de esquema. **Implementada
   y aprobada explícitamente** (mensaje del 2026-08-28: "Empieza por la
   Fase 1", con alcance ampliado a incluir también los controladores de
   escritura, no solo lectura — fusiona lo que este documento distinguía
   originalmente como Fase 1 y Fase 2). Es un cambio de navegación real:
   la barra inferior pasa de 5 a 3 destinos (Home / Mi trabajo / Resumen).
   Para que sea reversible sin esfuerzo, `WorkLogTab`/`ComisionesTab`/
   `CompanerosTab` **no se han borrado** — siguen en el código y
   funcionando, solo sin ningún punto de entrada en la UI (ni en la barra
   inferior ni en los accesos rápidos de Home, redirigidos a "Mi
   trabajo").
2. **Posible migración de modelo** — solo si aporta valor real
   verificado, no por limpieza arquitectónica. ADR propio si llega.
   Incluiría entonces retirar de verdad `WorkLogTab`/`ComisionesTab`/
   `CompanerosTab` del código, no solo de la navegación.

## Condiciones que justificarían revisar esta decisión

- Si en uso real "Mi trabajo" no reduce fricción frente a las 4 pantallas
  actuales.
- Si el ajuste de curso, en la práctica, resulta no estar casi nunca
  ligado a un curso concreto (el caso "deuda entre instructores sin
  curso" resulta ser frecuente, no marginal).

## Consecuencias sobre la documentación

- `docs/BACKLOG.md`: la hipótesis "Movimiento" pasa de "No hacer (por
  ahora)" a la Fase 1 ya movida a hecho y la Fase 2 en "Después", ambas
  referenciando este documento.
- El rename Actividades→Cursos (ítem de backlog ya existente) es una
  decisión independiente que este documento asume como ya aprobada para
  el lenguaje de "Mi trabajo", sin depender de cuándo se ejecute su
  propia migración interna.

## Addendum (2026-08-28) — el mismo patrón de entrada se extiende a Home

Al rediseñar Home (fase de rediseño global), se decidió que sus accesos
de creación siguieran exactamente el mismo patrón que este documento ya
fijó para el FAB de Mi trabajo: entrar directo al caso dominante (Curso
impartido) y resolver el resto con el selector de tipo ya existente
dentro de la propia hoja, en vez de multiplicar puntos de entrada.

Home tenía dos botones ("Curso impartido"/"Comisión") con nombres y
colores de las secciones ya retiradas por esta misma unificación. Se
sustituyen por un único "Añadir movimiento" — no por preferencia
estética, sino para no introducir un segundo patrón de creación
distinto al que el FAB y el calendario de Home (que también abre esta
misma hoja al tocar un día) ya usan. Un tercer botón por "Ajuste de
curso" habría sido igual de inconsistente con la jerarquía de frecuencia
que ya justifica por qué el FAB no lo trata como caso por defecto.

No cambia nada de lo ya decidido en el cuerpo de este documento — es la
misma decisión, aplicada a una segunda superficie de entrada.

## Addendum (2026-08-28) — extracción de `MovementSheet.jsx` y ubicación final en Home

El addendum anterior fijó que Home debía usar el mismo patrón de entrada
que el FAB de Mi trabajo, pero la primera implementación lo resolvía
navegando primero a Mi trabajo y abriendo la hoja allí — un salto de
pantalla antes de que el usuario escribiera nada, que además dejaba
Home ya cambiado de pestaña aunque el usuario cancelara sin guardar.

Se extrajo la hoja de creación/edición (antes vivía dentro de
`MiTrabajoTab.jsx`) a `src/MovementSheet.jsx`, un componente controlado
por un objeto `request` (`null | {type, editingEntry, date?}`) más
`onClose`/`onSaved`, sin conocimiento de en qué pestaña se está
montando. Esto permite montarlo también a nivel de `AppShell` en
`App.jsx`, fuera del `tab` condicional, para que Home pueda abrirlo sin
cambiar de pestaña: el usuario permanece en Home mientras rellena el
formulario, y solo se navega a Mi trabajo cuando `onSaved` confirma que
Supabase guardó con éxito (cancelar o cerrar sin guardar te deja en
Home). Mi trabajo sigue usando la misma hoja para su FAB y para editar,
sin cambios de comportamiento — verificado como refactor puro (mismos
180 tests pasando sin modificar antes de añadir la nueva capacidad).

El botón "Añadir movimiento" pasó además de fila independiente bajo la
tarjeta "Pendiente de cobrar" a un botón "+" integrado en el lado
derecho de esa misma tarjeta (`onQuickAdd`, prop opcional de
`PendingCollectionCard` que Mi trabajo no usa — ya tiene su FAB). Una
fila propia con el mismo ancho que la tarjeta de encima competía en
peso visual con la cifra pendiente, la información más consultada de
Home; integrarlo en el espacio libre de esa tarjeta evita una fila más
en una pantalla ya densa sin perder tamaño táctil (44×44) ni claridad
de acción.

No cambia la decisión de fondo (un único acceso, mismo patrón que el
FAB) — es una revisión de cómo se ejecuta esa decisión a nivel de
navegación y de layout, tras detectar que la primera implementación no
cumplía del todo el criterio de "Home permanece visible durante la
creación".
