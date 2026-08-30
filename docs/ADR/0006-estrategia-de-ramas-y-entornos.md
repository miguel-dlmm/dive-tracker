# ADR 0006 — Estrategia de ramas y entornos: GitHub Flow evolutivo hacia GitLab Flow

**Fecha:** 2026-08-28
**Estado:** Aprobado — **parcialmente ejecutado**. El disparador de "Cuándo
crear `main`" se cumplió el 2026-08-30: `main` existe, está publicada, y es
la Production Branch real del proyecto Vercel productivo
(`dive-tracker-exgg`) — ver detalle en la sección correspondiente más
abajo. `test` (rama y segundo proyecto Vercel configurado como tal) y la
separación de Supabase siguen sin implementarse, activables solo por sus
disparadores — no por calendario.

## Contexto

Ocean Pulse lo mantiene una sola persona. `develop` está conectada a
despliegue automático en Vercel y hoy hace de entorno de pruebas y de
producción a la vez para un grupo reducido de usuarios reales, que ya
saben que ese es el trato. No existe entorno `test` independiente. El
proyecto tiene una regla de trabajo explícita (`CLAUDE.md`, regla 6): ante
una decisión de arquitectura, seguir un estándar consolidado de la
industria en vez de inventar un flujo propio, salvo razón objetiva y
justificada para desviarse.

## Problema

Qué modelo de ramas y de promoción de cambios usar ahora, y cómo debe
evolucionar más adelante (test independiente, producción pública,
posible separación de base de datos) sin tener que volver a debatir esta
decisión ni acumular complejidad — o deuda de ramas — antes de que haga
falta de verdad.

## Decisión

**GitLab Flow, variante "environment branches", implementado de forma
incremental.** El número de ramas de entorno debe ser igual al número de
entornos reales desplegados — ni una más. Hoy solo existe un entorno real
(`develop`), así que la arquitectura de ramas de hoy es, por definición,
el caso de una sola rama de entorno de ese mismo estándar — que coincide
con GitHub Flow. No son dos metodologías distintas: GitHub Flow es
GitLab Flow con una única rama de entorno. El sistema no cambia de
filosofía al crecer, solo añade una rama de entorno cada vez que aparece
un entorno real nuevo.

### Fase actual

| Rama | Rol | Notas |
|---|---|---|
| `main` | Rama de producción real. | Creada el 2026-08-30 como copia exacta de `develop` en ese momento. Production Branch del proyecto Vercel productivo, `dive-tracker-exgg` — ver "Cuándo crear `main`" más abajo para el detalle de la migración. |
| `develop` | Rama de integración/preparación. | Deja de ser simultáneamente producción — ese rol pasa a `main`. Sigue siendo donde se fusiona cada `feature/*`/`fix/*` validada y donde se prepara cada release (`ADR-0010`), y será la base del futuro entorno `test`. Protegida frente a push directo (ver Fase 6 operativa). |
| `feature/*`, `fix/*` | Ramas efímeras de trabajo diario. | Nacen de `develop` actualizado, se prueban en su Preview Deployment automático de Vercel (equivalente funcional de las "Review Apps" de GitLab), se fusionan a `develop` y se borran (local y remoto) al mergear. |
| `hotfix/*` | Corrección urgente sobre `develop`. | Mismo ciclo que `feature/*`, simplificado: no hay entorno downstream todavía al que propagar. |

Ramas experimentales sin intención de merge (ej. `feature/design-lab-preview`,
sandbox visual referenciado desde `docs/BACKLOG.md`) son una excepción
reconocida del modelo: no siguen este ciclo, se conservan indefinidamente
como referencia.

### Flujo de trabajo y de merges (fase actual)

Local → `feature/<nombre>` desde `develop` → push → Preview Deployment
automático de Vercel para validar → `npm run test && npm run build` en
local → fusión a `develop` (nunca commit directo sobre `develop`) → push
→ borrar la rama.

## Alternativas consideradas

