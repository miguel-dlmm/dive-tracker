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

**Estado: 🟡 en curso.** Primer bloque implementado (iconografía/avatar,
ver arriba) directamente en `feature/rediseno-v2`, sin esperar al orden
original (logo/cabecera → Home → ...). El resto de la fase sigue el plan
de abajo.

## Cómo continuar (próxima sesión)

Pendiente: logo/cabecera/navegación global (máximo impacto visual,
mínimo riesgo funcional) y luego Home → Mi trabajo → Resumen → Tarifas
→ Configuración/Ayuda (Mi perfil ya está resuelto, ver bloque de
iconografía/avatar arriba). Nada de esto se ha tocado todavía.
