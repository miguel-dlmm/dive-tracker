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

## Estado de los bloques

| # | Bloque | Estado | Rama | Commit |
|---|---|---|---|---|
| 1 | Estado (notificaciones/styling/libro de estilo) | ✅ Analizado, mail enviado | — (solo análisis) | — |
| 2 | email_for_nickname / rate limiting | ✅ Analizado, mail enviado, sin implementar (decisión del usuario) | — (solo análisis) | — |
| 3 | Test roto en `main` (PaymentsTab, fecha relativa) | ✅ Hecho | `fix/paymentstab-test-fecha-relativa` (desde `develop`) | `f808a4d` |
| 4 | Ajustes rápidos (hint flotante, +/- negativos, último acceso, slide de eliminar) | ✅ Hecho | `fix/bloque4-ajustes-rapidos` (desde `develop`) | `508b920` |
| 5 | Training Records — config compartida por listado | ✅ Hecho | `feature/training-records` (desde `Release-V1`) | `3031a96` + `d131ed3` (docs) |
| 6 | Revisión de todos los textos de la app | ⬜ No empezado | — | — |
| 7 | Revisión de notificaciones propias (toasts) | ⬜ No empezado | — | — |
| 8 | Rediseño del slide de novedades (WhatsNew) | ⬜ No empezado | — | — |
| 9 | KPIs de la home a primera posición | ✅ Hecho | `feat/bloque9-kpis-primera-posicion` (desde `Release-V1`) | `ccc622e` |
| 10 | Rediseño de Home + enlace al generador de Training Records | ⬜ No empezado | — | — |
| 11 | KPIs animados en Movimientos (Generado este mes / Pendiente de cobrar + 3º a decidir) | ⬜ No empezado | — | — |
| 12 | Análisis de sesión/perfil (eficiencia, robustez) | ⬜ No empezado | — | — |
| 13 | Análisis de build/push/despliegue | ⬜ No empezado | — | — |
| 14 | Velocidad de la suite de test | ⬜ No empezado | — | — |
| 15 | Mocks vs. BBDD real en los tests | ⬜ No empezado | — | — |
| 16 | Eficiencia de las propias pruebas de Claude (navegador) | ⬜ No empezado | — | — |
| 17 | Cobertura de test — ampliar / otros tipos / estándares | ⬜ No empezado | — | — |
| 18 | Monitorización de infraestructura (Vercel/Supabase) | ⬜ No empezado | — | — |
| final | Análisis de código (eficiencia, robustez, patrones, dependencias...) | ⬜ No empezado | — | — |
| release | Dejar todo listo para desplegar (sin desplegar) | ⬜ No empezado — depende de que el resto avance y de que el usuario revise/mergee las ramas de arriba | — | — |

## Texto original de los bloques pendientes (para no depender del chat)

**Bloque 6 — Revisión de todos los textos**
Revisar todos los textos de la app: notificaciones de email que se
envían, textos de botones, ayudas… Objetivo: lenguaje cercano, humano,
cero máquina, cero formalidad de app financiera obsoleta.

**Bloque 7 — Notificaciones de la propia app**
Revisar las notificaciones propias (crear registro, eliminar,
confirmaciones…): revisión de diseño y usabilidad; si se te ocurre algo
mejor, implementarlo sin perder funcionalidad.

**Bloque 8 — Slide de cambios de la release**
Rediseñar el slide de "qué hay de nuevo" (se ve una vez, tras una
acción de backend o al iniciar sesión tras un despliegue). Adaptarlo a
los cambios de Release V1. Sencillo, para alguien con las manos
mojadas y prisa — un vistazo a las novedades principales.

**Bloque 10 — Home y acceso al generador**
Mover el enlace al generador de Training Records a la Home,
rediseñando Home para incluirlo — una Home útil y visualmente cuidada,
línea Ocean Flow. (Pregunta ya respondida en el Bloque 1: sí hay libro
de estilo parcial, `docs/ESTILO.md`.)

**Bloque 11 — KPIs en Movimientos**
Cambiar la pastilla superior de la página de movimientos por KPIs
animados: "Generado este mes" y "Pendiente de cobrar" (solo
cantidades, no nº de movimientos). Valorar un 3er KPI por estética,
explicando en el informe qué opciones se valoraron y por qué se eligió
la implementada.

**Bloque 12 — Sesión y perfil**
Qué eficiencias, mejoras y robustez se pueden añadir a la gestión de
sesión y perfil (contempla optimización). Buscar referencias/patrones
de mercado, innovar, reutilizar código.

**Bloque 13 — Build, push y despliegue**
¿Cuánto de grande es el proyecto? ¿Se puede optimizar el build/push/
despliegue? ¿Merece la pena invertir en esto?

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
2. Confirmar que las 4 ramas de la tabla de arriba siguen empujadas y
   sin mergear (`git branch -a`, `git log origin/<rama>..<rama>`).
3. Seguir con el Bloque 6, en orden, con el mismo protocolo (rama por
   bloque, commit por unidad, tests+build en verde antes de cada push,
   mail de aviso tras cada commit).
4. Bloques de mantenimiento general (6, 7, 11 si no toca Home, 12-18,
   final) → rama nueva desde `develop`. Bloques que son Release V1 (8,
   10, 11 si se hace junto al Bloque 10) → rama nueva desde
   `Release-V1`.
5. Al cerrar el job de verdad (todos los bloques + análisis final +
   release lista para desplegar), actualizar la tabla de arriba y
   enviar el mail resumen definitivo.
