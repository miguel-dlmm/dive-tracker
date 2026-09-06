# Ocean Flow — Rediseño completo v2: progreso

> Documento de progreso de la iniciativa "Rediseño completo de Ocean
> Flow", pedida por el usuario el 2026-09-06 en rama separada
> (`feature/rediseno-v2`, creada desde `develop`). Sigue el mecanismo de
> "Trabajo por fases en iniciativas largas" de `CLAUDE.md` (sección 9):
> una sesión nueva debe poder leer solo este documento y continuar
> exactamente donde se quedó la fase anterior. No sustituye la
> documentación de decisiones (ADR/PRODUCT.md/BACKLOG.md) — enlaza a
> ella, no la repite.

## Encargo original (resumen)

Rediseño visual de principio a fin de Ocean Flow, en rama separada,
partiendo del logo nuevo y su paleta (dos JPG entregados en la raíz del
repo), investigado con fuentes contrastadas (competencia + tendencias),
sin perder ninguna funcionalidad existente. Empezar por el libro de
estilo y mostrarlo antes de propagarlo a pantallas. Ideas descartadas
por complejas se documentan como backlog/roadmap, no se descartan sin
más. Al final, justificación del diseño elegido apoyada en lo
investigado.

## Fase 1 — Investigación + Libro de estilo v1 (2026-09-06)

**Estado: ✅ cerrada — libro de estilo y commit aprobados por el usuario
(commit `edf64c8` en `feature/rediseno-v2`, sin fusionar ni pushear).
Lista para empezar Fase 2 en una próxima sesión.**

### Qué se hizo

- **Rama `feature/rediseno-v2`** creada desde `develop` actualizada.
  Nada de esto toca `develop` hasta que se apruebe explícitamente.
- **Extracción real de la paleta del logo**: los dos JPG no traían
  valores hex — se instaló Pillow localmente (`pip3 install --user
  Pillow`, no toca `package.json` ni el bundle) y se muestrearon los
  píxeles de los 4 fondos de la lámina de marca. Valores reales
  confirmados: navy `#00335A`, sky blue `#81ADD0`, negro cálido
  `#191919`, blanco `#FFFFFF`.
- **Auditoría de lo ya construido** antes de proponer nada nuevo (regla
  "MVP y reutilización primero"): `docs/ESTILO.md`, `docs/PRODUCT.md`,
  `src/colors.js`, `src/App.jsx` (arquitectura de navegación real: 3
  tabs primarios + 4 accesos secundarios — ya alineado con buenas
  prácticas de zona de pulgar, no hacía falta rediseñarlo), `motion.js`
  (ya fundamentado en los tokens de movimiento de Material Design 3),
  `index.css` (Inter vía Google Fonts, decisión ya tomada y ya
  justificada con precedente real — Stripe/Linear/Mercury). Se encontró
  también la rama sin fusionar `feature/design-lab-preview`
  (2026-08-27): 5 direcciones visuales exploratorias, previas al
  rebranding a "Ocean Flow" y al logo nuevo — superada por este trabajo,
  pero su hallazgo de "glass solo en cabecera/FAB, nunca en el fondo del
  contenido" se reutiliza aquí porque sigue siendo válido.
- **Benchmarking con fuentes contrastadas** (ver "Fuentes" en
  `docs/DESIGN-SYSTEM.md` para el listado completo con enlaces):
  earnings-apps de la economía de plataformas (Gridwise 2025, DoorDash),
  apps de contabilidad para autónomos (Wave, QuickBooks Solopreneur,
  Bonsai), Material Design 3 (color HCT, tokens de movimiento —
  reafirma lo que motion.js ya hacía), Apple HIG + Liquid Glass
  (WWDC25), WCAG 2.2 (contraste), investigación de legibilidad al sol,
  apps de buceo (Diviac/PADI/Subsurface — conclusión: el análogo
  funcional real de Ocean Flow no son estas, sino las apps de earnings
  de economía de plataformas, porque Ocean Flow es una herramienta de
  dinero para un profesional del buceo, no una herramienta de buceo).
- **Libro de estilo v1** escrito en `docs/DESIGN-SYSTEM.md` (fuente de
  verdad futura para el código, sustituye/extiende `docs/ESTILO.md`) +
  una versión visual navegable (Artifact) para revisión humana real de
  color/tipografía/logo/spacing/motion/estados antes de tocar código.
  A petición explícita del usuario a mitad de esta fase, se profundizó
  especialmente en **controles** (estados completos de botón/FAB/campo/
  switch/pill/menú/diálogo/hoja — antes `docs/ESTILO.md` decía solo qué
  componente reusar, no fijaba sus estados visuales uno a uno),
  **iconografía** (tabla de tamaño/grosor/color por contexto + un
  indicador de pestaña activa nuevo, patrón "active indicator" de
  Material 3 Navigation Bar) y **tipografía** (tracking por token,
  reglas de medida/truncado, separación explícita entre peso 800
  reservado a cifras y 700 como máximo para texto).