- **Git Flow completo** (`develop`+`main`+`release/*`+`hotfix/*`) —
  descartado. Diseñado por su propio autor (Driessen, 2010) para software
  con ciclos de release programados y varias versiones en producción
  simultáneas; el propio autor reconoció después que encaja mal con
  aplicaciones web de entrega continua. La rama `release/*` añade una fase
  de estabilización que aquí no resuelve nada que no resuelva ya el
  despliegue automático de Vercel por rama — coste sin beneficio para un
  solo desarrollador.
- **GitHub Flow como destino final** (una sola rama de entorno para
  siempre) — descartado como destino, aunque se adopta como fase actual.
  No modela por sí solo la necesidad ya prevista de un segundo entorno
  real separado (producción pública) más adelante.
- **Trunk-Based Development** — descartado. Exige *feature flags* e
  infraestructura de CI/CD madura que no existen hoy; cambio de paradigma
  no justificado por el tamaño actual del proyecto.
- **Crear `test` y `main` ya, por adelantado** — descartado. Crear una
  rama de entorno sin el entorno real detrás ya generó deuda en este
  mismo repositorio: la rama remota `production`, huérfana y 62 commits
  desalineada de `develop`, es el ejemplo real de este error. El patrón
  correcto es crear cada rama de entorno en el momento exacto en que su
  entorno real nace, nunca antes.

## Evolución futura (documentada, no implementada)

### Cuándo crear `test`

Se crea cuando se cumpla **cualquiera** de estos disparadores objetivos,
no antes:

1. Necesitas validar juntas varias features antes de que las vea el grupo
   de prueba actual (hoy, probándose una a una vía Preview Deployment, no
   hace falta).
2. El grupo de usuarios de prueba se vuelve sensible a que `develop` se
   rompa mientras pruebas — deja de tolerar inestabilidad.
3. Trabajas en paralelo 2+ features grandes que necesitan integrarse y
   verse juntas antes de tocar `develop`.

Al crearse, `test` **no** requiere proyecto Vercel propio de entrada —
usa el Preview Deployment que Vercel genera automáticamente para esa
rama. Un proyecto/dominio propio para `test` solo se justifica si además
hace falta una URL estable (no una preview cambiante).

### Cuándo crear `main` (producción pública real) — EJECUTADO 2026-08-30

`main` se creó como copia exacta de `develop` (mismo commit,
`0ccedef8e579286969b4cdb1603d73e0415d9836`, ya con la release `v0.2.0` y
el cierre documental de `ADR-0010` incluidos) y se publicó en `origin`.

