# Ocean Flow — contexto del proyecto

App de control de ingresos para instructor de buceo freelance (Registro/Work
Log de clases impartidas, Comisiones por clientes referidos, Pagos de
compañeros, Tarifas, Resumen).

> Nombre del producto: hasta el 2026-08-30 se llamaba "Ocean Pulse" (un
> producto "de la marca personal Ocean Flow"). Se renombró a un único
> nombre, "Ocean Flow", en toda la interfaz visible — ver CHANGELOG.md y
> `docs/SESSION-2026-08-30-bloques-nocturnos.md`. Los ADR y sesiones
> anteriores a esa fecha siguen diciendo "Ocean Pulse" a propósito: son
> historial, no se reescriben.

## Stack

- Vite + React 19 + Tailwind CSS v4
- Supabase (Postgres + JS client) como backend, sin auth todavía (single-user,
  políticas RLS "allow all")
- lucide-react para iconos
- Sin router — navegación por estado (`tab` en App.jsx), no hay URLs por
  pantalla. `tab` y `returnTab` (a qué pestaña primaria vuelve "‹"/"✕"
  desde Ayuda/Configuración) se guardan en `sessionStorage` — sobreviven a
  una recarga de página, pero no a cerrar la pestaña ni a cerrar sesión
  (se limpian ahí a propósito, para que un usuario distinto no herede la
  posición del anterior)

## Estructura

- `App.jsx` — shell: paleta de color (constantes exportadas), navegación,
  `ToastProvider`, carga de todos los hooks `useSupabaseTable`
- `shared.jsx` — **librería de componentes propia**, léela entera antes de
  tocar cualquier pantalla. Todo lo reutilizable vive aquí: `Select`,
  `MultiSelect`, `SearchSelect`, `DatePicker`, `MoneyInput`, `Money`,
  `StatusPill`, `StatusSwitch`, `DeleteButton`, `ConfirmDialog`,
  `EditActions`, `ToastProvider`/`useToast`, `AppLoading`, `MonthCalendar`,
  `ListFilterBar`, `colorFor`, `lighten`, `applyListFilters`
- `useSupabaseTable.js` — hook genérico de CRUD (`rows`, `insertRow`,
  `updateRow`, `deleteRow`, `bulkUpdateWhere`, `setDefault`). `insertRow`/
  `updateRow`/`deleteRow` **lanzan** en error (no devuelven silenciosamente) —
  el código que llama debe hacer try/catch si quiere reaccionar
- Un archivo por pantalla: `HomeTab.jsx`, `WorkLogTab.jsx`, `ComisionesTab.jsx`,
  `CompanerosTab.jsx`, `RatesTab.jsx`, `PaymentsTab.jsx`, `ConfigTab.jsx`,
  `SummaryTab.jsx`

## Ramas y entornos

Modelo completo en `docs/ADR/0006-estrategia-de-ramas-y-entornos.md`. Hoy:
`main` es la producción real (proyecto Vercel `dive-tracker-exgg`,
`dive-tracker-exgg.vercel.app`) y `develop` es la rama de
integración/preparación, que además hace de entorno TEST de facto para el
proyecto Vercel `dive-tracker` (`dive-tracker-three.vercel.app`), con su
propio Supabase separado del de producción — ver "Indicador visual de
entorno TEST" más abajo y el ADR para el detalle completo. Todo cambio
nace en una rama `feature/*`/`fix/*`/`hotfix/*` creada desde `develop` y
vuelve a fusionarse ahí — nunca commits directos sobre `develop`. Empujar
esa rama a GitHub (sin fusionarla) genera sola un Preview Deployment en
Vercel con las mismas variables TEST, útil para validar sin tocar
`develop`. No existe todavía una rama `test` dedicada; se crea solo
cuando se cumpla alguno de los disparadores objetivos que describe el
ADR, no por adelantado.

## Bypass de login en desarrollo

Herramienta permanente de desarrollo — **no evita autenticación, la
automatiza**: en vez de una ruta alternativa que salte Supabase, hace
login automáticamente con una cuenta demo real usando el mismo `signIn()`
de `useSession.js` que usa cualquier usuario. Sigue siendo una sesión de
Supabase real, con RLS real — sirve para no teclear el login a mano en
cada recarga mientras se prueban cambios visuales/UX, no para eludir
ningún control de seguridad.

