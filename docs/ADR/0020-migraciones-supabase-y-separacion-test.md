# ADR 0020 — Versionado de esquema con migraciones oficiales de Supabase, como base de la separación TEST/PROD

**Fecha:** 2026-08-30
**Estado:** Propuesto — pendiente de aprobación explícita antes de ejecutar
ningún paso (creación de proyecto, `supabase init`, `db pull`/`db push`,
cambios en Vercel). Documenta la decisión; no implementa nada por sí
misma.

## Contexto

La Fase 3 (crear un entorno `test` real, separado de producción — ver
`docs/ADR/0006-estrategia-de-ramas-y-entornos.md`) empezó con una
auditoría completa de Supabase, código y Vercel. Esa auditoría encontró
algo más amplio que "falta un segundo proyecto Supabase":

- `schema.sql` documenta con precisión la parte **estructural** del
  esquema (tablas, RLS, funciones, triggers) — de hecho ya incluye
  correctamente `on delete cascade` y `created_at` directamente en los
  `create table`, no solo como nota de migración pendiente (ver
  `docs/ADR/0018` y `docs/ADR/0019`, ya ejecutadas).
- Pero los **datos de configuración/semilla** (`currencies`,
  `nav_sections`, `app_config`, el dataset `setup_datasets`/`ihasia` y sus
  4 tablas hijas) no están versionados en ningún sitio — solo existen como
  filas reales en la base de datos de producción. Ningún script los
  genera ni los exporta.
- No existe ningún mecanismo que impida que un cambio hecho a mano desde
  el Dashboard de Supabase (SQL editor) diverja silenciosamente de
  `schema.sql` — el propio historial del proyecto ya depende hoy de
  ejecutar ALTERs a mano y actualizar el fichero por separado, dos pasos
  que nada obliga a mantener sincronizados.
- El proyecto no usa la CLI de Supabase ni tiene carpeta
  `supabase/migrations` — todo el ciclo de vida del esquema pasa por
  copiar/pegar SQL en el Dashboard.

Crear un Supabase TEST reproduciendo esto a mano (copiar `schema.sql` +
adivinar/exportar los datos de configuración de producción) habría
perpetuado el mismo problema en un segundo entorno en vez de resolverlo.

## Decisión

Adoptar el sistema de migraciones oficial de **Supabase CLI**
(`supabase/migrations/`) como fuente ejecutable de verdad para cambios de
esquema futuros, junto con un seed reproducible y versionado
(`supabase/seed.sql`) para configuración/datos iniciales — nunca datos
reales de producción.

### CLI, sin Homebrew ni Docker

Verificado en este entorno: `npx supabase --version` funciona
directamente (v2.116.0), sin necesitar Homebrew (no instalado) ni Docker.
Se añade `supabase` como devDependency (`npm install -D supabase`) —
mismo patrón que el resto de herramientas del proyecto (Vite, Vitest,
Playwright), todas gestionadas por npm. La CLI se usa aquí solo para
`link`/`db pull`/`db push`/`migration new` contra proyectos **remotos**
— no se levanta Postgres local.

### Migración `0001` (baseline): generada, no transcrita a mano

En vez de convertir `schema.sql` a migraciones copiando su contenido a
mano (riesgo real de transcripción, y no resuelve la duda de fondo), la
migración inicial se genera con `supabase db pull` **contra el proyecto
de producción real** — introspección de solo lectura que captura el
esquema tal cual está de verdad en Postgres hoy. Si hubiera alguna deriva
entre Dashboard y `schema.sql` que hoy no conocemos, esto la saca a la
luz en vez de perpetuarla en el nuevo entorno.

### `supabase/seed.sql`: escrito a mano, no exportado de producción

Los valores de `currencies`/`nav_sections`/`app_config`/dataset `ihasia`
se escriben como `insert` explícitos, acordados con el usuario en el
momento de crearlos — nunca mediante `pg_dump`/exportación directa de las
filas reales de producción. Objetivo explícito: poder recrear un entorno
Supabase funcional desde cero, sin que producción exista o esté
accesible.

