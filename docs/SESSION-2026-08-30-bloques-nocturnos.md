# Sesión nocturna 2026-08-30 — 24 bloques, autónoma y secuencial

> Informe acumulativo de una sesión larga y autónoma. Se actualiza tras
> cada commit para poder retomar sin reconstruir contexto. No es
> documentación permanente del producto (eso vive en ADR/BACKLOG/CLAUDE.md)
> — es el registro de esta sesión concreta.

## Punto de partida verificado

- Rama: `feature/global-redesign`, working tree limpio salvo `cloudflared.tgz`
  (del usuario, no se toca). HEAD en `3ef1e1f`.
- `develop` local === `origin/develop` === `0cf625e`, sin cambios externos.
  `merge-base(develop, HEAD) == develop` — fast-forward puro, 44 commits por
  delante.
- Servidor principal del usuario: puerto **5173** (PID 97488) — NO tocar,
  NO reiniciar. Tiene un túnel Cloudflare activo (PID 92373,
  `cloudflared tunnel --url http://localhost:5173`) — NO tocar.
- Servidor de pruebas propio ya existente: puerto **5180** (PID 91368,
  `vite --port 5180`), vivo desde una sesión anterior, sirviendo el mismo
  directorio de trabajo — reutilizado para todo `mobile-check` de esta
  sesión (`MOBILE_CHECK_URL=http://localhost:5180`).
- Modo de trabajo: autónomo, secuencial (nunca paralelo), sin preguntas
  salvo bloqueo real de arquitectura/seguridad/datos/permisos/integridad.
  Commit por bloque funcional independiente, sin push, sin merge a
  `develop`.

## Orden de trabajo (el propio encargo permite reordenar por dependencia técnica)

1. Tarifas — rediseño completo
2. Marca → "Ocean Flow"
3. Calendario Home — indicador de día actual con actividad
4. Moneda — quitar de formularios, pasa a config global (con tarifa)
5. Ajuste de curso — densidad de formulario tras quitar moneda
6. Gestos — drag-to-dismiss en todas las hojas
7. Resumen — tendencia como navegación temporal central
8. Resumen — secciones (vocabulario + jerarquía)
9. Bug de cálculo tarifa/movimiento (Reef Divers – Adventure Dive – 150 con 3 personas)
10. Por escuela — ocultar conceptos multi-escuela si solo hay una
11. Ajustes de curso — quitar "0p"/personas donde no aplica
12. Añadir movimiento en Home — evaluar patrón actual vs. FAB
13. Separadores de miles — auditoría y convención global
14. Componentes duplicados — libro de estilo Ocean Flow
15. Tarifas y depreciación histórica — SOLO ANÁLISIS
16. Release — preparar (sin ejecutar)
17. SEO — rama separada
18. SEO MVP
19. Backups — política + acción segura si la hay
20. Analítica — solo si sobra margen
21. Documentación/literales — auditoría transversal (puede solaparse con 2/8)
22-24. Validación/commits/informe final — transversal, no un bloque aparte

## Bloques completados

### Bloque 1 — Tarifas: rediseño completo

Antes de tocar código: inventario de `RatesTab.jsx` (ya tenía FAB+hoja,
`RowMenu`, `EntryTitle`, filtros colapsables — no partía de cero) y de
`MovementSheet.jsx` (hoja con motion real: `sheetVariants` + arrastrar
para cerrar). El hueco real frente a "sentirse como Mi trabajo": (1) la
hoja de Tarifas era un `<div fixed inset-0>` estático, sin animar; (2) el
tipo (Curso/Comisión) era un modo de PÁGINA (dos pestañas, cada una
montando una tabla distinta) en vez de un selector dentro de la propia
hoja; (3) la lista no tenía el acento de color por tipo que sí tiene
`EntryRow`.