- **Cómo activarla:** en tu `.env.local` (nunca se comitea), pon:
  ```
  VITE_DEV_AUTH_BYPASS=true
  VITE_DEV_DEMO_EMAIL=dev-bypass@oceanpulse.test
  VITE_DEV_DEMO_PASSWORD=<la que le pusiste tú al activarla>
  ```
  Requiere que esa cuenta demo ya exista y tenga contraseña fijada — se
  crea una vez con `node --env-file=.env.local scripts/create-demo-user.js
  --email=... --nickname=...` y completando el enlace de primer acceso
  que imprime, igual que cualquier alta real.
- **Cómo desactivarla:** borra `VITE_DEV_AUTH_BYPASS` de `.env.local` o
  ponla a `false` — vuelve a aparecer el login normal.
- **Cerrar sesión respeta la decisión:** pulsar "Cerrar sesión" con el
  bypass activo guarda `oceanpulse:devBypassDisabled=true` en
  `localStorage` (por eso sobrevive a recargar la página, no solo a
  `sessionStorage`) y dejas de auto-loguearte con la cuenta demo en ese
  navegador hasta que inicies sesión a mano una vez — así se puede probar
  con otra cuenta sin que el bypass "secuestre" la sesión de vuelta.
- **Doble candado, no solo en teoría:** `import.meta.env.MODE ===
  "development"` (constante que Vite resuelve en build time — en
  `vite build`, mode "production", la rama se elimina del bundle por
  completo, verificado con `grep` sobre `dist/`) + el opt-in explícito
  `VITE_DEV_AUTH_BYPASS=true`. No está activo por defecto ni siquiera en
  desarrollo. Se compara con `MODE`, no con el flag `DEV`, porque `DEV`
  también es `true` bajo `vitest` (mode "test") — con `DEV` los tests que
  cargan `.env.local` activarían el auto-login real y romperían los tests
  de login.
- **Limitaciones:** necesita que la cuenta demo exista con contraseña ya
  fijada — no crea la cuenta ni la activa por sí solo. Los datos que
  generes con ella (escuelas, tarifas, movimientos...) son reales y
  persistentes en Supabase, no se limpian solos.
- **Qué nunca debe hacerse:** no usarlo jamás con las credenciales de una
  cuenta de un usuario real; no comitear `.env.local`; no configurar
  `VITE_DEV_AUTH_BYPASS` ni `VITE_DEV_DEMO_*` en Vercel — es exclusivamente
  para `npm run dev` en local.

## Indicador visual de entorno TEST

Igual que el bypass de login de arriba, es una herramienta permanente,
no una tarea puntual — para que nadie confunda nunca el entorno TEST con
producción, sin que la identificación visual altere en nada la copia
exacta de producción (posiciones, tamaños, layout).

- **Fuente de verdad única:** `VITE_ENVIRONMENT`. Vale `"test"` en el
  entorno TEST, cualquier otro valor (o ausente) en producción y en local
  por defecto. Nunca detección de rama Git, de proyecto Vercel ni de URL.
- **Componente:** `src/EnvironmentIndicator.jsx` — aislado a propósito, no
  depende de auth/navegación/negocio. Se monta una única vez en
  `App.jsx`, como hermano de `<AuthGate />` dentro de
  `export default function App()`, fuera de cualquier condicional — por
  eso aparece igual en login, crear contraseña y cualquier pestaña, sin
  tener que montarlo en cada pantalla por separado.
- **Qué hace:** una pill "TEST" `position: fixed`, centrada en el eje
  horizontal y alineada verticalmente con la fila de la cabecera (mismas
  coordenadas en toda la app, incluidas las pantallas sin cabecera propia
  como login), `z-index` por encima de todo (incluidos modales) y
  `pointer-events: none` — nunca intercepta taps. Además antepone
  `[TEST] ` al `document.title`. No ocupa espacio de layout: al ser
  `fixed`, nunca desplaza el header ni ningún componente.
