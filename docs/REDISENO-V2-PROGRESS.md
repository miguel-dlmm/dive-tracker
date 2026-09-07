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

## ⚠️ Pendiente para el despliegue a producción — cambios de DATOS, no de código

Dos ajustes de esta iniciativa viven en la **base de datos**, no en el
código — `schema.sql`/`seed.sql` ya quedaron actualizados para
instalaciones nuevas, pero la base de datos de producción real (la de
`main`, separada de la de TEST) ya tiene sus propias filas y no se
actualiza sola al fusionar esta rama. Antes de dar por cerrado el
despliegue de este rediseño a producción, ejecutar ahí también:

1. **`app_config.logo_icon`** → `'Logo'` (antes `'Waves'`), para que el
   spinner de carga use el logo real en vez del icono genérico:
   ```sql
   update app_config set logo_icon = 'Logo' where id = true;
   ```
2. **`nav_sections.color`** de `trabajo`/`log`/`comisiones` → `#00335A`
   (antes `#0F766E`/`#0E7C7B`, el teal viejo heredado de antes del
   rediseño) — afecta al FAB de Mi trabajo, su pestaña activa, y los
   iconos de categoría de Ayuda que comparten el mismo color de
   sección. `colegas` (`#64748B`, gris) no se toca — nunca fue el teal
   de marca, es un color real y distinto:
   ```sql
   update nav_sections set color = '#00335A' where key in ('trabajo', 'log', 'comisiones');
   ```

Ya ejecutados y verificados en la base de datos TEST (ver commits de
esta fase) — pendientes solo en producción, el día que se decida
publicar este rediseño ahí.

## Bloque 4 — Primer paso de controles finos (2026-09-06)

Arranque de la parte de §4/§6 de `docs/DESIGN-SYSTEM.md` que quedaba
sin propagar (radios, foco, elevación) — no exhaustivo todavía, dos
cambios de alto impacto por vivir en componentes compartidos:

- **`Sheet`** (`shared.jsx`): esquinas superiores de `rounded-t-xl`
  (12px) a `radius-sheet` (20px, valor arbitrario de Tailwind — no hay
  utilidad exacta en la escala por defecto); fondo del backdrop de
  `bg-black/25` (negro genérico) a `bg-[#191919]/45` (`brand-ink`,
  coherente con el resto de la marca). Cascada automática a toda hoja
  de la app (Home, Mi trabajo, Tarifas, Configuración...).
- **`inputCls`** (`shared.jsx`, reusado por `Field`/`Select`/
  `MultiSelect`/`SearchSelect`/`DatePicker`/`MoneyInput`): borde de
  foco de `focus:border-gray-400` (gris genérico) a `focus:border-
  [#00335A]` + halo `focus-visible:ring-[#81ADD0]` (antes sin color de
  anillo definido) — mismo criterio de §6.3.

**Sin hacer todavía** (alcance real, no bloqueante): normalizar el
radio de cada botón individual (`rounded-md` en decenas de sitios,
6px, frente al `radius-control` de 10px del libro de estilo) — coste
alto (tocar cada botón) para una diferencia visual de 4px, se deja
fuera de esta fase por relación esfuerzo/beneficio baja salvo que se
pida explícitamente.

## Fase 3 — Rediseño estructural (arrancada 2026-09-06)

Distinta de la Fase 2 (identidad de marca): el usuario preguntó
explícitamente "¿no queda nada más del rediseño?" y confirmó que sí
quería entrar en la parte más ambiciosa del encargo original —
"cambiar todo de sitio, calendarios, inputs, bloques/acciones
nuevas" — que hasta ahora no se había tocado (la Fase 2 fue
deliberadamente conservadora: solo color/logo, cero cambios de layout
o de comportamiento).

**Criterio explícito para esta fase**: no inventar cambios porque "hay
que cambiar algo" — cada pieza necesita una justificación real (un
problema de uso concreto, o un patrón ya establecido en la propia app
que falta extender), igual que el resto de la iniciativa. Auditar cada
área nombrada (calendarios, inputs, navegación de Configuración) para
encontrar huecos reales en vez de asumir que todo necesita cambiar —
varias de esas áreas (tipos de input de `MoneyInput`, patrón FAB+Sheet)
ya estaban bien resueltas de sesiones anteriores.

### Bloque 1 — Deslizar para cambiar de mes en el calendario

**Hueco real encontrado**: `MonthCalendar` solo navegaba con las
flechas ‹/› — sin gesto de deslizar, el único patrón de navegación de
calendario que le faltaba frente a cualquier calendario nativo de
móvil (iOS/Android). La propia app ya usa gestos de deslizar en otros
sitios (`useSwipeBack` en Configuración/Ayuda, arrastrar para cerrar
en `Sheet`) — no era un patrón nuevo para el proyecto, solo le faltaba
aplicarse aquí.

**Qué se hizo**: `useSwipeHorizontal` (nuevo, `motion.js`) — hermano
bidireccional de `useSwipeBack`, mismo umbral y misma lógica de
"predominantemente horizontal" (no duplicar un segundo criterio de
sensibilidad). `MonthCalendar` lo usa solo cuando el caller ya ofrece
`onPrevMonth`/`onNextMonth` (Home y Resumen) — deslizar a la izquierda
avanza de mes, a la derecha retrocede, igual convención que pasar
página. Respeta `prefers-reduced-motion` (se desactiva del todo, las
flechas siguen ahí).

Verificado con eventos táctiles reales (CDP, no un drag de ratón):
ambas direcciones cambian de mes correctamente, y tocar un día para
crear un movimiento sigue funcionando igual — sin errores de consola.

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

## Bloque 3 — Ronda de feedback real sobre Fase 3 (2026-09-06/07)

Tras probar la Preview, el usuario reportó tres cosas concretas
("la cabecera de ayuda y configuración sigue en verde... me chirría
como se abren ayuda y configuración... en los KPIS, ¿más compacta?").

**3.1 — Verde residual en cabeceras sin `nav_sections` propio.**
`sectionColor(tab)` caía a `|| TEAL` cuando la pestaña no tenía fila en
`nav_sections` (login, WhatsNew, cabeceras de Ayuda/Configuración) —
una decisión de una sesión anterior que asumía que era un caso raro.
En la práctica se disparaba constantemente en pantallas reales. Cambiado
el fallback a `|| BRAND_NAVY` en `App.jsx`, `ConfigTab.jsx` y
`HelpTab.jsx`; corregidas también las filas de `nav_sections` en la
base de datos TEST que aún guardaban el teal antiguo.

**3.2 — Rediseño de la navegación de Configuración.** El problema real:
al entrar en una sección (p. ej. Escuelas), la cabecera mostraba
"Configuración" DOS veces — una vez como botón de cerrar (✕, vuelve a
Home) y otra vez como breadcrumb interno de "‹ Configuración" (vuelve
al menú). Confuso y redundante. Solución: se elimina el breadcrumb
interno de `ConfigTab` por completo; el estado "en qué sección estoy"
se eleva al header global de `App.jsx` vía un callback
(`onSectionChange`). Ahora hay una única cabecera: `✕ Configuración` en
el menú raíz, `‹ Escuelas` (o la sección que sea) dentro de una
sección — patrón estándar de navegación jerárquica (X solo en la raíz
real, flecha-atrás en cualquier otro nivel, título mostrado una sola
vez). Mismo patrón que ya usaba Ayuda, ahora consistente entre ambas.
4 tests de `ConfigTab.test.jsx` que verificaban la estructura antigua
(breadcrumb + `<h2>`) se reescribieron para verificar el nuevo contrato
(`onSectionChange` llamado con `{label, onBack}` / `null`).

**3.3 — KPIs más compactos.** Las tarjetas KPI de Home (`KpiTile`) y Mi
trabajo (`MoneyKpiTile`) apilaban icono/cifra/etiqueta en 3 filas
centradas — ver captura del feedback: fila de 3 tarjetas junto a la
lista ocupaba demasiado alto. Cambiado a icono+cifra en una sola fila
(icono más pequeño, `size 13` en círculo de `24px`) y la etiqueta en su
propia fila a todo el ancho debajo — mismo patrón en ambas pantallas.
Verificado con capturas reales (viewport iPhone 14 Pro Max emulado):
las 3 tarjetas de Home y las 3 de Mi trabajo (incluida la de
"Pendiente de cobrar" con su tooltip) se ven correctamente, sin
desbordamiento de texto ni errores de consola.

**Verificado**: `npm run lint` 0 errores (10 avisos, el nuevo es el
`useEffect` de `onSectionChange`/`t` en `ConfigTab.jsx`, mismo patrón
tolerado que otros avisos existentes) · `npm run test -- --run` 754/754
· `npm run build` correcto · navegación real en Chrome (viewport
iPhone 14 Pro Max) para las 3 correcciones.

## Fase 4 — Ronda de correcciones y features pendientes (2026-09-07)

**Estado: ✅ cerrada — 8 de 9 items completos y verificados, 1
parcialmente cerrado por falta de información (ver item 7).** El
usuario encargó un lote grande antes de
desconectar por la noche, con instrucción explícita de resolverlo todo
sin pararse a pedir aprobación (autorización cubierta también por
`git push`/commits de este lote — ver memoria de sesión
`no-confirmations-when-user-unavailable`). Lista de encargo, cada item
se cierra aquí según se resuelve:

1. ✅ Bug: en Mi trabajo, cuando la lista está 100% vacía desaparece el
   menú inferior — ver 4.1 (corrección aplicada, verificación final
   pendiente de dispositivo real).
2. ✅ La navegación por deslizar del calendario (Bloque 1, Fase 3)
   debería estar animada — ver 4.2.
3. ✅ Rediseñar visualmente el input de `DatePicker` — ver 4.3
   (incluye también `DateRangePicker`, mismo componente base).
4. ✅ El generador de Training Records debe dejar de vivir "dentro" de
   Configuración y ser una feature independiente; volver atrás siempre
   debe volver a Home — ver 4.4.
5. ✅ Cargar datos reales de prueba para el usuario demo — ver 4.7.
6. ✅ Barrido final de pendientes de rediseño — ver 4.9.
7. 🔶 Probar generación de Training Records end-to-end — ver 4.8.
   Parcialmente cerrado: la generación en sí queda verificada y sin
   regresiones; el error concreto de iOS Safari/iPhone 14 Pro Max NO se
   ha podido reproducir ni diagnosticar en este entorno — necesita el
   texto/captura exacta del error, que el usuario no dejó antes de
   desconectar.
8. ✅ Logo más grande en login, loading y carnet del instructor — ver
   4.5.
9. ✅ Ya satisfecho sin cambio de código — ver 4.6 (verificación
   directa, no una tarea pendiente).

Cada item se documenta con su propio sub-apartado (qué se encontró, qué
se hizo, cómo se verificó) según se va cerrando, siguiendo el mismo
formato que los bloques anteriores.

### 4.1 — Menú inferior "perdido" en pantallas con poco contenido

**Diagnóstico**: no se encontró ningún código de la app que oculte
`<nav>` condicionalmente (siempre se renderiza en `App.jsx`, fuera de
cualquier condicional de datos) — descartada esa hipótesis tras revisar
`App.jsx` y `MiTrabajoTab.jsx` a fondo. El patrón encaja con un bug real
y documentado de iOS Safari: con `viewport-fit=cover` pero sin
`interactive-widget=resizes-content`, cuando una pantalla no tiene
contenido que desplazar, Safari mantiene su propia barra de
herramientas inferior expandida (no hay scroll que la colapse) y ancla
los elementos `position: fixed` al viewport de LAYOUT (el que asume la
barra de Safari ya colapsada) en vez de al viewport VISUAL real — el
menú queda anclado por debajo del área realmente visible, tapado tras
la barra de Safari. En una pantalla con contenido de sobra para
desplazar, el usuario colapsa la barra sin darse cuenta y el bug nunca
se manifiesta — coincide exactamente con el patrón reportado.

**Qué se hizo**: añadido `interactive-widget=resizes-content` al meta
`viewport` de `index.html` (Safari 16.4+/Chrome 108+, parte del
estándar CSS Viewport/WICG Interactive Widget) — le pide al navegador
que redimensione el viewport CSS cuando su propia barra cambia de
tamaño, en vez de dejar un viewport "grande" fijo detrás del cual
puede quedar oculto un elemento `fixed`.

**Verificación pendiente en dispositivo real**: esta clase de bug es
específica del motor/compositor de Safari — no reproducible con
Playwright + Chromium (la limitación ya documentada de
`scripts/mobile-check.mjs` en `CLAUDE.md`, sección 8). No se puede
cerrar como "verificado" hasta confirmar en un iPhone real que el menú
ya no desaparece con Mi trabajo sin movimientos.

### 4.2 — Calendario: animar el deslizar/las flechas de mes

`monthSlideVariants` (nuevo, `motion.js`) — cuadrícula de días con
transición de deslizamiento (entra desde el lado por el que se avanza,
sale por el contrario), usando el patrón documentado de Motion
`custom` en `<AnimatePresence>` para que la dirección de salida no se
quede "un paso atrás" si se alterna avanzar/retroceder rápido.
Aplicado en `MonthCalendar` (`shared.jsx`) tanto a las flechas ‹/› como
al gesto de deslizar (mismo estado `monthDirection`, una sola fuente de
verdad). Verificado en Chrome (clic en flecha ›): transición visible sin
saltos, la cuadrícula de destino resultante correcta, sin errores de
consola. El propio gesto táctil de deslizar no se pudo probar con las
herramientas de automatización disponibles (usan eventos de ratón, no
táctiles) — comparte la lógica exacta de las flechas, ya verificadas.

### 4.3 — Rediseño visual de DatePicker/DateRangePicker

**Encontrado**: ambos reutilizaban `inputCls`, el mismo rectángulo
`rounded-md` (6px) + borde gris genérico de cualquier campo de texto,
con el icono de calendario suelto en gris — sin nada que los distinga
como un control de fecha "de marca". Además varios objetivos táctiles
por debajo del mínimo de 44px de la convención 7 de `CLAUDE.md`: el
botón "Hoy" (36px), las flechas de mes dentro del panel (32px) y las
celdas de día (36-40px).

**Qué se hizo**: campo cerrado con borde `navy-100` (`#CCDBE6`) y radio
de 10px (`radius-control`, ya documentado en `docs/DESIGN-SYSTEM.md`
§4 pero sin aplicar aquí), icono de calendario en una chip circular
tintada de marca (mismo lenguaje visual que los iconos de KPI/filas de
menú de esta misma ronda). Dentro del panel: "Hoy" pasa a píldora
completa de 44px, flechas de mes a círculos de 44px, celdas de día a
círculos de 44px (mismo patrón que la cuadrícula principal de
`MonthCalendar`, no un tercer vocabulario). El panel flotante
compartido (`FloatingPanel`, usado también por Select/MultiSelect/
SearchSelect) no se tocó — cambio con propósito, no una revisión global
no pedida.

**Verificado**: capturas reales en el formulario de "Nuevo curso
impartido" (campo Fecha) y en "Filtrar" de Mi trabajo (Periodo,
`DateRangePicker`) — ambos selectores abren, seleccionan fecha/rango
correctamente (incluida la banda de rango intermedio) y cierran sin
errores de consola.

### 4.4 — Training Records, feature independiente de Configuración

**Encontrado**: aunque el enlace ya se había retirado del MENÚ de
Configuración en una sesión anterior (Bloque 10, job nocturno
2026-09-03) y la tarjeta de Home la abre directamente, por dentro seguía
viviendo como una "sección oculta" MÁS de `ConfigTab` — `App.jsx`
literalmente hacía `setStoredSection("training-records")` y
`changeTab("config")`. El síntoma real: dentro de Training Records, el
"‹ atrás" de la cabecera (tras el rediseño de navegación de
Configuración de este mismo lote, 4.1-4.3 de la Fase 3) volvía al MENÚ
de Configuración — una pantalla que ni siquiera la lista, confusa por
aparecer de la nada.

