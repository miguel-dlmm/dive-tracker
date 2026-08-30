# ADR 0019 — Fecha de alta en Tarifas (`created_at`)

**Fecha:** 2026-08-30
**Estado:** **Ejecutada.** `schema.sql` actualizado, frontend leyéndola,
y la columna confirmada en la base real (verificado directamente desde
este entorno vía consulta de solo lectura — a diferencia de `ADR-0018`,
esto sí es comprobable con las claves de la app, sin necesitar conexión
directa a Postgres): `rates`/`commission_rates` ya devuelven `created_at`
con valores reales. Tarifas ya muestra "Alta: `<fecha>`" real en vez de
"—".

## Encargo

Añadir fecha de creación a las tarifas, visible en el listado, con el
listado ordenado por más recientes primero — misma experiencia que
Movimientos. La fecha no es un campo del formulario (nadie la escribe a
mano): la fija el sistema al crear la tarifa.

## Decisión

Columna `created_at timestamptz not null default now()` en `rates` y
`commission_rates`. Ninguna alternativa real que valorar aquí (no hay
más de una forma razonable de modelar "cuándo se creó esta fila" en
Postgres) — se documenta con un ADR propio, no una nota de BACKLOG,
solo para mantener la misma trazabilidad que `ADR-0018` sobre qué
migraciones concretas están pendientes de ejecutar contra la base de
datos real, no porque haya trade-offs que discutir.

**Interpretación para el usuario** (sin ambigüedad, tal como se pidió):
"Alta: `<fecha>`" en cada tarjeta de Tarifas es la fecha en la que esa
tarifa se dio de alta en el sistema — se fija sola en el momento de
guardar "Nueva tarifa", nunca se edita, y "editar" una tarifa existente
no la cambia (solo actualiza importe/moneda). Mismo criterio y misma
redacción que "Alta: `<fecha>`" ya usa en Usuarios.

### Migración (pendiente de ejecución manual del usuario)

SQL Editor del dashboard de Supabase:

```sql
alter table rates add column created_at timestamptz not null default now();
alter table commission_rates add column created_at timestamptz not null default now();
```

**Reversible:** `alter table rates drop column created_at;` (idem para
`commission_rates`) deshace la migración sin afectar a ninguna otra
columna.

**Riesgo:** ninguno para los datos existentes — es una columna aditiva
con `default now()`, no reescribe ni valida nada de las filas ya
existentes (todas la reciben con el valor del momento en que se
ejecute el `ALTER TABLE`, no con su fecha real de creación original,
que no se registró en su momento — limitación aceptada, no hay forma
de recuperar esa fecha real para tarifas ya existentes).

### Frontend, ya preparado para cuando exista la columna

`RatesTab.jsx`: `allRows` ordena por `created_at` descendente como
criterio principal (con el orden anterior — escuela/tipo/curso — como
desempate, y como único criterio mientras la columna no exista: todas
las filas comparan como "sin fecha" y el desempate decide, sin cambio
de comportamiento visible hasta que se aplique la migración). Cada
fila muestra "Alta: `{shortDate(r.created_at)}`" — con la columna
todavía sin existir, `shortDate(undefined)` devuelve "—", el mismo
símbolo que ya usa el resto de la app para "sin dato", nunca una fecha
inventada.

## Consecuencias

- Hasta que el usuario ejecute la migración, toda tarifa muestra
  "Alta: —" y el orden por fecha no tiene efecto (cae al desempate
  anterior) — comportamiento honesto, no roto.
- Tras ejecutarla, toda tarifa NUEVA queda con su fecha real; las ya
  existentes reciben la fecha de la migración (no la de su alta real,
  ver limitación de arriba).
- Fila añadida a `docs/BACKLOG.md` ("Ahora") junto a la de `ADR-0018` —
  ambas migraciones pueden ejecutarse en la misma sesión del SQL Editor.