- **Eliminado del bundle de producción, no solo oculto:** al no estar
  `VITE_ENVIRONMENT` definida en el build de producción, Vite elimina la
  rama entera por dead-code elimination — verificado con `grep` sobre
  `dist/`, el string ni siquiera aparece en el JS servido. Mismo nivel de
  garantía que el `MODE === "development"` del bypass de login, sin
  necesitar ese doble candado aquí (no hay riesgo de seguridad que
  mitigar, es solo un indicador visual).
- **Dónde está activo hoy:** `.env.local` (local) y el proyecto Vercel
  `dive-tracker` (Production y Preview, `dive-tracker-three.vercel.app` y
  cualquier Preview Deployment de rama) tienen `VITE_ENVIRONMENT=test`. El
  proyecto de producción real (`dive-tracker-exgg`, rama `main`) no la
  tiene — nunca debe configurarse ahí.
- **Favicon:** `public/icon.svg` (referenciado por `index.html`) usa el
  mismo icono `Waves` de `lucide-react` y el mismo color `TEAL` que ya usa
  la app en cabecera/login/spinner — antes ese archivo no existía
  (`<link>` roto, sin favicon real).

## Convenciones — seguirlas es más importante que "queda bien"

1. **Nada hardcodeado que sea configuración del negocio.** Escuelas,
   actividades, tipos de pago, estados de pago, monedas, colores de sección,
   icono de carga: todo vive en tablas de Supabase, editable desde
   Configuración. Si necesitas un nuevo "tipo" de algo, es una tabla nueva,
   no un array en el código.
2. **Colores de una entidad se leen de su propia tabla** (`colorFor(rows,
   name)`), nunca una paleta fija en JS. Excepción: los 6-7 colores de marca
   de la app en sí (`NAVY`, `TEAL`, `CORAL`, `GREEN`...) exportados desde
   `App.jsx` — esos sí son constantes, es la identidad visual de la app, no
   datos de negocio.
3. **Crear registros = FAB + hoja inferior**, nunca un formulario fijo arriba
   de la lista. Mismo patrón en Work Log, Comisiones, Compañeros, Tarifas:
   lista primero, botón flotante `fixed bottom-24 right-4`, hoja
   `fixed inset-0 ... rounded-t-xl`, color del botón = `accentColor` (viene
   de `nav_sections` vía App.jsx).
4. **Editar en línea = `EditActions`** (Guardar/Cancelar unificado), nunca
   iconos sueltos de check/x.
5. **Eliminar = `DeleteButton`** (diálogo centrado + loading + toast), nunca
   un chip de confirmación inline ni un `window.confirm`.
6. **Toda operación de creación/edición/borrado da feedback** vía
   `useToast().success(...)`/`.error(...)`, con try/catch alrededor de la
   llamada a Supabase.
7. **Mobile-first + accesibilidad son requisito, no opcional**, en todo lo
   que se construya:
   - Objetivo táctil mínimo 44×44px en cualquier elemento pulsable
   - Los desplegables (`Select`, `MultiSelect`, `SearchSelect`, `DatePicker`)
     usan `useDropdownFlip`/`useEscapeClose`/`useClickOutside` de
     `shared.jsx` — no reinventar el patrón
   - `aria-label` en botones solo-icono, `role`/`aria-*` correctos en
     desplegables y switches, `aria-hidden="true"` en iconos decorativos
   - Nunca scroll lateral: usar `grid` con columnas fijas para filtros, no
     `flex-wrap` suelto con anchos fijos
8. **Filtros de Actividad = `MultiSelect`** (selección múltiple), el resto de
   filtros (Escuela, Estado, Tipo de pago) van con `Select` normal. Todo
   listado con filtros lleva un "Limpiar filtros".
9. **Moneda vive en la tarifa** (`rates.currency` / `commission_rates.currency`),
   no se elige en el formulario de Work Log/Comisiones — se deriva
   automáticamente de la tarifa que coincide con escuela+actividad. Si no hay
   tarifa, usar `currencies` con `is_default = true` como respaldo, nunca
   dejar el símbolo en blanco. Ajuste de curso (sin tarifa asociada) tampoco
   la elige por movimiento desde 2026-08-30: se resuelve sola (moneda
   favorita en `localStorage`, ADR-0007, o `is_default` de `currencies` como
   respaldo) y se muestra como referencia junto al importe, nunca como un
   campo interactivo — ver `docs/BACKLOG.md`, "Configuración → Moneda
   favorita", para la futura pantalla que la gestione explícitamente.
