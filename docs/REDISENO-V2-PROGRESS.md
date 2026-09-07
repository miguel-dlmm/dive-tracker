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