**Qué se hizo**: Training Records pasa a ser su propia pestaña
secundaria en `App.jsx` (`SECONDARY_TABS`), al mismo nivel que Ayuda/
Configuración/Mi perfil, con su propia cabecera "✕ Training Records"
independiente. `closeSecondary` gana un caso especial solo para esta
pestaña: cierra siempre a Home (`changeTab("home")`), a diferencia de
Ayuda/Configuración/Mi perfil, que vuelven a `returnTab` (la pestaña
primaria desde la que se entró) — pedido explícito del usuario ("volver
atrás será volver a la home siempre"), justificado porque es una
herramienta puntual con un único punto de entrada (la tarjeta de Home),
no una capa de navegación general. Retirado todo el código ahora muerto
en `ConfigTab.jsx`: `HIDDEN_SECTIONS`, la función `setStoredSection`
(sin más llamadores), el render de `TrainingRecordsTab` dentro de esta
pantalla, el import del componente, el icono `Award` (ya sin uso) y la
entrada de traducción huérfana `sections.trainingRecords` en
`config.json` (es/en).

**Verificado**: navegación real en Chrome — Home → tarjeta "Training
Records" abre la pantalla con cabecera propia "✕ Training Records"
(no "‹ Configuración" ni doble título); cerrar con ✕ vuelve a Home;
Configuración sigue funcionando con su propio menú (Escuelas/Cursos/
Tarifas, sin la entrada de Training Records, que nunca debía listarse
ahí) — sin errores de consola en ningún punto. `npm run lint` 0 errores,
`npm run test -- --run` 754/754, `npm run build` correcto.

### 4.5 — Logo más grande (login, loading, carnet)

Tres puntos concretos, cada uno con su propio tamaño de partida y
tratamiento — no un único valor global:
- **Login/Registro/Recuperar contraseña** (mismo bloque "hero" repetido
  en los tres): 28px → 44px. Se dejan fuera a propósito
  `AcceptLegalScreen`/`ForcedPasswordUpdateScreen`/`ResetPasswordScreen`
  — usan un patrón distinto (icono de 22px dentro de una insignia
  circular de 48px, no una imagen suelta) y no se nombraron en el
  feedback; agrandar solo el icono ahí desencajaría con el círculo que
  lo envuelve.
- **Loading** (arranque de la app: sesión resolviéndose y datos
  cargando tras iniciar sesión, `App.jsx`): 40px (valor por defecto de
  `AppLoading`) → 64px, en las dos pantallas de carga a toda página.
  Los usos internos más pequeños (guardando una tarifa, cargando una
  lista dentro de una sección) no son "el loading" que describía el
  feedback — un momento puntual y reconocible, no cualquier spinner —
  así que se quedan igual.
- **Carnet de instructor** (`ProfileTab.jsx`, marca de agua):
  16px/40% opacidad → 24px/55% — el punto más literal del feedback
  ("apenas se ve"); sigue sin competir con iniciales/nº SSI, el
  contenido real de esa fila.

**Verificado**: capturas reales del loading de arranque (64px, visible y
proporcionado) y del carnet en Mi perfil (marca de agua claramente más
visible, ampliada con zoom). Login/Registro/Recuperar contraseña NO se
pudieron capturar en este entorno: el bypass de login de desarrollo
inicia sesión automáticamente antes de que la pantalla llegue a
pintarse, así que no hay forma de verlas renderizadas en este dev server
— cambio de solo dos props (`width`/`height`) sobre una imagen ya
existente en un layout `flex flex-col items-center`, riesgo mínimo, pero
queda pendiente de confirmar visualmente la próxima vez que se pruebe
sin el bypass activo (o en el iPhone real).

### 4.6 — Icono de Configuración reflejando abierto/cerrado

**Ya satisfecho sin tocar código.** Comprobado en el propio `App.jsx`:
el icono de Ayuda (`?`) se oculta con `{tab !== "help" && (...)}` y el
de Configuración (engranaje) se oculta con `{tab !== "config" && (...)}`
— exactamente la misma regla, simétrica, ya existía para los dos antes
de esta sesión. Verificado en vivo con capturas: dentro de Configuración
el engranaje desaparece y el `?` de Ayuda sigue visible; dentro de Ayuda
ocurre lo contrario. Si en el dispositivo real del usuario se ve distinto,
lo más probable es una build cacheada antigua (Service Worker/PWA), no
un hueco en el código actual — a confirmar con una recarga forzada.

### 4.7 — Datos reales de prueba para la cuenta demo (TEST)

**Estado de partida**: la cuenta demo (nickname "demo", Supabase TEST)
ya tenía 2 escuelas, 105 worklog y 41 comisiones — pero todo concentrado
entre junio y el 4 de septiembre de 2026 (nunca futuro, generado por
`scripts/seed-demo-records.js` en una sesión anterior), y las
`commission_rates` con decimales aleatorios (13.5, 16.41, 24.33...) —
imposibles de verificar de cabeza, justo lo contrario de lo pedido.

**Qué se hizo** — nuevo script puntual
`scripts/seed-fase4-datos-reales.mjs` (documentado como herramienta de
desarrollo, no parte de la app real, mismo criterio que
`seed-demo-records.js`), sin borrar ni tocar ningún worklog/comisiones
ya existente:
- Redondeadas las 9 `commission_rates` con decimales a cifras enteras
  limpias (10/15/20/25).
- Nueva escuela **"Blue Manta"**, con 3 tarifas y 3 comisiones propias,
  en cifras redondas desde el origen (900/2200/400 THB tarifa,
  20/25/10 THB comisión).
- 35 worklog + 8 comisiones nuevos, repartidos en 6 meses: 3 pasados
  adicionales (marzo/abril/mayo 2026, antes de que empezaran los datos
  ya existentes) y 3 futuros (octubre/noviembre/diciembre 2026,
  inexistentes hasta ahora). Los futuros se marcan siempre "Pending"
  — no tiene sentido un curso futuro ya cobrado.
- Resultado: 3 escuelas, 10 meses continuos con datos (marzo→diciembre
  2026), toda tarifa/comisión en cifras enteras.

**Verificado**: navegación real en Chrome — calendario de Home
navegado hasta octubre y diciembre 2026 (meses futuros), con días de
actividad reales; Resumen muestra diciembre 2026 con "Blue Manta:
800,00 ฿ / 2p" (400 THB × 2 personas, cifra limpia verificable a mano)
y "Ihasia" en el mismo mes; KPI "Pendiente de cobrar" de Home
actualizado a la cifra combinada nueva — sin errores de consola en
ningún punto del recorrido.

**Nota para producción**: ninguna — este script solo se ejecutó contra
el Supabase de TEST (`VITE_ENVIRONMENT=test`, verificado antes de
correrlo), es contenido de prueba de la cuenta demo, no hay nada que
replicar en producción.

### 4.8 — Generación de Training Records end-to-end, todas las plantillas

**Verificación estructural (las 10 plantillas)**:
`scripts/verify-training-record-field-maps.mjs` — cada campo referenciado
en `templateFieldMaps.js` existe de verdad en el PDF real de Supabase
Storage, sin duplicados ni typos, en las 10 plantillas (4 con campos de
formulario rellenable: OWD/AOWD/SC-DD/SC-EAN; 6 por coordenadas exactas:
BD/SC-LV/SC-NV/SC-PB/SC-SR/SC-RR).

**Verificación end-to-end real, familia "campos rellenable"** (OWD) vía
`npm run mobile-check:training-records` (Chromium + iPhone 14 Pro Max) —
recorrido completo real: perfil de instructor, elegir plantilla,
progreso con fecha por fila (`DatePicker` ya rediseñado, sin problema),
2 alumnos con firma, generar los 2 PDF, descargar PDF y JPG
individuales, recargar página y comprobar que el roster persiste. El
script llevaba tres bugs SIN RELACIÓN con el trabajo de esta noche
(arrastrados de una revisión de copy/UI de 2026-09-04 que nunca se
volvió a ejecutar contra él): un selector `aria-label="Cerrar"`
ambiguo con el de un toast, un checkbox "Confirmación de Examen Final"
que ya no existe (ahora es solo una fecha, "Fecha de examen"), la
etiqueta "Añadir alumno" cuando el listado está vacío en realidad dice
"Añade tu primer alumno", y una espera de 300ms tras recargar
insuficiente frente a la carga real de Supabase. Los cuatro, corregidos
en el propio script — con eso, pasa limpio, sin avisos de consola.

**Verificación manual, familia "por coordenadas"** (Basic Diver) — en el
propio navegador: plantilla, 3 fechas de progreso + fecha de
confirmación del cuestionario, alumno con firma, "Generar para todos
los alumnos" → "Registros generados correctamente", sin errores de
consola.

**Lo que NO se ha podido verificar: el error concreto reportado en iOS
Safari/iPhone 14 Pro Max real.** Revisado el código de descarga
(`downloadBytes`, `TrainingRecordsTab.jsx`) por si hubiera una regresión
del bug ya conocido y corregido en el pasado ("No se ha podido completar
la operación (Error de WebKitBlobResource)", ver el comentario ya
existente junto a `downloadBytes`): la revocación diferida del blob URL
(`setTimeout(..., 1000)`, en vez de revocar en el mismo tick) se aplica
de forma consistente a la descarga individual de PDF, a la de JPG y al
bucle de "Descargar todo" — los tres pasan por la misma función, no hay
una ruta que se quedara sin el fix. No se encontró ninguna otra pista
concreta sin más información. Este entorno no puede abrir Safari/WebKit
real (limitación ya documentada en `CLAUDE.md` §8: Playwright+WebKit
cuelga aquí) ni un iPhone físico — para cerrar este punto de verdad hace
falta el texto exacto del error o una captura de pantalla del usuario,
que no quedó registrado antes de que se desconectara.

### 4.9 — Barrido final de pendientes de rediseño

Auditoría dirigida, no una revisión pantalla a pantalla completa —
buscando específicamente el mismo patrón de fallo que ya había costado
varias rondas de feedback esta noche (verde/navy antiguo sobreviviendo
en rincones no revisados):

- **`TEAL` literal en `WorkLogTab.jsx`/`ComisionesTab.jsx`/
  `CompanerosTab.jsx`/`PaymentsTab.jsx`**: confirmado que estos 4
  archivos son código MUERTO en la práctica — `App.jsx` documenta
  explícitamente (línea ~55) que las pestañas "log"/"comisiones"/
  "colegas" ya no tienen ningún punto de entrada en la UI desde la
  unificación en Mi trabajo (`docs/ADR/0005`), y "pagos" tampoco desde
  que "Cobrar todos" + filtro por escuela en Mi trabajo cubre su
  función. Se dejan tal cual a propósito — recolorearlos no cambiaría
  nada visible y tocar código muerto sin necesidad real es la
  complejidad que las reglas del proyecto piden evitar.
- **`NAVY` (el navy antiguo, `#0F172A`, pre-rebrand) en vez de
  `BRAND_NAVY` (`#00335A`) — real y visible, sí corregido**: 7 archivos
  alcanzables lo seguían usando en texto/iconos: `AcceptLegalScreen`,
  `CreatePasswordScreen`, `ForcedPasswordUpdateScreen`,
  `ForgotPasswordScreen`, `ResetPasswordScreen`, `RegisterScreen`
  (título de cada pantalla) y `WhatsNew.jsx` (un icono de categoría y
  el título de cada slide de "Qué hay de nuevo"). Mismo patrón que el
  resto de la migración de esta noche: el logo/icono de esas pantallas
  ya se había pasado a `BRAND_NAVY` en una sesión anterior, pero el
  texto del título se quedó atrás. Todas estas pantallas ya importaban
  `BRAND_NAVY` para otra cosa — cambio mecánico de una palabra, import
  de `NAVY` retirado donde quedaba sin uso.
- Barrido de hex literales (`#0F766E`, el valor real de `TEAL`) por si
  algún sitio lo hardcodeaba saltándose la constante: ninguno.

**Verificado**: `npm run lint` 0 errores, `npm run test -- --run`
754/754, `npm run build` correcto. Capturas reales de "Qué hay de
nuevo" (Ayuda → Ver qué hay de nuevo) recorriendo las 5 diapositivas:
el título y el icono de la diapositiva "Repásalo cuando quieras" pasan
del navy oscuro antiguo al navy de marca — confirmado con zoom sobre el
icono. Sin errores de consola.

## Cierre de la Fase 4 — para la próxima sesión

Los 5 commits de esta fase ya están en `feature/rediseno-v2`, pusheados
a GitHub (autorización previa del usuario, que se desconectó antes de
que terminara el lote): `1cefc8b`, `0f09337`, `839f277`, `eb7108b`,
`08ec86b`, `f75b725`.

**8 de los 9 items del encargo, completos y verificados** (lint 0
errores, 754/754 tests, build correcto, en cada commit; navegación real
en Chrome/iPhone 14 Pro Max emulado para cada cambio visual). El único
que no se pudo cerrar del todo:

- **Item 7 (error de Training Records en iOS Safari/iPhone 14 Pro
  Max)**: la generación en sí queda verificada sin regresiones (las 10
  plantillas estructuralmente correctas, la familia de campos
  rellenables y la de coordenadas probadas de extremo a extremo, el fix
  histórico de descarga de Safari sigue aplicado en los tres caminos de
  descarga). Lo que falta es información que solo puede dar el usuario:
  el texto exacto del error o una captura de pantalla — sin eso no hay
  forma de reproducirlo ni diagnosticarlo en este entorno (sin
  Safari/WebKit real ni un iPhone físico disponibles aquí). Primera
  pregunta obligada de la próxima sesión si el tema sigue abierto.

**Pendiente para el despliegue a producción** (además de lo ya anotado
tras la Fase 3, sección "⚠️ Pendiente para el despliegue a producción"
más arriba): ninguna fila nueva de base de datos que replicar — los
datos de la Fase 4 (escuela "Blue Manta", commission_rates redondeadas,
meses pasados/futuros) son solo contenido de prueba de la cuenta demo
de TEST, no algo que exista en producción ni deba tocarse ahí.

**Verificación pendiente en dispositivo real** (no se puede cerrar como
"hecho" sin ello, ambas ya señaladas en sus propios apartados): el fix
de `interactive-widget=resizes-content` para el menú inferior (4.1) y
el tamaño de logo en login/registro/recuperar contraseña (4.5, el
bypass de desarrollo impide verlas en este entorno).

## Fase 5 — Segunda ronda de feedback, con el usuario ya conectado (2026-09-07)

**Estado: ✅ cerrada — 9 items, todos verificados en Chrome (lint 0
errores, 754/754 tests, build correcto).** A diferencia de la Fase 4
(lote nocturno sin el usuario presente), esta ronda se resolvió con el
usuario activo en el chat — dos decisiones de diseño abiertas
(colores de entidad, KPIs) se le preguntaron directamente en vez de
decidirse por autonomía, siguiendo la memoria de sesión que distingue
ambos modos.

### 5.1 — Colores de escuela/curso: paleta curada, no eliminación

El usuario planteó la duda directamente ("¿dejar esto al usuario causa
mucha distorsión?"). Recomendación dada y aceptada: no eliminar la
personalización (sigue siendo información real — distingue entidades en
listas/calendarios, convención #2 de CLAUDE.md), pero sustituir el
`<input type="color">` nativo (sin restricción alguna; caso real
encontrado en los propios datos de prueba, una escuela en negro puro)
por una paleta curada de 12 swatches — pedido explícito: "que haya
blanco y negro también".

**`ENTITY_COLOR_PALETTE`** (`shared.jsx`) + **`ColorSwatchPicker`**
(rejilla tocable, con check y anillo para el blanco) — evitan
deliberadamente los 3 colores semánticos de estado (CORAL/SUN/GREEN),
los 2 de marca (BRAND_NAVY/BRAND_SKY) y, encontrado ya en el propio
navegador durante la verificación, el TEAL de "Curso" en
`MOVEMENT_TYPE_META` (ver 5.9) — un cyan distinto lo sustituye en la
paleta para que el color de una escuela nunca se confunda con el icono
de tipo de sus propios movimientos.

Reemplaza el `<input type="color">` en dos sitios de `ConfigTab.jsx`:
el botón inline de cada fila (Escuelas/Cursos/Estados de pago — nuevo
`ColorFieldButton`, abre la paleta en un panel flotante) y el alta/
edición en la hoja inferior (`ColorSwatchPicker` a todo el ancho, debajo
del nombre). Verificado en vivo: cambio de color en línea aplicado al
instante, paleta completa visible y correctamente marcada en el alta.

### 5.2 — Training Records: fecha de examen en la misma línea

"Fecha de examen"/"Confirmación del Cuestionario" vivían como una
sección aparte (título arriba, `DatePicker` suelto a todo el ancho
debajo) — un tercer vocabulario visual frente a las filas de progreso.
Nuevo componente `DateOnlyRow` (mismo contenedor `rounded-md border`
que `ProgressRowToggle`, etiqueta y fecha en la misma línea) sustituye
esa sección suelta.

### 5.3 — DatePicker: panel flotante corregido para disparadores estrechos

Diagnóstico real: `useFloatingPosition` calculaba `maxWidth` solo en
función del borde IZQUIERDO del disparador (`vw - rect.left - 8`),
fórmula que no tenía sentido para un disparador estrecho (`w-36`)
pegado al lado DERECHO de su fila — el resultado era un `maxWidth` de
apenas ~150px forzando el calendario (ancho fijo `w-72`, 288px) a
comprimirse muchísimo: "demasiado vertical y muy pegado al lateral".
`useFloatingPosition`/`useFloatingDropdown` ganan un parámetro `align`
("left"/"right") que cambia la fórmula al lado correcto; `DatePicker`
gana la misma prop, por defecto "left" (sin cambio para el campo Fecha
normal de un formulario, con espacio de sobra). Los `DatePicker` de
`ProgressRowToggle`, `AdventureRow` y `DateOnlyRow` pasan `align="right"`.
Verificado en vivo: el calendario abre a su ancho completo, sin
comprimirse, en las tres filas.

### 5.4 — AOWD: aventuras unificadas con el resto de progreso del curso

`AdventureRow` apilaba la fecha DEBAJO del selector en móvil
(`flex-col sm:flex-row`) — el `sm:` nunca se disparaba en un teléfono
real, así que en la práctica SIEMPRE se apilaba, a diferencia de
`ProgressRowToggle`. Se retira el `flex-col`/`sm:`: ahora siempre en una
sola línea (Select `flex-1` + fecha `w-36 shrink-0`, igual que el resto
de filas), con el `DatePicker` desplazado (`mt-6`) para alinearse con el
control, no con su etiqueta.

### 5.5 — Mi trabajo/Tarifas: importes ya no se cortan

`MovementSheet.jsx`: "Nº personas" y "Total" vivían en un `grid-cols-2`
a partes iguales — un importe con separador de miles y símbolo de
moneda ("19.800,00 ฿") es mucho más largo que 1-2 dígitos de personas,
así que el 50% fijo dejaba a Total justo el espacio que no necesitaba.
Sustituido por `flex` (personas `shrink-0`, Total `flex-1 min-w-0` +
`truncate` como red de seguridad). Verificado con un caso extremo real
(Blue Manta · Open Water · 9 personas → "19.800,00 ฿ / 2200,00 ฿ por
persona"): se lee completo, sin cortes.

### 5.6 — Puntos de acento retirados, color movido al propio texto

`EntryTitle` (`shared.jsx`, compartido por Mi trabajo y Tarifas) pintaba
un punto de color delante de actividad y escuela — pedido explícito:
"quiero quitar los puntos". Retirados los dos; la actividad ya teñía su
propio texto (sin cambio), la escuela pasa a teñir el suyo también (antes
gris fijo) para no perder la distinción visual que aportaba el punto.

### 5.7 — KPIs: segunda vuelta de diseño

Primera compactación (Fase 4) no convenció ("no acaban de gustarme").
Presentadas 3 direcciones concretas con vista previa; elegida "más
grandes y con aire" con la condición explícita de no ganar altura.
`KpiTile` (Home) e insignia+icono a 32px/18px (antes 24px/13px), cifra
en `text-xl` (antes `text-lg`), más padding interno — sigue en 2 filas.
`MoneyKpiTile` (Mi trabajo) recibió un ajuste MENOR (28px/16px de
insignia, cifra en `text-base`, no `text-xl`): un importe es mucho más
largo que un entero de 1-2 dígitos y a la primera pasada (`text-lg`) se
truncaba de verdad en el navegador — regresión real encontrada y
corregida en la misma ronda de verificación, antes de darla por buena.

### 5.8 — Training Records en iOS Safari: JPG, hardening sin diagnóstico confirmado

Igual que en la Fase 4, el error concreto no se pudo reproducir en este
entorno (sin Safari/WebKit real). Se revisó `pdfToJpg.js` en busca del
punto más frágil del pipeline: `canvas.toBlob()` puede llamar a su
callback con `null` en vez de lanzar un error real (lienzo saturado de
memoria, formato no soportado), y el código no lo comprobaba — un fallo
ahí producía un `TypeError` genérico ("Cannot read properties of null")
sin ninguna pista de la causa. Añadido el guard (rechaza con un mensaje
que incluye tamaño de canvas y nº de páginas) y anotado con qué página
exacta falla si `page.render()` lanza. No es la corrección confirmada
del error reportado — es endurecer el punto ya identificado como frágil
para que, si vuelve a fallar, el mensaje de consola diga algo útil.

### 5.9 — Mi trabajo: tipo de movimiento con icono, no una franja fina

La franja de 4px a la izquierda de cada fila (color por tipo) era
"difícil de reconocer de un vistazo" — pedido explícito de mejorar el
reconocimiento visual. `MOVEMENT_TYPE_META` gana un campo `icon`
(GraduationCap/Handshake/ArrowLeftRight para Curso/Comisión/Ajuste,
`shared.jsx`); `EntryRow` (Mi trabajo) sustituye el borde por una chip
circular de 36px, mismo lenguaje visual que los KPI y los campos de
fecha de esta misma ronda — el color de Ajuste sigue derivándose del
signo del importe (CORAL/GREEN), no de un color de tipo fijo, exactamente
igual que antes.

**Verificación**: recorrido real en Chrome (viewport iPhone 14 Pro Max)
para los 9 puntos — Mi trabajo con las 3 escuelas y el nuevo icono de
tipo, Training Records con OWD (fecha de examen) y AOWD (aventuras),
Configuración → Escuelas con la paleta curada en línea y en el alta.
Un movimiento de prueba creado para verificar el caso extremo de
importe largo se eliminó después de confirmar el fix, dejando los datos
de la cuenta demo como estaban. Sin errores de consola en ningún punto
del recorrido.

## Fase 6 — Colores de avatar, tipos consolidados y más datos de prueba (2026-09-07)

**Estado: ✅ cerrada — 3 encargos, verificados en Chrome (lint 0
errores, 754/754 tests, build correcto).**

### 6.1 — Paleta de avatar integrada con la de la app

La paleta de colores de avatar (`AVATAR_COLORS`, `avatarCatalog.js`)
era un vocabulario propio (NAVY/TEAL/AQUA/CORAL/GREEN/SUN, el previo al
rediseño) sin relación con `ENTITY_COLOR_PALETTE` (Fase 5) ni con la
paleta de marca — pedido explícito: "que integren con la paleta de
colores de la app" + "que esté disponible en blanco también".
`AVATAR_COLORS` pasa a derivar de `ENTITY_COLOR_PALETTE` (movida de
`shared.jsx` a `colors.js` para evitar un ciclo de imports:
`shared.jsx` ya importa de `avatarCatalog.js`, así que la paleta
compartida tiene que vivir en un archivo sin imports propios, igual
criterio que el resto de `colors.js`).

Blanco necesitó tratamiento especial en dos sitios que antes asumían un
color "normal": `Avatar` (shared.jsx) pintaba el icono del color exacto
sobre un fondo tintado al 10% de ese mismo color — blanco sobre
blanco-casi-invisible sería directamente invisible; ahora blanco lleva
fondo sólido + borde gris + icono en un neutro oscuro. El selector de
color del propio picker (ProfileTab.jsx) tenía el mismo problema con el
check de selección (blanco fijo, invisible sobre un swatch blanco) —
mismo criterio de excepción que `ColorSwatchPicker`.

### 6.2 — Colores/iconos de tipo (Curso/Comisión/Ajuste) unificados de verdad

Auditoría pedida explícitamente ("que se muestren igual por toda la
app cuando se usen los tipos"): los COLORES ya eran consistentes
(HomeTab/RatesTab/SummaryTab/MiTrabajoTab ya leían de
`MOVEMENT_TYPE_META`, la única fuente), pero los ICONOS no — `RatesTab.jsx`
y `MovementSheet.jsx` mantenían cada uno su propia copia de
`CREATE_TYPES` (GraduationCap/Handshake para Curso/Comisión, ya
coincidentes) y un desvío real para Ajuste: `MOVEMENT_TYPE_META`
(añadido en la Fase 5) usaba `ArrowLeftRight`, mientras que
`MovementSheet.jsx` — el sitio donde el usuario elige el tipo al crear
un movimiento — llevaba tiempo usando `Users`. `MOVEMENT_TYPE_META.companeros.icon`
pasa a `Users` (alineado con el uso real, no al revés) y las tres copias
de `CREATE_TYPES`/iconos sueltos en `RatesTab.jsx` y `MovementSheet.jsx`
se retiran — ambos derivan del mismo `MOVEMENT_TYPE_META`/`TYPE_META`
ahora, ninguno puede volver a desincronizarse en silencio.

### 6.3 — Más datos de prueba (TEST): meses pasados, actual y futuros

Auditoría antes de sembrar (pedido explícito: "cifras redondas fáciles
de cuadrar para meses pasados, actuales y futuros"): septiembre 2026
(el mes ACTUAL) tenía bastante menos volumen que junio-agosto y CERO
comisiones; Pagos de compañeros (Ajuste) solo existía en junio-agosto,
con decimales aleatorios (76.96, -31.2...) sembrados en una sesión
anterior — lo opuesto de "cifras redondas". Nuevo script puntual
`scripts/seed-fase6-mas-movimientos.mjs` (no toca ni borra nada
existente, solo añade filas nuevas con cifras redondas):
refuerzo de septiembre (worklog+comisiones a la altura de junio-agosto),
Pagos de compañeros en marzo/abril/mayo/septiembre/octubre/noviembre/
diciembre (antes solo en junio-agosto), y enero-febrero de 2026 y 2027
(pasado y futuro más profundos, cruzando el límite de año). Resultado:
worklog/comisiones/pagos con datos en los 12 meses de 2026 completos
más enero-febrero de 2027.

**Regresión real encontrada y corregida durante la verificación**: con
el pendiente de cobro creciendo por encima de 100.000 ฿, la cifra del
KPI "Pendiente de cobrar" (Mi trabajo) volvía a truncarse pese al ajuste
de la Fase 5 — un importe de 6 cifras con decimales y símbolo de moneda
seguía sin caber en `text-base` dentro de una columna de KPI de 1/3 de
ancho. `MoneyKpiTile` gana un tamaño de fuente que responde a la
longitud real del importe formateado (`text-base`/`text-sm`/`text-xs`
según corte, en vez de un tamaño fijo que confiaba en `truncate` como
primera línea de defensa) — verificado con el caso real de "117.477,40
฿", que ya se lee completo.

**Verificación**: recorrido real en Chrome — avatar en blanco (icono
oscuro visible, sin invisibilidad blanco-sobre-blanco), tipo "Curso"/
"Comisión"/"Ajuste" con el mismo icono en Tarifas y en el selector de
Mi trabajo/Home, calendario y listado con los nuevos meses (incluida
2027-02, cruzando el año), KPI de importe largo legible sin cortes. Sin
errores de consola en ningún punto.

## Fase 7 — Tercera ronda de correcciones (2026-09-07)

Ocho encargos nuevos, cada uno con su propio commit y su propio Preview
Deployment — pedido explícito del usuario ("trátalo como los anteriores
trabajos en lote, por separado con commit y preview").

### 7.1 — Bug real: email de recuperación de contraseña a la URL equivocada

**Diagnóstico confirmado** (no una suposición): `generateActivationLink`
(`server/users/activationLink.js`), compartida por alta/reactivación/
regenerar-contraseña-por-admin/recuperación autoservicio, construía
SIEMPRE el enlace con `process.env.APP_URL` — una única URL fija por
proyecto Vercel. Cualquier Preview Deployment de rama (una URL única por
PR, distinta de `APP_URL`) generaba enlaces que apuntaban a un
despliegue distinto de aquel desde el que se pidió el restablecimiento
— mismo backend de Supabase (todos los Preview de este proyecto
comparten TEST), pero dominio equivocado, exactamente el síntoma
reportado ("me lleva a la URL de test, no a la de preview").

**Corrección**: `generateActivationLink` gana un parámetro `baseUrl`
opcional que, cuando se pasa, gana sobre `APP_URL` — sin cambiar el
comportamiento de ningún llamador que no lo pase (alta/reactivación/
regenerar-contraseña siguen usando `APP_URL` exactamente igual que
antes; solo se tocó el camino reportado roto). `handleRequestPasswordReset`
(`requestPasswordReset.js`) y su adaptador Vercel
(`api/request-password-reset.js`) lo pasan a partir de
`req.headers.host` — el dominio REAL de la petición entrante, que sí
varía por despliegue (producción/TEST/cualquier Preview), a diferencia
de `APP_URL`.

**Hallazgo relacionado, no corregido — a decidir**: `createUser.js`/
`regenerateActivationLink.js`/`regeneratePassword.js`/
`generateInvitationLink.js` comparten la misma `generateActivationLink`
y el mismo patrón de `APP_URL` fijo — sufrirían el mismo bug si un
superadmin usa esas funciones desde un Preview Deployment de rama en
vez de la URL fija de TEST. No se tocan en este commit (fuera del
alcance de lo reportado, y son flujos de administración, no
autoservicio) — queda para una decisión explícita si se quiere aplicar
el mismo `baseUrl` ahí también.

### 7.2 — Bug real confirmado: generación de JPG rota en Safari (worker sin parchear)

El bloque 5.8 (Fase 5) ya había endurecido `toBlob` y desactivado el
`ImageDecoder` de WebCodecs por un fallo real distinto en Safari, pero
dejó explícitamente sin confirmar la causa de un tercer fallo — no había
forma de reproducirlo sin un Safari/WebKit real (ver CLAUDE.md §8, el
motor WebKit de Playwright cuelga en este entorno). Esta vez el usuario
pegó la consola completa de un iPhone real, con los tres errores
literales:

```
[Error] DataCloneError: The object can not be cloned. — pdf.mjs:8717
[Error] Unhandled Promise Rejection: TypeError: Promise.try is not a function.
    (In 'Promise.try(action, data.data)', 'Promise.try' is undefined)
    #onMessage (pdfjs-dist.js:7503)
```

**Diagnóstico**, esta vez sí confirmado leyendo el código fuente real de
`node_modules/pdfjs-dist` (no adivinado): `MessageHandler#onMessage`
llama a `Promise.try(action, data.data)` dentro del **Web Worker** de
pdfjs-dist — una propuesta TC39 sin fecha de soporte confirmada en
Safari. Al no existir, el worker revienta antes de procesar el primer
mensaje real; pdfjs-dist cae entonces a su mecanismo automático de
recuperación ("fake worker" en el propio hilo principal, vía
`LoopbackPort`), que relaya mensajes con `structuredClone()` nativo del
navegador — y ese camino de recuperación también falla
(`DataCloneError`) sobre el payload que intenta clonar. Los dos errores
de consola no son dos bugs independientes: el segundo es la consecuencia
automática del primero. Arreglar el `Promise.try` que falta evita que el
worker real llegue a fallar, así que el camino de recuperación nunca se
activa — un único parche resuelve ambos.

**Por qué el parche de polyfills ya existente (`pdfjsPolyfills.js`,
aplicado sobre `globalThis` en el hilo principal desde Fase 5) no
bastaba**: un Web Worker corre en su propio ámbito global aislado
(`self` dentro del worker, un objeto global distinto del de la página) —
no hereda nada de lo que se parchea en el hilo principal. El worker
necesita sus propios parches, aplicados dentro de él mismo, antes de que
el código real de `pdf.worker.mjs` se evalúe.

**Corrección**:
1. `applyPdfjsPolyfills` gana un tercer parche, `Promise.try` (además de
   los dos ya existentes de Fase 5, `Promise.withResolvers` e
   `Iterator`), con 4 tests unitarios nuevos.
2. Nuevo archivo `src/trainingRecords/pdfWorkerEntry.js`: el punto de
   entrada real del worker a partir de ahora — aplica los parches sobre
   `self` y solo DESPUÉS carga el `pdf.worker.mjs` real, con un `import()`
   dinámico (uno estático se izaría por encima de la aplicación de los
   parches, ya que las declaraciones `import` en ESM se evalúan en el
   orden en que aparecen en el archivo, antes que cualquier otro código).
3. `pdfToJpg.js` apunta `GlobalWorkerOptions.workerSrc` a este archivo
   nuevo en vez de al `pdf.worker.mjs` de la dependencia directamente,
   usando el sufijo especial de Vite para Web Workers (`?worker&url`, no
   un simple `?url`) — con `?url` a secas, Vite trataba el `import()`
   dinámico de dentro como un módulo más a bundlear en el chunk que lo
   importa, y el chunk de 2,2MB del worker real desaparecía del build por
   completo (detectado con `ls dist/assets` antes de dar el cambio por
   bueno; con `?worker&url` el chunk vuelve a generarse aparte,
   verificado también inspeccionando su contenido).

**Verificación**: 762/762 tests, lint 0 errores, build con el chunk del
worker (`pdfWorkerEntry-*.js`, ~1,19MB) confirmado presente y con el
contenido esperado (parches primero, código real de pdf.worker.mjs
después, auto-registro correcto). Prueba manual en Chromium (motor real
de Safari no disponible en este entorno, ver limitación de
`mobile-check` en CLAUDE.md §8): generación de PDF y de JPG para un
alumno de prueba, ambas sin errores de consola — sanity check de que la
reestructuración del worker (archivo nuevo, sufijo `?worker&url`) no
rompe nada en un navegador que ya soporta `Promise.try` de forma nativa,
antes de confiar en que también corrige el caso real de Safari que no se
puede probar aquí directamente.

### 7.3 — Emails sin adaptar al rediseño: colores de marca desactualizados

**Confirmado**: `server/email/templates/emailLayout.js` (el envoltorio
visual compartido por todos los emails transaccionales) tenía sus
propias constantes `NAVY`/`TEAL` con los valores **previos al rebrand**
(`#0F172A`/`#0F766E` — exactamente los mismos valores que las constantes
legado del mismo nombre en `src/colors.js`). El texto de los emails ya
decía "Ocean Flow" en todos los flujos (alta, reactivación, recuperación
de contraseña, aviso de despliegue al superadmin) desde el rebrand del
2026-08-30 — el hueco era puramente visual, nunca de copy.

**Por qué no se importa directamente `src/colors.js`**: `server/email/`
es un árbol de código deliberadamente independiente de `src/` (para
poder desplegarse como función serverless sin acoplarse a Vite/React) —
ya duplicaba el valor de la paleta antes de este cambio, solo que con
los valores antiguos sin actualizar tras el rebrand.

**Corrección**: `NAVY`/`TEAL` sustituidas por una única constante
`BRAND_NAVY = "#00335A"` (mismo valor que `src/colors.js`) — un solo
color en vez de dos porque en el resto de la app `BRAND_SKY` solo se usa
como tinte suave sobre fondos claros (icono badges), nunca como color
sólido de botón, mientras que `BRAND_NAVY` es el que ya usan todos los
botones de acción sólidos de la app (ConfigTab, CreatePasswordScreen,
DeploymentNotice...) — usarlo también aquí, tanto en el acento del icono
de cabecera como en el botón CTA, mantiene los emails coherentes con el
mismo vocabulario de color que ya usa el resto de la app, sin inventar
un uso de `BRAND_SKY` que no existe en ningún otro sitio.

**Barrido del resto de la app en busca de otras superficies sin migrar**
(pedido explícito: "revisa si queda alguna otra cosa que se nos haya
pasado adaptar") — sin más hallazgos: las únicas menciones a "Ocean
Pulse" fuera de `src/colors.js` están en comentarios de código que
documentan el propio rebrand histórico (`App.jsx`,
`legal/privacyPolicy.js`, `legal/termsOfUse.js`) — intencionales, no
texto visible al usuario (ver nota de CLAUDE.md sobre el rebrand); no
hay otros colores hexadecimales de la paleta antigua fuera de `src/`
(`server/notifications/` no renderiza HTML propio, reutiliza estas
mismas plantillas de email).

**Verificación**: 34/34 tests de `server/email/` en verde (sin cambios
necesarios — ningún test fijaba el valor hexadecimal concreto), 762/762
de la suite completa, lint 0 errores, build correcto.

### 7.4 — Tarifas: consistencia visual con Movimientos

Pedido explícito: "la pantalla de tarifas debe ser consistente con los
nuevos cambios de diseño implementados en movimientos, para dar
unificación al uso de la APP". Revisando `RatesTab.jsx` frente al estado
actual de `MiTrabajoTab.jsx` (tras 5.9, `TypeIconChip`), había un desvío
real: la fila de Tarifas seguía usando un borde izquierdo de 4px
(`border-l-4`) coloreado por tipo — exactamente el patrón que Mi trabajo
ya había retirado en la ronda anterior en favor de un icono en una chip
circular, con el propio comentario de la pantalla ("mismo idioma visual
que Mi trabajo") sin actualizar tras ese cambio.

**Corrección**: nuevo `RateTypeIconChip` (mismo criterio visual que
`TypeIconChip` de Mi trabajo — chip circular de 36px, icono del tipo,
fondo al 10% de opacidad de su color — sin reutilizar el componente
entero porque Tarifas nunca tiene el tipo "companeros" y no comparte el
resto de props de `EntryRow`, como pendiente/deshacer/animación de
borrado) sustituye el `border-l-4` de cada fila. Test actualizado
(`RatesTab.test.jsx`) para validar el color de fondo de la chip en vez
del borde retirado, mismo criterio de la fila anterior.

**Verificación**: 762/762 tests (23/23 en `RatesTab.test.jsx`), lint 0
errores, build correcto; comprobación visual manual en navegador —
Configuración → Tarifas muestra el icono de Curso/Comisión en cada fila
en vez de la franja de color, coherente con Mi trabajo.

**Verificado**: `npm run lint` 0 errores, `npm run test -- --run`
758/758 (4 tests nuevos: `baseUrl` pasa correctamente end-to-end desde
`requestPasswordReset` y gana sobre `APP_URL` en `activationLink`),
`npm run build` correcto. No se pudo probar el envío de email real
contra un Preview Deployment real desde este entorno (sin acceso a
Vercel/Resend en producción) — a confirmar en el próximo Preview.

### 7.5 — Login: logo vectorial real + tagline

El usuario entregó los vectoriales reales del logo (`Logos Ocean
Flow-01.svg`/`-02.svg`, dos hojas de presentación de 1920×1080 con la
marca sobre 4 fondos y, la segunda, también el wordmark en su tipografía
custom) con instrucción explícita de "actualizar y mejorar lo que creas
necesario ahora que los tienes" — no limitado a la pantalla de login.

**Sustitución del PNG por SVG real, en toda la app, no solo en login**:
`public/brand/logo-mark-navy.png`/`logo-mark-white.png` (170×157px,
rasterizados, en uso desde el bloque "logo más grande" del 2026-09-06)
se sustituyen por `logo-mark-navy.svg`/`logo-mark-white.svg` — los dos
`<path>` que forman la marca, extraídos directamente de los
vectoriales (bounding box calculado programáticamente con un parser de
path propio, sin redibujar ni un solo punto), coloreados con
`BRAND_NAVY`/blanco. Actualizados los 9 archivos que ya referenciaban el
PNG (LoginScreen, RegisterScreen, ForgotPasswordScreen,
ResetPasswordScreen, CreatePasswordScreen, ForcedPasswordUpdateScreen,
AcceptLegalScreen, ProfileTab, App.jsx, shared.jsx/AppLoading) — mismo
`<img src>`, mismos width/height/alt en cada sitio, cero cambios de
comportamiento fuera de la nitidez del propio icono. PNGs antiguos
borrados (nada los referencia ya). Tamaño: 1,9KB por SVG frente a
17-26KB de cada PNG.

**Hallazgo relacionado, corregido tras confirmación explícita del
usuario — ver DESIGN-SYSTEM.md §1.1/§3.1/§3.3**: el navy/sky exactos
del vectorial (`#063256`/`#8AACCE`) diferían ligeramente de
`BRAND_NAVY`/`BRAND_SKY` (`#00335A`/`#81ADD0`, muestreados por píxel de
los JPG originales — la única fuente disponible hasta entonces). Se
señaló como hallazgo sin aplicar (impacto transversal a toda la app) y,
tras la aprobación explícita del usuario ("ajusta los tokens con los
nuevos hallazgos del svg"), se corrigió `src/colors.js` y todo lo que
duplicaba el valor literal — `index.html`, `manifest.json`,
`server/email/templates/emailLayout.js`, los dos usos de Tailwind
arbitrario (`focus:border-[...]`/`focus-visible:ring-[...]`) en
`shared.jsx`, el propio SVG del símbolo (`logo-mark-navy.svg`), y
`navy-100` (la única tonalidad derivada de la escala §3.2 que se usa de
verdad en código). Contraste WCAG re-verificado con la nueva base
(script propio de luminancia relativa) antes de aplicar — ningún par
cruza un umbral AA/AAA distinto al que ya tenía, diferencia de
centésimas en cada ratio.

**Tagline en login** (pedido explícito, con las frases ya escritas por
el usuario: "Bucea más. Gestiona menos." como título corto + "Controla
tus inmersiones, ingresos y pagos desde un solo lugar" como subtítulo):
añadidas bajo el wordmark "Ocean Flow" (que se conserva — el nombre del
producto sigue siendo el identificador principal, la tagline refuerza,
no sustituye), como claves de i18n nuevas (`auth:login.tagline`/
`taglineSubtitle`, es+en) en vez de texto fijo, mismo criterio que el
resto de la pantalla. Logo aumentado de 44 a 52px (ahora vectorial, sin
pérdida de nitidez a ningún tamaño) para dar algo más de presencia al
conjunto, sin llegar a dominar la tarjeta de login.

**Opinión de diseño sobre la tagline** (pedida explícitamente: "¿qué tal
lo ves? ¿Cuadra con tendencias? ¿Es elegante y atractivo?") — resumen
aquí para que quede registrado: la estructura de dos frases cortas y
paralelas ("[verbo] más. [verbo] menos.") es un patrón de tagline de
producto real y vigente (mismo recurso retórico que "Do more with less"
de Microsoft o el titular+subtítulo corto de Notion, "One workspace.
Every team."), encaja con el requisito de brevedad "manos mojadas" de
CLAUDE.md, y conecta directamente con la motivación real del usuario
objetivo (un instructor de buceo quiere bucear, no hacer papeleo) — el
único matiz señalado es que "gestiona menos" podría leerse como "la app
gestiona menos" en vez de "tú dedicas menos esfuerzo a gestionar",
resuelto por el subtítulo inmediato que aclara qué hace la app en
concreto.

**Verificación**: 762/762 tests, lint 0 errores, build correcto (los dos
SVG presentes en `dist/brand/`, verificado con `ls`); comprobación
visual manual en navegador — login (logo+tagline+subtítulo, sin
solapamientos, todo en una línea cada bloque en un viewport de 500px de
ancho) y el `AppLoading` de la pantalla de carga (mismo mark, animación
de "relleno" intacta) ambos correctos, sin errores de consola.

### 7.6 — KPIs de Mi trabajo cortados en Safari iOS: umbrales endurecidos + test

Mismo síntoma que 5.7 (Fase 5) pero reportado por segunda vez, esta vez
en un iPhone real ("los KPIs de la cabecera de movimientos me salen con
las cifras numéricas cortadas") — el ajuste anterior (umbrales de
tamaño de letra en `>13`/`>9` caracteres) resolvió el caso reproducido
en Chromium con los datos de prueba de Fase 6, pero Safari/WebKit puede
renderizar dígitos y símbolos de moneda (el ฿ en concreto) más anchos
que Chromium con el mismo `font-family`/tamaño — no verificable desde
este entorno (WebKit no arranca aquí, ver CLAUDE.md §8).

**Corrección**: en vez de afinar el umbral exacto a ciegas sobre el
caso reportado, se baja el margen en los dos escalones (`MiTrabajoTab.jsx`,
`moneyKpiSizeClass`): `text-xs` a partir de 11 caracteres (antes 14),
`text-sm` a partir de 7 (antes 10) — cada cifra pasa a un tamaño más
pequeño con más margen de sobra, más robusto frente a diferencias de
métricas de fuente entre navegadores que un número ajustado al
milímetro sin poder probarlo en el motor real. La función se extrae
como `moneyKpiSizeClass(text)`, pura y exportada, con 3 tests nuevos
que fijan los umbrales exactos (incluyendo el caso real reportado,
"117.477,40 ฿") — para que un futuro ajuste no vuelva a estrechar el
margen sin que un test lo señale primero (es la segunda vez que este
mismo síntoma se reporta).

Comprobado también que el resto de la app no comparte el mismo patrón
de columna estrecha con cifras de moneda: el "Pendiente de cobrar" de
Home usa una tarjeta de ancho completo (`text-2xl` con margen de sobra
incluso para valores largos) — no aplica el mismo riesgo, no se toca.

**Verificación**: 765/765 tests (3 nuevos), lint 0 errores, build
correcto; comprobación visual en navegador — Mi trabajo con los mismos
datos de prueba reales (117.477,40 ฿, 26.584,00 ฿, 5.150,00 ฿) muestra
las tres cifras completas, sin cortar, con la más larga ("Pendiente de
cobrar") en el tamaño más pequeño y las otras dos en el intermedio.

### 7.7 — Investigación: firma digital y validez legal de los Training Records

Última tarea del bloque, puramente de investigación (sin código) —
encargo: si existe algún API/conexión con SSI para dar más validez
legal al Training Record generado por Ocean Flow, con el aviso de que
SSI podría empezar a exigir que no se rellenen "a máquina".

**Análisis completo, con fuentes reales, en `docs/INVESTIGACION-FIRMA-DIGITAL-TR.md`**
— resumen del hallazgo principal: SSI ya tiene su propio sistema de
firma digital de Training Records, pero vive dentro de su plataforma
MySSI, sin ningún API público conocido para que un tercero como Ocean
Flow se integre. Lo que el usuario probablemente escuchó es el empuje
de SSI hacia MySSI, no un requisito genérico sobre qué tecnología de
firma debe llevar cualquier documento de terceros — Ocean Flow no
puede hacer su propio documento "oficial para SSI" sin un
reconocimiento explícito de SSI, algo que no depende de ninguna
integración técnica que se construya aquí.

Se investigaron también las 3 APIs de firma electrónica más conocidas
(DocuSign, Dropbox Sign, Adobe Acrobat Sign) — descartadas para el MVP
por coste desproporcionado (≥$100/mes el más barato con firma embebida)
frente al problema real, que ninguna resolvería de todos modos
(reconocimiento SSI). Recomendación entregada: reforzar la firma ya
existente (trazo en canvas) con los 3 elementos que exige una firma
electrónica simple válida bajo eIDAS (intención, atribución,
integridad) — checkbox de confirmación + timestamp + hash SHA-256 del
PDF, sin coste añadido — y, sobre todo, preguntar directamente a SSI
antes de construir nada más. Registrado como ítem "Después" en
`docs/BACKLOG.md`, no implementado en este commit — es investigación y
recomendación, la decisión de priorizarlo queda para el usuario.

## Cierre de la Fase 7

Los 8 encargos de esta ronda quedan resueltos, cada uno en su propio
commit con su propio Preview Deployment: 7.1 (recuperación de
contraseña), 7.2 (JPG en Safari), 7.3 (emails), 7.4 (Tarifas), 7.5
(logo vectorial + tagline + corrección de tokens de marca), 7.6 (KPIs
en Safari), 7.7 (investigación de firma digital, sin código). El ítem
1 (aviso de chunk de build) se resolvió con una recomendación sin
cambio de código (diferir al bloque de optimización de build ya
existente, hallazgo ya documentado en `docs/RELEASE-V1-PROGRESS.md`).

## Fase 8 — Dos bugs reales tras la Fase 7 (2026-09-07)

El usuario confirma explícitamente que todas sus pruebas son en Safari,
en un iPhone 14 Pro Max real — el mismo viewport que ya emula
`mobile-check`, así que los bugs de esta fase no son de tamaño de
pantalla, son de motor de renderizado (WebKit vs. Chromium), algo que
sigue sin poder verificarse directamente desde este entorno (CLAUDE.md
§8).

### 8.1 — KPI del medio ("Pendiente de cobrar") seguía cortando la cifra: tercer intento, esta vez sin adivinar

Las dos correcciones anteriores (Fase 6 y 7.6) reducían el tamaño de
letra según el número de caracteres de la cifra ya formateada — un
umbral **adivinado**, nunca medido en el motor real, y las dos veces
resultó insuficiente en Safari/iOS real. Adivinar un tercer umbral
tenía toda la pinta de fallar otra vez por el mismo motivo.

**Solución de raíz distinta**: en vez de forzar una sola línea con un
tamaño de letra que hay que acertar a ciegas, se deja que la cifra se
parta en dos líneas si hace falta (se quita `truncate`, que fuerza
`white-space: nowrap`, en `MoneyKpiTile`, `MiTrabajoTab.jsx`) con un
tamaño de letra fijo. El propio motor de layout del navegador decide
dónde cabe cada palabra con sus métricas reales — nunca puede quedarse
corto, sea cual sea el ancho exacto que le dé a cada carácter, porque
ya no depende de que quepa en una sola línea. Test actualizado para
fijar el comportamiento (ausencia de `truncate`), no un número de
caracteres que pueda volver a quedarse corto.

**Verificación**: 763/763 tests, lint 0 errores, build correcto;
comprobación visual en Chromium con los datos de prueba reales — los
tres importes se ven al mismo tamaño ahora (ya no hace falta reducir
ninguno), sin cortarse.

### 8.2 — Calendario de "Periodo" (Mi trabajo) se salía del viewport sin poder hacer scroll

**Causa raíz, real y compartida por TODOS los paneles flotantes de la
app**: `useFloatingPosition`/`FloatingPanel` (shared.jsx) — el hook y
componente que usan Select, MultiSelect, SearchSelect, DatePicker,
DateRangePicker y RowMenu por igual — calculaban `maxWidth` pero nunca
`maxHeight`. Un panel más alto que el hueco disponible (p. ej. el
calendario de rango con la fila de atajos + 6 filas de días, abierto
desde un punto no muy alto de la pantalla) simplemente se salía por
debajo del viewport, sin ningún `overflow-y` que permitiera hacer
scroll para ver el resto — ni el panel en sí, ni la página de detrás
(bloqueada mientras el panel está abierto, `useBodyScrollLock`).

**Corrección, en el hook compartido, no en `DateRangePicker` a solas**:
`useFloatingPosition` calcula ahora también `maxHeight` (espacio
disponible por encima o por debajo del disparador, el que se esté
usando, menos un margen de 12px) y `FloatingPanel` lo aplica junto con
`overflow-y: auto` — vía `style` inline, no una clase de Tailwind
(`overflow-y-auto`), porque `RowMenu` ya trae su propio
`overflow-hidden` en `className` para recortar sus esquinas
redondeadas, y qué clase "gana" cuando dos tocan `overflow` depende del
orden en que Tailwind las genera en la hoja de estilos, no del orden en
el propio `className` — un inline style se salta ese riesgo por
completo. Corrige el bug reportado y, de paso, cualquier otro panel
flotante de la app que pudiera tener el mismo problema latente sin
haberse reportado todavía (varios ya traían su propio `max-h-*
overflow-y-auto` a mano, como red de seguridad fija que ahora convive
con el cálculo dinámico sin conflicto).

**Verificación**: 763/763 tests, lint 0 errores, build correcto;
comprobación visual en navegador — el calendario de "Periodo" en Mi
trabajo ahora muestra una barra de scroll real y permite llegar hasta
el final (confirmado también en el paso "Hasta", donde cabía entero sin
necesidad de scroll, y el botón "OK" queda visible); el menú "⋯" de una
fila sigue con las esquinas redondeadas intactas (sin regresión visual
del cambio de `overflow`).

### 8.3 — Punto de millar inconsistente: cifras de 4 dígitos sin agrupar

Bug real reportado: "en las cantidades hay puntos en decimales cuando
son 5 cifras, pero cuando son 4 cifras no llevan el punto de los
miles". Confirmado y reproducido directamente en Node antes de tocar
nada: `(4400).toLocaleString("es-ES", {minimumFractionDigits:2,
maximumFractionDigits:2})` da `"4400,00"`, pero
`(44000).toLocaleString(...)` da `"44.000,00"`. No es un bug de esta
app — es el comportamiento por defecto (`useGrouping: "auto"`) de
`Intl.NumberFormat` con el locale `es-ES`: por debajo de 5 cifras
totales, el motor decide no agrupar en absoluto; a partir de 5 sí,
incluyendo cualquier grupo adicional que hubiera (`1234567` →
`"1.234.567"`, con agrupación completa pese a que el primer grupo por
la izquierda también tendría un solo dígito).

**Corrección, unificada en las 4 funciones de la app que formatean un
número con `toLocaleString("es-ES", ...)`**: se añade `useGrouping:
"always"`, que fuerza la agrupación de miles siempre, sin ese umbral
oculto de 5 cifras. Las 4 funciones (antes ninguna lo tenía):
`formatMoney` y `Money` (`shared.jsx`, usadas por toda la app para
mostrar importes), `MoneyInput` (`shared.jsx`, la cifra que se ve al
dejar de editar un campo de importe) y `fmtInt` (`SummaryTab.jsx`,
contadores enteros — el mismo umbral de "auto" afecta igual a enteros
sin decimales, no es exclusivo de las cifras de dinero).

**Verificación**: 764/764 tests (1 nuevo, fija el caso exacto
reportado — `formatMoney(4400, ...)` → `"4.400,00 €"`; el test
preexistente que esperaba `"1234,50 €"` sin punto se corrige a
`"1.234,50 €"`, era el comportamiento buggy documentado sin darse
cuenta), lint 0 errores, build correcto; comprobación visual en
navegador — "Open Water" (4.400,00 ฿) y los KPIs de cabecera muestran
ya el punto de millar correctamente.

### 8.4 — Tarifas: filas desactivadas más visibles

Dos peticiones explícitas juntas, misma pantalla: "en tarifa, cuando le
de a mostrar desactivadas quiero q las filas desactivadas se muestren
en un color de fondo q lo indique visualmente rápido" y "quiero probar
el mostrar desactivadas fuera del filtro, para q no cueste encontrarlo
o saber q hay ítems desactivados".

**"Mostrar desactivadas" sale del panel de "Filtrar"**: antes había que
abrir "Filtrar" para siquiera saber que ese control existía. Ahora vive
siempre visible junto al contador de la lista ("26 tarifas"), como un
`BooleanToggle` (el mismo interruptor que ya usa el resto de la app
para un booleano persistente) en vez del checkbox nativo anterior.

**Fila desactivada con fondo, no solo opacidad**: antes solo se atenuaba
con `opacity-50`, apoyándose únicamente en el metadato "· Desactivada"
para confirmarlo por texto. Ahora lleva además `bg-gray-50` — se
reconoce de un vistazo, sin tener que leer la fila. La opacidad baja a
70% (antes 50%): con el fondo ya haciendo el trabajo de distinguir la
fila, no hace falta apagar tanto el texto.

Tests actualizados (`RatesTab.test.jsx`): las dos pruebas que abrían
"Filtrar" antes de tocar el checkbox ya no necesitan ese paso, y
buscan el control por `role="switch"` (el que expone `BooleanToggle`),
no `role="checkbox"`.

**Verificación**: 764/764 tests, lint 0 errores, build correcto;
comprobación visual en navegador — desactivar una tarifa de prueba
("Fun Dive 1T", Blue Manta) confirma el fondo gris distinto de las
filas activas vecinas, revertido después para no dejar datos de prueba
alterados.

### 8.5 — Calendario de Home: desplazamiento automático al panel de detalle

Pregunta del usuario, no un bug: "cuando hago click en un día del
calendario de la home no sé q se está cargando info abajo, no se si
sería interesante hacer ancla a la zona de info o moverla delante del
calendario. esto último me chirría porque si la lista es grande el
calendario caerá muy abajo". El propio usuario ya descartó reordenar
(mover el detalle antes de la cuadrícula) por un motivo real —
confirmado: Home apila KPIs + tarjeta de "Pendiente de cobrar" antes
del calendario, así que el panel de detalle de un día puede caer fuera
de la parte visible de la pantalla sin ningún indicio de que algo
cambió al tocar un día.

**Solución implementada — desplazamiento automático (la opción de
"anclar" que el usuario ya apuntaba)**, en `MonthCalendar` (`shared.jsx`,
compartido por Home y Resumen, mismo patrón de interacción en las dos):
al tocar un día CON actividad, la pantalla se desplaza lo mínimo
necesario (`scrollIntoView({block: "nearest"})`) para que el panel de
detalle quede completamente visible — nada si ya lo estaba. Solo se
dispara con un toque real del usuario (reutilizando `userSelectedRef`,
que ya existía para otro propósito: distinguir un clic real de la
auto-selección del primer día con actividad al cargar) — auto-
seleccionar el día 1 nada más entrar en Home y saltar de golpe habría
sido una sorpresa, no una mejora. Cambiar de un día a otro con el panel
ya abierto no vuelve a desplazar (el contenido ya está a la vista, sin
necesidad); cerrar el panel tampoco.

**Detalle técnico real, no trivial**: el panel anima su altura de `0` a
`"auto"` (`panelVariants`, `motion.js`) — desplazar la pantalla nada
más cambiar el estado (antes de que termine de crecer) mediría un
rectángulo más pequeño que el final, quedándose corto exactamente igual
que el problema que se intenta resolver. Se dispara en cambio desde
`onAnimationComplete` del propio panel, una vez termina de crecer.
Para que ese callback reciba la etiqueta de la transición como texto
("animate"/"exit", en vez del objeto de valores animados) se cambia
este uso concreto de `panelVariants` de pasar los valores sueltos como
props (`{...panelVariants(...)}`, como hace el resto de usos en la app)
a usar el mecanismo de `variants` + etiquetas de Motion — mismo
resultado visual de animación, forma distinta de invocar el callback.

**Verificación**: 764/764 tests, lint 0 errores, build correcto;
comprobación visual en navegador — tocar un día con actividad
(inicialmente fuera de la parte visible) desplaza la pantalla hasta
mostrar el panel de detalle completo; cerrar el panel o volver a tocar
el mismo día para deseleccionarlo no desplaza nada.

### 8.6 — El icono de Configuración siempre debe abrir el menú, no la última sección vista

Pedido explícito: "siempre q pulse el icono de configuración iré al
menú de configuración, no a la última pantalla q visite dentro de
configuración. en el caso de cerrar configuración volveré a la
pantalla donde estaba antes de abrirlo y si volviera a abrir otra vez
volvería al menú de configuraciones".

**Ya existía la mitad de este comportamiento** (feedback del
2026-08-30, ver comentario largo junto a `closeSecondary` en
`App.jsx`): cerrar Configuración con la "✕" (o el gesto de "atrás" en
su nivel más externo) ya limpiaba `oceanpulse:configSection`
(sessionStorage) para que la próxima apertura mostrara el menú, no la
última sección — a diferencia de recargar la página, que sí la
conserva a propósito (encargo distinto, ya resuelto entonces).

**El hueco real, sin cubrir hasta ahora**: `closeSecondary` (donde
vivía esa limpieza) solo se invoca desde la propia cabecera de
Configuración. Tocar directamente una pestaña de la barra inferior
(Home/Mi trabajo/Resumen) estando dentro de una subsección de
Configuración (p. ej. Tarifas) llama a `changeTab` sin pasar por
`closeSecondary` — la sección quedaba guardada en sessionStorage sin
limpiar, y reabrir Configuración con el engranaje restauraba esa
subsección en vez de mostrar el menú, justo el bug reportado.

**Corrección, centralizada en `changeTab` en vez de repetida en cada
botón que pueda alejarse de Configuración**: `changeTab` limpia
`oceanpulse:configSection` cuando `tab === "config" && next !== "config"`
— cualquier camino de salida (presente o futuro) queda cubierto por un
único sitio, en vez de tener que acordarse de añadirlo en cada botón
nuevo que pudiera cambiar de pestaña. La comprobación explícita en
`closeSecondary` se retira (redundante, `changeTab` ya lo cubre
también en ese camino) — una única fuente de verdad para esta regla,
no dos copias que podrían desincronizarse.

**Sin test automatizado nuevo** — decisión consciente, no un olvido:
`ConfigTab.test.jsx` ya cubre a fondo la persistencia de sección en
aislamiento (mockeando `onClose`/`onSectionChange`), pero el hueco real
estaba en el CABLEADO entre `App.jsx` y esa persistencia — probarlo de
verdad exigiría un test de integración completo de `App.jsx` (montar
`AppShell` autenticado con todas las tablas simuladas), un montaje
mucho más pesado que el resto de `App.test.jsx` (centrado hoy en
`AuthGate`) para fijar una condición de una sola línea. Verificado en
su lugar a fondo en el navegador (ver más abajo) — el coste de montar
ese andamiaje de test no está justificado por el riesgo real de una
condición tan simple (criterio de coste/beneficio, `CLAUDE.md`).

**Verificación**: 764/764 tests, lint 0 errores, build correcto;
comprobación manual completa en navegador — (1) Configuración → Tarifas
→ pulsar "Home" en la barra inferior → pulsar el engranaje: muestra el
menú de Configuración, no Tarifas (el bug reportado, confirmado
corregido); (2) Configuración → Tarifas → recargar la página: sigue
mostrando Tarifas directamente (el comportamiento del 2026-08-30, sin
regresión).

## Fase 9 — Lote grande post-Fase 8, trabajo autónomo (2026-09-07)

El usuario se ausenta y pide trabajar en lote sin esperar confirmación
de commit/push (aviso explícito, ver también la instrucción permanente
de `deployment-notice-after-commits`). Un encargo grande de perfil de
usuario/email queda con su propio plan de migración pendiente de
presentar antes de implementarse (cambios de auth/esquema, regla de
`CLAUDE.md`) — el resto de ítems se ejecutan y despliegan sin pausa.

### 9.1 — Config/Usuario: estado solo por color, con leyenda accesible

Pedido explícito: "en configuración, usuario, quita la palabra del
estado y deja solo el código de color, puedes añadir en algún punto un
tooltip para explicar la leyenda".

**Tensión real con una decisión previa, señalada, no ignorada**: el
propio `StatusBadge` (`ConfigTab.jsx`) documentaba desde el 2026-08-30
un motivo explícito para mantener el texto visible junto al punto de
color: "no llega a quien no distingue bien los colores ni a un lector
de pantalla". Quitar el texto del todo revierte esa decisión de
accesibilidad a propósito — mitigado, no ignorado: el texto real del
estado se conserva como `aria-label`/`sr-only` (nunca desaparece del
árbol de accesibilidad, un lector de pantalla lo sigue anunciando igual
que antes) y se añade `StatusLegendButton`, un botón "?" en la cabecera
del listado de Usuarios que abre un panel con los 3 colores y su
significado (mismo patrón de `useFloatingDropdown`+`FloatingPanel` que
el tooltip de "Pendiente de cobrar" en `MiTrabajoTab.jsx` — nunca un
`title` nativo, que no funciona al tacto en móvil). Trade-off residual,
dicho con honestidad: para una persona que ve el color pero no
distingue verde/ámbar/gris entre sí, la leyenda es menos inmediata que
tener el texto en cada fila — es la decisión consciente de este
cambio, no un error por no haberlo pensado.

Afecta a las dos únicas instancias de `StatusBadge` (fila del listado y
hoja de detalle) — un único componente, ambas se benefician igual sin
condicionales.

Tests actualizados (`ConfigTab.test.jsx`): 8 aserciones que buscaban el
texto visible ("Activo"/"Pendiente") pasan a buscar por rol accesible
(`getByRole("img", { name: ... })`, ya que el texto ahora vive en
`aria-label`, no como nodo de texto); el test que comprobaba "el estado
va antes que el nickname en la fila" (comparando índices dentro de
`textContent`, que ya no contiene la palabra) se reescribe comparando
la posición real en el DOM (`compareDocumentPosition`) en vez del
índice en el texto plano.

**Verificación**: 764/764 tests, lint 0 errores, build correcto. Sin
comprobación visual en navegador — la cuenta de desarrollo (`demo`, dev
bypass) no tiene rol admin, así que la sección "Usuarios" no es
accesible desde aquí; confianza puesta en los 39/39 tests de
`ConfigTab.test.jsx` (que sí cubren esta pantalla con un perfil admin
simulado) y en la reutilización de un patrón de tooltip ya verificado
visualmente en otra pantalla de la misma app (Mi trabajo, Fase 7).

### 9.2 — Config/Usuario: cuántos movimientos tiene un usuario y cuándo fue el último

Pedido explícito: "quiero ver al consultar los datos de perfil de un
usuario, cuantos movimientos tiene dados de alta y cuando creo/edito/
elimino el último movimiento".

**Por qué hace falta un endpoint nuevo, con service role**:
`worklog`/`comisiones`/`colleague_payments` tienen RLS "own rows"
(`auth.uid() = user_id`, ver `schema.sql`) — un admin viendo el perfil
de OTRO usuario no puede leer sus filas con su propia sesión, la RLS se
lo impide igual que le impediría a cualquier usuario normal. Mismo
patrón ya establecido por `listUserStatus.js` (que salta la RLS de
`auth.users` para leer `banned_until`/`last_sign_in_at` de cualquier
cuenta): nuevo `getUserActivitySummary.js` + adaptador
`api/get-user-activity-summary.js`, admin-only, con service role.

**Qué calcula, y por qué un único timestamp cubre las 3 acciones
pedidas**: `count` = movimientos activos (`deleted_at is null`) en las 3
tablas — "cuántos tiene dados de alta hoy". `lastActivityAt` = el
`updated_at` más reciente entre las 3 tablas, INCLUYENDO filas borradas
lógicamente — el trigger `set_updated_at()` (ver `schema.sql`) se
dispara en cualquier UPDATE, y la baja lógica (`deleted_at`) es una
UPDATE como otra cualquiera, así que un único valor ya cubre "creó,
editó o eliminó" sin necesitar tres consultas separadas por tipo de
acción ni ninguna columna nueva.

**Bajo demanda, no en el listado entero**: se consulta solo al abrir la
hoja de detalle de un usuario concreto (`useEffect` sobre `openUserId`
en `UsersDirectory`), no en cada carga del directorio — calcularlo para
todos los usuarios de golpe sería trabajo desperdiciado para un dato
que rara vez se consulta. Mientras carga se muestra "…" en vez de dejar
el valor en blanco (para no leerse como "sin movimientos" antes de
tiempo); un fallo de red no bloquea el resto de la hoja (mismo criterio
que `loadActiveStatus`, ya establecido).

**Hallazgo de fragilidad de tests, corregido de paso**: añadir esta
llamada rompió 4 tests preexistentes de `ConfigTab.test.jsx` que
mockeaban `fetch` con una cadena `.mockResolvedValueOnce()` indexada
por ORDEN GLOBAL de llamada — la nueva llamada a
`get-user-activity-summary` se colaba en medio de esa cola y
desplazaba las respuestas de las llamadas reales que cada test quería
comprobar. Corregido de raíz, no solo parcheado para que vuelva a
pasar: nuevo helper `mockFetchByUrl` (una cola de respuestas POR URL,
no un único índice global) sustituye las 9 cadenas de
`.mockResolvedValueOnce()` del archivo — cualquier llamada no
anticipada por un test (como esta, en los tests a los que no les
importa) recibe un 200 vacío genérico en vez de descolocar la cola de
otra URL. Más robusto también de cara a cualquier llamada nueva que se
añada en el futuro, no solo esta.

**Verificación**: 774/774 tests (10 nuevos en
`getUserActivitySummary.test.js`, 39/39 en `ConfigTab.test.jsx` tras el
refactor del mock), lint 0 errores, build correcto. Sin comprobación
visual en navegador — misma limitación que 9.1 (sin cuenta admin
disponible en este entorno).

### 9.3 — KPI "Pendiente de cobrar": margen derecho + tooltip más corto

Dos ajustes pequeños pedidos juntos: "cuando hay una cifra grande en el
kpi del medio de movimientos queda demasiado pegada al margen derecho
de la box" y acortar el tooltip a "esta cantidad refleja pagos
pendientes de meses anteriores".

**Margen**: el span de la cifra (`MoneyKpiTile`, `MiTrabajoTab.jsx`) no
tenía `w-full` — un `<span>` de solo texto se dimensiona a su propio
contenido, no al ancho real disponible en la fila, así que una cifra
partida en dos líneas (8.5) podía terminar su línea más larga justo en
el borde interior de la tarjeta. `w-full` fuerza el ancho real de la
fila; `px-2.5` de la tarjeta sube a `px-3` para un margen algo más
generoso.

**Tooltip**: el texto largo original ("no es solo de este mes: aquí se
junta todo lo que aún tienes pendiente de cobrar, aunque sea de hace
tiempo") se sustituye por el texto exacto pedido, más corto — mismo
criterio "manos mojadas" de `CLAUDE.md`.

**Verificación**: 774/774 tests (1 test actualizado, esperaba el texto
largo del tooltip), lint 0 errores, build correcto; comprobación visual
en navegador con datos de prueba reales (117.477,40 ฿) — margen
correcto y tooltip con el texto nuevo.

### 9.4 — KPIs de Mi trabajo: icono responsive, consistente entre los 3

Pedido explícito: "si crece mucho la cifra de los KPIs de movimientos se
llegan a salir incluso de la box. hacer responsive para q si el número
es muy grande el icono se reduzca o a partir de cierto tamaños incluso
desaparezca. si desaparece en uno, desaparecerá en todos".

**Decisión compartida entre los 3, no por tarjeta**: `kpiIconTierFor`
(nueva función pura, exportada) decide el nivel del icono
("normal"/"small"/"hidden") según la longitud del texto ya formateado
— pero se calcula UNA vez, sobre la cifra MÁS LARGA de las 3 totales
(`Generado`/`Pendiente`/`Cobrado`), no cada `MoneyKpiTile` mirando solo
la suya. El resultado (`kpiIconTier`, `useMemo` en el componente
principal) se pasa como prop `iconTier` a las 3 tarjetas por igual —
si una sola cifra crece lo bastante, las 3 cambian de tamaño de icono
juntas, nunca solo la que tiene el número grande, para no romper la
alineación entre ellas.

**Umbrales** (longitud del texto formateado, incluye símbolo de moneda
y separadores): ≤14 caracteres → icono normal (28px); 15-20 → icono
reducido (20px, círculo e icono más pequeños); >20 → icono oculto del
todo, liberando el ancho completo de la fila para la cifra. Capa
adicional a la solución de la Fase 8.1 (permitir partir la cifra en dos
líneas): para el caso ya extremo en el que ni así cabe con el icono
delante, no la sustituye.

**Verificación**: 777/777 tests (3 nuevos en `kpiIconTierFor`, fijan
los 3 umbrales exactos), lint 0 errores, build correcto; comprobación
visual en navegador — con los datos de prueba reales actuales (12
caracteres, nivel "normal") las 3 tarjetas siguen mostrando su icono
sin cambios, confirmando que el mecanismo no rompe el caso normal. No
se ha podido generar en este entorno una cifra de prueba real que
alcance el nivel "small"/"hidden" (los umbrales exactos están fijados
por el test unitario, que sí los ejerce directamente).

### 9.5 — Bug real confirmado: una tarifa desactivada podía usarse para calcular un movimiento nuevo

Pregunta del usuario, no una suposición: "se está teniendo en cuenta la
tarifa desactivada a la hora de añadir un movimiento, pillar solo la
activa o en caso de no haber ni creada ni activa ofrecer el formulario
inline?". Investigado el código real (`MovementSheet.jsx`) — la
respuesta era que NO se tenía en cuenta correctamente: `rateFor`
buscaba la tarifa de una escuela+curso con un simple `.find(r =>
r.school === school && r.activity === activity)`, sin filtrar
`is_active`. Una escuela+curso con SOLO una tarifa desactivada (sin
ninguna activa) encontraba igualmente esa fila desactivada y calculaba
el importe del movimiento con su precio — en vez de tratarlo como "no
hay tarifa vigente" y ofrecer el formulario inline de "Añadir tarifa",
que es lo que debía pasar.

**Corrección**: `isRateActive` (antes solo en `RatesTab.jsx`, para
"Mostrar desactivadas") se extrae a `rateCalc.js` como única fuente de
verdad — RatesTab.jsx pasa a importarla en vez de tener su propia copia
local. `rateFor` (`MovementSheet.jsx`) añade el filtro que le faltaba:
`r.school === school && r.activity === activity && isRateActive(r)`.

**Verificación**: 778/778 tests (1 nuevo, en `MiTrabajoTab.test.jsx` —
`renderMiTrabajo` gana la posibilidad de sustituir `rates`/
`commissionRates` para este caso concreto — confirma que con una
tarifa desactivada como única existente para una escuela+curso, no
aparece ningún importe calculado y sí el botón "Añadir tarifa", igual
que si no existiera ninguna), lint 0 errores, build correcto.

### 9.6 — Calendario Home/Resumen: hoy tiene prioridad al auto-seleccionar

Pedido explícito: "en el calendario de la home y el de resumen aparecerá
marcado el día de hoy si tiene alguna entrada, con la lista desplegada.
en caso de estar vacío se seleccionará el primer día del mes con
movimientos asociados".

**Antes**: `autoSelectFirstDay` (`MonthCalendar`, `shared.jsx`) siempre
seleccionaba el PRIMER día del mes con actividad (`Math.min(...days)`),
sin distinguir si hoy mismo tenía actividad — si hoy no era el primer
día del mes con movimientos, se auto-abría un día distinto al de hoy.

**Corrección**: se compara el mes/año que se está pintando con el de
hoy (`parseDateStr(todayStr())`) — si coinciden Y hoy tiene entradas en
`byDay`, se selecciona el día de hoy; si no (hoy vacío, o el mes visible
no es el actual — p. ej. tras navegar con las flechas), cae al primer
día con actividad, exactamente igual que antes. Mismo componente
compartido por Home y Resumen, un único cambio cubre las dos pantallas.

**Verificación**: 779/779 tests (1 nuevo en `HomeTab.test.jsx` — dos
entradas en el mes, una en un día anterior y otra hoy, confirma que se
auto-selecciona hoy, no el día anterior), lint 0 errores, build
correcto. Los tests preexistentes de navegación entre meses (que ya
usaban `TODAY` como única fecha con actividad) siguen en verde sin
cambios, comportamiento idéntico en ese caso.

### 9.7 — Scroll automático al detalle del día: no funcionaba en Safari iOS real

Reporte del usuario, sobre el mecanismo recién construido en 8.5:
"la animación del calendario de la home al pulsar y ver la info no
funciona en safari ios iphone 14 pro max".

**No se ha podido reproducir directamente en Safari/WebKit** en este
entorno (WebKit no arranca aquí, ver CLAUDE.md §8), pero sí se ha
encontrado y confirmado la causa más probable mediante depuración
directa en la consola del navegador de este mismo entorno (Chrome, vía
`javascript_tool`), no por conjetura: `window.scrollTo({ top,
behavior: "smooth" })` **no desplaza la página en absoluto** aquí
(`scrollY` se queda igual incluso esperando 800ms) — mientras que
`window.scrollTo({ top })` sin `behavior` y la forma clásica de dos
argumentos `window.scrollTo(x, y)` sí funcionan al instante. La
implementación original de 8.5 usaba `Element.scrollIntoView({behavior:
"smooth", block: "nearest"})` — mismo tipo de opción con nombre
(`behavior: "smooth"`) que probablemente parecía funcionar en la
verificación de 8.5 solo porque `usePrefersReducedMotion()` devolvía
`true` en ese momento (usando `behavior: "auto"`, instantáneo, que sí
funciona), enmascarando el problema real.

Dado que lo que el usuario pidió es que quede claro que algo cargó —no
que el desplazamiento sea suave— y que este tipo de opción es
sospechosa de fallar también en Safari real, se abandona el
desplazamiento animado por completo: `scrollDetailIntoView`
(`MonthCalendar`, `shared.jsx`) ahora calcula el hueco a mano con
`getBoundingClientRect()` (dentro de un `requestAnimationFrame`, para
leer el rectángulo ya con `height: "auto"` aplicado tras el aviso de
fin de animación de Motion) y llama a `window.scrollTo(x, y)` con la
forma de dos argumentos — la única de las tres probada como fiable —
siempre instantáneo, nunca con `behavior`. Mismo criterio visual que
antes: no mueve nada si el panel ya está completamente visible.

**Sin confirmación de que esto sea la causa exacta en Safari real** —
es la corrección mejor fundamentada que se puede aplicar sin acceso a
WebKit real, respaldada por un hallazgo reproducible (no una certeza
sobre Safari específicamente). Si el usuario confirma que sigue sin
funcionar tras este cambio, haría falta una captura de consola real de
Safari (como ya se consiguió para el bug de JPG) para diagnosticar la
causa de verdad.

**Verificación**: 779/779 tests, lint 0 errores nuevos (mismos 10
avisos preexistentes de siempre, ninguno en `shared.jsx`), build
correcto. Comprobación visual en Chromium local completada esta vez de
forma inequívoca: día sin actividad visible en el viewport → clic →
`window.scrollY` pasa de `0` a `232` y el panel de detalle del día
queda visible, confirmado leyendo `scrollY` por consola además de por
captura de pantalla (la verificación anterior, solo por captura, había
quedado ambigua).

### 9.8 — DatePicker: accesos rápidos ayer/mañana/antes de ayer, junto a "Hoy"

Petición del usuario sobre el selector de fecha de Training Records:
"añade al datepicker de TR los días hoy, ayer, mañana y antes de ayer
como accesos rápidos encima del calendario. ahora solo sale hoy". El
`DatePicker` de TR es el mismo componente compartido (`shared.jsx`) que
usa el resto de la app (Mi trabajo, Comisiones, Pagos...), así que el
cambio se hace una vez en el componente y llega a todos sus usos por
igual — mismo criterio de reutilización de siempre (convención 3 de
CLAUDE.md), no una versión aparte solo para TR.

El único botón "Hoy" se sustituye por una rejilla 2×2 (antes de
ayer/ayer/hoy/mañana): una fila de 4 píldoras no cabía sin truncar
"Antes de ayer" en el ancho fijo del panel (`w-72`). Un único
`selectQuick(offsetDays)` reutiliza `addDays`/`todayStr` (ya existían
para los presets de `DateRangePicker`, en el mismo archivo) en vez de
un cálculo de fecha suelto por botón.

**Verificación**: nuevo test en `PaymentsTab.test.jsx` (reutiliza el
patrón ya existente de reloj congelado en 15 de agosto de 2026) que
comprueba los 4 accesos uno a uno contra la fecha esperada. 780/780
tests, lint sin errores nuevos, build correcto. Comprobado también a
mano en el navegador, en el flujo real de TR (Training Records →
plantilla → campo "Fecha" de "Sesiones Académicas"): la rejilla se ve
completa y legible, y pulsar "Ayer" con la fecha real del sistema
(2026-09-07) rellena correctamente "06/09/2026".

### 9.9 — Bug real confirmado: fecha de padre/madre/tutor se rellenaba aunque el alumno no fuera menor

Feedback del usuario: "en todos los TR cuando hay padre/madre/tutor es
nombre, firma y una fecha (donde aplica). si el alumno no marcó el
check de menor, esa fecha quedará vacía."

Confirmado en `buildFillOperations` (`pdfFill.js`), la función que
arma el relleno para las 10 plantillas (tanto las de campos de
formulario reales como las 6 de coordenadas — una única función
compartida, no una por plantilla): la fecha de la fila de firma de
padre/madre/tutor (`sig.parentDate`) se rellenaba siempre con
`generatedAtLabel`, sin comprobar si esa fila tenía contenido. Nombre
y firma del tutor ya dependían correctamente de `isMinor`
(`StudentQuickEntrySheet.jsx`/`recordConfig.js`: si no es menor,
`guardianName`/`guardianSignature` se guardan vacíos) — solo la fecha
se había quedado fuera de esa regla, dejando una fecha "huérfana" sin
nombre ni firma que la acompañara en cualquier alumno no menor.

Corrección: la fecha de padre/madre/tutor ahora solo se rellena si
`data.signatures?.parentPng` existe — la misma condición que ya usaba
la propia firma (línea de al lado en el archivo) para decidir si
dibujarla, ahora aplicada también a su fecha.

**Verificación**: 2 tests nuevos en `pdfFill.test.js` (con firma de
tutor → fecha se rellena; sin ella → fecha se omite, estudiante e
instructor siguen rellenándose). 781/781 tests, lint sin errores
nuevos, build correcto.

### 9.10 — Loading: la ola del logo aparece hacia arriba, no todo el icono de golpe

Petición del usuario: "para el loading... podrías animar la parte q
parece una ola para q vaya apareciendo esa parte del logo hacia arriba
en lugar de solo rellenarse el color como ahora?".

`logo-mark-navy.svg` son en realidad dos trazos superpuestos: un aro
en forma de media luna y, dentro, un trazo que sí parece una ola
rompiendo (confirmado renderizando cada uno por separado). La
animación `oceanFill` (ya existía, sin cambios) recortaba el logo
COMPLETO de golpe — los dos trazos a la vez, sin distinguir la ola del
aro que la envuelve. Se separó el SVG en dos ficheros nuevos con el
mismo `viewBox` (para que seguir encajando exactamente al
superponerse): `logo-mark-navy-ring.svg` (solo el aro, estático,
siempre visible en navy) y `logo-mark-navy-wave.svg` (solo el trazo de
la ola). `AppLoading` (`shared.jsx`) ahora apila 3 capas en vez de 2:
fondo tenue completo (sin cambios), aro fijo encima, y la ola encima de
todo con `oceanFill` — solo ella sube y baja en bucle, el aro se queda
quieto.

**Verificación**: nuevo `AppLoading.test.jsx` (2 tests: las 3 capas son
3 imágenes distintas; solo la capa de la ola lleva la animación).
783/783 tests, lint sin errores nuevos, build correcto. Comprobado a
mano en el navegador (recarga completa, vista previa de "Icono de
carga" en Configuración → Ajustes): las 3 peticiones de red a los SVG
devuelven 200, y visualmente el aro se ve sólido y fijo mientras la
ola aparece y desaparece por debajo.

### 9.11 — Training Records: "Descargar todo" genera un único ZIP, no N descargas sueltas

Petición del usuario: "cuando le de a descargar todos bien foto o pdf
debería de descargar un fichero comprimido con todos los archivos."

Antes, `downloadAllAs` (`TrainingRecordsTab.jsx`) descargaba un fichero
por alumno, uno detrás de otro con una pausa de 200ms entre cada uno
(varias descargas simultáneas se bloquean en algunos navegadores) — con
una clase de 20-30 alumnos, eso eran 20-30 avisos de descarga que el
usuario tenía que ir aceptando a mano. Se añade **`fflate`** (~8kB, sin
dependencias — dependencia nueva, ver `package.json`) para empaquetar
todos los PDF/JPG generados en memoria en un único ZIP con `zipSync`,
y una sola llamada a `downloadBytes` al final (mismo mecanismo ya
probado en Safari iOS que usan `downloadPdf`/`downloadJpg`: revocar el
`blob:` URL con retraso). Nueva `uniqueZipFilename()` evita que dos
alumnos con nombre y apellidos idénticos se pisen dentro del ZIP (antes
eran descargas sueltas y el propio navegador añadía "(1)" al segundo
fichero sin que hiciera falta nada en el código).

**Verificación**: nuevo test en `TrainingRecordsTab.test.jsx` (genera
2 alumnos, pulsa "Descargar todo en PDF", comprueba que
`URL.createObjectURL` se llama exactamente 1 vez con un Blob
`application/zip`). 784/784 tests, lint sin errores nuevos, build
correcto. Comprobado también a mano en el navegador real (plantilla
Basic Diver, 2 alumnos): el ZIP se descargó de verdad
(`~/Downloads/Basic_Diver.zip`) y, al abrirlo con `unzip -l`, contenía
los 2 PDF con nombres correctos (`Ana_Garcia_BD.pdf`,
`Luis_Perez_BD.pdf`).

### 9.12 — Incidente en producción: todos los deployments de Vercel fallaban desde 94b02dd

Aviso directo del usuario a mitad de esta sesión, sin haberlo pedido
como tarea: "te has dado cuenta q los deploy de vercel están fallando?
me están llegando mails de avisos de error". No estaba en el backlog
de la Fase 9 — se atiende de inmediato por delante de todo lo demás,
al ser una rotura activa de producción con avisos llegando por email.

**Diagnóstico** (con `vercel ls`/`vercel inspect --logs`, comparando
deployments Ready vs Error commit a commit): el primer deployment en
error fue exactamente `94b02dd` — el commit de la sección 9.2
(Config/Usuario: movimientos + última actividad), que añadía
`api/get-user-activity-summary.js`. El log de build terminaba en
"Deploying outputs..." seguido de "Error" sin más detalle — el build
en sí (`npm run build`) siempre había terminado bien, tanto en Vercel
como en local, porque `vite build` no toca `api/` en absoluto: un
fallo ahí solo lo detecta el propio empaquetado de Functions de
Vercel, un paso posterior que no corre con `npm run build` ni con
`vercel build` sin sesión vinculada. Reproducido en local vinculando
el proyecto (`vercel link` + `vercel build --yes` + `vercel deploy
--prebuilt --yes`), lo que dio el mensaje real: **"No more than 12
Serverless Functions can be added to a Deployment on the Hobby
plan."** — `api/get-user-activity-summary.js` era la 13ª función del
proyecto (`api/*.js` = 1 Serverless Function cada uno en Vercel).

**Corrección**: en vez de subir a un plan de pago (decisión de
producto/coste, no técnica) o eliminar la funcionalidad, se fusiona el
resumen de actividad dentro de `/api/list-user-status` — endpoint
hermano que ya autentica y comprueba el rol admin igual, ver
`activitySummaryFor()` en `listUserStatus.js`. `handleListUserStatus`
gana una rama activada por `user_id` en el cuerpo: si llega, responde
SOLO el resumen de actividad de ese usuario (sin tocar
`auth.admin.listUsers()`, que no hace falta para esa rama); si no
llega, se comporta exactamente igual que antes (listado masivo para el
directorio). Eliminados `api/get-user-activity-summary.js`,
`server/users/getUserActivitySummary.js` y su test — la lógica y sus
tests (7 casos, portados tal cual) viven ahora en
`listUserStatus.js`/`listUserStatus.test.js`. Cliente actualizado
(`ConfigTab.jsx`): la misma llamada de antes, ahora contra
`/api/list-user-status` con `{ user_id }` en el cuerpo.

**Efecto secundario encontrado en el propio test suite**: los tests de
`ConfigTab.test.jsx` que mockean `fetch` por URL (`mockFetchByUrl`) ya
no pueden distinguir la llamada masiva de la llamada por usuario solo
por la URL (las dos son ahora `/api/list-user-status`) — se
distinguen por si el cuerpo de la petición trae `user_id`, con una
clave de mock aparte (`/api/list-user-status:user`) para quien quiera
comprobar esa respuesta en concreto. Aparte, fusionar los tests de
`getUserActivitySummary.test.js` dentro de `listUserStatus.test.js`
reveló un mock compartido (`verifyCaller`) sin `.mockClear()` en el
`beforeEach` — un test que comprobaba "no se llamó a verifyCaller"
solo pasaba si era el primero del archivo en ejecutarse; ahora se
limpia el historial de llamadas en cada test, no solo el valor de
retorno.

**Regla para el futuro, no solo para hoy**: el límite de 12 Serverless
Functions del plan Hobby es un techo real del proyecto mientras siga
en ese plan — cualquier endpoint admin nuevo debería plantearse primero
como una rama de un endpoint hermano ya existente (mismo criterio de
autenticación/rol) antes que como un fichero `api/*.js` nuevo, salvo
que la semántica sea claramente distinta (método HTTP, público vs
admin, etc.). Ninguna herramienta local (`npm run build`, `npm run
test`, `npm run lint`) detecta este límite — solo se descubre con
`vercel build`/`vercel deploy` vinculado al proyecto real, o
desplegando de verdad. Vale la pena considerar añadir esa comprobación
al proceso de cierre de cualquier cambio que toque `api/`, no solo
cuando ya ha fallado en producción.

**Verificación**: 781/781 tests (58 en
`listUserStatus.test.js`+`ConfigTab.test.jsx` juntos, todos verdes),
lint sin errores nuevos, build correcto. Confirmado con `vercel build
--yes` que el número de funciones vuelve a 12 (antes 13), y con
`vercel deploy --prebuilt --yes` que el deployment termina en
`readyState: "READY"` — la corrección funciona de verdad, no solo en
teoría.

### 9.13 — JPG en Safari iOS real: sin nuevo avance con confianza, se pide un dato concreto en vez de un cuarto arreglo a ciegas

Retomando el reporte del usuario: "descargar JPG SIGUE ROTO. prueba tu
en la url de preview directamente para q lo veas. estoy probando en
safari ios iphone 14 pro max."

**Repaso de lo ya intentado en rondas anteriores** (todo documentado en
sesiones previas, `docs/RELEASE-V1-PROGRESS.md` y Fase 7/8 de este
mismo documento): (1) polyfills de `Promise.withResolvers`/`Iterator`/
`Promise.try` aplicados también dentro del Web Worker de pdfjs-dist,
no solo en el hilo principal; (2) `disableImageDecoder: true` para
evitar la dependencia de WebCodecs, no soportada de forma fiable en
Safari; (3) guard sobre `canvas.toBlob()` devolviendo `null` en vez de
lanzar, con mensaje de error que dice en qué canvas/paso falló. Las
tres son correcciones reales de bugs confirmados en su momento (con
capturas de consola de Safari real que el usuario proporcionó
entonces) — no conjeturas.

**Intento de esta ronda**: probar directamente en la URL de Preview
real, tal como pidió el usuario — posible ahora mismo porque hay un
Preview Deployment recién verificado como `Ready` (ver 9.12). Bloqueado
en la práctica: la app requiere sesión real (el bypass de login es
exclusivamente `npm run dev` en local, nunca en Vercel, por diseño —
ver CLAUDE.md) y no hay credenciales de una cuenta real disponibles
aquí. Sin poder entrar a la app en la URL de Preview, no se puede
ejecutar el flujo de Training Records ahí ni con Chromium ni con nada.

**Por qué no se hace un cuarto cambio a ciegas**: `downloadJpg` y
`downloadPdf` comparten exactamente el mismo mecanismo de descarga
(`downloadBytes`: `<a download>` + `blob:` URL, revocado con retraso).
Existe una incompatibilidad real y documentada de Safari/WebKit con el
atributo `download` sobre URLs `blob:` de imágenes específicamente
(históricamente Safari a veces navega/abre la imagen en vez de
descargarla, a diferencia de `application/pdf`, con mejor soporte) —
es una hipótesis razonable de por dónde puede estar fallando
específicamente JPG y no PDF. Pero aplicar un arreglo (p. ej. detectar
Safari/iOS y abrir la imagen en pestaña nueva en vez de forzar
descarga, para al menos dejar la imagen visible y "guardar imagen"
mediante toque largo como alternativa) sin poder verificarlo sería
exactamente el mismo patrón que ya falló 3 veces seguidas con el bug
del scroll del calendario (ver 9.7) antes de encontrar la causa real
mediante depuración directa — y aquí no hay ninguna vía de depuración
directa disponible.

**Lo que de verdad desbloquearía este bug**: un dato concreto del
dispositivo real que aquí no se puede obtener sin él — ¿qué pasa
exactamente al tocar "Descargar imagen (JPG)" en el iPhone real ahora
mismo? (a) ¿un error visible en pantalla — cuál exactamente? (b) ¿no
pasa nada en absoluto? (c) ¿se abre la imagen en una pestaña nueva en
vez de descargarse? (d) ¿la propia generación falla antes de llegar a
descargar? Cualquiera de esas 4 respuestas apunta a una causa distinta
y a un arreglo distinto — sin ese dato, seguir cambiando código es
conjetura, no diagnóstico.

**Estado**: sin cerrar. Pendiente de esa respuesta del usuario antes de
un cuarto intento de arreglo. No se toca código en esta sección.

### 9.14 — Ayuda: capturas + GIFs, piloto hecho, hallazgo real antes de escalar

Petición del usuario: "revisa y rehaz la ayuda para q se actualice a
todo el nuevo contenido. añade capturas de pantallas y para las
operaciones básicas un paso a paso con gifs animados, capturados en la
app de la rama rediseño, q pesen poco, no escatimes en gifs".

**Contexto que había que resolver primero**: `docs/ADR/0011-rediseno-ayuda.md`
(2026-08-29/09-04) documenta una decisión deliberada de NO usar
capturas — las de esa sesión mostraban el nombre de la cuenta
`dev-bypass` y datos de prueba acumulados desordenados, no
presentables. `HelpStep.jsx`/`HelpArticleBody.jsx` hoy NO tienen
ningún mecanismo de imagen (a diferencia de lo que decía el comentario
de `content.js` — comprobado leyendo el código real, no el comentario:
`article.steps` es un array de strings, sin campo `image` en ningún
sitio) — habría que añadirlo desde cero.

**Antes de descartar la petición por ese antecedente**: se comprobó si
seguía aplicando. Buena noticia — ya no del todo: la cabecera muestra
un nickname genérico ("demo"), no "dev-bypass", y los nombres de
escuela/curso (Blue Manta, Open Water...) leen como datos de ejemplo
razonables, no basura de prueba — probablemente por el commit reciente
`eb7108b` ("añade escuela, redondea comisiones y siembra meses
pasados/futuros"). Sí sigue habiendo un problema de escala: la cuenta
demo tiene 139 pendientes con fechas hasta 2027, lejos de lo que vería
un usuario real en su primera semana — mitigable en captura (filtrar a
un subconjunto pequeño antes de grabar), no bloqueante.

**Piloto real intentado** (artículo "Crear un movimiento", el más
básico): capturado con `gif_creator` (herramienta de grabación de
Chrome de este entorno) el flujo completo FAB → elegir tipo → rellenar
escuela/curso → Guardar, con las marcas de agua/indicadores de clic
desactivados (`showWatermark`/`showClickIndicators`/etc. `false`) para
que no se vieran en un GIF de producto real. **Resultado no
presentable**: el GIF exportado tenía un artefacto real de
"fantasma"/doble exposición — texto de la hoja "Nuevo curso impartido"
superpuesto con el texto de la lista de debajo ("Fun Dive 2T", "Jue,
25 Feb") en posiciones que no corresponden a ningún estado real de la
pantalla, compatible con un frame capturado a mitad de la transición
de apertura de la hoja (`Sheet`, animada) o con un problema del propio
codificador de GIF de la herramienta. Segundo intento añadiendo
esperas explícitas entre cada acción para dejar asentar la animación
antes de grabar el siguiente frame — no llegó a completarse: la propia
sesión de automatización del navegador se volvió a quedar "aparcada"
(`chrome-extension://.../park.html`, la misma inestabilidad ya
documentada en la convención 8 de `CLAUDE.md` para verificación
móvil) a mitad de la grabación.

**Por qué se para aquí en vez de seguir intentando**: dos hallazgos
reales independientes (calidad del GIF exportado + fiabilidad de la
sesión de grabación) apuntan a que producir en serie los GIFs de "no
escatimes" con esta herramienta, en este entorno, ahora mismo,
probablemente saldría con la misma calidad no presentable del piloto,
repetido en cada artículo — peor que no tener GIFs, no mejor. Mismo
criterio que en 9.13: seguir intentando sin una vía de diagnóstico o
mitigación distinta sería conjetura repetida, no producción de
verdad.

**Lo que SÍ se puede ofrecer con confianza, sin más capturas
arriesgadas**: capturas ESTÁTICAS (no animadas) de una sola pantalla
por artículo básico — esas sí han salido limpias toda la sesión (ver
las capturas de Training Records/DatePicker/etc. de esta misma
sesión), sin el problema de transición a media animación que solo
aparece al grabar varios frames seguidos de una `Sheet` abriéndose.
Sería necesario primero añadir el soporte de imagen a
`HelpStep.jsx`/`HelpArticleBody.jsx`/`content.js` (hoy no existe) y
decidir dónde alojar los ficheros (`public/help/`, mismo patrón que
`/brand/*.svg`).

**Pregunta para el usuario, antes de seguir invirtiendo tiempo aquí**:
¿capturas estáticas (1 por artículo básico, sin animación, calidad
confirmada) como alternativa realista a los GIFs por ahora, dejando
los GIFs para cuando se pruebe en un navegador real fuera de este
entorno (o con otra herramienta)? ¿O prefieres que se siga intentando
con GIFs a pesar de la calidad del piloto?

**Estado**: sin cerrar. Nada de código ni contenido nuevo de Ayuda
tocado todavía — el piloto se descartó (fichero borrado) por no ser
presentable.

### 9.15 — JPG en Safari iOS: cerrado, con causa real confirmada

Retoma 9.13. El usuario pegó la consola real de un Safari en su Mac
probando la URL de Preview:

```
Error: Setting up fake worker failed: "undefined is not an object
(evaluating 'e.setup')".
```

Encontrada la causa exacta leyendo el propio código fuente de
`pdfjs-dist` (`node_modules/pdfjs-dist/build/pdf.mjs`,
`PDFWorker._setupFakeWorkerGlobal`/`#mainThreadWorkerMessageHandler`):
cuando Safari no consigue crear un Worker real, pdf.js cae a su modo
interno "fake worker" — en vez de `new Worker(workerSrc)`, hace
`await import(GlobalWorkerOptions.workerSrc)` DIRECTAMENTE EN EL HILO
PRINCIPAL y espera un `WorkerMessageHandler` entre las exportaciones de
ese módulo. `pdfWorkerEntry.js` (el fichero al que apunta `workerSrc`)
nunca exportaba nada — solo tenía un `import()` de efecto secundario,
necesario para el modo worker real (aplicar los polyfills sobre `self`
antes de cargar el worker de verdad) — así que en modo fake-worker
pdf.js recibía un módulo vacío y `undefined.setup(...)` reventaba con
exactamente ese mensaje.

**Arreglo** (`pdfToJpg.js`): `globalThis.pdfjsWorker = {
WorkerMessageHandler }`, la vía que el propio pdf.js comprueba ANTES de
intentar el `import(workerSrc)` — con esto puesto, el modo fake-worker
de Safari deja de depender de las exportaciones de `pdfWorkerEntry.js`
del todo.

**Primer intento descartado**: reexportar `WorkerMessageHandler` desde
el propio `pdfWorkerEntry.js` con top-level await (mantiene el orden
"parche antes que worker" sin un `export * from` estático, que sí lo
rompería). Funcionaba en `npm run dev`, pero el build de producción lo
eliminaba por tree-shaking — ningún módulo de la app "usa" esa
exportación de forma estática, solo pdf.js en tiempo de ejecución vía
un `import()` dinámico que el bundler no rastrea. Confirmado
inspeccionando el chunk generado (`grep` sobre `dist/assets/`): el
`export const` desaparecía del todo. El mecanismo de `pdfToJpg.js` usa
un `import` estático real, así que no es tree-shakeable.

**Por qué esta vez sí se cierra** (a diferencia de los 3 intentos
anteriores del bug del scroll, ver 9.7): esta corrección está anclada
a un error real de un Safari real, con su causa leída directamente en
el código fuente de la dependencia — no es una hipótesis sobre qué
podría estar pasando.

**Verificación**: 781/781 tests, lint sin errores nuevos, build
correcto (confirmado que `globalThis.pdfjsWorker` sobrevive en el
chunk de producción). Sin regresión en Chromium (sin acceso a Safari
real en este entorno, ver CLAUDE.md §8): flujo completo de Training
Records → generar → "Descargar imagen (JPG)" probado a mano en local,
JPG descargado correctamente, sin errores de consola.

### 9.16 — Mi perfil: fecha de nacimiento + país de residencia

Cierra el "Plan de migración #3" propuesto antes en esta misma Fase.
El usuario confirmó el alcance: solo para mostrar en el perfil, ambos
opcionales, sin validación ni uso en ningún otro flujo. Migración
aditiva (`birth_date date`, `country_of_residence text` en `profiles`,
ambas nullable) aplicada contra Supabase TEST con
`scripts/apply-migration.mjs` (permiso explícito del usuario, bloqueado
antes por el clasificador de permisos del entorno por ser un cambio de
esquema en vivo). Nueva `src/countries.js` (lista fija de países con
etiqueta es/en, mismo criterio que `language`/`professional_level` en
`schema.sql` — no es configuración de negocio, no necesita tabla en
Supabase) para el `SearchSelect` del formulario.

**Verificación**: 4 tests nuevos en `ProfileTab.test.jsx` (guardado,
modo lectura con datos, modo lectura sin datos, elegir país en el
buscador). 784/784 tests, lint sin errores nuevos, build correcto.
Comprobado también a mano en el navegador: guardar país+ver que
persiste tras recargar (confirma que la migración quedó bien aplicada
en TEST, no solo que el código compila).

### 9.17 — Plan de migración #4 (cambio de email): aparcado a petición del usuario

Propuesto en chat, nunca implementado — el usuario pidió expresamente
"aparca el intercambio de mail, documenta todo y anótalo en backlog
con prioridad media" (fila añadida a `docs/BACKLOG.md`, sección
"Después").

**Flujo descrito por el usuario, tal cual, para cuando se retome**:
editar email → estado "pendiente" durante 48h → reenvío del email de
verificación cada 2 minutos con countdown visible en la UI → email de
verificación → creación de contraseña nueva para el email nuevo → un
único slide de éxito in-app (mismo patrón que "Qué hay de nuevo")
aclarando que el login por nickname sigue funcionando igual → si pasan
las 48h sin confirmar, el email revierte al original + un slide
explicando la expiración, con la misma nota de transparencia del
nickname.

**Por qué no se implementó en esta ronda**: toca `auth.users`
(Supabase Auth, no solo `profiles`) y necesita al menos una tabla
nueva para el estado "pendiente" — un cambio de esquema/auth real, que
la regla del proyecto (`CLAUDE.md`) exige plantear como plan de
migración aparte y aprobarse antes de tocar código, nunca en un solo
paso. Antes de implementarlo, vale la pena revisar primero (como
haría un senior, no solo seguir la instrucción literal) si
`supabase.auth.updateUser({ email })`, que ya trae su propio
doble-opt-in incorporado, resuelve parte del flujo sin necesidad de
reinventar la tabla de "pendiente" desde cero.

**Estado**: aparcado, documentado, sin código tocado.

## Fase 10 — Segundo lote grande, feedback en vivo del usuario (2026-09-07)

El usuario prueba en vivo la Fase 9 recién desplegada (Preview real,
Safari iOS/macOS, Chrome PC) mientras la sesión sigue en curso y va
encolando hallazgos según los ve. Mismo criterio de autonomía que la
Fase 9: se resuelve y despliega sin pausa salvo que algo necesite una
decisión suya.

### 10.1 — Dominio de producción: alias adicional, con protección de Vercel de por medio

`oceanflow.vercel.app` y `ocean-flow.vercel.app` ya estaban cogidos por
terceros (comprobado con `vercel alias set`, que los rechazó con
"already in use"). `oceanflow-app.vercel.app` se probó, se creó, y se
descartó por decisión del usuario ("app" quedaba repetido demasiado
cerca del propio `.vercel.app`). Alias final:
**`oceanflow-web.vercel.app`**, apuntando al mismo despliegue de
producción que `dive-tracker-exgg.vercel.app` (que nunca se toca —
nunca hay enlaces rotos, no es una redirección).

Hallazgo real durante la creación: el alias nuevo devolvía 302 a un
login de Vercel (`vercel.com/sso-api`) en vez de servir la app —
protección "Vercel Authentication" del proyecto, que por defecto
protege cualquier dominio que no sea el ya marcado como Production.
El usuario lo resolvió él mismo en el dashboard (Project Settings →
Deployment Protection) — confirmado con `curl -I` que
`oceanflow-web.vercel.app` ya devuelve 200 directo, sin redirección.

### 10.2 — Vercel BotID en el registro externo

Ver commit `2713a61` — aprobado explícitamente tras el hallazgo de
seguridad de la Fase 9 (registro externo sin límite de frecuencia).
Nivel Basic (gratis). Detalle completo en el propio mensaje de commit.

### 10.3 — Bug del email de recuperación de contraseña: confirmado ya resuelto, no un bug nuevo

El usuario reportó "sigue sin dejarme cambiar la contraseña... me
envía el mail con URL a develop" desde la URL de Preview del
rediseño. Investigado con la propia API de Resend (con la
`RESEND_API_KEY` ya en el proyecto): se encontró un email de las 03:31
de esa misma madrugada con la URL de develop — pero **reproducido en
vivo ahora mismo** (pedir "olvidé mi contraseña" desde la URL real de
Preview, con la cuenta real `demom `/`mi.gueldlmm@gmail.com`,
inspeccionando el email resultante vía la API de Resend) el enlace
salió con la URL CORRECTA del Preview, y el cambio de contraseña
completo funcionó de principio a fin. La sospecha razonable es que el
email de las 03:31 se pidió directamente desde `dive-tracker-three.vercel.app`
(develop), donde esa URL sí es la correcta — no una prueba contra el
Preview de esta rama. Sin cambios de código; verificado end-to-end en
el navegador real, no solo revisión de código.

### 10.4 — Calendario Home: causa real encontrada y arreglada (scroll al detalle)

Retoma 9.7/9.15. El usuario reportó que el arreglo de la sesión
anterior (`window.scrollTo` de dos argumentos, sin `behavior: "smooth"`)
NO funcionaba en Safari iOS, Safari macOS NI Chrome PC — "lo hace de
vez en cuando pero con un retraso muy grande y solo se ve la
cabecera... no está animado".

**Reproducido y diagnosticado en vivo** (demo, `localhost`, cuenta con
datos reales): `window.scrollY` confirmó que el scroll SÍ llegaba a
ocurrir (0 → 232), pero con un retraso variable de hasta varios
segundos. Causa real: el mecanismo dependía de `onAnimationComplete`
del panel de detalle (`panelVariants`, animación `height: 0 → "auto"`)
— la DURACIÓN de esa animación no es constante, varía según cuánto
contenido tenga el día (un día con más movimientos tarda más en
terminar su animación de altura), así que "esperar a que la animación
termine" nunca iba a dar un tiempo fiable ni predecible.

**Arreglo real (tercer intento sobre este mismo bug)**: dejar de
esperar a nada. El desplazamiento ahora ocurre dentro del propio
manejador de clic del día (`handleClick`, `MonthCalendar`), usando
`e.currentTarget.scrollIntoView({ behavior: "auto", block: "center" })`
sobre el BOTÓN del día pulsado — un elemento que no cambia de tamaño
ni anima, así que su posición se conoce con certeza en el mismo
instante del clic, sin depender de si (ni de cuándo) el panel de
debajo termina de crecer. Se elimina todo el mecanismo anterior
(`detailRef`, `scrollDetailIntoView`, `onAnimationComplete`) — más
simple y sin la fragilidad que tenía.

Efecto secundario esperado y aceptado: al abrir un día que ya cabía
en la pantalla sin necesidad de scroll, este mecanismo igualmente
centra la vista en él — se prefiere un comportamiento consistente y
predecible en todos los casos frente a uno "más fino" que dependa de
medir con precisión (la misma clase de fragilidad que causó este bug
tres veces seguidas).

**Verificación**: reproducido el bug en vivo (retraso real observado,
scrollY con `await` de por medio) y confirmado el arreglo en vivo dos
veces seguidas — clic en un día fuera de la pantalla → panel visible
en la misma captura, sin ninguna espera. jsdom no implementa
`scrollIntoView` (a diferencia de `scrollTo`, que sí existe ahí como
no-op) — encadenado opcional (`?.`) añadido para que los tests no
revienten. 786/786 tests, lint sin errores nuevos, build correcto.

### 10.5 — Training Records: botón "Generar para todos" seguía en verde

El botón usaba el `TEAL` genérico hardcodeado en vez del `accentColor`
real de la sección (ya se le pasaba como prop desde `App.jsx` vía
`sectionColor("trabajo")`, pero se ignoraba en este botón concreto).
Confirmado con una consulta directa a `nav_sections` en Supabase que el
color real de "trabajo" es navy (`#00335A`), no verde — era un bug de
color hardcodeado, no un problema de datos/configuración. Arreglo:
`style={{ backgroundColor: accentColor || TEAL }}` (línea 843 de
`TrainingRecordsTab.jsx`), dejando TEAL solo como respaldo si
`accentColor` no llegara. Añadida una prueba nueva que renderiza el
componente con un `accentColor` distinto del TEAL por defecto y
comprueba el `backgroundColor` real del botón, para que un futuro
cambio no pueda volver a perder el uso de la prop sin que ningún test
lo note. 9/9 tests de `TrainingRecordsTab.test.jsx`.

### 10.6 — Perfil: fecha de nacimiento y país de residencia en la misma línea

Pedido explícito del usuario tras ver el campo nuevo (Fase 9.16) en la
pantalla real: en el formulario de edición, "fecha de nacimiento" y
"país de residencia" pasan a ir en la misma línea (`grid grid-cols-2
gap-2`), y el campo "Profesional" pasa a ir al final (antes iba justo
después del nickname). Mismo orden aplicado a la vista de solo lectura.
Cambio puramente de disposición, sin tocar validación ni el resto del
flujo — ambos campos siguen opcionales. 32/32 tests de
`ProfileTab.test.jsx`.

### 10.7 — Config/Usuarios: fila de una cuenta desactivada, colores más apagados

"la fila de usuarios desactivada tiene el gris muy claro, se diferencia
poco, además querría q todos los colores q muestra sean mas apagados
que los del resto de fila, que de la sensación de 'apagado'" — antes,
una cuenta desactivada solo se distinguía por el punto de estado y la
línea "Baja:"; nickname, nombre, icono de rol, fecha y flecha se veían
exactamente igual que en una fila activa.

Dos cambios en `ConfigTab.jsx`: (1) el color del punto de estado
`desactivado` pasa de `#9CA3AF` (gray-400, el "gris muy claro" del
reporte) a `#6B7280` (gray-500) — necesita partir de un tono algo más
oscuro porque además va a quedar atenuado por el segundo cambio; (2) la
fila entera (`UserListRow`) recibe `opacity-60` cuando
`status === "desactivado"` — atenúa todos los elementos de la fila a la
vez con un único ajuste, en vez de recolorear cada uno a mano, y se
mantiene por encima del umbral de legibilidad.

Añadidas 2 pruebas nuevas en `ConfigTab.test.jsx`: la fila de una cuenta
desactivada lleva `opacity-60`, la de una cuenta activa no — sin esto,
ningún test existente comprobaba el `className` de la fila. 41/41 tests
de `ConfigTab.test.jsx`.

### Cierre del lote 10.5–10.7

789/789 tests (suite completa), lint sin errores nuevos (solo
warnings preexistentes de `react-hooks/exhaustive-deps` en archivos no
tocados por este lote), build correcto. Verificado en navegador
(Chromium, `localhost`, cuenta demo) para 10.4; 10.5–10.7 son cambios
de CSS/orden de campos de bajo riesgo, cubiertos por tests dirigidos —
no se dispone de una cuenta superadmin en el navegador de pruebas de
esta sesión para confirmar visualmente el efecto de `opacity-60` en
Configuración → Usuarios, pendiente de que el usuario lo confirme en su
propia sesión de superadmin.

### 10.8 — Favicon: logo real sin recuadro, con negativo en modo oscuro

"el favicon debería ser solo el logo en el color primario, y si el
navegador tiene activo el modo oscuro serviremos el negativo, ahora
sale un recuadro azul con el logo blanco en el medio". Confirmado
decodificando el PNG embebido en `public/icon.svg`: era literalmente
eso, un cuadrado navy sólido horneado en la propia imagen con el logo
en blanco encima — quedaba así porque en el momento de crear ese
favicon (2026-09-06) el logo solo existía como foto/JPEG, sin fuente
vectorial disponible.

Esa limitación ya no aplica: `public/brand/logo-mark-navy.svg` (mismos
paths que usa el logo de carga de `AppLoading`, extraído del vectorial
real del logo en la Fase 7) ya existe, junto con
`public/brand/logo-mark-white.svg` como negativo. `public/icon.svg`
pasa a ser esos mismos dos `<path>` directamente, sin PNG ni fondo, con
un `<style>` que fija `fill: #063256` (BRAND_NAVY) por defecto y lo
cambia a blanco bajo `@media (prefers-color-scheme: dark)` — el
"negativo" pedido, para que la marca no desaparezca sobre una pestaña
oscura del propio navegador/sistema (sin relación con el tema oscuro de
la app, todavía pendiente).

**Verificación**: `public/icon.svg` es XML válido; en `dist/icon.svg`
tras el build aparecen tanto `#063256` como `#FFFFFF`. Comprobado en
Chromium con una página de prueba aparte (`<img>` del mismo `icon.svg`
sobre fondo blanco y sobre fondo negro): el navegador de pruebas tiene
el esquema de color del sistema en oscuro, y el logo se pintó en blanco
(visible sobre el fondo negro, invisible sobre el blanco por diseño —
confirma que el `@media` sí se está aplicando de verdad, no solo que el
archivo es válido). De paso, se corrige una descripción obsoleta en
`CLAUDE.md` ("Indicador visual de entorno TEST" → punto "Favicon") que
seguía diciendo que el favicon era el icono `Waves` de `lucide-react` en
TEAL — dejó de ser cierto desde el logo real de 2026-09-06 y nunca se
había actualizado esa nota.

### 10.9 — DatePicker compartido: accesos rápidos más compactos + salto de año

Dos quejas relacionadas sobre el mismo componente compartido
(`shared.jsx`, usado en casi toda la app):

1. "los selectores de hoy, ayer.. etc... son muy grandes y poco
   discretos, ocasionan mucho scroll en la capa del datepicker". La
   rejilla 2x2 de accesos rápidos (añadida en 9.8) duplicaba la altura
   del panel — dos filas de 44px antes de llegar siquiera al calendario
   — obligando a hacer scroll interno en el panel flotante para ver
   todos los días en móvil.
2. Fecha de nacimiento (10.6): "no necesito los accesos rápidos de hoy
   mañana ayer.. sino poder ir atrás varios años fácilmente" — esos
   accesos no tienen ningún sentido para una fecha de nacimiento, y no
   había ninguna forma rápida de retroceder décadas (solo mes a mes).

**Arreglo**: los 4 accesos rápidos pasan de una rejilla 2x2 a una única
fila — cabían sin truncar dejando que el texto de cada pastilla envuelva
a 2 líneas dentro del mismo botón de 44px de alto (`leading-tight`, sin
`whitespace-nowrap`), en vez de obligar a una segunda fila completa.
Reduce a la mitad la altura fija del panel en todos los usos. Además,
nuevo prop `quickAccess` (`true` por defecto): `ProfileTab` lo desactiva
del todo para la fecha de nacimiento, donde esos accesos no aportan
nada. Y junto a los `‹`/`›` de mes ya existentes, se añaden `«`/`»`
(`ChevronsLeft`/`ChevronsRight`) para saltar de año en año — siempre
visibles, útiles en cualquier fecha lejana, no solo nacimiento. Nuevas
claves i18n `calendar.prevYear`/`calendar.nextYear` (es/en).

**Verificación**: 2 tests nuevos (`ProfileTab.test.jsx`: el selector de
fecha de nacimiento no muestra "Hoy"/"Ayer" pero sí "Año anterior";
`PaymentsTab.test.jsx`: el salto de año retrocede un año manteniendo mes
y día) + los tests existentes de accesos rápidos y navegación de mes
(que dependen de los mismos nombres accesibles) siguen pasando sin
cambios. Confirmado en navegador (Chromium, `localhost`, cuenta demo):
panel de "Fecha" en Nuevo movimiento (con accesos rápidos, una sola
fila, calendario completo visible sin scroll) y panel de fecha de
nacimiento en Mi perfil (sin accesos rápidos, salto de año probado en
vivo: Septiembre 2026 → Septiembre 2025 con un toque). 791/791 tests,
lint sin errores nuevos, build correcto.

### 10.10 — Tarifas: mismo criterio de "apagado" que la fila de usuario desactivado

"añade lo de la fila desactivada para las tarifas también" — Tarifas ya
tenía su propio tratamiento para una tarifa desactivada desde la Fase 8
(8.4: fondo `bg-gray-50` + opacidad + "· Desactivada" en el metadato),
así que no partía de cero. Comprobado en vivo (Chromium, `localhost`):
desactivando una tarifa de prueba y comparándola con una fila activa, la
opacidad al 70% seguía siendo demasiado sutil — el mismo defecto que ya
se había corregido en la fila de usuario de ConfigTab. Bajada a 60%,
igualando el criterio entre las dos pantallas. Añadido un test que
comprueba la clase `opacity-60` en la fila.

De paso, un test añadido en el commit anterior
(`trainingRecords/TrainingRecordsTab.test.jsx`, "el botón 'Generar para
todos'... usa accentColor") no llevaba el `testTimeout` explícito
(15000ms) que ya usa el test hermano de al lado para el mismo flujo
(seleccionar plantilla + rellenar + añadir alumno) — bajo la carga de la
suite completa llegaba a superar el timeout por defecto de Vitest
(5000ms) y fallaba de forma intermitente, aunque en solitario siempre
pasaba. Corregido añadiendo el mismo `}, 15000);` al final del test.
792/792 tests (suite completa, verificado dos veces seguidas sin fallos
intermitentes), lint sin errores nuevos, build correcto.

### 10.11 — Perfil: espaciado del formulario de Datos personales

"el formulario de edición de datos personales del perfil está todo muy
pegado, input, input, control...". Comprobado en el código: las filas
del formulario (nombre/apellidos, nickname, fecha de nacimiento/país,
profesional) no tenían ningún margen ni `space-y` entre sí — cada
`Field` solo trae su propio `gap-1` interno (etiqueta a input), así que
entre una fila y la siguiente había literalmente 0px. Comparado con el
panel de avatar más arriba en el mismo `ProfileTab.jsx`, que sí envuelve
sus campos en `space-y-3`: se adopta el mismo valor aquí, en vez de
introducir un tercer criterio de espaciado dentro de la misma pantalla.

**Verificación**: 33/33 tests de `ProfileTab.test.jsx` sin cambios
(cambio puramente de layout, sin tocar ningún dato ni comportamiento).
Confirmado en navegador (Chromium, `localhost`, cuenta demo): el
formulario de edición de Datos personales ahora respira entre filas en
vez de aparecer todo pegado. 792/792 tests (suite completa), lint sin
errores nuevos, build correcto.

### 10.12 — Perfil: país de residencia en orden alfabético + panel que ya no "salta" en móvil

Dos quejas sobre el mismo campo: "los países no están en orden
alfabético" y "es imposible de usar en mv, sale arriba, si lo toco
salta".

**Orden alfabético**: `countries.js` los tiene curados por relevancia
(España/Latinoamérica primero) — útil para leer el archivo, no para
elegir en el propio selector. `countryOptionsFor()` (`ProfileTab.jsx`)
ahora los ordena con `Intl.Collator` (no `localeCompare` suelto, para
que acentos como en "México" ordenen junto al resto de sus vecinos y no
al final por el propio acento) antes de devolverlos.

**El panel "salta"**: causa real, no adivinada — `useFloatingPosition`
(`shared.jsx`, el hook que decide si CUALQUIER panel flotante de la app
abre hacia arriba o hacia abajo) recalculaba esa decisión en cada
evento de `resize`/`scroll` del `visualViewport`, incluidos los que
dispara el propio teclado virtual al abrirse mientras el usuario escribe
en el campo de búsqueda del país. Si el campo estaba en una posición
donde el teclado dejaba "justo" el umbral de 280px por debajo, la
decisión podía cambiar de "abajo" a "arriba" (o al revés) MIENTRAS el
panel ya estaba abierto y el usuario tecleando — el panel entero se
desplazaba de golpe sin que nadie tocara nada relacionado con su
posición. Arreglo: la dirección arriba/abajo se decide UNA SOLA VEZ, en
el instante de abrir el panel, y queda congelada mientras siga abierto;
`maxHeight`/`top`/`bottom` (con esa misma dirección ya fija) se siguen
recalculando en cada cambio de viewport, así que el panel sigue sin
salirse nunca de la pantalla — solo deja de cambiar de lado.

**Verificación**: 2 tests nuevos. `ProfileTab.test.jsx` comprueba el
orden alfabético real de las opciones. `shared.test.jsx` reproduce el
mecanismo exacto del bug con un `SearchSelect` aislado — ancla mockeada
cerca del borde inferior de un viewport de 768px (fuerza apertura hacia
arriba), panel abierto, `window.innerHeight` agrandado a 2000 + evento
`resize` disparado (equivalente a que el teclado se cierre), y se
confirma que el panel SIGUE abriendo hacia arriba en vez de saltar hacia
abajo — el test falla con el código anterior y pasa con el arreglo,
confirmado ejecutándolo contra ambas versiones. Como afecta a
`useFloatingPosition`, el hook que comparten TODOS los paneles
flotantes de la app (Select, MultiSelect, SearchSelect, DatePicker,
DateRangePicker, RowMenu), el arreglo protege a los demás por igual, no
solo al selector de país. 794/794 tests (suite completa), lint sin
errores nuevos, build correcto. No se ha podido confirmar en un teclado
virtual real de iOS (la limitación ya documentada de `mobile-check` en
`CLAUDE.md`: el efecto del teclado real sobre `visualViewport` solo se
verifica de verdad en el dispositivo físico) — el arreglo está anclado
al mecanismo real leído en el código, no a una suposición, pero queda
pendiente de que el usuario lo confirme en su iPhone.

### 10.13 — KPIs de Mi trabajo: la cifra ya puede partirse DENTRO de la palabra

Retoma 8.1/9.3/9.4: "los KPIs de movimientos se siguen saliendo del
cuadro porque la cifra es muy grande", luego aclarado "me pasa solo en
el móvil". Causa real, confirmada con DOM real en Chromium (no
adivinada): la Fase 9 ya había quitado `truncate` para permitir partir
la cifra en 2 líneas, pero eso solo funciona si el texto tiene algún
ESPACIO donde partir (varias monedas unidas con " + "). `Money`
(shared.jsx) pinta una cifra sola como un único nodo de texto sin
espacios ("119.677,40") — para el motor de layout es UNA sola palabra,
así que sin más no tenía ningún punto de corte y simplemente se salía
del borde de la tarjeta en vez de bajar de línea. Solo se nota en móvil
porque ahí las 3 tarjetas comparten una fila mucho más estrecha; en
desktop hay margen de sobra para que hasta 7-8 dígitos quepan en una
sola línea sin llegar a necesitar partir nada.

**Arreglo**: `break-words` (Tailwind, `overflow-wrap: break-word`) en el
span del importe de `MoneyKpiTile` — permite partir dentro de la propia
cifra cuando de verdad no cabe, sin afectar a cifras que sí caben en una
línea.

**Verificación**: reproducido y confirmado en vivo con
`javascript_tool` sobre el DOM real (Chromium, `localhost`, cuenta
demo) — con una cifra larga inyectada (`119.677.234.567,40`),
`scrollWidth` (142px) superaba a `clientWidth` (91px) en 51px con la
clase quitada (el mismo overflow que reporta el usuario) y coincidían
exactamente (91px = 91px, la cifra bajaba a una segunda línea) con la
clase puesta. No es una suposición: es el mismo mecanismo reproducido y
medido. Test nuevo en `MiTrabajoTab.test.jsx` que comprueba la clase
`break-words` en el importe. 795/795 tests, lint sin errores nuevos,
build correcto.

### 10.14 — Calendario Home/Resumen: alinear bajo la cabecera en vez de centrar el día

Cuarto ajuste sobre este mismo mecanismo (retoma 9.7/9.15/10.4): "al
hacer click en un día, el calendario estará alineado con la parte
superior de la pantalla, justo debajo de la cabecera con algo de aire".
El criterio anterior (`scrollIntoView({block:"center"})` sobre el BOTÓN
del día) centraba el día pulsado en el viewport; el nuevo pedido es
distinto — ver el mes completo (contexto) pegado justo debajo de la
cabecera fija, con el detalle del día apareciendo debajo, en vez de que
el día pulsado quede en medio de la pantalla.

Se calcula manualmente cuánto desplazar (`window.scrollBy`) para que el
contenedor del calendario entero (`containerRef`, no el día suelto)
quede justo debajo de `<header>` con un margen de 12px. La altura real
de la cabecera se MIDE con `getBoundingClientRect()` en el instante del
clic (mismo criterio que `useFloatingPosition` — medir, no asumir un
número fijo), porque varía con `env(safe-area-inset-top)` según el
dispositivo (notch o no). Se mantiene `behavior: "auto"` (nunca
"smooth", hallazgo ya documentado de que "smooth" no desplaza nada en
este entorno de pruebas).

**Verificación**: 795/795 tests, lint sin errores nuevos, build
correcto. Confirmado en vivo (Chromium, `localhost`, cuenta demo, con
`javascript_tool` para medir con precisión): tras hacer scroll manual
para alejar el calendario de la cabecera y pulsar el día 20, la
cabecera y el borde superior de la tarjeta del calendario quedaron
separados exactamente 11.75px (el margen de 12px pedido, con el
redondeo normal de sub-píxel del navegador) — el mes completo visible
justo debajo de la cabecera, con el detalle del día 20 apareciendo a
continuación.

### 10.15 — Dominio real en TODOS los enlaces generados por email, no solo "olvidé mi contraseña"

Pedido explícito: "lo que corregiste de dominio de enlaces de
recuperación de contraseña aplica a todos los enlaces generados en la
app, aplica el fix lo antes posible". La corrección de la Fase 9/10.3
(`baseUrl` del host real de la petición, en vez de la URL fija
`APP_URL`) solo se había aplicado a "olvidé mi contraseña"
(`requestPasswordReset.js`). Auditados TODOS los sitios que generan un
enlace de un solo uso o de invitación — 5 más seguían con el mismo bug,
confirmado leyendo cada uno (no una sospecha, una comprobación real de
cada llamada a `generateActivationLink`/`new URL(APP_URL)`):

1. **`provisionUser.js`** (compartido por alta de usuario y registro
   externo) — `generateActivationLink(email)` sin `baseUrl`. Afecta al
   email de bienvenida de CUALQUIER cuenta nueva, la ruta con más
   volumen de las cinco.
2. **`createUser.js`** (alta por superadmin) — no calculaba `baseUrl`
   del header `host`, así que `provisionUser` nunca lo recibía.
3. **`externalRegister.js`** (autoregistro público) — ni siquiera
   recibía `headers` en su firma (`api/external-register.js` tampoco se
   los pasaba) — el más lejano del fix original de los cinco.
4. **`regenerateActivationLink.js`** (reactivar cuenta / reenviar
   enlace de activación desde Configuración).
5. **`regeneratePassword.js`** (regenerar contraseña desde
   Configuración).
6. **`generateInvitationLink.js`** (enlace de invitación, Release V1) —
   caso más grave de los seis: ni siquiera tenía la opción de recibir
   un `baseUrl`, `new URL(process.env.APP_URL)` a pelo. Con respaldo a
   `APP_URL` solo si de verdad no llega el header `host`.

`activationLink.js` (el núcleo compartido) ya sabía priorizar `baseUrl`
sobre `APP_URL` desde el fix original — no necesitó ningún cambio,
solo que los seis llamadores empezaran a pasárselo. Mismo patrón en
todos: `getHeader(headers, "host")` + `getHeader(headers, "x-forwarded-proto")`
(ya con su propio helper `getHeader` en cada archivo, patrón ya
establecido en el resto de `server/users/*.js`) → `baseUrl` →
adelante. Ningún cambio de comportamiento cuando no llega el header
`host` (tests locales, o cualquier entorno sin ese header): sigue
cayendo a `APP_URL` exactamente igual que antes.

**Verificación**: 8 tests nuevos (uno o dos por archivo tocado), cada
uno confirma que el enlace/email final usa el host de la petición en
vez de `APP_URL` cuando ese header llega, y que sigue cayendo a
`APP_URL` cuando no llega (sin romper ningún test existente — todos los
tests que ya comprobaban el `flow`/la forma de la llamada a
`generateActivationLink` con matchers exactos siguen pasando porque
`baseUrl: undefined` es equivalente a "esa clave no está" para
`toEqual`/`toHaveBeenCalledWith`). 803/803 tests (suite completa), lint
sin errores nuevos, build correcto. Sin cambio en el recuento de
Serverless Functions (ningún fichero `api/*.js` nuevo, límite de 12 del
plan Hobby sin tocar — ver "Límite de Serverless Functions" en
`CLAUDE.md`).

### Estado al cierre de esta sesión (2026-09-07) — cola pendiente para la próxima

Último commit pusheado a `feature/rediseno-v2`: `fe11868` (fix del
dominio real en todos los enlaces de email). Todo lo de 10.1 a 10.15
está commiteado y pusheado; nada uncommitted salvo dos JPEG sueltos en
la raíz y `docs/ADR/0020-...md`, ninguno de esta sesión — no tocar sin
preguntar. El usuario ha pedido explícitamente cortar aquí y hacer un
`/clear`; esta sección es el punto exacto por el que retomar, sin
depender del historial de chat.

**Pendiente, en orden aproximado de lo último que se pidió:**

1. **KPIs de Mi trabajo — rediseño del icono cuando el número es largo**
   (feedback tras 10.13, break-words): "queda fatal ese diseño de KPIs
   cortados por la cifra... si el número es tan grande como para que no
   quepan número e icono, quitamos los iconos de los tres... todo con
   animaciones". Repasar `kpiIconTierFor`/`MoneyKpiTile` en
   `MiTrabajoTab.jsx` — hoy hay 3 tiers (normal/small/hidden); revisar
   si "small" debe desaparecer (pasar directo de normal a hidden) y
   añadir una transición animada (Motion, `AnimatePresence`) al
   mostrar/ocultar el icono, que hoy es instantáneo.
2. **Calendario — animar el scroll al pulsar un día** (tras 10.14, que
   dejó el scroll instantáneo a propósito): "haz una animación al
   scroll down al calendario al pulsar en un día". Antes de descartar
   `behavior: "smooth"` otra vez (una ronda anterior encontró que no
   desplazaba nada en este entorno de pruebas), verificar con
   `javascript_tool` si sigue fallando aquí o si hace falta un tween
   manual con `requestAnimationFrame`.
3. **Emails — revisión completa** (#31 en la cola del usuario, aparte
   del fix de dominio de 10.15): "en los emails sigue llegando el logo
   antiguo de waves, haz una revisión completa y ajusta diseño y textos
   según la línea Ocean Flow y el libro de estilos". Revisar
   `server/email/` (plantillas HTML) — logo, colores, tono de los
   textos (regla 2 de "Reglas permanentes — Release V1" en
   `CLAUDE.md`: cercano, humano, sin jerga técnica).
4. **TR — estándares del libro de estilo pendientes** (#33, bloqueado):
   "creo q en el TR no se han aplicado los estándares del libro de
   estilo…" — mensaje cortado a media frase. Ya se revisó una vez
   (RowMenu/DeleteButton/Sheet compatibles, botón "Generar para todos"
   ya arreglado en 10.5) sin encontrar más desviaciones obvias. Sigue
   sin resolver: falta que el usuario aclare qué vio mal en concreto.
5. **Sembrar datos reales para mi.gueldlmm@gmail.com** (#32, solo
   TEST): "carga el usuario... con datos de movimientos reales de los
   últimos 4-5 meses y un par de meses a futuro... cantidades redondas...
   varias escuelas". No iniciado.
6. **Investigar recarga en bucle** (#20, abierto desde antes de esta
   sesión): reportado en el Preview Deployment del rediseño. Probado
   una vez sin reproducirlo (solo dos 503 aislados que no se repitieron:
   `HEAD /` y `/.well-known/vercel/jwe`). Sin más datos del usuario
   desde entonces — genuinamente sin cerrar, no descartar sin más
   evidencia.
7. **Rehacer Ayuda: capturas + GIFs** (#18, aparcado desde antes de
   esta sesión) — piloto ya hecho en una sesión anterior con un hallazgo
   real antes de escalar (ver 9.14). No retomado en esta sesión.

Todo lo demás pedido en esta sesión (favicon, DatePicker, fila
desactivada en Config/Tarifas, espaciado de Datos personales, país de
residencia alfabético + el panel que ya no salta, KPIs que no se salen
del cuadro, calendario alineado bajo la cabecera, dominio real en todos
los enlaces) está cerrado, verificado y pusheado — no hace falta
retomarlo salvo que el usuario reporte algo nuevo sobre ello.

## Fase 11 — Continuación de la cola pendiente (2026-09-07, sesión nueva)

Sesión nueva tras el `/clear` pedido al cierre de la Fase 10 — retoma la
lista de "Pendiente, en orden aproximado de lo último que se pidió" de
arriba, en el mismo orden, en modo autónomo (encargo explícito del
usuario: implementar, testear, lintear, build, verificar y hacer
commit+push de cada punto sin pararse a pedir confirmación salvo bloqueo
real).

### 11.1 — KPIs de Mi trabajo: sin tier "small", icono animado al aparecer/ocultarse

Retoma el primer pendiente de la cola: "queda fatal ese diseño de KPIs
cortados por la cifra... si el número es tan grande como para que no
quepan número e icono, quitamos los iconos de los tres... todo con
animaciones".

**Qué se hizo**: `kpiIconTierFor` (`MiTrabajoTab.jsx`) pasa de 3 estados
(`normal`/`small`/`hidden`, umbrales 14/20 caracteres) a solo 2
(`normal`/`hidden`, un único umbral en 14) — el tier intermedio que
reducía el icono a 20px seguía sin resolver el problema real (el icono
seguía compitiendo por el mismo ancho que la cifra), así que ahora es
binario: icono a tamaño completo (28px) o ningún icono, liberando todo
el ancho de la fila para el número. El umbral se mantiene en el mismo
punto (14 caracteres) que antes marcaba el paso a "small" — ya señalaba
que el icono a tamaño completo dejaba de caber cómodo.

`MoneyKpiTile` envuelve el icono en `AnimatePresence` +
`motion.span` (mismo par `EASE.enter`/`EASE.exit` y `DURATION.sm`/`xs`
que el resto de la app, no un tercer vocabulario de motion): entra con
opacidad+ancho+escala crecientes, sale a la inversa, con
`overflow-hidden` en el propio icono para que no se vea recortado a
medio colapsar mientras el ancho anima hacia 0. Antes el cambio de tier
era instantáneo (montaje/desmontaje condicional sin animar).

**Verificado**: `kpiIconTierFor` reescrito en `MiTrabajoTab.test.jsx`
(2 describe blocks en vez de 3, mismos umbrales exactos, ahora solo
normal/hidden). 802/802 tests (suite completa, un test menos que 803
por fusionar 2 casos de "small"/"hidden" en un único describe de
"hidden", no por perder cobertura), lint 0 errores, build correcto.
Confirmado visualmente en Chrome (Chromium, `localhost`, cuenta demo,
viewport por defecto): forzando temporalmente `iconTier` a `"hidden"`
vía una variable de depuración en el propio render (revertida antes de
commitear, nunca llegó a git) se comprobó que las 3 tarjetas ocultan su
icono a la vez y el número ocupa todo el ancho; quitando el forzado y
volviendo a montar la pantalla, el icono reaparece en las 3 — sin
errores de consola en ningún estado.

### 11.2 — KPIs de Mi trabajo: de umbral de caracteres a medición real en el DOM

Feedback en vivo del usuario probando el cambio anterior (11.1) recién
pusheado, en dos mensajes seguidos: "quita el truncate de la cifra
numérica porque ahora sale en dos filas en vez de ocultar el icono" y,
tras preguntarle, "en chrome lo ves bien pero en safari ios se salta en
dos líneas". Confirma el mismo patrón de fallo que ya había costado 3
rondas anteriores en este archivo (Fase 6/7/9): un umbral de caracteres
adivinado (14, fijado en 11.1) no refleja las métricas de fuente reales
de Safari/WebKit, que renderiza los dígitos más anchos que Chromium con
la misma fuente/tamaño — así que una cifra que en Chromium se quedaba en
el tier "normal" (icono visible) en Safari real ya no cabía, y como
`break-words` seguía en el span (heredado de la Fase 10), el resultado
era la cifra partiéndose en dos líneas con el icono todavía puesto, en
vez de ocultar el icono como pedía el diseño.

**Decisión de fondo, no un cuarto ajuste de umbral**: dejar de adivinar
por completo. Se sustituye `kpiIconTierFor` (función pura de longitud de
caracteres, retirada) por una MEDICIÓN real hecha en el propio DOM:

- El span del importe (`MoneyKpiTile`) pierde `break-words` — la cifra
  ya no se parte nunca en dos líneas, en ninguna tarjeta.
- El padre (`MiTrabajoTab`) mantiene `kpiIconTier` como estado (antes
  era un `useMemo` derivado de la longitud del texto) y una referencia a
  los 3 spans de importe (`kpiAmountRefs`, poblada vía la nueva prop
  `measureRef` de `MoneyKpiTile`). Dos `useLayoutEffect` encadenados: el
  primero reintenta "normal" cada vez que cambia la cifra más larga
  (por si ahora sí cabe, p. ej. tras cobrar un pendiente); el segundo
  comprueba si alguno de los 3 spans se sale de su propio ancho
  (`scrollWidth > clientWidth`, mismo criterio ya usado para verificar
  el bug de la Fase 10/10.13) y, si es así, oculta el icono en las 3 a
  la vez. Al ser `useLayoutEffect` (no `useEffect`), la medición ocurre
  antes de pintar el frame — nunca hay un parpadeo del icono
  apareciendo y desapareciendo de golpe.

Esto funciona igual de bien en Safari que en Chromium porque no depende
de contar caracteres en ningún punto: le pregunta al navegador cuánto
ocupa de verdad lo que ya pintó, sea cual sea su motor de fuentes.

**Verificado**: `kpiIconTierFor` y su test se retiran (la lógica ya no
existe como función pura). 2 describe blocks nuevos en
`MiTrabajoTab.test.jsx`: uno confirma que el importe no lleva `truncate`
ni `break-words` pase lo que pase; el otro mockea `scrollWidth`/
`clientWidth` sobre `Element.prototype` (jsdom no calcula layout real,
mismo criterio que otros bugs de esta app reproducidos con medidas
DOM simuladas) para probar ambos caminos — cabe (icono visible) y no
cabe (icono oculto en las 3 tarjetas, con `waitFor` porque el icono sale
con una animación, no al instante). 804/804 tests (suite completa),
lint 0 errores, build correcto. Confirmado en Chrome con los datos
reales de la cuenta demo (sin overflow en ese caso): las 3 tarjetas
muestran icono + cifra en una sola línea, sin errores de consola.
Reproducir el caso de overflow EN VIVO en este entorno (forzando un
ancho artificial con CSS inyectado) resultó poco fiable por la
inestabilidad ya documentada de esta herramienta de automatización de
Chrome en esta sesión (CLAUDE.md §8: pestaña con estado desincronizado
entre lo que devuelve `javascript_tool` y lo que se ve en pantalla) —
la corrección se apoya en la prueba determinista de los tests, no en
esa comprobación visual adicional. Queda pendiente que el usuario lo
confirme en su iPhone real, el único sitio donde el bug original era
reproducible.

### 11.3 — Calendario: animar el scroll al pulsar un día

Retoma el segundo pendiente de la cola: "haz una animación al scroll
down al calendario al pulsar en un día" — el ajuste de 10.14 había
dejado el desplazamiento instantáneo a propósito. Antes de implementar
se reconfirmó en vivo (no se dio por hecho que seguía roto) que
`window.scrollTo`/`scrollIntoView` con `behavior: "smooth"` TODAVÍA no
desplaza nada en este entorno de pruebas (Chromium vía CDP) —
verificado con `javascript_tool`: `scrollY` se queda exactamente igual
tras pedir un scroll suave, tanto para el propio scroll simple como
para el caso real del calendario.

**Qué se hizo**: `animateScrollBy` (nueva, `motion.js`) — anima un
`window.scrollBy` equivalente usando `animate()` de Motion (la misma
librería que ya usa toda la app, no una dependencia nueva) para animar
un NÚMERO (el scrollY objetivo) con el mismo par duración/easing
(`DURATION.md`/`EASE.standard`) que el resto de transiciones — el
patrón documentado de Motion para animar valores ajenos a un elemento
(aquí, la posición de scroll), sin tener que resolver a mano la curva
cubic-bezier de `EASE` con un tween propio. `reduced:true` (o un delta
ya nulo) salta directo al destino con `scrollBy` normal, igual que
antes. `MonthCalendar` (`shared.jsx`) lo usa en el mismo punto donde ya
medía el delta a desplazar (ver el comentario largo junto a
`handleClick`, sin tocar esa parte) — solo cambia CÓMO se aplica el
desplazamiento, no cómo se calcula.

**Verificado**: `animateScrollBy` mockea `animate()` de Motion (para no
depender de `requestAnimationFrame` real en jsdom, mismo criterio que
`useSwipeBack` en este mismo fichero) — 3 tests nuevos en
`motion.test.jsx`: salta directo con `reduced:true`, salta directo con
un delta insignificante, y anima hasta el `scrollY` objetivo
(`startY + delta`) con movimiento activo. Confirmado también en vivo
que la función real SÍ se invoca al pulsar un día del calendario de
Home (con `console.log` temporal, revertido antes de commitear, nunca
llegó a git): `animate()` de Motion se llama con el `deltaY` correcto y
devuelve un controlador de animación real de la librería. 804/804
tests (suite completa, incluye los 3 nuevos), lint 0 errores, build
correcto.

### 11.4 — Emails: logo real (no `Waves`) y ajuste de tono

Retoma el tercer pendiente de la cola: "en los emails sigue llegando el
logo antiguo de waves, haz una revisión completa y ajusta diseño y
textos según la línea Ocean Flow y el libro de estilos".

**Auditoría de `server/email/`** (2 plantillas reales — activación/
bienvenida/reset y aviso de despliegue interno — comparten un único
envoltorio, `emailLayout.js`, ver su propio comentario de cabecera):

- **Logo (el hallazgo real, ya corregido)**: `emailLayout.js` seguía
  pintando el icono `Waves` de lucide-react como SVG inline en la
  cabecera — se escribió (Bloque 7, 2026-09-01) ANTES de que el
  rediseño v2 sustituyera `Waves` por el logo real en toda la app
  visible (Bloque 2 de esta misma iniciativa, 2026-09-06) y quedó fuera
  de esa migración por vivir en un árbol de código aparte
  (`server/email/`, deliberadamente independiente de `src/` para no
  acoplar el envío de emails a Vite/React). `logoMarkSvg()` (nueva,
  sustituye a `wavesIconSvg()`) usa los mismos paths exactos de
  `public/brand/logo-mark-navy.svg` — mismo símbolo que el favicon, el
  loading y el carnet de instructor.
- **Colores**: ya estaban al día — `BRAND_NAVY` (`#063256`) y `BG`
  (`#F7F8F8`) de `emailLayout.js` ya coincidían exactamente con los de
  `src/colors.js` desde una corrección de la Fase 7 (7.5) de esta misma
  iniciativa. No hacía falta ningún cambio aquí.
- **Tono de los textos**: 4 de las 5 variantes de copy de activación
  (`signup`/`external_signup`/`password_reset_request` ya sonaban
  cercanas; se ajustan las 2 que se quedaban más frías/pasivas que sus
  hermanas — `reactivation` ("Tu cuenta... ha sido reactivada" → "¡Buenas
  noticias! Tu cuenta... ya está activa de nuevo") y `password_reset`
  ("Se ha invalidado tu contraseña anterior..." → "Hemos restablecido tu
  contraseña... — crea una nueva con el siguiente enlace", evita además
  la palabra "invalidado", más jerga técnica que producto). El email de
  aviso de despliegue (`deploymentNoticeEmailTemplate.js`) no se toca en
  tono — es contenido interno solo para superadmin (commits, tests,
  build), no le aplica la regla de tono de producto de Release V1.

**Verificado**: comentarios de código que seguían citando "icono Waves"
actualizados en los 3 ficheros que lo mencionaban. 34/34 tests de
`server/email/` (ninguno dependía de los paths SVG concretos, solo de
que exista un `<svg>` y el texto "Ocean Flow" — descripción del test
actualizada igualmente). 804/804 tests (suite completa), lint 0
errores, build correcto. Verificado además renderizando
`renderActivationEmailHtml` a un HTML real y abriéndolo en el navegador
(archivo temporal en `public/`, generado y borrado en el mismo paso, sin
llegar a git): el logo se ve nítido y completo, sin paths rotos ni
recortados.

### 11.5 — Sembrar datos reales para migueldlmm@gmail.com (TEST)

Retoma el quinto pendiente de la cola: "carga el usuario... con datos de
movimientos reales de los últimos 4-5 meses y un par de meses a
futuro... cantidades redondas... varias escuelas". Solo contra el
Supabase TEST (`VITE_ENVIRONMENT=test`, verificado antes de ejecutar) —
es la cuenta real del superadmin (`migueldlmm@gmail.com`), no la cuenta
demo, así que nunca se toca nada de lo ya sembrado a mano.

**Estado de partida**: la cuenta ya tenía datos reales propios — 3
escuelas (Ihasia, Reef Divers, Taco), 24 worklog + 2 comisiones, todo
concentrado entre 2026-08-01 y 2026-09-07 y casi todo en Ihasia (21/24).

**Qué se hizo** — nuevo script puntual
`scripts/seed-real-account-movimientos.mjs` (mismo patrón que
`seed-fase4-datos-reales.mjs` de la cuenta demo, documentado igual como
herramienta de desarrollo, no parte de la app real), sin borrar ni tocar
ningún worklog/comisiones ya existente:
- 3 meses pasados adicionales (mayo/junio/julio 2026, antes del rango ya
  sembrado) + 2 meses futuros (octubre/noviembre 2026, "un par de
  meses").
- Repartido entre las 3 escuelas ya existentes (antes casi todo en
  Ihasia) — solo sobre combinaciones escuela+actividad cuya tarifa YA es
  una cifra redonda; se excluyen a propósito 3 tarifas de Ihasia con
  cifras sueltas (Specialty 34, Rescue 12, curso 10 THB) que eran ruido
  de pruebas anterior, no datos reales.
- Futuros siempre "Pending" — no tiene sentido un curso futuro ya
  cobrado.
- Resultado: cobertura continua mayo→noviembre 2026 (7 meses, sin
  huecos), 52 worklog + 11 comisiones en total, en las 3 escuelas.

**Bug real encontrado y corregido en el propio desarrollo de esta
sesión**: el primer cálculo de "meses pasados adicionales" tenía un
error de desfase de un mes — `currentMonth - [3,2,1]` caía en
junio/julio/AGOSTO en vez de mayo/junio/julio, duplicando el mes de
agosto (que ya tenía datos reales). Detectado antes de dar el paso por
bueno (verificando los meses cubiertos tras la primera ejecución, no
asumiendo que el script era correcto), revertido con un `DELETE` acotado
por `created_at` de los últimos 5 minutos (los 35 registros recién
insertados, ninguno de los originales, verificado por recuento antes/
después: 24/2 exactos de vuelta), corregido el desfase (`currentMonth -
[4,3,2]`) y reejecutado.

**Verificado**: recuento de meses cubiertos por `worklog.date` (mayo a
noviembre, sin huecos), reparto por escuela (Ihasia/Taco/Reef Divers,
ya no solo Ihasia), e importe = tarifa × personas para cada fila nueva
(todos números redondos, ninguna cifra con decimales) — consultado
directamente contra Supabase TEST con el service role, no asumido.
Todos los meses futuros (octubre/noviembre) confirmados "Pending". No
verificado en el navegador: esta es la cuenta real del superadmin, no
la cuenta demo que usa el bypass de login de desarrollo
(`VITE_DEV_DEMO_EMAIL`), así que no hay forma de iniciar sesión como
ella en este entorno sin su contraseña real — la verificación se apoya
en las consultas directas a la base de datos, no en captura de
pantalla.

## Fase 12 — Nuevo lote de correcciones y mejoras (2026-09-07)

Con la cola de la Fase 10 cerrada, el usuario encarga un lote nuevo de
11 puntos ("Correcciones y mejoras — Ocean Flow"), más dos aclaraciones
sobre la cola anterior: la queja de TR ("no se han aplicado los
estándares del libro de estilo") se concreta en "los campos versión del
examen, certificación... se ven del tono verde anterior al rediseño";
y la recarga en bucle del Preview Deployment (#20, abierta desde antes
de la Fase 10) "ya no ocurre" — se cierra sin más acción, no
reproducida de nuevo y ahora confirmada resuelta por el propio usuario.

Orden de trabajo explícito del usuario: "el orden no establece la
prioridad... prioriza entregando valor de forma constante" — se
resuelve en el orden que permita cerrar y pushear cada punto cuanto
antes (empezando por los más acotados), no en el orden 1-11 en que se
listaron. Mismo mecanismo de siempre: documentar+commit+aviso de
despliegue después de cada bloque cerrado, nunca al final del lote.

### 12.1 — Tooltip de "Pendiente de cobrar": solo si hay pendientes de antes de este mes

El tooltip existía para aclarar por qué la cifra de "Pendiente de
cobrar" (deuda acumulada de siempre) no cuadraba con Generado/Cobrado
(ambos solo del mes en curso) en cuanto quedaba algo sin cobrar de un
mes anterior — pero si TODO lo pendiente es de este mismo mes, las tres
cifras ya cuadran solas y el tooltip no aclara nada, solo ruido.

**Qué se hizo**: `hasPendingBeforeCurrentMonth` (nuevo, `MiTrabajoTab.jsx`)
— `true` si algún `incomeEntry` pendiente tiene `date` de un mes
anterior al actual. El prop `tooltip` de la tarjeta "Pendiente de
cobrar" pasa a `null` cuando es `false` — `MoneyKpiTile` ya no monta el
botón "?" en ese caso (no hizo falta tocar ese componente, solo cómo se
le llama).

**Verificado**: test nuevo en `MiTrabajoTab.test.jsx` — con un único
pendiente fechado en el mes en curso, el botón "Info: ..." no aparece
en absoluto. El test ya existente (con pendientes de un mes anterior)
sigue confirmando que el tooltip SÍ aparece y funciona igual que antes.
805/805 tests (suite completa), lint 0 errores, build correcto.

### 12.2 — Training Records: barrido completo del TEAL antiguo (no solo "Generar para todos")

Retoma la queja de TR de la cola anterior, ahora concretada: "los campos
versión del examen, certificación... se ven del tono verde anterior al
rediseño". La ronda de feedback previa (10.5) solo había corregido el
botón "Generar para todos los alumnos" — el resto del archivo seguía
con `TEAL` (el teal legado, `#0F766E`) hardcodeado, algunos componentes
sin ni siquiera recibir `accentColor` como prop.

**Auditoría real (no solo el punto señalado)**: `TrainingRecordsTab.jsx`
ya recibía `accentColor={sectionColor("trabajo")}` desde `App.jsx`
(navy) — pero de los ~16 usos de `TEAL` en el archivo, solo 1
(`accentColor || TEAL` del botón "Generar para todos") lo aprovechaba.
Los otros 15 (`RadioChoice` — versión de examen/certificación/variante
de curso —, `ProgressRowToggle` — checkbox de cada fila de progreso —,
`BatchActionTile`, `StudentRow`, `InstructorMissingNotice`, badge de
plantilla, botón "cambiar plantilla", aviso de "configuración
compartida", enlace "Añade tu primer alumno") seguían con TEAL fijo,
más `#F0FDFA`/`#0F5B57` (tinte/texto teal) hardcodeados en vez de
derivarse del color real. `StudentQuickEntrySheet.jsx` (hoja de alta de
alumno) ni siquiera recibía `accentColor` — sus 2 usos (checkbox "Menor
de edad", botón "Guardar alumno") no tenían forma de acceder al color
real aunque hubiera querido.

**Qué se hizo**: `accentColor` pasa a ser un prop real de cada
subcomponente afectado (antes solo lo tenía el componente raíz),
sustituyendo cada `TEAL` fijo por `accentColor || TEAL` (TEAL queda
solo como último respaldo, nunca como valor por defecto real — mismo
criterio que ya fijó el test de la ronda anterior). Los tintes
hardcodeados (`#F0FDFA`, `#0F5B57`) pasan a derivarse del propio color
(`${color}1A`/`${color}33`), mismo patrón ya usado en Config/Mi trabajo
para las chips de icono. `StudentQuickEntrySheet` gana el prop
`accentColor`, pasado desde `TrainingRecordsTab` en su única llamada.

**Verificado**: 3 tests nuevos en `TrainingRecordsTab.test.jsx` —
"Versión de examen" (RadioChoice) refleja `accentColor` en la opción ya
marcada por defecto, el checkbox de una fila obligatoria de progreso
usa `accentColor` en su `accentColor` CSS, y el aviso de "completa tu
perfil" usa `accentColor` en su botón — los 3 con un `accentColor`
distinto del TEAL legado para que el test falle de verdad si vuelve a
colarse el valor fijo. 808/808 tests (suite completa), lint 0 errores,
build correcto. Confirmado además en navegador real (Chromium,
`localhost`, cuenta demo): plantilla Open Water Diver seleccionada,
checkboxes de "Progreso del curso" en navy (no verde), "Versión del
examen" (Online) y "Certificación" (Open Water Diver) ambos en navy —
zoom sobre los dos para confirmar que no queda ningún resto verde. Sin
errores de consola.

### 12.3 — Pantalla "Crea tu cuenta": textos más cercanos

Pedido: "quiero que la pantalla de 'crea tu cuenta' tenga textos más
amigables, de bienvenida y que generen expectativa" — el copy anterior
era puramente funcional ("Crea tu cuenta" / "Te enviaremos un email
para confirmar tu cuenta y crear tu contraseña"), sin ningún gancho ni
tono de bienvenida, a diferencia de `createPassword` ("¡Bienvenido a
Ocean Flow!"), que sí lo tenía para el flujo de alta por admin.

**Qué se hizo** (`src/i18n/locales/{es,en}/auth.json`, clave
`register`), sin tocar la lógica de `RegisterScreen.jsx`:
- `title`: "Crea tu cuenta" → "Únete a Ocean Flow" — deja de sonar a
  trámite.
- `description`: pasa de solo explicar el paso técnico siguiente
  (email de confirmación) a nombrar primero el problema real que
  resuelve la app ("Deja el cuaderno y las notas sueltas — lleva el
  control de tus clases, comisiones y pagos desde un único sitio"),
  cerrando con la expectativa de rapidez ("Solo te llevará un minuto").
- `confirmationMessage`: abre con "¡Ya casi está!" en vez de ir
  directo al paso técnico, y cierra recordando el beneficio ("empezar a
  controlar tus ingresos con Ocean Flow") en vez de solo "empezar a
  usar Ocean Flow".
- `submit`: "Registrarme" → "Crear mi cuenta" — más personal que el
  infinitivo genérico.

Mismo cambio en `en/auth.json` (paridad de idioma, ya exigida en
cualquier copy nueva de la app). Nada de jerga técnica ni mensaje de
"máquina" — regla 2 de "Reglas permanentes — Release V1" en
`CLAUDE.md`.

**Verificado**: `RegisterScreen.test.jsx` actualizado (8 asserts que
dependían del texto literal anterior) — todos los tests comprueban
comportamiento (envío del formulario, validación de errores, mensaje de
confirmación), no la redacción exacta más allá de localizar el botón
por su nuevo nombre accesible. 808/808 tests (suite completa), lint 0
errores, build correcto. No verificado en navegador real: el bypass de
login de desarrollo inicia sesión automáticamente antes de que esta
pantalla llegue a pintarse (misma limitación ya documentada en 4.5),
así que la verificación se apoya en los tests, que sí renderizan el
componente real y comprueban el texto en el DOM.

### 12.4 — Registro: fecha de nacimiento y país de residencia (opcionales)

Pedido: "añade al formulario de registro los campos fecha de
nacimiento y país de residencia. Ambos serán opcionales" — Mi perfil ya
tenía estos dos campos (Fase 9), pero el registro externo
(`RegisterScreen.jsx`) no los pedía nunca; quien quisiera rellenarlos
tenía que esperar a tener cuenta y entrar en Mi perfil.

**Decisión de diseño (evita tocar el trigger de alta)**: en vez de
mandar estos valores en `user_metadata` para que `handle_new_user()`
(el trigger de Postgres que crea la fila de `profiles` al dar de alta
un usuario en Supabase Auth) los recoja, lo que habría sido un cambio
de esquema/trigger — CLAUDE.md pide planificarlo aparte, "nunca
implementar cambios de esquema en un solo paso" — `provisionUser.js`
hace un `UPDATE` normal sobre la fila que el propio trigger ya creó,
justo después de clonar el dataset inicial. Mismo criterio best-effort
que ya usa el email de bienvenida: si el UPDATE falla, la cuenta ya
existe igual, solo faltarían estos dos datos decorativos (rellenables
después desde Mi perfil) — nunca revierte el alta por esto.

**Qué se hizo**:
- `countryOptionsFor()` (`ProfileTab.jsx`) pasa a exportarse — una sola
  fuente de verdad para el selector de país, reutilizada tal cual en
  `RegisterScreen.jsx` (convención MVP/reutilización).
- `RegisterScreen.jsx`: 2 campos nuevos opcionales (`DatePicker` sin
  accesos rápidos + `SearchSelect` de país, mismos componentes/criterio
  que Mi perfil), justo después de Nickname. Van en su propio estado
  (no en el objeto `form`, que usa un helper genérico pensado para
  eventos de `<input>`) y se mandan en el body de
  `/api/external-register` como `birth_date`/`country_of_residence`
  (`null` si se dejan vacíos).
- `externalRegister.js`: extrae ambos campos del body y los reenvía tal
  cual a `provisionUser()` — no valida ni transforma nada, ya lo hace
  el propio formulario (fecha real vía `DatePicker`, país de una lista
  cerrada vía `SearchSelect`).
- `provisionUser.js`: acepta `birth_date`/`country_of_residence`: si
  llega alguno de los dos, hace el `UPDATE` descrito arriba (el que
  falte se manda como `null`, nunca se omite la clave). Sin ninguno de
  los dos, no toca la tabla en absoluto — ni una llamada de más para el
  alta por admin (`createUser.js`, que no manda estos campos), que
  sigue exactamente igual que antes.

**Verificado**: 2 tests nuevos en `RegisterScreen.test.jsx` (país
enviado en el body cuando se rellena; fecha de nacimiento no repetida
aquí porque ya está a fondo probada con el mismo componente compartido
en `ProfileTab.test.jsx`), 4 tests nuevos en `provisionUser.test.js`
(UPDATE con ambos, con solo uno — el otro sale `null`—, sin ninguno —no
llama al UPDATE—, y que un fallo del UPDATE no bloquea el alta), 1 test
nuevo en `externalRegister.test.js` (propaga ambos campos a
`provisionUser`) — más el test existente de "flujo correcto" actualizado
para reflejar las claves nuevas en la llamada. 814/814 tests (suite
completa), lint 0 errores, build correcto (tamaño del bundle
prácticamente sin cambio, +1KB — `ProfileTab.jsx` ya se cargaba en el
bundle principal desde `App.jsx`, importar `countryOptionsFor` desde
ahí no añade peso nuevo). No verificado en navegador real: mismo motivo
que 12.3 (bypass de login), verificación apoyada en los tests.

### 12.5 — WhatsNew: recupera el slide lateral real (era solo un fundido)

Pedido: "revisa la animación del slider de WhatsNew, ahora mismo se ve
rara". El propio código ya documentaba por qué: un bug real (Bloque 8,
2026-09-03) obligó a QUITAR `AnimatePresence` por completo — combinada
con `mode="wait"` o sin `mode` (sync), la diapositiva ANTERIOR se
quedaba para siempre en el DOM al avanzar. Sin `AnimatePresence`, la
diapositiva vieja se desmonta al instante (React, sin animar) y la
nueva solo hace un fundido de entrada — nada se desliza lateralmente,
de ahí que "se viera rara" comparado con cualquier otro slider de la
app (el calendario de Home/Resumen sí desliza de verdad).

**Causa real encontrada (no solo "quitar y ya")**: `MonthCalendar`
(`shared.jsx`) usa `AnimatePresence` con la MISMA librería/versión y
SÍ funciona bien — la diferencia real es que WhatsNew combinaba
`AnimatePresence` con el `drag`/`dragElastic` INTEGRADO de Motion sobre
la propia diapositiva animada, mientras que `MonthCalendar` nunca usa
`drag` de Motion para su gesto de deslizar: usa `useSwipeHorizontal`
(motion.js), eventos de touch nativos que no tocan la posición del
elemento durante el gesto, solo disparan un callback al soltar. Mezclar
`drag` con `AnimatePresence` en el mismo elemento es un caso límite
documentado del propio Motion — coincide con el bug real observado.

**Qué se hizo**: se reintroduce `AnimatePresence` con `mode="popLayout"`
(el mismo que ya usa `MonthCalendar`, nunca probado en WhatsNew) +
`monthSlideVariants` (mismo par duración/easing que el resto de la
app, no un tercer vocabulario) + `custom={direction}` (nuevo estado,
misma idea que `monthDirection`: "Atrás" siempre desliza al revés que
"Siguiente"/deslizar a la izquierda). El `drag` integrado de Motion se
sustituye por `useSwipeHorizontal` — mismo hook, mismo criterio de
umbral/gesto que ya usa el calendario, un swipe nativo que confirma AL
SOLTAR (sin arrastre en vivo/elástico) en vez del `dragElastic`
anterior.

**Verificado**: test nuevo en `WhatsNew.test.jsx` — tras avanzar dos
veces, comprueba que nunca queda más de un `heading` en el DOM de forma
permanente (justo el test que habría fallado con el bug original; se
confirmó primero que SÍ falla en el instante exacto del clic — el
solapamiento normal e intencionado de la propia animación de salida —
antes de envolverlo en `waitFor` para comprobar el estado ya asentado,
no el transitorio). Los 4 tests ya existentes de navegación siguen
pasando sin cambios. 815/815 tests (suite completa), lint 0 errores,
build correcto. Confirmado además en Chrome real (Ayuda → Ver qué hay
de nuevo): "Siguiente" desliza de verdad lateralmente (capturada la
transición a medio camino, ambas diapositivas visibles brevemente,
resuelto limpio a una sola al asentarse), "Atrás" desliza en el sentido
contrario, sin errores de consola.

### 12.6 — Tras activar la cuenta: Home con WhatsNew, no Ayuda

Pedido: "cuando el usuario accede después del enlace de activación, le
llevará a la home con el WhatsNew abierto. Una vez que lo cierre, no
volverá a verlo hasta la próxima release."

**Estado de partida real, no supuesto**: ya existía un mecanismo
`justActivated` (`App.jsx`) — tras completar `activateAccount()`, la
app abría directamente en **Ayuda** (`initialTab`), pensado para
orientar a alguien en su primer acceso. Este pedido sustituye esa
decisión anterior por la descrita arriba — se retira `justActivated`
por completo en vez de mantener las dos rutas en paralelo (el propio
pedido solo describe UN resultado, no "Ayuda y además WhatsNew").

**Por qué el cambio real es pequeño**: WhatsNew ya tenía su propio
mecanismo general de "una vez por versión" (`whatsNewOpen`/
`hasSeenWhatsNew`, con `localStorage` por `user_id`+`APP_VERSION`) —
independiente de `justActivated`, nunca gateado por él. Una cuenta
recién activada, por definición, no tiene ninguna versión marcada como
vista en ese navegador — así que quitar el enrutado especial a Ayuda y
dejar que `AppShell` arranque siempre en `"home"` (su valor por
defecto) hace que WhatsNew se abra solo, sin necesitar ningún caso
especial para "recién activado": el mismo mecanismo que ya cubre a
cualquier usuario existente que entra tras una versión nueva.

**Qué se hizo**: se retira `justActivated` (estado, `setJustActivated`,
los comentarios que lo explicaban) y el prop `initialTab` de `AppShell`
(ya no lo pasa nadie con un valor distinto del por defecto) — `tab` pasa
a inicializarse siempre como `readStoredNav()?.tab || "home"`, sin la
rama especial. `handleResetPassword` (recuperar contraseña autoservicio)
no cambia: nunca puso `justActivated`, y sigue sin necesitarlo.

**Verificado**: test nuevo en `App.test.jsx` — una cuenta con
`activated_at` recién fijado y sin ninguna versión vista en
`localStorage` muestra el diálogo de WhatsNew abierto solo tras
montar; al cerrarlo (botón "Cerrar" dentro del propio diálogo), queda
"Tu impacto este mes" (contenido único de Home) y NO "Primeros pasos"
(contenido único de Ayuda). Encontrado y corregido un problema real de
aislamiento del propio test durante el desarrollo (no del código de la
app): `sessionStorage` no se limpia entre tests de este archivo, así que
un test anterior que había navegado a Ayuda dejaba esa pestaña guardada
y el test nuevo la heredaba en vez de arrancar en Home — un `sessionStorage.clear()`
al principio del test (documentado en el propio test, con la aclaración
de que en producción esto nunca ocurre: una activación real siempre
pasa en una sesión/pestaña nueva) lo replicó fielmente. 816/816 tests
(suite completa), lint 0 errores, build correcto. No verificado en
navegador real: reproducir un enlace de activación real requiere un
token válido de un solo uso recién generado, no algo simulable en este
entorno sin generar uno de verdad contra Supabase TEST — verificación
apoyada en el test, que ejercita el mismo camino de estado que usaría
la app real (`profile.activated_at` recién fijado, sin marca de versión
vista).

### Fase 13, punto final — KPIs de Mi trabajo: encogimiento continuo del icono

Pedido explícito, muy concreto (el propio usuario: "llevamos varias
iteraciones... se me está haciendo bola"): "el número animado empieza a
crecer. El icono de la izquierda se va encogiendo según crece el
número. En el momento en que el número vaya a salirse de la caja, el
icono desaparece... En el momento en que uno de los 3 KPIs vaya a
ocultar su icono, el resto hará lo mismo a la vez." Con libertad
explícita para decidir la implementación ("rápida y eficiente").

**Por qué las 5 rondas anteriores (Fase 6/7/9/11.1/11.2) no llegaban a
esto**: todas eran BINARIAS — dos estados fijos (normal/pequeño,
normal/oculto) con un salto o una animación de entrada/salida entre
ellos. El pedido de esta ronda es explícitamente continuo ("se va
encogiendo"), no dos estados.

**Diseño elegido** (`MiTrabajoTab.jsx`): `kpiIconScale`, un número de 0
a 1 en vez de un string de dos valores.
- Se mide la cifra FINAL de cada tarjeta, no la que se ve mientras el
  número cuenta hacia arriba — cada `MoneyKpiTile` renderiza un span
  invisible adicional (`finalTextMeasureRef`, `visibility:hidden` +
  `position:absolute`, nunca `display:none`, que inutilizaría
  `scrollWidth`) con el importe ya formateado sin animar, solo para
  medir su ancho real de una sola vez por cambio de totales — evita
  tener que remedir en cada fotograma del conteo (más simple y barato)
  sin perder la garantía de Fase 11.2 de medir el DOM real en vez de
  contar caracteres (WebKit renderiza más ancho que Chromium).
- Fórmula: `scale = clamp((rowWidth - 34 - textScrollWidth) / 36, 0, 1)`
  — 34px es el hueco del icono completo (28px + 6px de gap), 36px es la
  zona de transición (cuánto margen antes del borde empieza a encoger
  el icono en vez de saltar de golpe). Se calcula sobre las 3 tarjetas a
  la vez y se aplica el MÍNIMO de las 3 a las 3 — así, si una cifra
  fuerza a ocultar el icono, las otras dos lo hacen a la vez, mismo
  criterio que ya exigían las rondas anteriores.
- El icono nunca se desmonta (sin `AnimatePresence`): su
  `width`/`opacity`/`scale` se anima de forma continua con Motion hacia
  el `iconScale` que le llegue — un cambio de 1 a 0 se ve como un
  encogimiento gradual sobre `DURATION.md`, no un salto ni una
  animación de entrada/salida separada. "Se encoge según crece el
  número" se consigue por SINCRONÍA de duración (mismo tramo de tiempo
  que el conteo hacia arriba, aunque no estén atados fotograma a
  fotograma), no midiendo en cada frame — mucho más barato y, en la
  práctica, indistinguible para quien lo mira.

**Bug real encontrado y corregido durante la verificación en vivo** (no
en los tests, que no lo detectaban): el `motion.span` del icono no
tenía `initial` explícito — en el primer render, Motion trataba el
`opacity` de partida como "el que ya hay" (1, el valor CSS por
defecto), pero el `width` de partida como "el que ya hay" también, solo
que sin ningún ancho explícito en las clases (`h-7` fija el alto, no el
ancho) su ancho natural real era el del icono SVG interior (~16-20px),
no 28px — las dos propiedades animaban desde puntos de partida
distintos e inconsistentes entre sí, dejando `opacity` congelado en 1
mientras `width` sí llegaba a 0 (confirmado con `javascript_tool`
sobre el DOM real: `iconWidth: "0.99785px"`, `iconOpacity: "1"` a la
vez — un estado a medio camino que nunca debía quedarse fijo).
Corregido añadiendo `initial={{ width: 28, opacity: 1, scale: 1 }}`
explícito, con lo que ambas propiedades pasan a compartir el mismo
punto de partida y llegan sincronizadas al mismo destino.

**Verificado**: 3 tests reescritos en `MiTrabajoTab.test.jsx` — escala
1 con espacio de sobra, escala 0 sincronizada en las 3 tarjetas cuando
el límite se supera (con el botón de tooltip de "Pendiente de cobrar"
comprobado aparte, nunca depende de esta escala), y un caso a
propósito en el punto intermedio confirmando una escala estrictamente
entre 0 y 1 (el encogimiento gradual, no un salto). El matcher
compartido `money()` de este archivo se ajusta para excluir el nuevo
span invisible de medición (mismo texto que el visible, antes lo
encontraba dos veces). 817/817 tests (suite completa), lint 0 errores,
build correcto. Confirmado en Chrome real (Chromium, `localhost`,
cuenta demo): con los importes reales, las 3 tarjetas muestran el
icono a tamaño completo (`28px`, opacity `1`) sin overflow; forzando un
ancho de tarjeta artificialmente estrecho (CSS inyectado y revertido en
el mismo paso, nunca llegó a git), el icono se oculta del todo
(`0px`, opacity `0`) en las 3 a la vez — sin errores de consola en
ningún estado. No se pudo reproducir en vivo el tramo intermedio exacto
(los importes reales de la cuenta demo no dejan margen suficiente entre
"cabe justo" y "no cabe" para forzarlo solo con CSS sin tocar datos) —
cubierto igualmente por el test dedicado con anchos controlados.

### 12.7 — Home: "Generado este mes" → "Escuela más activa" (deja de duplicar el KPI de Mi trabajo)

**Pedido**: la tarjeta "Generado este mes" al final de Home mostraba
una cifra de dinero que ya aparece, igual de visible, en la cabecera
de Mi trabajo ("Tu impacto este mes") — información duplicada sin
aportar nada nuevo. Petición explícita del usuario: rediseñarla con
libertad creativa total, con la única condición de que el contenido
nuevo tenga **menos** peso informativo que una cifra de dinero (no
sustituir un duplicado por otro dato igual de "grande"), manteniendo el
encaje visual con el resto de Home.

**Decisión de diseño**: la tarjeta pasa a mostrar la **escuela con más
movimientos este mes** ("Escuela más activa"), con un contador de
movimientos como subtítulo y, si hay más de una escuela con actividad,
cuántas escuelas en total (p. ej. "2 movimientos · 2 escuelas este
mes"). Es información de contexto/curiosidad, no una cifra de negocio —
cumple el requisito de "menos peso" sin dejar la tarjeta vacía de
contenido. Reutiliza `incomeEntries` (ya cargado en `HomeTab.jsx`, sin
tabla ni cálculo nuevo) agrupando por escuela y quedándose con el
máximo; si no hay ningún movimiento este mes, muestra un estado vacío
("Sin actividad este mes") en vez de esconder la tarjeta — mismo rol de
"puente táctil a Resumen" que tenía antes, ahora con `onClick` idéntico
y el testid renombrado a `active-school-this-month-card`. Icono
`Building2` (lucide-react) en `TEAL`, mismo patrón visual de tarjeta que
el resto de Home. Las claves i18n antiguas (`generatedThisMonth`,
`peopleTrained_*`, `noCoursesThisMonth`, `trendVsPreviousMonth`) se
eliminan de `home.json` (comprobado que ningún otro archivo depende de
ellas — la clave homónima `trabajo:kpis.generatedThisMonth` de Mi
trabajo vive en un namespace distinto y no se toca).

**Descartado**: mantener el indicador de tendencia ("+100% vs mes
anterior") junto al nuevo dato — habría vuelto a subir el peso
informativo de la tarjeta justo lo que se pedía bajar.

**Verificado**: `HomeTab.test.jsx` reescrito — nuevo describe con 3
tests (una escuela activa en singular, varias escuelas con el contador
combinado, sin actividad muestra el estado vacío) más el test de
navegación a Resumen ya existente, adaptado al testid nuevo; los 2
tests del indicador de tendencia (funcionalidad retirada) se eliminan.
817/817 tests (suite completa), lint 0 errores (mismos 10 warnings
preexistentes, ninguno nuevo), build correcto. Confirmado en Chrome
real (Chromium, `localhost`, cuenta demo, datos reales sembrados en
11.5): la tarjeta muestra "Ihasia" con "30 movimientos · 3 escuelas
este mes", y pulsarla navega a Resumen sin errores de consola.

### 12.8 — Training Records: AOWD, las "Aventuras" ya avisan de que son obligatorias

**Pedido**: feedback real del usuario — "en TR de Advance no se ve de
primeras que las aventuras sean obligatorias".

**Causa**: no era un bug de validación — `validateRecordConfig`
(`recordConfig.js`) ya trataba las 3 filas "Aventura 1/2/3" de AOWD
como obligatorias de verdad desde el "ALL AOWD fields obligatory" del
2026-09-04 (hay que elegir una aventura distinta en cada una, con su
fecha, o el documento no se puede generar). El problema era solo
visual: `ProgressRowToggle` (filas fijas como "Sesiones Académicas",
"Buceo Profundo"...) ya mostraba una etiqueta "OBLIGATORIO" junto al
texto, pero `AdventureRow` (las 3 filas de aventura) no tenía ningún
indicio equivalente — a simple vista se veían como un campo más,
indistinguible de uno realmente opcional.

**Implementado**: `AdventureRow` (`TrainingRecordsTab.jsx`) añade la
misma etiqueta `t("studentSheet.obligatorio")` que ya usa
`ProgressRowToggle`, reutilizando la clave i18n existente — sin texto
nuevo que traducir. Cambio puramente visual, la lógica de validación no
se toca.

**Verificado**: nuevo test en `TrainingRecordsTab.test.jsx`
("las 'Aventuras' de AOWD muestran la etiqueta 'Obligatorio', igual
que las filas fijas") — selecciona la plantilla AOWD y comprueba que
"Aventura 1" lleva la etiqueta junto al texto. 818/818 tests (suite
completa), lint 0 errores (mismos 10 warnings preexistentes), build
correcto. Confirmado en Chrome real: con la plantilla "Advanced Open
Water Diver" seleccionada, "Aventura 2" y "Aventura 3" muestran
"OBLIGATORIO" con el mismo estilo que "Sesiones Académicas
Finalizadas"/"Buceo Profundo" — sin errores de consola.

### 12.9 — `manifest.json` nunca llegaba al build de producción (bug real, causa probable del icono roto en Safari iOS)

**Pedido**: feedback real del usuario — "ahora en Safari iOS no sale el
icono directamente".

**Causa real encontrada**: `manifest.json` vivía en la RAÍZ del
repositorio, no dentro de `public/`. Vite solo copia a `dist/` los
ficheros de `publicDir` (por defecto `public/`, sin configuración
distinta en `vite.config.js`) — un fichero en la raíz del repo nunca
forma parte del build de producción, aunque `index.html` lo referencie
como `<link rel="manifest" href="/manifest.json" />`. Confirmado de
forma reproducible: `rm -rf dist && npm run build` seguido de
`ls dist/` no incluía `manifest.json` (sí incluía `icon.svg`,
`icon-192.png`, `icon-512.png`, ya correctamente ubicados en
`public/`). Confirmado también contra la producción real:
`curl -L https://dive-tracker-exgg.vercel.app/manifest.json` → 404
(mientras que `icon.svg` sí respondía 200). Sin un manifest válido,
Safari iOS no tiene de dónde leer el nombre/tema/lista de iconos de la
app al hacer "Añadir a pantalla de inicio" y puede caer a un icono
genérico (una captura de la propia página) en vez del logo real — el
síntoma exacto reportado. El `apple-touch-icon` (PNG independiente del
manifest) ya apuntaba al fichero correcto, pero eso solo cubre parte
del comportamiento de iOS, no lo compensa del todo si el manifest
falla.

**Implementado**: `git mv manifest.json public/manifest.json` — cambio
de una sola línea de intención (mover un fichero a su sitio), nada más
se toca. Sin referencias a la ruta antigua en el código (`grep` sobre
todo el repo, aparte del propio `index.html`, que sigue apuntando a
`/manifest.json` — la ruta SERVIDA, no cambia).

**Verificado**: `rm -rf dist && npm run build` seguido de `ls dist/`
ya incluye `manifest.json` junto al resto de iconos; `vite preview`
(build de producción real, servido en local) responde 200 tanto en
`/manifest.json` como en `/icon-192.png`. 818/818 tests (suite
completa, sin relación funcional con este cambio pero confirmando que
nada se rompió), lint 0 errores, build correcto. Pendiente de
confirmar en Safari iOS real una vez este cambio llegue a producción
(el bug solo era reproducible contra un build real, no en `npm run
dev`, donde Vite sirve también los ficheros de la raíz del repo de
forma distinta a como empaqueta `vite build`).

### 12.10 — Auditoría de los 10 warnings de lint: ninguno esconde un bug real

**Pedido**: "analiza si merece la pena arreglarlos o si esconden algo
más grande" sobre los 10 warnings de `npm run lint` (0 errores, todos
`react-hooks/exhaustive-deps`, sin cambios desde antes de esta sesión).

**Análisis, caso a caso** (no solo por categoría — cada archivo
inspeccionado):

1. **`ComisionesTab.jsx`/`MovementSheet.jsx`/`WorkLogTab.jsx`** (`rateFor`
   fuera de las deps de un `useMemo`) y **`SummaryTab.jsx`**
   (`withinRange`/`schoolColor` fuera de las deps de varios `useMemo`,
   5 de los 10 avisos): en los 4 archivos, la función señalada es un
   closure plano, redefinido en cada render, que solo lee de un valor
   que YA está en el array de dependencias (`commissionRates.rows`,
   `rangeStart`/`rangeEnd`, `schools.rows`...). Añadir la función al
   array no cambiaría nunca el resultado (su comportamiento ya depende
   por completo de lo que ya se vigila) — sí haría que el `useMemo`
   recalculase en CADA render, porque una función sin `useCallback`
   tiene una identidad distinta cada vez: quitaría el memo de raíz sin
   arreglar nada real. Caso de falso positivo conocido y documentado
   del propio plugin `eslint-plugin-react-hooks` para closures locales
   que cierran solo sobre dependencias ya declaradas.
2. **`ConfigTab.jsx`** (`onSectionChange`/`t` fuera de un `useEffect`):
   `onSectionChange` es el setter de un `useState` de `App.jsx`
   (`setConfigSectionHeader`) — React garantiza que un setter de
   `useState` nunca cambia de identidad entre renders, así que omitirlo
   es siempre seguro. `t` sí podría, en teoría, dejar la miga de pan de
   Configuración en el idioma antiguo si el idioma cambiara mientras el
   usuario sigue dentro de una subsección — pero el único selector de
   idioma en caliente vive en "Mi perfil" (`ProfileTab.jsx`), una
   pestaña principal distinta: llegar hasta ahí implica salir de
   Configuración, lo que desmonta este estado (`section` vuelve a
   `null`) y hace que el efecto se re-ejecute igualmente al volver. No
   hay ningún camino real de la UI actual que deje ver el bug.
3. **`StudentQuickEntrySheet.jsx`** (`initial` fuera de un `useEffect`):
   deliberado y ya explicado en un comentario del propio archivo — usa
   `initial?.id` (un primitivo estable) en vez del objeto `initial`
   completo (una referencia nueva en cada render del padre) para no
   resetear el formulario en cada re-render ajeno de quien abre la
   hoja. Patrón estándar recomendado precisamente para este caso.

**Decisión**: no tocar ninguno de los 10. "Arreglarlos" en el sentido
que sugiere el aviso (añadir la dependencia) sería, según el caso, un
no-op (el setter) o un empeoramiento real (recalcular en cada render
donde hoy hay memoización correcta), sin ganar nada — iría contra
"evitar sobreingeniería y patrones introducidos solo por moda" (regla
de arquitectura de `CLAUDE.md`). La alternativa "correcta" según la
letra de la regla — envolver `rateFor`/`withinRange`/`schoolColor` en
`useCallback` en sus 4 archivos para poder listarlas sin recalcular de
más — es una refactorización real con su propio coste (más código, más
superficie que mantener) a cambio de cero cambio de comportamiento; no
se hace sin que aporte algo. Sin cambios de código en este punto —
solo esta auditoría documentada, tal y como pide la regla 7 de
"Documentación viva de decisiones" para una decisión de arquitectura
con motivo real de quedar registrada.

### 12.11 — Limpieza de código y documentación obsoleta

**Pedido**: "analiza si hay algo obsoleto que limpiar", con el añadido
posterior explícito de repasar también `docs/BACKLOG.md` ("muchas
cosas están hechas u obsoletas").

**Código eliminado** (verificado sin ninguna referencia antes de
borrar, `grep` sobre todo el repo): `public/favicon.svg` y
`public/icons.svg` — ningún archivo (`index.html`, componentes, tests)
los menciona; sobras de antes del rediseño de marca (el favicon real
hoy es `public/icon.svg`, ver "Indicador visual de entorno TEST" en
`CLAUDE.md`).

**`CLAUDE.md` corregido**: la sección "Cosas que NO existen todavía"
seguía afirmando que `/icon-192.png`, `/icon-512.png` y `/og-image.png`
eran placeholders pendientes de generar, y que el icono de carga
(`AppLoading`) usaba iconos de lucide-react "a la espera del logo
oficial". Ambas afirmaciones ya eran falsas: los 3 ficheros son el
logo real de Ocean Flow (generados 2026-09-06/07, confirmado abriendo
cada imagen) y `AppLoading` ya usa ese vectorial real por defecto
(`iconName="Logo"`, `shared.jsx`) — los iconos de lucide-react siguen
existiendo solo como alternativa seleccionable en Configuración →
Ajustes, no como único recurso. Corregido para que una sesión futura
no dé por hecho un trabajo pendiente que ya está hecho.

**`docs/BACKLOG.md` corregido**: la fila "Crear rama `test` +
configurar `dive-tracker`" describía `dive-tracker` como un proyecto
"hoy sin variables de entorno reales en Production/Preview" — ya no es
cierto, `CLAUDE.md` (sección "Ramas y entornos", con una revisión
posterior a la última edición de `BACKLOG.md` según `git log`)
confirma que `develop` ya hace de entorno TEST de facto sobre ese
proyecto, con su propio Supabase separado y `VITE_ENVIRONMENT=test` ya
configurado. Se corrige la fila para reflejar que lo único pendiente
es la rama `test` DEDICADA en sí (sin disparador cumplido todavía, por
`docs/ADR/0006`), no la configuración del proyecto Vercel (ya hecha).

**Comprobado y descartado como falso positivo** (sin tocar): auditados
también, contra el código real, varios ítems más de "Después" del
backlog — rate limiting de `/api/request-password-reset` (sin
implementar, confirmado), healthcheck periódico de sesión
(`useSession.js` solo llama `getUser()` puntual, sin `setInterval`),
snapshot de tarifa en `worklog` (sin columna `rate` en `schema.sql`),
renombrado interno de `activities` (sigue llamándose así en
`App.jsx`), pasos de BD de `payment_type` (la tabla y columnas siguen
en `schema.sql`) — los 5 siguen genuinamente pendientes, ninguno se
toca.

**Dejado explícitamente sin tocar**: `docs/ADR/0020-migraciones-supabase-y-separacion-test.md`
(sin commitear, "Propuesto — pendiente de aprobación explícita" según
su propia cabecera) y la fila "Bug: añadir tarifa inline bloquea el
formulario" del backlog (sin ninguna evidencia nueva de que esté
resuelto) — ambos son trabajo en curso ajeno a esta limpieza, no
material obsoleto.

**Verificado**: 818/818 tests (suite completa, sin relación funcional
con este cambio pero confirmando que nada se rompió al borrar los 2
SVG), lint 0 errores, build correcto tras `rm -rf dist && npm run
build`.

### 12.12 — Guía de marca para la diseñadora (redes/materiales)

**Pedido**: "prepara una guía corta (CTAs, servicios, presentación de
Ocean Flow) para mi diseñadora" — material de referencia para diseñar
piezas de redes sociales.

**Implementado**: guía publicada como página (Artifact), no como
documento markdown suelto — pensada para que la diseñadora la abra y
trabaje directamente sobre ella. Contenido íntegramente sacado de
fuentes reales del propio proyecto, sin inventar mensajes nuevos:
- **Elevator pitch y público objetivo**: de `docs/PRODUCT.md`
  ("instructor de buceo freelance", los 4 problemas que resuelve).
- **Tono de voz**: de las reglas permanentes de Release V1 en
  `CLAUDE.md` (cercano, joven y fresco sin perder profesionalidad,
  nunca mensajes de máquina, contexto de "manos mojadas").
- **Paleta**: los 5 colores de marca reales de `src/colors.js`
  (`BRAND_NAVY #063256`, `BRAND_SKY #8AACCE`, `TEAL #0F766E`,
  `CORAL #C2542F`, `GREEN #15803D`), con su rol de uso real en la app.
- **Tipografía**: Inter, única familia (convención #10 de `CLAUDE.md`)
  — la guía explicita que nunca se combina con una segunda fuente.
- **Logo**: el SVG vectorial real (`public/brand/logo-mark-navy.svg`),
  con reglas de uso mínimas (versión blanca sobre fondo oscuro, margen,
  no estirar/rotar).
- **Funcionalidades**: las 6 reales de la app (Registro, Comisiones,
  Compañeros, Tarifas, Resumen, Training Records), cada una con un
  mensaje corto en el mismo tono, no una lista técnica.
- **CTAs y frases ya validadas**: el tagline real del login ("Bucea
  más. Gestiona menos.") y el copy real de la pantalla de registro
  ("Deja el cuaderno y las notas sueltas..."), reutilizables tal cual.

Sin código de la app tocado — entregable puramente de contenido/diseño,
sin tests/lint/build aplicables.

### 12.13 — Decimales en cifras de dinero: análisis, sin implementar todavía

**Pedido**: "¿cómo sería de elegante ocultar los decimales e indicarlo
en algún tooltip? lo veo una basura" — pregunta de diseño, no una
instrucción cerrada de implementar.

**Análisis**: la cifra que motivó el comentario son los KPIs de
cabecera de Mi trabajo (`MoneyKpiTile`, `MiTrabajoTab.jsx`) — el mismo
componente rediseñado tres veces esta sesión (Fase 6/7/9/11.1/11.2/13)
hasta llegar al encogimiento continuo del icono ya cerrado en el punto
anterior de esta fase. Redondear su cifra a 0 decimales no es solo
"quitar dos caracteres": el ancho medido para decidir cuánto se encoge
el icono (`finalTextMeasureRef`) usa `moneyKpiText()` →
`formatMoney()`, la MISMA función de 2 decimales que pintaría la cifra
visible — cambiar solo la cifra visible sin tocar también esa medición
dejaría el icono encogiéndose más de lo necesario (conservador, no
roto, pero sí una regresión sutil sobre un cálculo que costó 3 rondas
dejar bien). Añadir además un tooltip con el importe exacto sobre un
componente ya animado (icono + cifra contando hacia arriba) es
superficie nueva de interacción sobre algo recién estabilizado.

**Decisión**: no implementarlo todavía. El coste real (tocar de nuevo
un componente ya delicado, dos sitios que deben cambiar a la vez para
no desincronizarse) no es proporcional a una idea todavía abierta
("¿cómo sería...?", no "hazlo"), y compite con trabajo de más impacto
y más urgente ya en cola (SEO y QA antes de la release a producción,
pedidos explícitamente "antes de la release"). Si el usuario confirma
que quiere seguir adelante con esto, la vía de menor riesgo sería un
`title` nativo del navegador con el importe exacto (sin estado nuevo,
sin tocar la animación) en vez de un tooltip con panel propio, y
actualizar `formatMoney`/`moneyKpiText` a la vez que la cifra visible
para no desincronizar la medición del icono.