10. **Tipografía única (Inter)**, jerarquía por peso/tamaño, no mezclar
    fuentes. Cifras de dinero: `tabular-nums` + símbolo de moneda más
    apagado que la cifra (componente `Money`).

## Reglas permanentes — Release V1 (lanzamiento público)

Reglas de trabajo que arrancan con la iniciativa "Release V1" (documento
maestro de fases del usuario, iniciado 2026-09-01: preparar Ocean Flow
para hacerlo público fuera de usuarios de test) y que se aplican siempre
a partir de ahora, sin que haga falta repetirlas en cada sesión. El
progreso fase a fase de esa iniciativa se lleva en
`docs/RELEASE-V1-PROGRESS.md` — ver la sección 9 de "Reglas de trabajo
obligatorias" más abajo para el mecanismo general de trabajo por lotes.

1. **La Ayuda nunca documenta funcionalidades de admin ni de
   superadmin.** No basta con ocultarlas a quien no tiene el rol — hoy
   `help/content.js` ya soporta marcar una categoría/artículo
   `adminOnly`/`superadminOnly` y `HelpTab.jsx` los filtra en cliente,
   pero eso solo esconde el contenido, no lo elimina. Contenido de
   admin/superadmin no debe existir en la Ayuda en absoluto. Se aplica
   cada vez que se regenera o modifica la Ayuda, sin excepción.
2. **Tono de los textos de producto: cercano, humano, agradable — un
   punto joven y fresco, sin salirse de una línea profesional.** Nunca
   mensajes de "máquina" (errores genéricos, jerga técnica expuesta al
   usuario). Aplica a toda copy nueva: toasts, estados vacíos,
   confirmaciones, emails, slides de novedades.
3. **Contexto de uso real: manos mojadas.** El usuario típico está en el
   móvil, a menudo recién salido del agua — cualquier pantalla nueva debe
   leerse y entenderse rápido, sin párrafos largos. Refuerza (no
   sustituye) la convención 7 de mobile-first/accesibilidad de arriba.
