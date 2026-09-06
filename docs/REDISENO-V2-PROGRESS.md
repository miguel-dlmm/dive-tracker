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

**Estado: ✅ entregado, pendiente de validación humana antes de pasar a
Fase 2 (propagación a pantallas).**

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

## Cómo continuar (próxima sesión / próxima fase)

**Fase 2 propuesta: propagación del libro de estilo a las pantallas**,
pantalla a pantalla, empezando por el logo/cabecera/navegación global
(máximo impacto visual, mínimo riesgo funcional) y siguiendo por Home →
Mi trabajo → Resumen → Tarifas → Configuración/Perfil/Ayuda. No
empezar la Fase 2 sin que el usuario haya dado el visto bueno explícito
al libro de estilo v1 (`docs/DESIGN-SYSTEM.md` + Artifact) — instrucción
explícita del encargo original ("enséñamelo antes de propagarlo").