**Extraído `Sheet` (`shared.jsx`)** — la hoja de `MovementSheet` extraída
a un componente reutilizable (fondo + `sheetVariants` + tirador que
arrastra para cerrar + bloqueo de scroll interno). Detectado de paso: 5
sheets más en `ConfigTab.jsx` (`CrudTable`, edición, creación de usuario,
detalle de usuario) tienen el mismo `<div fixed inset-0>` sin animar —
consolidarlos ahí queda para el Bloque 6 (gestos en todas las hojas),
ahora mucho más barato porque el componente ya existe.

**`RatesTab.jsx` reescrito:**
- Lista única combinada (rates + commission_rates, sin cambiar el modelo
  de datos — dos tablas reales, una sola vista de presentación, mismo
  patrón que `buildActivityEntries`), con borde izquierdo de color por
  tipo (TEAL/SUN, `MOVEMENT_TYPE_META`) igual que `EntryRow`.
- El tipo pasa de pestaña de página a filtro dentro de "Filtrar" —
  mismo criterio que Mi trabajo (ADR-0005: el tipo no es un control de
  primer nivel).
- Hoja de creación/edición con `Sheet` + selector de tipo integrado
  (Curso/Comisión, mismo patrón visual que `MovementSheet`), solo visible
  al crear (editar no cambia el tipo de una tarifa ya guardada, movería
  la fila entre tablas).
- Corregido de paso: 3 `Select` de filtro compartían `aria-label` con el
  placeholder ("Todos"), indistinguibles entre sí para un lector de
  pantalla — se les pasa ahora un `label` explícito.

**Validado:** 314/314 tests (+3 nuevos: lista combinada con acento de
color, filtro "Tipo", cambio de tipo en la hoja guarda en la tabla
correcta), build correcto, `mobile-check` sin errores (+3 pasos nuevos:
hoja de creación con selector de tipo, cambio a Comisión, título
actualizado) — capturas revisadas visualmente.

### Bloque 2 — Marca "Ocean Flow"

Auditoría completa (`grep` de "Ocean Pulse"/"by Ocean Flow" en todo el
árbol, no solo `src/`) — encontró 12 archivos con el nombre visible al
usuario: cabecera global, login, primer acceso, aceptación legal, Ayuda
("Primeros pasos"), Términos de Uso, Política de Privacidad, metadata de
`index.html` (title/description/OG/Twitter/JSON-LD), `manifest.json`,
`robots.txt` y **el email de bienvenida real** (`server/email/
welcomeEmailTemplate.js` — el más fácil de pasar por alto por no vivir en
`src/`).

**Decisión de fusión, no solo sustitución de texto:** antes el patrón era
"Ocean Pulse" (producto) + "by Ocean Flow" (marca personal, subtítulo
pequeño) en 4 pantallas distintas (cabecera, login, primer acceso, email
de bienvenida) y en la de aceptación legal. Con un único nombre, esa
segunda línea sería literalmente el mismo texto repetido dos veces — se
retira en las 5, no se sustituye por "Ocean Flow"/"Ocean Flow" apilado.

**Legal, no solo texto de marketing:** Términos de Uso y Política de
Privacidad mencionaban "Ocean Pulse" como el producto y "Ocean Flow" como
la entidad que lo opera/posee. "El diseño, código y marca de Ocean Pulse
pertenecen a Ocean Flow" se reescribe (no un simple find-replace, habría
quedado circular: "...de Ocean Flow pertenecen a Ocean Flow") a "...de
Ocean Flow son propiedad de su operador". `VERSION` de ambos documentos
sube de `v1` a `v2` — cambio de contenido real, dispara la reaceptación
ya existente (`pendingLegalConsents`, `useSession.js`) para cualquier
cuenta que ya hubiera aceptado la v1, incluida la cuenta de pruebas.

**Efecto colateral encontrado y corregido en el camino:**
`mobile-check.mjs` asumía que tras el login se entra directo a la app —
con la reaceptación legal disparada por el bump de versión, se quedaba
esperando "Mi trabajo" indefinidamente. Añadido un paso que detecta la
pantalla de reaceptación (si aparece) y la resuelve antes de continuar —
comportamiento real que cualquier usuario con datos previos va a ver, no
un problema del script.