4. **MVP y reutilización primero.** Ya es el principio de trabajo #2 de
   `docs/PRODUCT.md` ("la solución más barata que resuelve el problema
   real gana") — se reafirma aquí explícitamente para esta iniciativa:
   preferir siempre lo sencillo, integrable y ya construido (p. ej.
   `motion.js`, `shared.jsx`, `ESTILO.md`) sobre una solución nueva y más
   elaborada.
5. **Benchmarking y tendencias: solo con fuentes contrastadas.** Cuando
   se pida investigar mercado, patrones de UX o tendencias (p. ej. las
   fases de cabecera/notificaciones y revisión visual), citar de dónde
   sale cada afirmación — nunca una recomendación de diseño sin respaldo
   verificable.
6. **Validación humana antes de cerrar cualquier fase.** Además de tests
   y build (regla 2 de "Reglas de trabajo obligatorias" abajo), todo
   entregable de UI se comprueba de verdad (con `npm run mobile-check`
   cuando el módulo lo soporte, o navegación manual/browser tool) antes
   de reportarlo como terminado.

## Cosas que NO existen todavía (no asumir que están hechas)

- Interacción real en el calendario de Resumen (sigue siendo de solo
  lectura, con un desglose al pulsar un día; no filtra el resto de la
  pantalla). El calendario de Home sí admite crear un movimiento al tocar
  un día vacío o desde el propio desglose de un día con actividad — ver
  `onCreateForDay` en `MonthCalendar`, `shared.jsx`.
- Los iconos/imágenes que referencia `index.html` (`/icon-192.png`,
  `/icon-512.png`, `/og-image.png`) son placeholders — hay que generarlos.
  `/icon.svg` (favicon) ya no lo es — ver "Indicador visual de entorno
  TEST" arriba
- El icono del logo real de Ocean Flow — de momento el loading usa iconos de
  lucide-react (configurable en Configuración → Ajustes) a la espera del
  logo oficial
- **Un Design System unificado de Ocean Flow.** El rediseño de Movimientos
  (paneles flotantes, tarjetas, animaciones, identidad visual por tipo de
  movimiento) es una referencia de calidad, no el sistema de diseño
  definitivo de la app. Sus componentes, patrones, colores y decisiones
  visuales podrán consolidarse, ajustarse o incluso reemplazarse durante
  una futura fase de unificación visual global. El objetivo final es una
  identidad visual coherente en toda la aplicación — no que una pantalla
  concreta condicione innecesariamente el diseño del resto porque se hizo
  primero. No tratar ninguna decisión visual de Movimientos como
  inamovible fuera de esa pantalla sin que se acuerde explícitamente
  extenderla al resto de la app.

## Esquema de base de datos

Ver `schema.sql` — es el esquema consolidado actual (sustituye a las ~10
migraciones sueltas del historial de chat, que ya no hace falta volver a
mirar salvo para entender el porqué de alguna decisión). Para levantar
una base de datos nueva desde cero (TEST, o cualquier entorno futuro):
ejecutar `schema.sql` y después `seed.sql` — este último siembra lo
mínimo que la app necesita para ser utilizable (moneda por defecto,
`nav_sections`, `app_config`, dataset `ihasia`). Nunca hace falta contra
producción, que ya tiene sus propias filas reales.

For database and architecture changes:
Always propose a migration plan first.
Never implement authentication, permissions or schema changes in a single step.
Prefer incremental migrations.

## Reglas de trabajo obligatorias

Estas reglas son obligatorias para todos los cambios futuros del proyecto,
salvo que se acuerde explícitamente una excepción.

### 1. Control de cambios y gestión de commits

- Todo cambio se desarrolla en una rama `feature/*`/`fix/*`/`hotfix/*`
  creada desde `develop` — nunca se commitea directamente sobre `develop`
  (ver "Ramas y entornos" arriba y `docs/ADR/0006-...md`).
- Nunca hacer commit ni push directamente sin revisión previa del cambio.
- Antes de cualquier commit, mostrar siempre: resumen funcional de los
  cambios, objetivo del cambio y problema que resuelve, lista completa de
  archivos modificados/creados/eliminados, dependencias añadidas o
  modificadas, riesgos técnicos identificados, impacto sobre la arquitectura
  existente, resultado de todas las verificaciones ejecutadas, y el mensaje
  de commit propuesto.
- El mensaje de commit se pide siempre para aprobación antes de ejecutar
  `git commit`.
- Convención semántica siempre: `feat`, `fix`, `refactor`, `test`, `chore`,
  `perf`, `docs`.
- Commits pequeños, coherentes, una única intención técnica. Evitar mezclar
  en un mismo commit: refactor + funcionalidad nueva, cambios visuales +
  cambios de arquitectura, configuración + lógica de negocio.

### 2. Validación obligatoria antes de push

- Antes de cualquier push, ejecutar siempre `npm run test` y `npm run build`.
- Deben pasar todos los tests y el build debe finalizar correctamente.
- Si falla un test: NO commit ni push. Detener e informar nombre del test,
  archivo, error completo, contexto del fallo, posible causa y propuesta de
  solución.
- Si falla el build: NO push. Informar error completo, archivo afectado,
  posible causa y solución propuesta.
- Solo tras aprobación del mensaje de commit + tests correctos + build
  correcto: `git add <archivos>`, `git commit -m "mensaje aprobado"` sobre
  la rama `feature/*`/`fix/*`/`hotfix/*` correspondiente, fusionarla a
  `develop` y `git push origin develop`.
- Tras el push, informar siempre: hash del commit, rama utilizada, resumen
  final de cambios, resultado final de tests, resultado final del build.

### 3. Principios de diseño y arquitectura

- Priorizar código mantenible frente a soluciones rápidas; evitar
  duplicación de lógica; una única fuente de verdad para reglas de negocio;
  separar responsabilidades; favorecer composición frente a componentes
  gigantes con demasiadas condiciones; extraer abstracciones solo cuando
  exista una necesidad real; evitar sobreingeniería y patrones introducidos
  solo por moda.
- Antes de crear un componente/hook/servicio/capa/librería nueva, analizar
  si existe duplicación real, si mejora la mantenibilidad, si reduce
  complejidad, y si el coste supera al beneficio.

### 4. Estándares de testing

- Estrategia basada en comportamiento, priorizando en este orden: (1)
  unitarios — funciones puras, cálculos, validaciones, reglas de negocio;
  (2) integración ligera — componentes React críticos, interacción de
  usuario, llamadas a servicios, flujos importantes; (3) seguridad —
  permisos, autenticación, autorización, endpoints sensibles.
- Evitar tests frágiles basados en clases CSS, estructura exacta del HTML,
  implementación interna del componente o estados privados. Validar
  comportamiento visible, llamadas externas, datos enviados y resultados
  obtenidos.
- Mockear únicamente los límites del sistema (API, Supabase, servicios
  externos); no mockear innecesariamente lógica interna propia.

### 5. Revisión arquitectónica continua

- Actuar también como responsable técnico del proyecto: si se detecta un
  problema de diseño, no ignorarlo. Comunicar problema detectado, impacto
  futuro, posibles soluciones, recomendación profesional y coste
  aproximado del cambio.
- No implementar estas mejoras automáticamente — presentar la propuesta y
  esperar aprobación primero.

### 6. Investigación y criterio profesional

- En decisiones arquitectónicas importantes, no limitarse a seguir
  instrucciones literales: analizar alternativas como lo haría un
  desarrollador senior (patrones actuales de la industria, características
  reales del stack, coste/beneficio, evitando soluciones empresariales
  innecesarias para el tamaño del proyecto).
- Si hay una aproximación mejor que la planteada inicialmente,
  presentarla argumentando por qué mejora el diseño, qué problema resuelve,
  qué coste añade y cuándo sería recomendable aplicarla.
- La decisión final siempre debe buscar código simple, seguro, mantenible,
  fácil de evolucionar y sin complejidad innecesaria.

### 7. Documentación viva de decisiones

La conversación no es la fuente de verdad del proyecto: cada decisión
relevante que se apruebe en una sesión debe quedar reflejada en la
documentación, para que una sesión futura entienda el contexto sin
depender del historial de chat.

Es "decisión relevante" cualquier decisión de:
- **Producto** (alcance, usuarios objetivo, flujos, prioridades,
  funcionalidades descartadas).
- **Arquitectura** (modelo de datos, estructura de código, patrones,
  decisiones técnicas con impacto futuro).
- **Seguridad/autenticación/permisos.**
- **UX con impacto transversal** (no un ajuste puntual de una pantalla).

Proceso obligatorio:
1. Al detectar una decisión de este tipo, proponer dónde documentarla
   antes de escribir nada: `docs/PRODUCT.md` si es visión o principio de
   producto; un ADR nuevo en `docs/ADR/` si es una decisión arquitectónica
   o de diseño con alternativas y trade-offs; `docs/BACKLOG.md` si es
   priorización o algo pendiente; este mismo `CLAUDE.md` si es una regla
   permanente de trabajo o desarrollo.
2. No documentar nunca automáticamente sin avisar antes. Indicar primero:
   que la decisión debería quedar registrada, el documento y sección
   propuestos, y un resumen breve de lo que se guardaría.
3. Actualizar el documento solo tras la aprobación.
4. Toda respuesta que incluya un cambio documental cierra con una sección
   final **"Documentación actualizada"**: archivo modificado, sección
   afectada, resumen de la decisión registrada.

Evitar llenar el proyecto de documentación innecesaria — esta regla es
para decisiones que cambiarían de verdad el comportamiento de una sesión
futura, no para cada detalle de implementación.

### 8. Verificación UX/UI (mobile-check)

Ocean Flow es mobile-first, pero verificar solo con Chrome de escritorio
redimensionado deja fuera la clase de bugs más específica de móvil
(paneles flotantes mal posicionados, objetivos táctiles pequeños,
animaciones rotas, errores de consola) hasta que el usuario los prueba a
mano en su iPhone. Para no depender de eso en cada ronda, existe
`scripts/mobile-check.mjs` (`npm run mobile-check`).

**Cuándo ejecutarlo.** Antes de dar por cerrado cualquier cambio de
UX/UI relevante en el módulo verificado (hoy, Movimientos) — no solo
cuando se pida explícitamente. Requiere `npm run dev` arrancado aparte,
con `VITE_DEV_AUTH_BYPASS` activo (ver "Bypass de login en desarrollo"
más arriba), y el motor Chromium de Playwright instalado una vez
(`npx playwright install chromium`).

**Qué verifica.** Recorre el flujo real de "Mi trabajo" (crear, cambiar
tipo, seleccionar curso, buscar moneda, añadir nota, eliminar con
animación) usando **Playwright con el motor Chromium** y emulación de
`iPhone 14 Pro Max` (`devices["iPhone 14 Pro Max"]`): viewport, densidad
de píxel (`deviceScaleFactor: 3`) y eventos táctiles reales (`tap()`, no
clics de ratón) del dispositivo real de referencia del usuario. Vuelca
capturas en `scripts/mobile-check-output/` (no versionado) para revisión
visual humana, y falla (código de salida ≠ 0) si aparece cualquier error
o aviso en la consola del navegador durante el recorrido.

**Herramientas evaluadas y por qué esta.**
- **BrowserStack / dispositivo remoto real**: la fidelidad más alta
  posible, pero requiere cuenta de pago y credenciales del usuario — no
  accionable sin que él configure el acceso.
- **Simulador de iOS (Xcode)**: Xcode está instalado pero sin ningún
  runtime de iOS descargado — instalarlo implica una descarga de varios
  GB y posible login de Apple ID. No se ha intentado sin consultarlo
  antes, por el coste y la incertidumbre (ver siguiente punto: WebKit ya
  reveló restricciones reales de sandboxing en este entorno).
- **Playwright + motor WebKit** (el motor real de Safari): la opción
  teóricamente ideal. Instalada y probada a fondo — pero
  `browser.newPage()` cuelga indefinidamente en este entorno concreto
  (launch y contexto sí completan). Diagnosticado de forma aislada: el
  mismo código con el motor Chromium de Playwright funciona
  end-to-end sin problema, confirmando que el bloqueo es específico de la
  arquitectura multiproceso de WebKit chocando con alguna capa de
  sandboxing del entorno, no un fallo de configuración corregible desde
  aquí.
- **Playwright + motor Chromium con emulación de iPhone 14 Pro Max**
  (elegida): no es el motor de Safari, pero da viewport/densidad/táctil
  reales del dispositivo del usuario, funciona de forma fiable en este
  entorno y no necesita cuentas externas ni descargas pesadas.

**Limitaciones — cuándo sigue siendo imprescindible la prueba manual en
el iPhone real del usuario.** `mobile-check` NO sustituye la prueba
física para nada que dependa específicamente de: el motor de render/JS
real de WebKit/Safari (soporte de CSS, particularidades del motor), el
teclado virtual real de iOS y su efecto sobre `visualViewport`, o el
tacto físico real (presión, gestos multitáctiles). Para todo lo demás
(posición de paneles flotantes, tamaños de objetivo táctil, animaciones,
flujos de interacción, errores de consola) sí sustituye la ausencia total
de verificación móvil automática que había antes — se comprueba solo, en
cada sesión, antes de pedirle nada al usuario.

### 9. Trabajo por fases en iniciativas largas

Cuando una iniciativa se trabaja **por lotes** (una fase por sesión,
sesiones largas, sin que el usuario tenga que repetir contexto), aplica
este mecanismo — elegido para la iniciativa "Release V1" (ver sección
"Reglas permanentes — Release V1" arriba) y reutilizable para cualquier
iniciativa futura equivalente:

- **Un documento de progreso dedicado por iniciativa**, en `docs/`
  (ejemplo: `docs/RELEASE-V1-PROGRESS.md`), con una sección por fase:
  estado, lo hecho, decisiones tomadas y su porqué, lo descartado,
  riesgos, y el punto exacto por el que se iba. Se actualiza al cerrar
  (o al compactar/cortar) cada fase — nunca se deja para "luego".
- **No sustituye la documentación de decisiones ya exigida por la regla
  7** ("Documentación viva de decisiones"): una decisión de arquitectura
  o producto con impacto futuro real sigue yendo a su propio ADR, a
  `docs/PRODUCT.md` o a `docs/BACKLOG.md`. El documento de progreso
  enlaza a esos, no los repite ni los reemplaza — es el "por dónde iba",
  no la fuente de verdad de cada decisión.
- **Una sesión nueva, sin nada del contexto de la anterior, debe poder
  leer solo ese documento y continuar** exactamente donde se quedó la
  fase anterior, sin tener que releer el historial de chat.
