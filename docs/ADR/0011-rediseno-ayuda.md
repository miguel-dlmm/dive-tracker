# ADR 0011 — Rediseño de Ayuda: contenido reescrito + menú agrupado

**Fecha:** 2026-08-29
**Estado:** Aprobado e implementado (sesión nocturna autónoma, ver
`docs/SESSION-2026-08-28-rediseno-global.md`).

## Contexto

El contenido de Ayuda (`src/help/content.js`) describía una versión de
la app que ya no existe: Registro/Comisiones/Compañeros/Pagos como
pantallas separadas, "Ganado este mes" (ahora "Generado"), pestañas
horizontales en Configuración, ninguna mención a Mi trabajo ni al
rediseño de Resumen de esta misma sesión. Mantenerlo tal cual habría
significado enseñarle a un usuario real una app que ya no coincide con
lo que tiene delante.

## Decisión

### Contenido reescrito por completo

Mismo esqueleto de artículo que ya existía (`whatYouCanDo`/
`whenToUseIt`/`steps`/`tips`/`expectedResult`, renderizado por
`HelpArticleView.jsx`) — no se rediseñó ese formato porque ya cumplía
bien "pasos, consejos, resultado esperado" sin necesitar nada más. Lo
que cambia es el contenido: reescrito entero para describir Mi trabajo,
Home, Resumen y Configuración tal como quedaron tras esta sesión.

### Menú agrupado en "Quiero..." / "Funcionalidades"

`HELP_CATEGORIES` gana un campo opcional `group` (`"quiero"` |
`"funcionalidades"` | sin valor). `HelpCategoryList.jsx` agrupa por esa
clave con cabeceras de sección — mismo patrón visual que el menú de
Configuración de `ConfigTab.jsx` (`ADR-0008`): fila con icono + título +
descripción + chevron, agrupada bajo un título en mayúsculas. Reutilizar
el patrón en vez de inventar uno propio para Ayuda cumple directamente
el criterio del proyecto de que aprender una pantalla facilite usar las
demás.

- **"Quiero..."** (historias de uso, orientadas a una acción): Registrar
  un movimiento, Cobrar movimientos pendientes, Consultar cuánto has
  generado, Configurar tu aplicación.
- **"Funcionalidades"** (referencia por pantalla, para quien ya sabe qué
  quiere hacer): Mi trabajo, Resumen, Configuración, Filtros y búsqueda.
- **"Primeros pasos"** queda suelta, sin cabecera de grupo, siempre
  primera — no encaja en ninguno de los dos grupos (es contexto general,
  no una acción ni una pantalla).

### Sin capturas de pantalla, misma decisión que en "Qué hay de nuevo"

Se evaluaron capturas reales de esta sesión (Home, Mi trabajo, Resumen)
para ilustrar los pasos — ninguna era presentable: mostraban el nombre
de la cuenta de desarrollo ("dev-bypass") y datos de prueba repetidos
acumulados durante la noche. `HelpStep.jsx` ya soporta un campo `image`
opcional (sin usar desde antes de esta sesión) para cuando existan
capturas limpias generadas a propósito — no se ha tocado ese mecanismo,
solo se ha decidido no usarlo todavía con material no presentable.

## Efecto secundario encontrado y corregido: scroll no se reinicia al cambiar de pestaña

Verificando el nuevo menú agrupado con `mobile-check`, la cabecera
"Quiero..." y la tarjeta "Primeros pasos" no aparecían en la primera
captura — no por un fallo del contenido, sino porque `AppShell`
(`App.jsx`) nunca reiniciaba el scroll de la página al cambiar de
pestaña. Tras hacer scroll en Resumen (para comprobar la cabecera
sticky) y entrar en Ayuda, la pantalla nueva heredaba la posición de
scroll de la anterior, mostrando el menú a mitad en vez de desde arriba.

No es un problema del rediseño de Ayuda ni de ninguna pantalla en
concreto — es la navegación entre pestañas en general, así que la
corrección vive en `AppShell` (`useEffect(() => window.scrollTo(0, 0),
[tab])`), no en una pantalla suelta. Cualquier cambio de pestaña futuro
queda protegido por el mismo efecto.

## Consecuencias

- El contenido de Ayuda vuelve a describir la app real; un usuario que
  lo siga hoy llega al resultado que promete.
- El menú agrupado dejó sitio, sin coste adicional, para futuras
  categorías en cualquiera de los dos grupos sin rediseñar la pantalla.
