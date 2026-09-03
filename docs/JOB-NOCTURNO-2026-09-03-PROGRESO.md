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
| 14 | Velocidad de la suite de test | ⬜ No empezado | — | — |
| 15 | Mocks vs. BBDD real en los tests | ⬜ No empezado | — | — |
| 16 | Eficiencia de las propias pruebas de Claude (navegador) | ⬜ No empezado | — | — |
| 17 | Cobertura de test — ampliar / otros tipos / estándares | ⬜ No empezado | — | — |
| 18 | Monitorización de infraestructura (Vercel/Supabase) | ⬜ No empezado | — | — |
| final | Análisis de código (eficiencia, robustez, patrones, dependencias...) | ⬜ No empezado | — | — |
| release | Dejar todo listo para desplegar (sin desplegar) | ⬜ No empezado — depende de que el resto avance y de que el usuario revise/mergee las ramas de arriba | — | — |

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

**Bloque 14 — Velocidad de la suite de test**
¿Se podría paralelizar/optimizar para que vaya más rápido, o es
prematuro pensarlo ahora?

**Bloque 15 — Mocks en los tests**
¿Se usan mocks o llamadas reales a BBDD en los tests? Deberían ser
mocks. Si no lo son, justificar antes de tocar nada — el usuario lo
revisa antes de actuar.

**Bloque 16 — Pruebas propias de Claude**
¿Se puede hacer más eficiente cómo Claude prueba contra el navegador?
Si ya está optimizado, nada que hacer.

**Bloque 17 — Cobertura y tipos de test**
¿Merece la pena ampliar cobertura? ¿Falta algún tipo de test que dé
robustez? ¿Algún estándar a seguir?

**Bloque 18 — Monitorización de infraestructura**
Estudiar alertas de consumo de recursos en Vercel/Supabase antes de
abrir el registro público. Añadir un análisis de monitorización junto
al de escalabilidad ya hecho antes; devolver ambos completos por email
y documentarlos.

**Bloque final — Análisis de código**
Eficiencia, robustez, usabilidad, reutilización, buenas prácticas,
dependencias externas locales, patrones de diseño, optimización,
documentación (ni exceso ni defecto), y cualquier otro análisis
pertinente. Mejoras que no comprometan estabilidad → implementar
directo. Las más controvertidas → dejar la propuesta y la elegida por
escrito, sin implementar. Toda esta parte, en una rama aparte sin
mergear hasta revisión.

**Release final**
Dejar todo listo para que el usuario solo tenga que desplegar al
volver — usando todo lo ya mergeado contra `Release V1`. No ejecutar el
despliegue real (`main`/producción) sin que el usuario lo pida
explícitamente.

## Cómo continuar en la próxima sesión

1. Leer solo este documento — no hace falta el historial de chat.
2. Confirmar que las ramas de la tabla de arriba siguen empujadas y sin
   mergear (`git branch -a`, `git log origin/<rama>..<rama>`).
3. `TR-restyle` ya está hecho (commit `d5609ea` en
   `feature/training-records`) — si algún día se pide seguir tocando esa
   misma pantalla, continuar sobre esa rama, no una nueva.
4. Seguir con el Bloque 7 en adelante, en orden, con el mismo protocolo
   (rama por bloque, commit por unidad, tests+build en verde antes de
   cada push — recordar el cherry-pick de `f808a4d` si `PaymentsTab.test.jsx`
   falla por la fecha real, ver "Hallazgo colateral del Bloque 6" arriba
   —, mail de aviso tras cada commit vía `scripts/_notify.mjs` si la
   rama nace de `develop`, o `scripts/send-deployment-notice.mjs` si
   nace de `Release-V1`).
5. `scripts/_notify.mjs` (no commiteado) ya existe en el working
   directory de esta sesión — si una sesión nueva no lo encuentra,
   recrearlo seed con la lógica descrita en "Hallazgo técnico
   importante" más arriba (inserta en `deployment_notices` + envía por
   Resend, sin depender de `server/`).
6. Bloques de mantenimiento general (12-18, final) → rama nueva desde
   `develop`. Bloques que son Release V1 y NO tocan Home ni Training
   Records → rama nueva desde `Release-V1`. **Bloque 11 (KPIs
   animados en Movimientos) toca la MISMA pantalla que Bloque 10 tocó
   parcialmente y depende de patrones ya usados ahí — construir sobre
   `feat/bloque10-home-training-records`, no sobre `Release-V1` a
   secas, para no perder ese trabajo ni duplicar esfuerzo.** Cualquier
   bloque futuro que dependa de Training Records (el generador en sí,
   no solo el enlace desde Home) debe partir de
   `feature/training-records` (o de una rama que ya la incluya, como
   `feat/bloque10-home-training-records`) — `Release-V1` a secas NO
   tiene el generador todavía, solo esa rama.
7. Al cerrar el job de verdad (todos los bloques + análisis final +
   release lista para desplegar), actualizar la tabla de arriba y
   enviar el mail resumen definitivo.