**Qué NO se tocó, deliberadamente:** claves de `localStorage`/
`sessionStorage` (`oceanpulse:*` — son recurso técnico interno, cambiarlas
huérfanaría preferencias ya guardadas de usuarios reales, ver CLAUDE.md
"no renombres... recurso técnico salvo que sea necesario"), `package.json`
(nombre de paquete npm), historial de `CHANGELOG.md` anterior a esta
sesión y ADRs/sesiones previas (documentan lo que era cierto en su
momento). `CLAUDE.md`/`docs/PRODUCT.md`/`docs/BACKLOG.md` sí se actualizan
(describen el estado ACTUAL del producto, no historial) con una nota
explícita de cuándo y por qué cambió el nombre.

**Validado:** 314/314 tests (+1 assertion actualizada en `App.test.jsx`),
build correcto (verificado además con `grep` sobre `dist/`: cero
apariciones de "Ocean Pulse", "Ocean Flow" presente donde se espera),
`mobile-check` sin errores tras el fix del paso de reaceptación legal —
capturas revisadas visualmente (cabecera, login, pantalla de reaceptación
legal, con la marca ya coherente).

**Commit:** `feat(marca): renombrar el producto a "Ocean Flow" en toda la
interfaz visible`.

### Bloque 3 — Calendario de Home: marcar el día actual

Antes, un día con actividad se veía exactamente igual sea o no el de
hoy (mismo anillo/relleno TEAL) — "hoy" se perdía en cuanto tenía algún
movimiento, que es justo el caso que pedía el encargo.

**Solución:** un punto discreto bajo el número del día de hoy —
reutiliza el mismo lenguaje visual ya introducido esta sesión para
"periodo actual" en `TrendBars` (SummaryTab.jsx), no una convención
nueva. Se calcula comparando el `dateStr` que la propia celda ya
construye contra `todayStr()` (mismo helper que usa el resto de la
app) — cero lógica de fecha nueva, cero riesgo de desajuste de huso
horario. El `aria-label` de la celda también anuncia "(hoy)" — antes un
día CON actividad no llevaba ningún `aria-label` (su nombre accesible
salía del número visible); ahora lo lleva cuando es hoy, para que la
marca llegue también a un lector de pantalla, no solo visualmente.

**Ámbito:** cambio en `MonthCalendar` (`shared.jsx`, compartido por Home
y Resumen), pero el marcador solo tiene sentido donde el mes mostrado
puede SER el actual — no se ha tocado nada de Resumen a propósito (el
encargo pedía específicamente "Calendario de Home"); si algún día
interesa lo mismo en Resumen, es una línea de trabajo aparte, no un
efecto colateral de este cambio. Ninguna capacidad existente se pierde:
ver el desglose del día y crear un movimiento siguen exactamente igual.

