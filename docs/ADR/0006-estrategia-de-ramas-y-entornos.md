# ADR 0006 — Estrategia de ramas y entornos: GitHub Flow evolutivo hacia GitLab Flow

**Fecha:** 2026-08-28
**Estado:** Aprobado — fase actual (una sola rama de entorno) vigente y en
uso. Fase futura (`test`, `main`) documentada y aprobada en su diseño, no
implementada — se activa por disparadores objetivos, no por calendario.

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
| `develop` | Única rama de entorno. Test **y** producción a la vez para el grupo reducido de usuarios actual. | Decisión consciente y adecuada al tamaño actual del proyecto — no es una mala práctica pendiente de corregir. Protegida frente a push directo (ver Fase 6 operativa). Deploy automático a Vercel, sin cambios. |
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

### Cuándo crear `main` (producción pública real)

Cuando exista de verdad un lanzamiento público distinto del uso actual —
no antes. Al crearse: se cambia el Production Branch del proyecto Vercel
de `develop` a `main`; `develop` (y `test`, si existe) pasan a Preview con
URL estable. Nombre fijado ya como `main` (convención casi universal de
Git para la rama principal/de producción) para no tener que redecidirlo
ese día.

### Cuándo separar bases de datos

En el mismo momento en que nazca `main` como producción pública real —
usuarios que no deban compartir datos con el entorno de pruebas ni verse
afectados por migraciones experimentales. Separar antes tiene coste
recurrente (esquema y dataset semilla duplicados) sin beneficio mientras
solo hay un entorno real. `test`, cuando exista, sigue compartiendo el
Supabase actual — es integración antes de `develop`, no un entorno con
usuarios distintos.

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
- `docs/BACKLOG.md` registra la creación futura de `test` y `main` como
  ítems de vigilancia condicionados a los disparadores de este documento,
  no como tareas a priorizar.
- Los proyectos Vercel duplicados (`dive-tracker` y `dive-tracker-exgg`,
  ambos con Production Branch = `develop` hoy) y las ramas locales
  muertas detectadas (`feature/app-redesign-experiments`,
  `tmp/incident-401-backup`) siguen pendientes de confirmación del
  operador — no bloquean esta decisión, se resuelven en el procedimiento
  operativo cuando se apruebe.

## Límites actuales (explícito, para no reabrir este debate)

Hoy **no existen** ni se crean en esta fase: rama `test`, rama `main`,
segundo proyecto Vercel, segunda base de datos, ni ningún cambio en el
flujo de despliegue actual. Todo lo anterior es evolución futura ya
diseñada y aprobada en este documento, activable solo por los
disparadores descritos — no deuda técnica pendiente.

## Condiciones que reactivarían esta decisión

Solo si, en el uso real, alguno de los disparadores de "Evolución futura"
se cumple, o si aparece un requisito de negocio no previsto aquí (por
ejemplo, un segundo desarrollador). Hasta entonces, esta decisión no se
vuelve a evaluar desde cero.