### Decisiones tomadas en esta fase (con su porqué)

1. **Tipografía: se mantiene Inter única**, no se introduce una segunda
   fuente para "hacer eco" de la rotulación redondeada del logotipo. La
   decisión ya existente en el código (comentario en `index.css`) cita
   precedente real (Stripe/Linear/Mercury); el carácter "joven y
   cercano" de la marca se transmite con color, radio de esquina,
   iconografía y motion — no mezclando tipografías. Ver "Ideas
   descartadas" para el detalle de alternativas evaluadas.
2. **Sky blue (`#81ADD0`) es un color de superficie/decorativo, nunca
   texto o icono funcional pequeño.** Medido con la fórmula de
   contraste WCAG: sky blue sobre blanco da 2.38:1 (no pasa ni el
   mínimo de 3:1 para elementos grandes); sobre navy sí pasa (5.44:1).
   El logotipo en blanco sobre sky blue es válido porque WCAG exime
   explícitamente a los logotipos del requisito de contraste — no
   porque el par sea válido para UI real. Justifica por qué, en el
   sistema de color nuevo, sky blue se reserva para fondos de tarjeta/
   superficies decorativas y nunca para texto.
3. **Dark mode: no se construye en esta fase, pero el sistema de
   tokens se diseña para no bloquearlo.** El propio logo incluye una
   variante para fondo casi negro (`#191919`) — señal real de que la
   marca ya contempla un tema oscuro — pero construirlo de verdad para
   las ~9 pantallas de la app es un salto de alcance grande. Se opta
   por el MVP: tokens semánticos (no valores hardcodeados por pantalla)
   para que activar un tema oscuro más adelante sea "cambiar valores de
   token", no "reescribir cada pantalla". Dark mode real queda anotado
   como ítem de roadmap en `docs/BACKLOG.md`.
4. **Glass/blur solo en capas flotantes (cabecera, FAB, hojas), nunca
   en el fondo de contenido.** Coincide con el hallazgo ya existente de
   `feature/design-lab-preview` y con la dirección de toda la industria
   en 2025-2026 (Liquid Glass de Apple, WWDC25) — y es coherente con la
   restricción real de uso de Ocean Flow (sol, manos mojadas): el
   contenido con el que se lee/decide (importes, fechas) nunca pierde
   contraste por un efecto visual.