### `schema.sql`: se mantiene, sin retirarse todavía

Sigue existiendo como documento de referencia humana durante la
transición — decisión explícita del usuario. Si en el futuro se retira o
se relega definitivamente en favor de `supabase/migrations/` como única
fuente, será una decisión aparte, tomada solo después de validar que el
flujo de migraciones funciona de extremo a extremo (TEST y PROD
sincronizados, al menos un cambio de esquema real pasado por el flujo
completo).

### Flujo futuro para cualquier cambio de esquema

```
rama local (feature/fix)
        │
        │  npx supabase migration new <nombre>
        ▼
  supabase/migrations/<timestamp>_<nombre>.sql
        │
        │  supabase link --project-ref <test> && supabase db push
        ▼
     Supabase TEST
        │
        │  validación funcional
        ▼
  supabase link --project-ref <prod> && supabase db push
        │
        ▼
     Supabase PROD
```

Nunca se edita el esquema de producción a mano desde el Dashboard salvo
emergencia documentada aparte (mismo criterio que ya aplica CLAUDE.md a
cualquier cambio de esquema: proponer plan de migración antes, nunca en
un solo paso).

### Estructura inicial de `supabase/` (propuesta, no creada todavía)

```
supabase/
  config.toml   — generado por `npx supabase init`, config de la CLI
  migrations/
    <timestamp>_baseline.sql   — generada con `supabase db pull` contra producción
  seed.sql      — insert explícitos para currencies/nav_sections/app_config/
                  setup_datasets, escritos a mano y acordados con el usuario
```

## Alternativas consideradas

- **Seguir como hasta ahora** (`schema.sql` editado a mano + SQL editor
  del Dashboard) — descartado como método definitivo: es precisamente la
  causa del hallazgo de esta auditoría. Se mantiene solo como documento
  humano complementario, no como fuente ejecutable.
- **Herramienta de migraciones genérica de Postgres** (`node-pg-migrate`,
  Flyway, etc.) en vez de la de Supabase — descartada: Supabase ya expone
  su propia CLI oficial pensada exactamente para este flujo (`db
  pull`/`db diff` conscientes de RLS, funciones y triggers tal como los
  usa este proyecto). Añadir otra herramienta sería una capa de
  abstracción sin beneficio real sobre la del propio proveedor.
- **Supabase local con Docker** (`supabase start`) para desarrollo diario
  — valorado, descartado por ahora: resuelve un problema distinto (loop
  de desarrollo local) al que motiva esta ADR (versionado + deriva
  Dashboard/documento), y añade una dependencia de infraestructura
  (Docker) no justificada todavía por el tamaño del proyecto. Se anota en
  `docs/BACKLOG.md` como mejora futura opcional, no como parte de esta
  decisión.

## Consecuencias

- Nueva dependencia de desarrollo: `supabase` (CLI) vía npm.
- Nueva carpeta `supabase/` en el repositorio (`migrations/`, `seed.sql`,
  `config.toml`).
- `schema.sql` pasa a convivir con `supabase/migrations/` como referencia
  humana, no como fuente ejecutable — sin cambiar su rol formal en
  `CLAUDE.md` todavía; eso es una decisión aparte, posterior a validar el
  flujo completo.
- Cualquier cambio de esquema futuro sigue el flujo TEST → validación →
  PROD descrito arriba, nunca directo a producción salvo excepción
  documentada explícitamente en el momento.
- Esta ADR no crea el proyecto Supabase TEST ni ejecuta ningún comando —
  es la base para el siguiente paso de Fase 3, pendiente de aprobación
  del orden de ejecución.

## Condiciones que reactivarían esta decisión

Si la CLI de Supabase dejara de ser viable en este entorno (no es el caso
hoy, verificado con `npx supabase --version`), o si el proyecto creciera
lo suficiente para justificar Supabase local con Docker — se evaluaría
como una ADR aparte, no como una revisión de esta.