- El fix de scroll-al-cambiar-de-pestaña beneficia a toda la
  navegación, no solo a Ayuda — un efecto colateral positivo de validar
  visualmente con `mobile-check` en vez de dar el contenido por bueno
  solo con el build pasando.

## Addendum (2026-08-29) — orden por flujo real y cobertura de los 3 tipos de movimiento

Encargo explícito: revisar Ayuda contra caminos de usuario concretos
(configurar primero → crear un movimiento de cada tipo → cobrar uno →
cobrar en bloque → entender el flujo general), no solo contra la lista
de pantallas actuales.

**Reorden de "Quiero...":** las cuatro categorías vivían en el orden en
que se rediseñaron las pantallas (crear, cobrar, consultar, configurar),
no en el orden en que un usuario nuevo las necesita. Pasan a: Configurar
tu aplicación → Registrar un movimiento → Cobrar movimientos pendientes
→ Consultar cuánto has generado — el mismo orden que ya sugería, sin
decirlo explícitamente, el propio artículo de "Crear un movimiento"
("revisa que tus tarifas estén dadas de alta").

**Contenido nuevo en "Crear un movimiento":** el artículo trataba los 3
tipos (Curso, Comisión, Ajuste) como una única mecánica ("el mismo
formulario, elige el tipo"), correcto a nivel de interfaz pero
insuficiente para "quiero crear un movimiento de cada tipo" — no
explicaba qué es distinto de cada uno. Se añade un paso por tipo: Curso
(depende de una tarifa de curso), Comisión (mismo mecanismo, tarifa de
comisión, para un cliente referido), Ajuste (sin tarifa, importe y
compañero manuales, puede ser negativo).

**Contenido reforzado en "Cobrar movimientos pendientes":** ya cubría
"cobrar uno" y "cobrar en bloque", pero como una mención breve dentro de
la misma lista de pasos, sin distinguir cuándo usar cada uno. Se separan
en dos flujos explícitos dentro del mismo artículo (uno a uno vs. "Cobrar
todos" con filtro previo) y se añade el widget de Home ("Los más
antiguos por cobrar", ver el bloque de esta misma sesión en
`docs/SESSION-2026-08-28-rediseno-global.md`) como una tercera vía para
cobrar uno sin salir de Home.

**"Entender el flujo general":** no existía como pregunta explícita en
ningún artículo — "Primeros pasos" describía las 3 pantallas pero no el
orden de uso. Se añade una guía explícita de 3 pasos (configurar →
crear → cobrar) en sus tips, remitiendo a las categorías "Quiero..."
correspondientes.

Sin cambios de código de producto, solo de contenido (`src/help/content.js`)
y de orden de categorías — verificado que ningún test depende del orden
del array (`HelpCategoryList` preserva el orden de `HELP_CATEGORIES`,
solo filtra por `group`).

## Addendum (2026-08-30) — de índice a guía viva: se retira la navegación por pantallas

**Feedback explícito:** "Ahora hay un primer nivel y, cuando entro, un
segundo nivel con un solo item. Ese patrón no me gusta: es el antipatrón
de lo que queremos en Ocean Flow (...) Quiero que la ayuda se comporte
más como una guía viva que como un índice pobre."

**Causa raíz confirmada en el propio contenido:** las 8 categorías de
`HELP_CATEGORIES` tienen, cada una, exactamente **un** artículo. El
modelo de navegación por pantallas que el addendum anterior (2026-08-29)
heredó sin cuestionar — categorías → lista de artículos de la categoría
→ artículo — hacía que la pantalla intermedia ("lista de artículos")
mostrara siempre, literalmente, una sola fila: la misma información que
la propia categoría ya anunciaba, repetida, antes de por fin llegar al
contenido real. No era un artículo mal escrito ni un problema de
contenido — la mecánica de navegación estaba resolviendo un problema
("varios artículos por categoría") que no existe hoy en ningún sitio.

**Decisión:** en vez de "arreglar" esa pantalla intermedia (p. ej.
saltándola automáticamente cuando hay un único artículo, un parche que
seguiría arrastrando el modelo de 3 pantallas por si algún día hiciera
falta), se retira el modelo de navegación por pantallas entero. Ayuda
pasa a ser **una sola página que se recorre haciendo scroll**, con cada
categoría como una `ExpandableCard` — el mismo componente que Resumen ya
usa para "Por escuela"/"Por curso"/Comisiones/Calendario (extraído a
`shared.jsx` en este mismo cambio, al ganar un segundo consumidor real).
Tocar una categoría despliega su artículo completo en el sitio; no hay
"volver" porque no hay ningún nivel de profundidad que atravesar.

**Por qué esto y no otra cosa:**
- Misma interacción que ya existe y funciona en Resumen — no una tercera
  forma de plegar/desplegar contenido en la misma app (criterio explícito
  del proyecto: "no quiero soluciones distintas para la misma
  interacción").
- Resuelve el antipatrón de raíz, no solo su síntoma más visible (el
  "segundo nivel con un solo item") — no queda ninguna pantalla ni
  transición que solo exista para sostener una jerarquía que el contenido
  real no tiene.
- "Guía viva" encaja mejor con un documento único explorable de un
  vistazo (con secciones que se abren bajo demanda) que con un asistente
  de varias pantallas — más cerca de un FAQ/manual que de un flujo con
  pasos.

**Qué deja de hacer falta, y por qué es correcto que desaparezca (no un
recorte):** `HelpCategoryList.jsx` y `HelpArticleList.jsx` (pantallas de
navegación) se eliminan — ninguna aporta ya nada que la propia lista de
`ExpandableCard`s no resuelva. `HelpArticleView.jsx` se sustituye por
`HelpArticleBody.jsx` (mismo contenido visual — pasos numerados, aviso de
consejos, resultado esperado — sin el título/resumen/botón de "volver"
que ahora pone la propia tarjeta). El gesto de "deslizar para volver"
(`useSwipeBack`, añadido en el bloque anterior de esta misma sesión para
Configuración y Ayuda) deja de aplicarse a Ayuda por el mismo motivo: sin
niveles de navegación, no hay "atrás" al que volver — sigue aplicándose
a Configuración, que sí conserva jerarquía real (menú → sección).

**Si algún día una categoría necesita más de un artículo:** es una
decisión de contenido/estructura nueva que tomar en ese momento (con esa
necesidad real delante), no algo que este cambio deba prever de
antemano — construir esa flexibilidad hoy, sin ningún caso real que la
use, sería exactamente la sobreingeniería que este proyecto evita a
propósito.

## Addendum (2026-08-30, segunda vuelta) — acordeón (no independientes) + misma regla de persistencia que Configuración

**Vuelve el gesto de "atrás", ahora recursivo — y con él, una categoría a
la vez:** el addendum anterior retiró `useSwipeBack` de Ayuda razonando
que "sin niveles de navegación, no hay 'atrás' al que volver". Eso dejó
de ser cierto en cuanto Configuración adoptó "recargar conserva el
contexto, cerrar con 'X' reinicia" (ver ADR-0008, mismo addendum) y se
pidió aplicar el mismo criterio a Ayuda: para que "recargar mantenga la
pantalla actual" tenga sentido aquí, tiene que existir una única
"pantalla actual" que persistir — con varias `ExpandableCard`
independientes abiertas a la vez (el comportamiento hasta ahora), no hay
una respuesta clara a "¿cuál es la actual?" ni a "¿qué colapsa el gesto
de atrás?".

Se resuelve convirtiendo las categorías en un **acordeón** (como mucho
una desplegada a la vez, mismo criterio que el menú con drill-down de
Configuración) en vez de plegables independientes. `ExpandableCard`
(`shared.jsx`) gana un modo controlado opcional (`open`/`onToggle`) para
esto — sin pasarlos, sigue funcionando exactamente igual que antes
(Resumen, sin necesidad de coordinar varias tarjetas entre sí).

**Misma regla que Configuración, mismo mecanismo:** la categoría abierta
se persiste en `sessionStorage` (`oceanpulse:helpOpen`) y sobrevive a una
recarga; cerrar Ayuda con la "✕" la limpia (vía `closeSecondary` en
`App.jsx`, igual que `oceanpulse:configSection`) para que la próxima
apertura vuelva al índice plegado. El gesto de deslizar hacia la derecha
es recursivo: con una categoría abierta, la colapsa; sin ninguna abierta,
cierra Ayuda entera (llama al mismo `onClose` que la "✕") — el mismo
vocabulario de gesto que Configuración, en el mismo nivel de recursión.

`HelpTab` recibe ahora un prop `onClose` con el mismo contrato que
`ConfigTab` (ver ADR-0008): opcional, sin él el swipe en el índice
simplemente no hace nada.