**Aclaración importante sobre qué proyecto Vercel es la producción real**,
que esta misma ADR dejaba como pregunta abierta ("Consecuencias" original):
existen dos proyectos Vercel duplicados apuntando al mismo repositorio,
`dive-tracker` y `dive-tracker-exgg`. Auditando ambos directamente (bundle
servido, variables de entorno por proyecto) se confirmó que **el proyecto
realmente usado por los usuarios reales es `dive-tracker-exgg`** — es el
único con las variables `APP_URL`/`SUPABASE_SERVICE_ROLE_KEY`/
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` configuradas en Production y
Preview, y el único cuyo bundle desplegado contiene la conexión real a
Supabase. `dive-tracker` no tenía ninguna variable en Production/Preview
(solo en Development) — su bundle en producción no podía conectar con
Supabase, señal de que nunca fue el proyecto real en uso.

En consecuencia:
- **Production Branch de `dive-tracker-exgg`** cambiado de `develop` a
  `main` (no hay forma de hacer este cambio concreto vía API pública de
  Vercel — se hizo manualmente desde el Dashboard). Validado tras el
  cambio: deployment nuevo generado, mismo bundle exacto que antes
  (`index-DBN7Epol.js`, sin diferencia de código), conexión a Supabase
  intacta, cero errores de consola, login y datos existentes verificados
  por el usuario. La URL pública (`dive-tracker-exgg.vercel.app`) no ha
  cambiado — sin migración de usuarios.
- **`dive-tracker`** (Production Branch todavía `develop`, sin variables
  reales) queda identificado como el candidato natural a proyecto Vercel
  del futuro entorno `test` — ver sección siguiente. Sigue sin
  configurarse como tal; es solo la asignación de rol, no la ejecución.

### Cuándo separar bases de datos — TODAVÍA PENDIENTE

`main` ya existe como producción real (ver arriba), pero la separación de
Supabase **no se ha ejecutado todavía** — sigue habiendo una única base de
datos, compartida por lo que hoy es producción (`main`) y lo que en el
futuro sea `test`. Esto es intencional en esta fase (crear `main` y
separar Supabase son dos pasos distintos, no atómicos), pero dejar de ser
cierto es justo el disparador para hacerlo: en cuanto exista de verdad un
segundo entorno (`test`) que necesite escribir datos de prueba sin
mezclarlos con los reales, toca separar. Hasta entonces, cualquier
cambio de esquema sigue afectando a la única base de datos real — se
mantiene el criterio de `CLAUDE.md` de proponer plan de migración antes de
tocar el esquema. `test`, cuando exista, seguirá compartiendo el Supabase
actual hasta ese momento — es integración antes de `develop`, no un
entorno con usuarios distintos.

### Releases

Se mantiene lo ya existente — `CHANGELOG.md` + semver + tag `vX.Y.Z` —
sin cambios de fondo. Mientras `develop` sea la única rama de entorno
real, los tags marcan su estado (como ya ocurre con `v0.1.0`). El día que
`main` sea la producción real, los tags se mueven a marcar `main`.

### Protección de ramas

Con un solo desarrollador no hay a quién bloquear, pero sí protege contra
el propio despiste: prohibir push directo y borrado accidental sobre
`develop` (y sobre `test`/`main` en cuanto existan). No cambia el flujo
de despliegue ni añade infraestructura — es un ajuste de configuración
del repositorio en GitHub, incluido en el procedimiento operativo de esta
misma decisión.

## Consecuencias

- `CLAUDE.md` (regla 2) se actualiza: el flujo documentado pasaba por alto
  las ramas `feature/*` y describía commit/push directo sobre `develop`,
  lo cual ya no es correcto — ver "Documentación actualizada" al cierre de
  esta sesión.
- `docs/BACKLOG.md` registra la creación futura de `test` como ítem de
  vigilancia condicionado a los disparadores de este documento, no como
  tarea a priorizar. El ítem de creación de `main` ya se completó (ver
  "Cuándo crear `main`" arriba) y se marca como tal en el backlog.
- **Resuelto:** los proyectos Vercel duplicados ya no son una ambigüedad
  pendiente — `dive-tracker-exgg` es la producción real, `dive-tracker` es
  el candidato a proyecto de `test`. Las ramas locales muertas detectadas
  (`feature/app-redesign-experiments`, `tmp/incident-401-backup`) siguen
  pendientes de confirmación del operador, sin relación con lo anterior.

## Límites actuales (explícito, para no reabrir este debate)

**Ya existe y está en uso** (desde 2026-08-30): rama `main`, publicada y
configurada como Production Branch real del proyecto Vercel productivo
(`dive-tracker-exgg`).

Hoy **todavía no existen** ni se crean en esta fase: rama `test`, un
proyecto Vercel configurado como entorno `test` (aunque `dive-tracker` ya
está identificado como el candidato — falta configurarlo como tal),
segunda base de datos de Supabase. Todo lo anterior sigue siendo
evolución futura ya diseñada y aprobada en este documento, activable solo
por los disparadores descritos — no deuda técnica pendiente.

## Condiciones que reactivarían esta decisión

Solo si, en el uso real, alguno de los disparadores de "Evolución futura"
se cumple, o si aparece un requisito de negocio no previsto aquí (por
ejemplo, un segundo desarrollador). Hasta entonces, esta decisión no se
vuelve a evaluar desde cero.