**Validado:** 316/316 tests (+2 nuevos: el día de hoy anuncia "(hoy)"
cuando tiene actividad; si hoy está vacío, es el único día "Añadir
movimiento" con esa marca), build correcto, `mobile-check` sin errores
(un primer intento tuvo el hipo transitorio ya conocido de esta sesión,
reintento limpio) — captura de Home revisada visualmente: el punto bajo
el "30" (hoy) es visible y distinto del "29" (con actividad, sin punto).

**Commit:** `feat(calendario): marcar el día de hoy en el calendario de Home`.

### Bloques 4+5 — Moneda global + densidad de Ajuste de curso

Ejecutados juntos a propósito (dependencia técnica real, no solo
conveniencia): quitar el campo de Moneda del formulario de Ajuste de
curso deja huérfana la mitad de una fila (`grid-cols-2`, antes Importe+
Moneda) — decidir qué hacer con ese hueco Y reorganizar el formulario
son la misma decisión de diseño, hacerlas por separado habría significado
escribir el layout dos veces.

**Auditoría de "todos los formularios donde se selecciona":**
`CurrencySearchSelect` aparece en 6 archivos. De ellos, **solo uno** era
realmente "elegir moneda para un movimiento": el Ajuste de curso en
`MovementSheet.jsx` (Curso/Comisión nunca han tenido ese campo — la
moneda ya se deriva de la tarifa, ver CLAUDE.md convención 9). Los otros
5 son la moneda de una TARIFA (`RatesTab.jsx`, y el alta de tarifa en
línea dentro del propio `MovementSheet.jsx`) — ahí la moneda es el dato
fundacional de la tarifa en sí, no una elección repetida por movimiento;
tocarla habría sido una regla de negocio nueva, fuera de lo pedido.
`WorkLogTab.jsx`/`ComisionesTab.jsx`/`CompanerosTab.jsx` también la
tienen, pero son las 3 pantallas ya sustituidas por Mi trabajo, sin
ningún punto de entrada en la UI (ver `App.jsx`) — código muerto que no
afecta a ningún usuario real; no se ha tocado, sin valor tocar una
pantalla inalcanzable.

**Bloque 4 — qué cambia:** el campo "Moneda" (`CurrencySearchSelect` +
botón "Usar X como favorita") desaparece del formulario de Ajuste de
curso. `form.currency` se sigue resolviendo exactamente igual que antes
(`favoriteCurrency || defaultCurrency`, mismo mecanismo de
`localStorage` de ADR-0007) — lo que se retira es la posibilidad de
CAMBIARLA desde aquí, no el dato en sí (se sigue guardando en el
registro). El valor resuelto se muestra como referencia, en la propia
etiqueta del importe ("Importe · THB"), no como un desplegable.

**Backlog añadido:** "Configuración → Moneda favorita" — sin esa
pantalla futura, no queda NINGÚN sitio desde el que cambiar la moneda
favorita (antes existía el botón "Usar X como favorita" dentro del
propio formulario). Es una limitación real y consciente durante el
interín, tal como pedía el encargo ("no implementes todavía" esa
pantalla). `setFavoriteCurrencyStorage` (el escritor de la preferencia)
se retira por quedar sin ningún llamador — la futura pantalla lo
reintroduce trivialmente, mismo formato de clave documentado en el
comentario que queda en su lugar.

**Bloque 5 — densidad:** con la columna de Moneda libre, "Instructor
relacionado" e "Importe" pasan a compartir una fila (`grid-cols-2`) en
vez de que Importe ocupara media fila vacía o una fila entera él solo —
el formulario de Ajuste pasa de 4 filas de campos a 3. La explicación
del signo ("Importe positivo si te paga a ti; negativo si le pagas tú a
él/ella", ya existente) hace innecesario repetir "(puede ser negativo)"
en la propia etiqueta del campo, así que esa etiqueta se acorta a
"Importe · {moneda}".

**Validado:** 317/317 tests (reescrita la prueba de "moneda global +
favorita" en `MiTrabajoTab.test.jsx`, que asumía el campo/botón
retirados; +1 test nuevo cubriendo que la favorita de `localStorage` se
respeta), build correcto, `mobile-check` sin errores (paso "Cambiar tipo
-> Ajuste de curso" actualizado: comprueba ausencia del campo Moneda y
presencia de "Importe · <código>") — captura revisada visualmente:
Instructor relacionado + Importe · THB en la misma fila, sin ningún
rastro del campo de Moneda.

**Commit:** `feat(ajuste): moneda global (sin campo por movimiento) +
formulario más compacto`.

### Bloque 6 — Gestos: drag-to-dismiss en todas las hojas

El componente `Sheet` (extraído en el Bloque 1) se aplica a los 5 sheets
sin animar que quedaban en `ConfigTab.jsx`: `CrudTable` (Escuelas/Cursos/
Tipos de pago/Estados de pago/Monedas), `UserDetailSheet`,
`ActivationLinkPanel` (z-50, puede convivir con `UserDetailSheet` z-40
detrás) y las 2 vistas de `CreateUserSheet` (formulario normal + el
fallback "no se pudo enviar el email"). `useBodyScrollLock` manual se
retira de los 3 sitios que lo llamaban aparte — `Sheet` ya lo hace
internamente.

**Límite real, no ocultado:** `CrudTable` tiene una animación de salida
completa (gestiona su propio `sheetOpen` internamente, nunca se
desmonta a sí misma) — igual que `RatesTab` ya validado en el Bloque 1.
Las otras 3 (`UserDetailSheet`, `ActivationLinkPanel`, `CreateUserSheet`)
las monta/desmonta el padre por completo (`{cond && <X/>}`) — con eso,
la animación de ENTRADA y el gesto de arrastrar funcionan bien, pero al
cerrar, React las desmonta antes de que Motion complete la transición de
salida (desaparecen de golpe en vez de deslizarse). Arreglarlo del todo
exige el mismo patrón de `MovementSheet.jsx` (siempre montado, `open`
como prop) — cambio de más alcance en pantallas de administración de
bajo uso, así que se documenta como pendiente en `docs/BACKLOG.md` en
vez de forzarlo esta noche. Es una mejora real de todos modos: antes
estas 3 hojas no tenían NINGUNA animación (ni entrada ni gesto).

**Validado:** 317/317 tests (1 test de `ConfigTab.test.jsx` ajustado con
`waitFor` — la hoja ahora anima la salida, el heading ya no desaparece
en el mismo tick que cerrarla), build correcto, `mobile-check` sin
errores — captura de "Nueva escuela" revisada visualmente: tirador de
arrastre visible, mismo aspecto que `MovementSheet`/`RatesTab`.

**Commit:** `feat(gestos): aplicar Sheet (motion + arrastrar para
cerrar) a las hojas de Configuración`.

### Bloques 7+8 — Resumen: tendencia como navegación central + secciones

Ejecutados juntos: ambos tocan el mismo archivo y la misma franja
superior de la pantalla.

**Bloque 7 — causa raíz real de los dos bugs reportados, no un ajuste
cosmético:**
- *"Se solapa con su título"*: cada barra apilaba barra+etiqueta+punto
  de "hoy" (hasta ~70px de contenido real) dentro de un contenedor con
  altura FIJA de 56px. Cuando la barra más alta se acercaba a su
  máximo, el contenido desbordaba ese contenedor hacia ARRIBA
  (`items-end` ancla por abajo), invadiendo el título de encima.
- *"Cambia de altura al tocar barras"*: sin `overflow-hidden`, el
  navegador dejaba que el contenido más alto de cada momento
  determinara el alto real de la fila — como qué periodo es el más
  alto cambia al navegar, el alto visible de toda la franja cambiaba
  con cada toque.
- **Arreglo:** la barra vive dentro de su propio "carril" de altura
  fija (`h-11`, con la barra alineada abajo DENTRO de él, no del bloque
  entero) — el carril nunca cambia de tamaño, solo el color/alto de la
  barra que hay dentro. El alto total de cada botón (carril + etiqueta
  + punto) pasa a ser constante para los 7 periodos siempre.

**Fusión conceptual (cabecera de periodo + tendencia, "misma
experiencia"):** ambas viven ahora en una única tarjeta (una cabecera
con el selector de granularidad + periodo, un separador, y la franja de
tendencia debajo) en vez de dos bloques sueltos. Las flechas ‹ › de
navegación de un periodo en uno se RETIRAN — la franja ya cubre
exactamente ese caso (sus dos barras vecinas) y además "más lejos" en
un único toque; mantener ambas habría sido duplicar el mismo control
con menos capacidad en uno de los dos, lo contrario de "no añadas
controles por añadir". `goPrev`/`goNext` (ya redundantes con
`shiftPeriod`, introducido en la revisión anterior de esta misma
franja) se eliminan del todo, no se dejan como código muerto.

**Bloque 8 — vocabulario y jerarquía:** "Pagos de compañeros" pasa a
"Ajustes de curso" — Resumen era la última pantalla que aún usaba el
nombre antiguo (Mi trabajo/MovementSheet ya dicen "Ajuste de curso").
Jerarquía revisada: Por escuela → Por curso → Comisiones → Ajustes de
curso → Calendario (antes: Escuela → Curso → Calendario → Comisiones →
Pagos de compañeros). Motivo: las primeras cuatro responden la misma
pregunta ("¿de dónde sale el total?", cada una con su propio corte) y
van juntas; Calendario responde una pregunta distinta ("¿cuándo?", la
más exploratoria de las cinco) y cierra la lista en vez de partirla
en dos mitades.

**Validado:** 319/319 tests (+2 nuevos: sin flechas ‹ ›; Comisiones y
Ajustes de curso preceden a Calendario en el documento — más el ajuste
de nombres en tests existentes), build correcto, `mobile-check` sin
errores — capturas revisadas visualmente: la barra más alta (mes
actual) ya no invade el título "Tendencia...", y el alto de la tarjeta
se mantiene idéntico antes/después de navegar a otro periodo.

**Commit:** `feat(resumen): fusionar cabecera de periodo y tendencia,
arreglar solape/inestabilidad, y renombrar/reordenar secciones`.

### Bloque 9 — Bug de datos de tarifa/movimiento: investigado, causa raíz confirmada, sin parche esta noche

Caso reportado: tarifa creada en línea "Reef Divers – Adventure Dive" a
150, usada en un movimiento de 3 personas → total mostrado 150 (no 450).

**Investigación empírica (no supuesta):** consulta de solo lectura
contra Supabase real (script desechable, borrado tras usarlo, sin
modificar ningún dato) confirmó que la cuenta de esa tarifa tiene un
catálogo `payment_types` propio — "Instructor" (`is_default`) y
"Comisión" — sin ninguna fila "Per Person". El fallback ya documentado
en `docs/ADR/0003-eliminar-payment-type.md` (usa "Per Person" si existe,
si no el `is_default` de la cuenta) asignó la tarifa nueva a
`payment_type: "Instructor"`; `computeRateTotal` solo multiplica por
personas cuando el valor es exactamente "Per Person" — cualquier otro
valor cae al importe fijo. 150 fijo, confirmado, no un cálculo erróneo.

**Veredicto:** ni bug de aritmética ni ambigüedad de negocio sin
resolver — es exactamente la ambigüedad arquitectónica que
`docs/ADR/0003` ya había identificado el 27/08 (`payment_type` es un
catálogo editable por el usuario, pero el cálculo compara contra el
literal `"Per Person"` como si fuera una constante interna). Esta noche
se confirma con un caso real, no solo en teoría. Añadido como addendum
a esa ADR y elevada la evidencia en `docs/BACKLOG.md`.

**Por qué no se ha parcheado esta noche:** un arreglo aislado (forzar
"Per Person" ignorando el catálogo real de la cuenta) sería la misma
clase de parche a medias que la propia ADR-0003 ya advierte no
introducir por separado — el plan de migración ya aprobado ahí
(`importe = tarifa × personas`, sin `payment_type`) resuelve esto de
raíz para cualquier cuenta. Sin commit de código en este bloque, solo
documentación (dos archivos: la ADR y el BACKLOG).

**Commit:** `docs(tarifas): confirmar con datos reales la causa raíz del
bug de payment_type`.

### Bloque 10 — Por escuela: ocultar lo multi-escuela cuando solo hay una

Problema de usuario: con una sola escuela configurada (el caso normal
para un instructor freelance que trabaja para un único centro), varios
controles/secciones solo tienen sentido para comparar entre escuelas —
y con una sola, no comparan nada, solo añaden ruido: el filtro
"Escuela" en Tarifas y Mi trabajo (una única opción posible), la
tarjeta "Por escuela" de Resumen (agruparía todo en un solo grupo
idéntico al total), el desglose "Por escuela" dentro de Comisiones, y
la leyenda de colores por escuela del Calendario de Resumen (un único
color no necesita leyenda).

**Solución:** en los tres archivos, una misma condición derivada
(`schools.rows.length > 1`) oculta cada pieza multi-escuela sin tocar
ningún dato ni regla de negocio — reaparece sola en cuanto existe una
segunda escuela, sin flag ni configuración manual:
- `RatesTab.jsx` / `MiTrabajoTab.jsx`: el filtro "Escuela" (dentro de
  "Filtrar") desaparece con una sola escuela.
- `SummaryTab.jsx`: la tarjeta "Por escuela" se oculta; "Por curso"
  hereda su `defaultOpen` (para que Resumen no empiece con las tres
  tarjetas superiores cerradas); el desglose "Por escuela" dentro de
  "Comisiones" se oculta (el desglose "Por curso" de Comisiones se
  mantiene siempre); la leyenda de colores del Calendario se omite.

Ninguna capacidad existente se pierde: en cuanto el usuario da de alta
una segunda escuela, todo reaparece exactamente igual que antes, sin
necesitar recargar ni cambiar de pestaña.

**Validación:**
- Tests nuevos (mismo patrón en los 3 archivos: helper `render*` acepta
  un override `schools`, un test confirma ausencia con 1 escuela, otro
  confirma reaparición con 2): `RatesTab.test.jsx` (+2),
  `MiTrabajoTab.test.jsx` (+2), `SummaryTab.test.jsx` (+2, incluyendo
  el caso de "Por curso" heredando `defaultOpen`).
- Suite completa: **325/325** tests (`npm run test -- --run`).
- Build: limpio (`npm run build`, sin warnings nuevos — el aviso de
  tamaño de chunk es preexistente).
- `mobile-check`: 41 capturas, **sin errores ni avisos de consola**. La
  cuenta demo usada por `mobile-check` tiene varias escuelas reales, así
  que este pase valida el camino "no se rompe nada con multi-escuela";
  el camino de una sola escuela queda cubierto por los tests unitarios
  con datos controlados (no observable end-to-end sin una cuenta demo
  de una sola escuela, que no existe hoy).

**Commit:** `feat(por-escuela): ocultar funcionalidades multi-escuela
cuando solo hay una configurada`.

### Bloque 11 — Ajustes de curso: sin concepto de "persona"

Problema de usuario: los Ajustes de curso (`colleague_payments`) no
tienen ni han tenido nunca un campo de personas en el modelo de datos
(confirmado en `schema.sql`) — MovementSheet ya no le pide ese dato
desde el rediseño de Mi trabajo. Pero varias vistas agregadas construyen
listas mezclando Curso/Comisión/Ajuste en una forma común, y esa forma
común fuerza `people: 0` en cada Ajuste para que el resto del código
(que sí espera ese campo) no rompa — el problema es que varias de esas
vistas pintaban ese `0` como si fuera un dato real ("0p"), en vez de
tratarlo como un artefacto interno de unificar la forma.

**Auditoría realizada** (Home, Mi trabajo/MovementSheet, Resumen,
Ayuda, calendario, filtros): Mi trabajo (`EntryRowTitle`/`EntryRow`) y
la cifra "personas formadas" de Home ya excluían Ajustes correctamente
— no llevaban el bug. Los 3 puntos reales, todos en el desglose
agregado de Resumen (calendario y listas "Por escuela"/"Por curso",
`shared.jsx` + `SummaryTab.jsx`):
1. Calendario, vista "Total combinado" agrupada por fuente
   (`sourceGroupedBreakdown` en `shared.jsx`): el grupo "Ajuste" del día
   mostraba "0p" en cada línea.
2. Calendario filtrado a un único tipo que no es "Total" (`flatBreakdown`,
   la rama sin agrupar): con el filtro en "Ajuste", cada línea del día
   mostraba "0p".
3. "Por escuela"/"Por curso" (`RankedList`, vía `groupSum`): una escuela
   o curso cuya única actividad del periodo fuera un Ajuste mostraba
   "0p" junto al importe.

**Solución:** en vez de ocultar el badge "por defecto" (lo que también
lo escondería en un grupo mixto con un curso real, perdiendo un dato
legítimo), cada agregador ahora rastrea si TODAS las entradas que
componen esa clave son Ajustes (`allColleague` en `groupSum` y
`flatBreakdown`, comprobación directa de `group.key` en
`sourceGroupedBreakdown`) — el badge de personas solo se oculta cuando
es 100% Ajustes; un grupo mixto (p. ej. un curso real + un ajuste con la
misma escuela) sigue mostrando el recuento real de personas del curso.

**Validación:**
- 3 tests nuevos en `SummaryTab.test.jsx`: "Por escuela" con una
  escuela 100% Ajuste, Calendario en "Total combinado" con un grupo
  mixto Curso+Ajuste el mismo día, Calendario filtrado a "Ajuste".
- Suite completa: **328/328** tests.
- Build: limpio.
- `mobile-check`: 41 capturas, sin errores de consola.

**Commit:** `fix(ajustes-de-curso): ocultar el recuento de personas
cuando el grupo es enteramente Ajustes de curso`.

### Bloque 12 — Añadir movimiento en Home: evaluado, sin cambios

Encargo: valorar si integrar "+" dentro de la tarjeta "Pendiente de
cobrar" sigue siendo la mejor solución para crear un movimiento desde
Home, o si conviene reutilizar visualmente el FAB flotante de Mi
trabajo; implementar solo si hay una mejora clara.

**Estado actual (ya eran 3 vías de creación en Home, sin tocar nada
hoy):** el "+" integrado en "Pendiente de cobrar" (`onQuickAdd`),
tocar un día vacío del calendario, y el propio desglose de un día con
actividad (`onCreateForDay`, ver `MonthCalendar`). Esta integración
(en vez de una fila de botón aparte o un FAB flotante) fue una decisión
ya tomada y documentada en el propio código
(`HomeTab.jsx`, comentario junto a `PendingCollectionCard`) durante el
rediseño de Home/Resumen de esta misma sesión, 2026-08-29: antes era
una fila propia que competía visualmente con la cifra pendiente.

**Análisis (por qué no se cambia a un FAB tipo Mi trabajo):**
- Mi trabajo es una pantalla de lista CRUD pura — el patrón "FAB +
  hoja inferior" (convención #3 de `CLAUDE.md`) está pensado
  exactamente para eso: una lista de registros del mismo tipo de
  contenido, sin nada más compitiendo por atención en pantalla.
- Home es explícitamente lo contrario por diseño de producto: un
  "vistazo rápido" con varias piezas de información distintas en la
  misma pantalla (cifra pendiente, calendario, generado este mes). Un
  FAB flotante fijo (`fixed bottom-24 right-4`) añadiría una CUARTA vía
  de creación, sin sustituir ninguna de las tres existentes, compitiendo
  visualmente con la propia cifra y con el calendario en el mismo
  viewport donde ya caben cómodas dos vías directas (tocar un día,
  desglose de un día).
- Ninguna de las tres vías actuales tiene fricción real detectada ni
  ha recibido ninguna crítica de usuario — el criterio explícito del
  bloque ("no añadir por uniformidad si la solución actual es mejor
  para Home") aplica aquí en sentido literal.

**Decisión:** mantener la integración actual. Sin cambios de código,
sin commit — evaluación documentada aquí.
