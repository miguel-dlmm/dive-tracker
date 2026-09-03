# Ocean Flow — Job nocturno 2026-09-03: progreso

> Documento de progreso dedicado (CLAUDE.md, regla 9 — "Trabajo por fases
> en iniciativas largas") para el encargo nocturno por lotes que el
> usuario dio la noche del 2026-09-02→03. Una sesión nueva, sin nada del
> historial de chat, debe poder leer solo este documento y continuar
> exactamente por donde se quedó — no depende de la conversación.

## Cómo se pidió trabajar esta noche (reglas del propio encargo, siguen vigentes)

- Avanzar y entregar valor aunque haya que dejar cosas mockeadas o
  pendientes — mejor bloques que aportan algo que bloques perfectos sin
  terminar.
- Abordar los bloques **en el orden en que están** (ver lista abajo).
- Resolver cualquier duda al principio — ya resuelto en la sesión
  anterior (ver "Decisiones ya tomadas" más abajo).
- **No parar el proceso por percepción de que la conversación es larga.**
  Corrección explícita del usuario en esta misma iniciativa: la sesión
  anterior se detuvo tras el Bloque 9 alegando que el contexto se estaba
  agotando, sin ningún bloqueo real — el usuario lo corrigió
  ("por qué no has avanzado en los bloques que quedan"). El propio
  sistema comprime el contexto automáticamente para que el trabajo largo
  no necesite cerrarse antes de tiempo. Solo son motivos válidos para
  parar: (a) un bloqueo real que necesita una decisión del usuario y no
  se puede resolver con un supuesto documentado, (b) la lista de trabajo
  realmente agotada, o (c) el usuario pide parar explícitamente.
- Primero análisis, luego implementación. Cosas sencillas, modo MVP,
  reutilizar código.
- Frontend con libertad total para tocar.
- **Cada bloque conceptual en su propia rama, sin mergear** hasta
  revisión del usuario.
- Commit por unidad de trabajo cerrada, con los mails de aviso ya
  conocidos.
- Toda migración debe quedar persistida (`scripts/migrations/`) de cara
  al despliegue de la próxima release, con su rollback documentado si se
  toca BBDD.
- Mails al admin, además de los de despliegue tras cada push:
  - Al terminar un análisis: el análisis completo por email.
  - Si se aparca algo por un motivo real: mail de status explicando el
    bloqueo o la duda.
  - Al final de un job grande: mail resumen de todos los puntos y su
    status final.

## Decisiones ya tomadas (no volver a preguntar)

- **Bloque 2 (email_for_nickname/rate limiting):** decisión de apetito
  de riesgo del usuario, no técnica — análisis y opciones ya enviados
  por email, sin implementar nada. No bloquea el resto del job.
- **Bloque 5 (Training Records):** la ambigüedad inicial ("¿configura
  aquí también el listado o solo el alumno?") se resolvió leyendo el
  propio encargo del usuario — una única configuración COMPARTIDA por
  listado, alumnos solo con nombre/apellidos/iniciales/firma. Ya
  implementado (ver abajo).
- **No mergear nada de esta noche** — ni a `develop` ni a `Release-V1`
  ni a `main`. Cada rama queda a la espera de revisión.

## Hallazgo técnico importante (no pedido, descubierto trabajando)

**Ramas Release V1 vs. `develop` están divergentes de verdad.** No es
solo "features distintas" — faltan módulos enteros de una respecto a la
otra:
- `docs/RELEASE-V1-PROGRESS.md`, `scripts/send-deployment-notice.mjs`,
  `server/notifications/`, `server/email/{EmailService,providers,templates}`
  (el sistema de avisos de despliegue) **solo existen en `Release-V1`**
  (y en ramas nacidas de ella, como `feature/training-records`), no en
  `develop`.
- Consecuencia práctica: los bloques que son puramente Release V1
  (Training Records, KPIs de Home, cualquier cosa de las Fases 1-8 ya
  trackeadas en `docs/RELEASE-V1-PROGRESS.md`) se trabajan en una rama
  nacida de **`Release-V1`**. Los bloques de mantenimiento general
  (tests rotos, bugs sueltos, análisis de infraestructura...) se
  trabajan en una rama nacida de **`develop`**, como manda CLAUDE.md.
- Para enviar avisos de despliegue desde una rama basada en `develop`
  (que no tiene el sistema de avisos), la sesión anterior escribió un
  script standalone temporal (`scripts/_notify.mjs`, no commiteado,
  recreable en 2 minutos si hace falta — ver su lógica: inserta en la
  tabla `deployment_notices` de Supabase directamente + envía el email
  vía la API REST de Resend, sin importar nada de `server/`). No quedó
  persistido a propósito (herramienta de una sesión, no parte del
  producto) — si hace falta reenviar avisos desde una rama de
  `develop`, recrear ese patrón o usar `git checkout Release-V1 --
  server/email scripts/send-deployment-notice.mjs` de forma temporal
  (¡revertir después con `git checkout HEAD --` los mismos paths para no
  ensuciar la rama de `develop`!).

**Colisión de números de migración.** `feature/training-records` tiene
`scripts/migrations/0009-datos-instructor-perfil.sql` y
`0010-firma-instructor-y-aventuras.sql`; `Release-V1` YA tiene sus
propios `0009-invitation-links.sql` y `0010-avisos-generalizados.sql` —
mismos números, contenido distinto (ambas ramas partieron de un mismo
punto con 0007 como última migración y numeraron por separado). No
rompe nada hoy (ninguna de las dos está mergeada), pero **al fusionar
`feature/training-records` contra `Release-V1` hará falta renumerar una
de las dos series a mano antes de aplicar nada.**

## Prioridad insertada durante la sesión (procesar ANTES que el resto)

El usuario pidió, mientras se trabajaba el Bloque 6, un rediseño del
generador de Training Records (`feature/training-records`) y pidió
explícitamente tratarlo como lo primero de la cola pendiente, procesado
en cuanto se cerrara el bloque en curso. Ver fila "TR-restyle" en la
tabla de abajo y su texto completo en la sección de textos originales.

## Estado de los bloques

| # | Bloque | Estado | Rama | Commit |
|---|---|---|---|---|
| TR-restyle | Rediseño del generador de Training Records (pedido a mitad de sesión, prioridad máxima) | ✅ Hecho | `feature/training-records` (continúa la misma rama del Bloque 5) | `d5609ea` |
| 1 | Estado (notificaciones/styling/libro de estilo) | ✅ Analizado, mail enviado | — (solo análisis) | — |
| 2 | email_for_nickname / rate limiting | ✅ Analizado, mail enviado, sin implementar (decisión del usuario) | — (solo análisis) | — |
| 3 | Test roto en `main` (PaymentsTab, fecha relativa) | ✅ Hecho | `fix/paymentstab-test-fecha-relativa` (desde `develop`) | `f808a4d` |
| 4 | Ajustes rápidos (hint flotante, +/- negativos, último acceso, slide de eliminar) | ✅ Hecho | `fix/bloque4-ajustes-rapidos` (desde `develop`) | `508b920` |
| 5 | Training Records — config compartida por listado | ✅ Hecho | `feature/training-records` (desde `Release-V1`) | `3031a96` + `d131ed3` (docs) |
| 6 | Revisión de todos los textos de la app | ✅ Hecho | `fix/bloque6-revision-textos` (desde `develop`) | `aca9d89` |
| 7 | Revisión de notificaciones propias (toasts) | ✅ Hecho | `fix/bloque7-toasts` (desde `develop`) | `ed2c5b2` |
| 8 | Rediseño del slide de novedades (WhatsNew) | ✅ Hecho | `feat/bloque8-whatsnew-releasev1` (desde `Release-V1`) | `8b9f520` |
| 9 | KPIs de la home a primera posición | ✅ Hecho | `feat/bloque9-kpis-primera-posicion` (desde `Release-V1`) | `ccc622e` |
| 10 | Rediseño de Home + enlace al generador de Training Records | ✅ Hecho | `feat/bloque10-home-training-records` (desde `feature/training-records`, con el Bloque 9 cherry-picked encima) | `5ff378e` |
| 11 | KPIs animados en Movimientos (Generado este mes / Pendiente de cobrar + 3º a decidir) | ✅ Hecho | `feat/bloque11-kpis-movimientos` (desde `feat/bloque10-home-training-records`) | `08079f8` |
| 12 | Análisis de sesión/perfil (eficiencia, robustez) | ✅ Hecho | `fix/bloque12-sesion-perfil` (desde `develop`) | `f1a7576` |
| 13 | Análisis de build/push/despliegue | ✅ Analizado + limpieza real ejecutada, mail enviado | — (solo análisis + `git gc` local) | — |
| 14 | Velocidad de la suite de test | ✅ Analizado, mail enviado | — (solo análisis) | — |
| 15 | Mocks vs. BBDD real en los tests | ✅ Analizado, mail enviado — ya cumple, sin acción | — (solo análisis) | — |
| 16 | Eficiencia de las propias pruebas de Claude (navegador) | ✅ Analizado, mail enviado | — (solo análisis) | — |
| 17 | Cobertura de test — ampliar / otros tipos / estándares | ✅ Hecho | `fix/bloque17-cobertura-usesupabasetable` (desde `develop`) | `358fa00` |
| 18 | Monitorización de infraestructura (Vercel/Supabase) | ✅ Hecho | `docs/bloque18-monitorizacion-infra` (desde `Release-V1`) | `acde0de` |
| final | Análisis de código (eficiencia, robustez, patrones, dependencias...) | ✅ Hecho | `chore/bloque-final-analisis-codigo` (desde `develop`) | `effb61a` |
| release | Dejar todo listo para desplegar (sin desplegar) | ✅ Todos los bloques hechos — ver "Guía de fusión" más abajo. Ningún merge ejecutado (regla del job) | — | — |

## Texto original de los bloques pendientes (para no depender del chat)

**TR-restyle — Rediseño del generador de Training Records (prioridad
máxima, pedido a mitad de sesión, texto literal del usuario)**
> las fechas del generador de training records, son campos super
> grandes, a todo lo ancho, quiero algo más pequeño para que cada item
> del progreso del curso esté en una fila y no en dos como hasta ahora.
> en la fila del alumno quita el icono del lápiz q ya está en los 3
> puntos y añade un regenerar TR individual de ese alumno. las opciones
> finales.. dale una vuelta a la parte de "Todo el listado": descargar
> PDF, JPG o compartir todo para que sea todo mucho más visual. Rediseña
> el styling del formulario de generador de training records para q sea
> más fácil e intuitivo. rediseña también cómo se ven mis datos de
> instructor, algo como una pequeña "card" con el avatar de mi perfil,
> nombre, iniciales, SSI PRO Number, firma. que el curso a certificar y
> cambiar plantilla estén en la misma línea.

Desglose accionable:
1. Fechas de cada item de progreso del curso: de campo ancho completo a
   uno más compacto, para que quepan en una sola fila por item (hoy
   ocupan dos).
2. Fila de alumno: quitar el icono de lápiz (editar) — ya está
   duplicado en el menú "⋯". Añadir en su lugar una acción "Regenerar
   TR" individual para ese alumno.
3. Sección "Todo el listado" (acciones finales sobre el listado
   completo): rediseño visual — descargar PDF, descargar JPG, compartir
   todo. Más visual que el estado actual.
4. Styling general del formulario del generador: más fácil e intuitivo.
5. Bloque "mis datos de instructor": convertir en una card compacta con
   avatar de perfil, nombre, iniciales, SSI PRO Number y firma.
6. "Curso a certificar" y "Cambiar plantilla": en la misma línea.

Rama: continuar sobre `feature/training-records` (mismo feature que el
Bloque 5, no una rama nueva — es un refinamiento de la misma pantalla,
no un bloque conceptual distinto).

✅ Hecho — commit `d5609ea`, verificado a mano en Chrome (viewport
iPhone) contra Supabase TEST real además de la suite de tests (616
passed). Los 6 puntos del desglose de arriba, cubiertos. Detalle
técnico en el propio mensaje de commit y en el aviso de despliegue ya
enviado. Único añadido no pedido explícitamente: `DatePicker`
(`shared.jsx`) gana un prop opcional `ariaLabel` — necesario porque el
placeholder visible se acortó a "Fecha" por espacio, pero cada fila
sigue necesitando un nombre accesible distinto para lectores de
pantalla; retrocompatible, ningún otro uso de `DatePicker` en la app
lo pasa y sigue comportándose igual que antes.

**Bloque 6 — Revisión de todos los textos** ✅ Hecho — ver tabla arriba.
Alcance cubierto: toasts de éxito (quitado "correctamente" — redundante
con el toast verde) y primera línea del email de bienvenida ("Se te ha
dado de alta" → "Ya tienes cuenta", menos jerga de RRHH). El resto de
copy visible (pantallas, Ayuda, mensajes de error) ya tenía tono cercano
tras la reescritura de Ayuda de 2026-08-29/30 — revisado, sin cambios
necesarios. Los toasts en sí (diseño/usabilidad, no solo texto) quedan
para el Bloque 7, que los trata en profundidad.

**Hallazgo colateral del Bloque 6 (no un bloqueo, ya resuelto en su
rama):** `develop` tiene un test (`PaymentsTab.test.jsx`) que rompe en
cuanto el reloj real pasa de agosto a septiembre de 2026 — el mismo bug
ya diagnosticado y arreglado en la rama `fix/paymentstab-test-fecha-relativa`
(commit `f808a4d`, Bloque 3), pero esa rama sigue sin fusionar a
`develop`. El Bloque 6 hizo cherry-pick de ese mismo fix para tener
tests en verde — cualquier bloque nuevo que se abra desde `develop` a
partir de ahora se topará con el mismo test roto hasta que el usuario
fusione `fix/paymentstab-test-fecha-relativa` (o el propio Bloque 6) a
`develop`. Próximos bloques de mantenimiento: cherry-pick del mismo
commit si hace falta, documentado aquí para no repetir el diagnóstico.

**Bloque 7 — Notificaciones de la propia app** ✅ Hecho — ver tabla
arriba. Añadido: animación de entrada/salida (antes aparecía/
desaparecía sin transición, único elemento de feedback fuera del
vocabulario de motion ya usado en hojas/filas/paneles), botón de
cierre manual, y fix de accesibilidad (aria-atomic por toast en vez de
en el contenedor entero). Test nuevo (`Toast.test.jsx`) para un
componente que no tenía cobertura propia. Nota para la próxima
sesión: durante la verificación manual en Chrome, varias lecturas de
`getComputedStyle` vía JS devolvieron opacity:0 de forma consistente,
pareciendo un bug — resultó ser el propio timing de la comprobación
(antes o después de la transición real de ~0.2s), no un fallo del
componente. Diagnosticado con una animación de 3s temporal antes de
concluir que estaba bien; revertido antes de comitear.

**Bloque 8 — Slide de cambios de la release** ✅ Hecho — ver tabla
arriba. Las 5 diapositivas se reescribieron para hablar de lo que de
verdad es nuevo en Release V1 (Training Records, idioma ES/EN, KPIs de
Home, cabecera con menos iconos, cómo reabrir el slide) — el contenido
anterior hablaba de cambios de `develop` que ya llevaban semanas en
producción. Se añadió un eyebrow ("Novedades de esta versión").

**Bug real encontrado y arreglado en este bloque (preexistente en
Release-V1, no algo de esta sesión):** pulsar "Siguiente" en el slide
dejaba la diapositiva ANTERIOR permanentemente en pantalla — el
`step` interno sí avanzaba (botones/puntos correctos) pero el
contenido visible (título/cuerpo) se quedaba congelado en la
diapositiva vieja para siempre. Reproducido también con el contenido
ORIGINAL antes de tocar nada, así que no lo causó el cambio de texto.
Causa: envolver el `motion.div` de cada diapositiva en
`<AnimatePresence>` (con o sin `mode="wait"`, con o sin `drag`, con o
sin desplazamiento en `x`) — con motion 13.1.1 + React 19.2.8, el
`exit` nunca se completaba y `AnimatePresence` nunca desmontaba el
hijo saliente (confirmado con JS en el navegador: dos elementos
`#whats-new-title` a la vez). Arreglado quitando `AnimatePresence` del
todo — se pierde el fundido de SALIDA de la diapositiva vieja (ahora
desaparece al instante en vez de animar), se mantiene el fundido de
ENTRADA de la nueva. La suite de test (jsdom) no lo detecta porque no
reproduce el timing real de la animación en un navegador — todo esto
se verificó a mano en Chrome. Si se quiere recuperar el fundido de
salida más adelante, investigar la causa raíz de fondo (versión de
"motion" vs. modo concurrente de React 19) antes de volver a envolver
esto en `AnimatePresence`.

**Bloque 10 — Home y acceso al generador** ✅ Hecho — ver tabla arriba.
Nueva tarjeta "Training Records" al final de Home (icono+título+
subtítulo+chevron, mismo lenguaje visual que el resto de la app);
retirada del menú de Configuración (sigue siendo la misma sección por
dentro, vía `HIDDEN_SECTIONS` + `setStoredSection()` exportado). No se
tocó el resto de Home más allá de esto — ya estaba bien cuidada tras
varias rondas previas (KPIs, tendencia, calendario), rediseñarla entera
sin una razón concreta habría sido cambiar por cambiar.

**Hallazgo importante de este bloque:** `Release-V1` en sí NO tiene el
generador de Training Records — solo vive en la rama
`feature/training-records` (aún sin fusionar). La rama de este bloque
se construyó sobre `feature/training-records`, no sobre `Release-V1`
directo, con el commit del Bloque 9 (`ccc622e`, KPIs primera posición)
cherry-picked encima para partir del Home más reciente. **Cualquier
bloque futuro que toque Home o dependa de Training Records debe
construirse igual, sobre `feature/training-records`** (o esperar a que
el usuario la fusione a `Release-V1`) — no sobre `Release-V1` a secas.

**Bloque 11 — KPIs en Movimientos** ✅ Hecho — ver tabla arriba. 3
KPIs animados (Generado este mes / Pendiente de cobrar / Cobrado este
mes) sustituyen la tarjeta única de antes (que tenía un `onPress` a un
`onOpenPayments` nunca conectado desde App.jsx — prop muerta, eliminada
de paso). 3er KPI elegido: "Cobrado este mes" — completa el ángulo
financiero (Generado = todo lo facturado; Pendiente = deuda total;
Cobrado = lo que de verdad ha entrado este mes) sin duplicar los KPIs
no financieros que ya tiene Home (alumnos/cursos/captados). Detalle
completo de las opciones descartadas en el propio mensaje de commit.

Hallazgo de testing (no bug de producción): el test que comprobaba el
importe animado era frágil bajo carga — un `waitFor` con timeout fijo
no bastaba porque animar en CÉNTIMOS exige que `useCountUp` llegue casi
al 100% de su duración para que `Math.round()` coincida exacto (a
diferencia de un KPI entero pequeño, que ya redondea bien mucho antes).
Arreglado forzando `prefers-reduced-motion` con un mock local de
`matchMedia` — determinista, sin depender del reloj real. Si un futuro
bloque anima OTRO importe de dinero con `useCountUp`, aplicar el mismo
patrón desde el principio en su test.

**Bloque 12 — Sesión y perfil** ✅ Hecho — ver tabla arriba. Implementado:
`TOKEN_REFRESHED` ya no repite `resolveSessionState` entera (getUser +
profile + consents, 3 peticiones de red) en cada refresco automático de
token de GoTrue (~1h con la pestaña abierta) — solo actualiza el token.
La detección de baneo no se debilita (un refresh token de cuenta
baneada nunca llega a emitir ese evento). Análisis completo enviado por
email, con un hallazgo SIN implementar (posible condición de carrera
entre la carga inicial y `onAuthStateChange` al montar — patrón
conocido, pero no confirmado en este SDK; se deja para que el usuario
decida si blindarlo). **Nota para sesiones futuras: `ProfileTab.jsx` no
existe en `develop`** — la pantalla "Mi perfil" solo vive en la rama
`Release-V1`/`feature/training-records` (Fase 4). Este bloque se
centró en `useSession.js` (compartido por ambas líneas); una revisión
de la pantalla de perfil en sí necesitaría una rama basada ahí.

**Bloque 13 — Build, push y despliegue** ✅ Hecho — ver tabla arriba y
el mail enviado para el detalle completo. Resumen: el proyecto en sí
es pequeño (784KB / ~9.400 líneas en `src/`, build en ~1.7s, 5
dependencias de producción) — nada que optimizar ahí, no merece la
pena invertir. Hallazgo real y ya corregido (sin riesgo, solo local):
el `.git` local pesaba 352MB por 4 blobs sueltos e inalcanzables (nunca
comiteados) que coinciden en tamaño exacto con `postgresql.dmg` y los
instaladores de `gh` CLI que siguen sueltos en el directorio de
trabajo — alguien hizo `git add` de esos archivos alguna vez y se
deshizo sin comitear, pero el blob quedó huérfano. `git gc --prune=now`
lo limpió: 352MB → 2,2MB, verificado con `git fsck --full` (sin
errores) y `git ls-remote` (remoto intacto) — no tocó ningún commit,
rama ni el remoto, 100% local y reversible en el sentido de que no
perdió nada real.

**Pendiente de decisión del usuario, sin tocar:** `postgresql.dmg`
(267MB) y los instaladores de `gh` (~56MB) siguen sueltos, sin
trackear, en el directorio de trabajo — no se han borrado por no ser
archivos de esta sesión. Si se confirma que no hacen falta, borrarlos
libera ese espacio y evita que un `git add .` futuro repita el mismo
problema; añadir `*.dmg`/`*.pkg` al `.gitignore` sería una prevención
barata para el futuro.

**Bloque 14 — Velocidad de la suite de test** ✅ Hecho — ver mail
enviado. Veredicto: prematuro optimizar ahora (616 tests, ~45-100s de
reloj real, ya paralelizado por defecto por Vitest entre varios
workers — no corre en serie). Palanca concreta documentada para si
algún día hace falta: `environment: 'jsdom'` → `'happy-dom'` (más
ligero, 2-3x más rápido de instanciar según la comunidad) — no
instalada ni probada, sería el primer sitio donde mirar. Revisar de
nuevo si la suite crece mucho, si se añade CI, o si el propio usuario
empieza a notar la espera como una molestia real.

**Bloque 15 — Mocks en los tests** ✅ Hecho — ver mail enviado. Ya
cumple: los 18 archivos de test son 100% mocks, cero llamadas reales a
Supabase (verificado buscando referencias a variables de entorno
reales — cero resultados). La arquitectura de props (cada pantalla
recibe `{rows, insertRow...}` ya resuelto, el hook se llama una vez en
App.jsx) hace que la mayoría de tests ni necesite mockear
`supabaseClient` explícitamente. Solo 3 archivos tocan Supabase
directo (`useSupabaseTable.js`, `useSession.js`, `ConfigTab.jsx`); los
2 con test propio lo mockean correctamente. Sin acción — nada que
tocar. Hallazgo aparte para el Bloque 17: `useSupabaseTable.js` no
tiene test propio, solo se verifica indirectamente.

**Bloque 16 — Pruebas propias de Claude** ✅ Hecho — ver mail enviado.
3 lecciones concretas de ESTA misma sesión: (1) esperar 1-2s tras
cualquier navegación antes del primer clic — un clic inmediato tras
cambiar de pestaña/abrir un slide falla casi siempre por la transición
de motion; (2) para verificar texto/estado del DOM, usar
`javascript_tool` (textContent, getComputedStyle) en vez de interpretar
una captura — esta sesión tuvo un falso positivo Y un falso negativo
leyendo capturas; (3) para depurar un bug de animación real, inspeccionar
el DOM directamente por JS encontró la causa mucho más rápido que mirar
capturas. No se ha tocado CLAUDE.md — se ofreció añadir una nota breve,
a la espera de que el usuario lo confirme.

**Bloque 17 — Cobertura y tipos de test** ✅ Hecho — ver tabla arriba.
Cubierto el hueco real encontrado en el Bloque 15: `useSupabaseTable.js`
(el hook de CRUD del que dependen TODAS las pantallas) no tenía test
propio, solo se probaba de forma indirecta. 12 tests nuevos. El
estándar de testing del proyecto (CLAUDE.md) ya está bien definido y
se sigue de forma consistente — no hacía falta un estándar nuevo.
Valorados y descartados por ahora (proporcional): tests de
accesibilidad automatizados (axe-core, no urgente hoy) y tests de
rendimiento/carga (prematuro, ver Bloques 13/14).

**Bloque 18 — Monitorización de infraestructura** ✅ Hecho — ver tabla
arriba. Addendum a la Fase 7 de `docs/RELEASE-V1-PROGRESS.md` (junto
al análisis de escalabilidad ya hecho): alertas recomendadas en
Supabase (BBDD al 80% de 500MB, egress al 80%) y Vercel (invocaciones
de funciones, ancho de banda) antes de abrir el registro público —
ambos análisis completos enviados por email. Sin acceso a los
dashboards reales desde esta sesión: es una recomendación de qué
configurar a mano, pendiente de que el usuario lo haga.

**Bloque final — Análisis de código** ✅ Hecho — ver tabla arriba y el
mail enviado. `npm run lint` pasaba de 95 problemas (82 errores, 13
avisos) a 37, todos revisados uno a uno (no corregidos a ciegas):
imports de React sin usar (21 archivos, el runtime automático de JSX
ya no lo necesita), 20 `global is not defined` en un test (sustituido
por `globalThis`), una regla nueva (`react-hooks/set-state-in-effect`)
desactivada por marcar como error el patrón "fetch al montar" correcto
y usado en toda la app, y un caso real de mutar un ref durante el
render en `MiTrabajoTab.jsx` (movido a un `useEffect`). Los 37
problemas restantes quedan documentados como revisados y no-bugs
(arquitectura deliberada de `shared.jsx`, dependencias de `useMemo` ya
cubiertas por otras, o comprobaciones de React Compiler que este
proyecto no usa). Dependencias: 5 de producción, 17 de desarrollo,
todas usadas, sin bloat.

**Propuesta controvertida, sin implementar:** ¿desactivar también las
reglas de preparación para React Compiler en `eslint.config.js`? Se
deja para que el usuario decida — no es un bug, es una postura de
herramientas con trade-offs reales en ambos sentidos (detalle en el
mail).

**Pendientes de decisión consolidados de todo el job (12-18 + final,
para no rebuscar en cada email):** (1) Bloque 12 — posible condición
de carrera en `useSession.js`; (2) Bloque 13 — borrar `postgresql.dmg`
y los instaladores de `gh` sueltos (~323MB); (3) Bloque 14 — adoptar
`happy-dom` si la suite se nota lenta de verdad algún día; (4) este
bloque — postura sobre las reglas de React Compiler.

**Release final** ✅ Todos los bloques del encargo (6-18 + final)
están hechos, cada uno en su propia rama, sin fusionar — tal como
pedía el encargo ("cada bloque en su propia rama, sin mergear hasta
revisión"). No se ha ejecutado ningún merge ni ningún despliegue real.
Lo que sigue es una guía de fusión para cuando el usuario revise y
decida qué mergear y en qué orden — no una acción ya hecha.

### Guía de fusión — orden recomendado y por qué

Dos líneas de ramas independientes, cada una debe fusionarse en su
propio destino:

**Hacia `develop`** (bloques de mantenimiento general, sin
dependencias entre sí — se pueden revisar y fusionar en cualquier
orden, o todos juntos):
- `fix/paymentstab-test-fecha-relativa` (Bloque 3, sesión anterior)
- `fix/bloque4-ajustes-rapidos` (Bloque 4, sesión anterior)
- `fix/bloque6-revision-textos` (Bloque 6)
- `fix/bloque7-toasts` (Bloque 7)
- `fix/bloque12-sesion-perfil` (Bloque 12)
- `fix/bloque17-cobertura-usesupabasetable` (Bloque 17)
- `chore/bloque-final-analisis-codigo` (Bloque final)

  **Aviso real:** varias de estas ramas (Bloque 6, 7, 12, 17, final)
  llevan cada una su propio cherry-pick del mismo commit
  (`f808a4d`, el fix de fecha relativa de `PaymentsTab.test.jsx`) —
  necesario porque `fix/paymentstab-test-fecha-relativa` (Bloque 3)
  seguía sin fusionar a `develop` cuando se crearon. Al fusionar
  **`fix/paymentstab-test-fecha-relativa` primero**, cualquier fusión
  posterior de las otras ramas debería resolver ese fragmento como
  "ya aplicado" sin conflicto real (mismo contenido) — si git no lo
  detecta solo, es un conflicto trivial de descartar (quedarse con la
  versión ya en `develop`), no algo que requiera revisar la lógica.

**Hacia `Release-V1`** (bloques de la funcionalidad nueva — **estas
SÍ tienen dependencias reales entre sí, fusionar en este orden
exacto**):
1. `feature/training-records` (Bloque 5 + rediseño TR — la base:
   introduce el generador de Training Records, que no existe en
   `Release-V1` todavía)
2. `feat/bloque9-kpis-primera-posicion` (Bloque 9 — toca `HomeTab.jsx`
   de forma independiente; puede fusionarse antes o después del punto
   1 sin conflicto real, ambas tocan Home pero en zonas distintas del
   archivo)
3. `feat/bloque8-whatsnew-releasev1` (Bloque 8 — independiente de las
   dos anteriores)
4. `feat/bloque10-home-training-records` (Bloque 10 — **depende de
   1 y 2**: se construyó sobre `feature/training-records` con el
   commit de `feat/bloque9-kpis-primera-posicion` ya incluido
   mediante cherry-pick. Fusionar DESPUÉS de 1 y 2, no antes)
5. `feat/bloque11-kpis-movimientos` (Bloque 11 — **depende de 4**: se
   construyó encima de `feat/bloque10-home-training-records`.
   Fusionar en último lugar de este grupo)
6. `docs/bloque18-monitorizacion-infra` (Bloque 18 — solo
   documentación, sin dependencias de código; puede fusionarse en
   cualquier momento)

  **Aviso real ya documentado (ver "Hallazgo técnico importante" al
  principio de este documento):** `feature/training-records` tiene
  `scripts/migrations/0009-datos-instructor-perfil.sql` y
  `0010-firma-instructor-y-aventuras.sql`; `Release-V1` YA tiene sus
  propios `0009-invitation-links.sql` y `0010-avisos-generalizados.sql`
  — **renumerar una de las dos series a mano antes de aplicar
  cualquier migración**, la fusión de código en sí no lo resuelve
  sola.

**Después de fusionar ambos grupos:** `Release-V1` queda con todo el
trabajo de esta noche integrado. En ese punto (y no antes) tiene
sentido evaluar si `Release-V1` ya está lista para su propio proceso
de release hacia `main`/producción — esa decisión y su alcance
quedan fuera de lo que este job nocturno debía dejar preparado.

## Cierre del job — 2026-09-03

**Job completado.** Todos los bloques del listado original (6-18),
más el análisis final, más el rediseño completo de Training Records
pedido a mitad de sesión, están hechos — cada uno en su propia rama,
sin fusionar, con tests y build en verde antes de cada push, tal como
exigía el protocolo. Se envió un email de aviso por bloque durante la
noche, y el mail resumen definitivo (commit `f9f2b4c`, rama
`docs/job-nocturno-2026-09-03-progreso`) se envió al cerrar.

No queda trabajo pendiente de este job. Lo único que falta es una
decisión humana: revisar y fusionar las ramas — ver "Guía de fusión"
arriba para el orden y las dependencias reales — y decidir sobre las
4 cuestiones abiertas listadas en esa misma sección superior del
documento (guardia de secuenciación en `useSession.js`, limpieza de
archivos sueltos en el working directory, posible adopción de
`happy-dom`, reglas ESLint de React Compiler).

### Cómo continuar en una futura sesión (si se pide más trabajo)

1. Leer solo este documento — no hace falta el historial de chat.
2. Confirmar que las ramas de la tabla de arriba siguen empujadas y sin
   mergear (`git branch -a`, `git log origin/<rama>..<rama>`).
3. Si se pide seguir tocando Training Records, continuar sobre
   `feature/training-records` (ya incluye el rediseño, commit
   `d5609ea`), no una rama nueva — `Release-V1` a secas NO tiene el
   generador todavía.
4. Para cualquier bloque nuevo: rama por bloque desde `develop` (si es
   mantenimiento general) o desde `Release-V1`/`feature/training-records`
   (si toca esa funcionalidad), commit por unidad, tests+build en verde
   antes de cada push, mail de aviso vía `scripts/_notify.mjs` (ramas
   `develop`) o `scripts/send-deployment-notice.mjs` (ramas
   `Release-V1`). Recordar el cherry-pick de `f808a4d` si
   `PaymentsTab.test.jsx` falla por la fecha relativa, hasta que esa
   rama se fusione a `develop`.
5. `scripts/_notify.mjs` (no commiteado a propósito) sigue en el
   working directory — si una sesión nueva no lo encuentra, recrearlo
   con la lógica descrita en "Hallazgo técnico importante" más arriba.