5. **Arquitectura de navegación (3 tabs + accesos secundarios) se
   mantiene.** Ya está alineada con la evidencia de zona de pulgar
   (accesos primarios abajo, secundarios en cabecera) — no hay problema
   real que resolver ahí, cambiarla sería complejidad sin necesidad
   (principio de producto #1).

### Ideas evaluadas y descartadas por ahora (roadmap, no basura)

Ver la sección "Ideas descartadas / roadmap" de `docs/DESIGN-SYSTEM.md`
para el detalle completo con coste estimado. Resumen:

- Dark mode real (ver decisión 3 arriba) — Esfuerzo L, valor real pero
  no bloqueante.
- Color dinámico estilo Material You (paleta que reacciona a wallpaper/
  contenido) — sobreingeniería clara para una app de un único usuario
  con marca ya definida; **no hacer**, no solo "después".
- Glass real (blur con backdrop-filter) en cabecera — placeholder con
  color sólido semitransparente en v1 por coste de rendimiento en
  gama baja de Android sin medir todavía; revisar con datos reales de
  rendimiento antes de activarlo. Esfuerzo S una vez medido.

## Hallazgo lateral (2026-09-06) — bundle de producción, implementado ya como arranque de Fase 2

Al revisar el aviso de "chunk >500kB" del build (fuera del alcance
original de esta iniciativa, pero descubierto investigándolo a fondo a
petición del usuario), se confirmó con análisis real de sourcemap
(no solo el aviso genérico de Vite) que **`lucide-react` aporta el 36%
del peso del bundle aunque la app solo usa 64 iconos de los más de 1000
que tiene la librería**. Causa exacta: `shared.jsx`, `ProfileTab.jsx` y
`HelpTab.jsx` hacen `import * as Icons from "lucide-react"` y resuelven
el icono por nombre en runtime (`Icons[nombreGuardadoEnSupabase]`) —
necesario porque el nombre viene de datos, pero eso bloquea el
tree-shaking de la librería entera. Confirmado también que `pdf-lib`/
`pdfjs-dist` (Training Records) **no** están en el bundle hoy —
correctamente eliminados porque esa pantalla no tiene punto de entrada
en la UI; si se reactiva Training Records en el futuro, aplicar la
misma disciplina ahí (`src/trainingRecords/pdfToJpg.js` también usa
`import * as pdfjsLib`, mismo patrón de riesgo, hoy irrelevante porque
es código inalcanzable).

**Decisión del usuario, actualizada:** en vez de aplazarlo a cuando le
tocara el turno a Mi perfil, adelantarlo y hacerlo ya como primer
bloque de implementación de Fase 2. Las 3 tareas resueltas en el mismo
cambio (todas tocan `avatarCatalog.js`/`ProfileTab.jsx`/`shared.jsx`/
`HelpTab.jsx`):

1. **✅ Tree-shaking arreglado.** Los 3 `import * as Icons from
   "lucide-react"` (`shared.jsx`, `ProfileTab.jsx`, `HelpTab.jsx`)
   sustituidos por mapas explícitos de iconos nombrados:
   `LOADING_ICONS` en `shared.jsx` (mismas 6 claves que `ICON_OPTIONS`
   de `ConfigTab.jsx`), `CATEGORY_ICONS` en `HelpTab.jsx` (mismas
   claves que los `icon:` de `help/content.js`), y `Avatar`
   (`shared.jsx`) más `InstructorCard` (`ProfileTab.jsx`) pasan a
   reusar `iconByName()` de `avatarCatalog.js` en vez de resolver el
   nombre por su cuenta — elimina también la duplicación que ya se
   había detectado. **Resultado real, medido con build**: 1,59MB →
   968KB minificado (**−39%**, mejor que el ~1,0-1,1MB estimado).
   754/754 tests y build en verde; verificado además en navegador real
   (loading, Ayuda, avatar) sin ningún error de consola.
2. **✅ Catálogo de avatares ampliado de 6 a 14.** Se relaja el
   criterio de `docs/ESTILO.md` (2026-09-04) de "solo animales marinos
   reales" a "iconografía real de mar/buceo" — y de paso se retiran las
   4 sustituciones forzadas que ya estaban documentadas como débiles
   (Shrimp haciendo de tiburón ballena, Snail de manta, Shell de pulpo,
   FishSymbol de tiburón): ahora cada icono representa lo que su
   nombre dice, ninguno finge ser un animal que no es. Los 6 animales
   reales se mantienen (representándose a sí mismos) y se añaden 8
   iconos de mar/buceo: Anchor, Compass, LifeBuoy, Sailboat, ShipWheel,
   Bubbles, TreePalm, Droplets — 4 de ellos ya eran iconografía de
   marca aceptada en otro sitio de la app (`ICON_OPTIONS` del icono de
   carga), así que no es un lenguaje visual nuevo.
3. **✅ Selector de avatar en carrusel horizontal.** Sustituye el
   `grid grid-cols-3` estático (que con 14 iconos habría crecido a 5
   filas) por `IconCarousel` (nuevo, local a `ProfileTab.jsx` — se
   extrae a `shared.jsx` si aparece un segundo uso real): una sola fila
   con scroll-snap + flechas prev/siguiente, altura constante
   independientemente del tamaño del catálogo. Documentado en
   `docs/DESIGN-SYSTEM.md` §6 como patrón "Selector en carrusel
   horizontal". Textos de accesibilidad de las flechas nuevos en
   `profile.json` (es/en): `avatar.previousIcon`/`avatar.nextIcon`.

## Fase 2 — Propagación a pantallas (arrancada 2026-09-06)

**Estado: 🟡 en curso.** Dos bloques implementados hasta ahora:

### Bloque 1 — Iconografía/avatar (ver "Hallazgo lateral" arriba)

Tree-shaking de iconos, catálogo de avatares ampliado, carrusel.

### Bloque 2 — Logo, cabecera y navegación global

- **Logo real en la cabecera**: sustituye el icono `Waves` de
  `lucide-react` por el logo entregado. Como el logo solo existe como
  foto/JPEG (sin vectorial disponible — el usuario lo confirmó
  explícitamente al preguntarle), se recortó el símbolo con Pillow
  (fondo blanco → transparencia real, no solo blanco puro) y se usa
  como `<img>` en `public/brand/logo-mark-navy.png`. Documentado en el
  propio código (`App.jsx`) para sustituir por un `<svg>` real en
  cuanto exista un vectorial oficial.
- **Favicon/iconos PWA/OG image generados** (antes placeholders que ni
  siquiera existían como archivo, según `CLAUDE.md`): `icon-192.png`/
  `icon-512.png`/`og-image.png` a partir del logo (fondo navy + símbolo
  blanco, mismo criterio de "tile de marca" para los tres). `icon.svg`
  (favicon) pasa a ser un SVG que envuelve el PNG en base64 — evita
  tocar el `<link rel="icon" type="image/svg+xml">` de `index.html`
  mientras no haya vectorial real. `theme-color` (index.html y
  manifest.json) actualizado al navy nuevo (`#00335A`).
- **Tokens de marca nuevos** en `src/colors.js`: `BRAND_NAVY`,
  `BRAND_SKY`, `BRAND_INK` — añadidos sin tocar `NAVY`/`TEAL`/etc.
  existentes (esos se migran pantalla a pantalla, no de golpe). Usados
  hoy solo en la cabecera (wordmark + iconos de "cerrar"/Ayuda/
  Configuración).
- **Indicador de pestaña activa** en la navegación inferior (§7.1 de
  `docs/DESIGN-SYSTEM.md`, patrón Material 3 Navigation Bar): píldora
  de fondo `BRAND_SKY` tras el icono+etiqueta activos — el color del
  propio icono lo sigue decidiendo `sectionColor()` (dato de negocio,
  convención #2 de `CLAUDE.md`), la píldora es un "estás aquí" genérico
  aparte, no una repintada del acento de sección.
- Corregido de paso un error real de lint nuevo (`react-hooks/
  static-components`, no estaba en la lista de reglas ya desactivadas
  de `eslint.config.js`): `iconByName()` no puede llamarse como función
  en el punto donde se asigna la etiqueta JSX — se añadió
  `AVATAR_ICON_MAP` (objeto plano) en `avatarCatalog.js`, mismo patrón
  ya usado por `LOADING_ICONS`/`CATEGORY_ICONS`.
- **Ampliado a petición explícita del usuario** ("revisa que los
  loadings también se actualizan con el logo y todas las posibles
  referencias") — auditoría completa de `Waves` en todo `src/`:
  - **`AppLoading` (spinner genérico, `shared.jsx`)**: nueva opción
    `"Logo"` — el logo real, no un icono de `lucide-react`. Como es un
    PNG (sin vectorial, no se puede recolorear con `color` como un
    icono de stroke), el efecto de "relleno" se consigue superponiendo
    dos copias de la imagen (una atenuada de fondo, otra recortada por
    la animación) en vez de dos copias coloreadas distinto del mismo
    icono — mismo `oceanFill` de siempre. `"Logo"` pasa a ser el valor
    por defecto: `ICON_OPTIONS` (`ConfigTab.jsx`) lo añade primero,
    `App.jsx` lo usa como fallback si no hay fila de configuración, y
    `schema.sql`/`seed.sql` lo fijan como default para instalaciones
    nuevas. La fila real de `app_config` en la base de datos TEST
    actual también se actualizó a `"Logo"` (dato, no esquema — un
    `UPDATE` de una fila, ejecutado con un script de un solo uso y
    borrado después) para que el efecto sea visible ya, no solo en
    instalaciones futuras.
  - **Las 7 pantallas de autenticación** (Login, Registro, Olvidé mi
    contraseña, Restablecer contraseña, Crear contraseña, Actualización
    forzada de contraseña, Aceptar términos legales) mostraban el mismo
    icono `Waves` como marca antes de iniciar sesión — todas pasan al
    logo real. Las 3 que además muestran el texto "Ocean Flow" (Login,
    Registro, Olvidé mi contraseña) actualizan también ese texto a
    `BRAND_NAVY`, igual que la cabecera.
  - **Watermark del carnet de instructor** (`InstructorCard`,
    `ProfileTab.jsx`): el `Waves` decorativo en la esquina del carnet
    pasa a `logo-mark-white.png` (variante blanca del logo, nueva —
    fondo del carnet es oscuro).
  - Verificado uno por uno en navegador real (login, spinner con la
    animación de relleno, watermark del carnet) — sin errores de
    consola en ningún caso.
- **No tocado todavía** (a propósito, fuera del alcance de este
  bloque): ningún color interior de pantalla (`TEAL`/`CORAL`/etc.) — eso
  sigue el orden original: Home → Mi trabajo → Resumen → Tarifas →
  Configuración/Ayuda.

## Bloque 3 — Resto de pantallas + fundamentos compartidos (2026-09-06)

A petición explícita del usuario ("prueba paquetes más grandes de
mejoras acumuladas, ahorra commits"), este bloque cierra de una vez
toda la migración de color pendiente en vez de ir pantalla a pantalla
con un commit cada una:

- **Resumen** (`SummaryTab.jsx`): cifra de "Total combinado" (fondo
  sólido, antes un `NAVY` distinto del resto de la app), pestaña "Total"
  activa, mes seleccionado en la tendencia, `ExpandableCard` de "Por
  escuela"/"Calendario". Sin tocar los colores por fuente
  (Curso/Comisión/Ajuste — categóricos, `SOURCE_META`/`MOVEMENT_TYPE_META`).
- **Tarifas** (`RatesTab.jsx`): importe de cada tarifa, contador "N
  tarifas", "Filtrar" activo, color de respaldo de la hoja de alta.
- **Configuración** (`ConfigTab.jsx`, el archivo más grande, 17 usos):
  FAB genérico de `CrudTable`, botones "Guardar"/"Copiar enlace"/
  "Enviar invitación"/"+ Nuevo usuario", icono de rol admin, "Editar"/
  "Regenerar enlace" de un usuario, estado activo del selector de icono
  de carga (incluida su vista previa, ya con el logo real de fondo),
  badge de icono de cada fila del menú principal (antes `#F0FDFA` fijo,
  ahora `${BRAND_NAVY}1A`, coherente con el resto), botón "‹ volver" y
  título de sección. Sin tocar el fallback de `sectionColor` (sigue
  siendo `TEAL`, como en Mi trabajo/Ayuda — solo se usa si una sección
  no tiene color propio en `nav_sections`).
- **Ayuda** (`HelpTab.jsx`): icono de "Ver qué hay de nuevo".
- **Mi perfil** (`ProfileTab.jsx`, no estaba en el plan original pero
  comparte código con Configuración): título de cada tarjeta, badge de
  editar sobre el avatar, aro de selección de color, "Editar" del
  carnet, botón de guardar contraseña, aciertos de requisito de
  contraseña. El degradado del carnet de instructor (antes NAVY→TEAL→
  AQUA, tres colores de la paleta antigua) pasa a un degradado de dos
  tonos de marca (`BRAND_NAVY` → `BRAND_SKY`, con el segundo stop más
  allá del 100% para que el azul claro nunca sature del todo la esquina
  y el texto blanco del carnet mantenga contraste).
- **Fundamentos compartidos** (`shared.jsx`): título de `ErrorBoundary`,
  cabecera mes/año y punto de "hoy" de `MonthCalendar`, color por
  defecto de `ExpandableCard` — al vivir en la librería de componentes,
  este cambio se propaga solo a cualquier pantalla que ya use estos
  componentes. `AppLoading` cambia también su color por defecto
  (`BRAND_NAVY` en vez de `TEAL`) para los iconos de `lucide-react`
  alternativos al logo real.
- Ningún color categórico (colores por tipo de movimiento, colores de
  entidad de negocio vía `colorFor`) se ha tocado en ningún archivo —
  mismo criterio que en Home/Mi trabajo.

Verificado: `npm run lint` (0 errores), `npm run test -- --run`
(754/754), `npm run build` (correcto) una única vez para todo el
bloque, más verificación visual real en navegador de las 5 pantallas
(Resumen, Tarifas, Configuración, Ayuda, Mi perfil) — sin errores de
consola en ninguna.

## Justificación final del diseño

Añadida como sección nueva ("08 — Justificación") al mismo Artifact del
libro de estilo (no un documento aparte) — cierra el encargo original
("justificación del diseño elegido apoyada en lo investigado"): qué
decía la intuición vs. qué dijo la fuente en las 4 decisiones grandes,
por qué se mantuvieron Inter/la navegación/los tokens de tema oscuro
sin construir, cómo salió el hallazgo de bundle de investigar (no de
buscarlo), y una tabla de qué se entregó vs. qué queda.

## Estado de la Fase 2

**Completa.** Las 4 pantallas del plan original (Home, Mi trabajo,
Resumen, Tarifas) más Configuración/Ayuda/Mi perfil ya usan los tokens
de marca nuevos donde corresponde. Pendiente real, no de esta
iniciativa: nada bloqueante — quedan como ideas de roadmap ya
documentadas en `docs/DESIGN-SYSTEM.md` §9 (dark mode, blur real,
code-splitting de `pdf-lib`) y el refactor de `AppLoading` para animar
el logo real también con los iconos alternativos de `lucide-react`
(hoy solo la opción "Logo" usa la imagen real, el resto del catálogo
sigue siendo iconos coloreados).
