# ADR 0025 — Gestión de migraciones para release: anotarlas y aplicarlas el día del despliegue

**Fecha:** 2026-09-01
**Estado:** Propuesto — informe de análisis, sin implementar (encargo explícito del cierre de esta sesión: "analízalo solo, no lo implementes").

## Contexto

Esta sesión generó 6 migraciones reales (`scripts/migrations/0001-*.sql` a
`0006-*.sql`), todas aplicadas contra Supabase **TEST** vía un script nuevo
(`scripts/apply-migration.mjs`, conexión Postgres directa), **ninguna
contra producción todavía**. Hasta hoy no existía ningún mecanismo — ni
para TEST ni para producción — que registrara qué migración se aplicó
dónde y cuándo: la única "anotación" era el propio nombre del archivo y un
comentario en `schema.sql`. Con 6 migraciones acumuladas en una sola
sesión, la pregunta de "¿cuáles de estas ya están en producción?" ya no
tiene una respuesta obvia sin repasar el historial de chat — exactamente
el problema que este informe debe resolver.

Relacionado pero **distinto** de `docs/ADR/0020-migraciones-supabase-y-separacion-test.md`
(propuesta, sin aprobar, sin ejecutar ningún paso): esa ADR plantea
adoptar la CLI oficial de Supabase (`supabase/migrations/`, `db pull`/`db
push`) como reemplazo completo del flujo actual. Esta ADR no reabre esa
decisión — analiza específicamente la pregunta más estrecha y con impacto
inmediato: cómo anotar y aplicar las migraciones que YA existen, con el
mecanismo que YA funciona hoy (`scripts/migrations/` + `apply-migration.mjs`),
sin esperar a que se apruebe una herramienta nueva.

## Decisión propuesta

### 1. Una tabla de seguimiento, en cada base de datos — el patrón estándar

Añadir una tabla `schema_migrations` (nombre que usan por convención
Rails, Django, Flyway y prácticamente cualquier herramienta de
migraciones del mercado — no es una invención propia, es el patrón
consolidado de la industria para este problema exacto):

```sql
create table if not exists public.schema_migrations (
  filename text primary key,   -- p.ej. '0007-algo-nuevo.sql'
  applied_at timestamptz not null default now()
);
```

Cada entorno (TEST, producción) tiene su propia tabla, con sus propias
filas — nunca se comparte entre entornos. Responde con una única consulta
(`select filename from schema_migrations order by filename`) a "¿qué
migraciones tiene aplicadas ESTA base de datos concreta ahora mismo?",
sin depender de memoria ni de revisar el historial de chat.

### 2. `apply-migration.mjs` se extiende, no se sustituye

Cambio pequeño sobre el script ya existente y ya probado esta sesión:

- Antes de ejecutar un archivo, comprueba si su nombre ya está en
  `schema_migrations` de la base de datos objetivo — si ya está, no lo
  vuelve a aplicar (mensaje claro, no error) — evita reaplicar por
  error una migración que además de `create table if not exists` incluya
  algún `update`/backfill que no sea idempotente de verdad.
- Tras aplicar con éxito, inserta la fila en `schema_migrations`.
- Nuevo modo `--all`: recorre `scripts/migrations/` en orden y aplica
  solo las que falten contra el entorno objetivo — es literalmente el
  comando de "aplicar todo lo pendiente" para el día del release.

Coste: pequeño, sobre una herramienta que ya existe y ya se usó 6 veces
con éxito esta sesión — no una reescritura.

### 3. Procedimiento del día del despliegue

```
1. git checkout develop (o la rama que se vaya a desplegar)
2. Confirmar qué archivos hay en scripts/migrations/ que develop tiene
   y producción no (git log, o simplemente mirar el número más alto
   aplicado en producción vs. el más alto en el repo)
3. node --env-file=.env.production.local scripts/apply-migration.mjs --all
   (contra la cadena de conexión de PRODUCCIÓN — variable de entorno
   separada, nunca la de TEST; ver punto 4)
4. Verificar: select filename from schema_migrations order by filename;
   en producción, confirmar que coincide con TEST
5. Desplegar el código (Vercel ya lo hace solo al hacer push/merge)
```

Nunca automático, nunca en un pipeline de CI sin supervisión — sigue
siendo una decisión humana explícita, ejecutada a mano, exactamente como
ya exige `CLAUDE.md` para cualquier cambio de esquema contra producción.
Esta ADR no cambia esa parte, solo la hace repetible y verificable en vez
de manual.

### 4. Nomenclatura de la cadena de conexión de producción

Mismo patrón ya usado hoy para `PROD_SUPABASE_URL`/`PROD_SUPABASE_SERVICE_ROLE_KEY`
(añadidas en esta misma sesión para leer un dataset real de producción):
una variable nueva, `PROD_SUPABASE_DB_URL`, análoga a
`SUPABASE_TEST_DB_URL` — nunca en Vercel, nunca comiteada, solo en el
`.env.local` de quien ejecuta el release ese día.

## Alternativas descartadas

- **Adoptar ya la CLI de Supabase (ADR-0020).** Resolvería lo mismo y
  más (deriva de esquema, seed reproducible), pero es una pieza de
  infraestructura nueva completa — dependencia nueva, carpeta nueva,
  flujo nuevo que aprender — para un problema que la tabla de
  seguimiento de arriba ya resuelve con una migración de 4 líneas.
  Coherente con la regla ya fijada para este proyecto: no construir
  infraestructura nueva antes de que la necesidad real lo justifique.
  Se mantiene como decisión aparte, para revisarse cuando aparezca un
  motivo concreto (p. ej. necesitar `db diff` de verdad, o que el
  número de migraciones crezca lo suficiente para que un archivo plano
  ya no baste).
- **Anotar migraciones aplicadas a mano en un documento Markdown
  (`docs/MIGRATIONS.md`).** Descartado: es exactamente el tipo de dato
  que se desincroniza solo (alguien aplica una migración y se olvida de
  anotarla) — una tabla en la propia base de datos no puede mentir sobre
  si esa migración se aplicó ahí o no.
- **Ejecutar las migraciones automáticamente en el build de Vercel.**
  Descartado de plano: mezclaría un cambio de esquema (irreversible,
  afecta a datos reales) con un despliegue de código (reversible,
  rollback de un clic) — el mismo motivo por el que este proyecto ya
  exige un paso humano separado para tocar producción.

## Consecuencias

- Migración nueva (`schema_migrations`, aditiva) más una extensión
  pequeña de un script que ya existe — ninguna dependencia nueva.
- Responde con una consulta, no con memoria, a "qué le falta a
  producción" en cualquier momento futuro.
- Dedeja preparado, sin decidir todavía, el paso a la CLI de Supabase
  (ADR-0020) si algún día hace falta — esta tabla no es incompatible con
  esa migración futura, `supabase migration new` podría seguir usándose
  para generar los archivos y esta misma tabla (o su equivalente,
  `supabase_migrations.schema_migrations`, que la propia CLI ya crea)
  seguiría llevando la cuenta.

## Pendiente de aprobación

Ninguna línea de código de esta ADR está implementada — es análisis, tal
como se pidió explícitamente. Implementar el punto 1 (la tabla) y el
punto 2 (la extensión del script) es una migración más (`0007-*.sql`) del
mismo tipo que las 6 ya hechas esta sesión — bajo riesgo, bajo coste,
lista para ejecutar en cuanto se apruebe.
