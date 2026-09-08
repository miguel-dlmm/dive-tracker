-- Migración 0015 — Vigencia de tarifas (Tarifas: no duplicados + baja
-- lógica). Dos problemas reales hoy en `rates`/`commission_rates`:
--
-- 1. Nada impide crear dos tarifas para la misma escuela+curso —
--    rateCalc.js (buildEntriesBySource) resuelve el importe de un
--    movimiento con `ratesTable.find(...)`, que siempre coge la PRIMERA
--    coincidencia — con dos tarifas activas para la misma escuela+curso,
--    cuál "gana" es indeterminado para quien mira la lista, aunque el
--    código sea determinista.
-- 2. Solo existe borrado físico (RatesTab.jsx, deleteRate) — bloqueado si
--    algún Work Log/Comisión ya usó esa tarifa, pero sin alternativa para
--    "ya no cobro esto así" salvo dejarla tal cual (precio desactualizado
--    pero seleccionable) o forzar el borrado si nunca se usó.
--
-- Solución: is_active (mismo patrón que setup_datasets.is_active,
-- scripts/migrations/0003) + índice único PARCIAL (solo sobre filas
-- activas) por (user_id, school, activity) en cada tabla. Desactivar una
-- tarifa la saca del índice único, así que una escuela+curso puede tener
-- como mucho UNA tarifa activa a la vez, pero cualquier número de
-- tarifas desactivadas (histórico de precios anteriores) sin chocar.
--
-- No se toca cómo rateCalc.js calcula el importe de movimientos ya
-- existentes: una tarifa desactivada sigue en la tabla y sigue
-- apareciendo en `rates.rows`/`commission_rates.rows` tal cual (solo
-- RatesTab.jsx la oculta del listado por defecto), así que ningún
-- movimiento histórico que la referenciara pierde su importe. Fuera de
-- alcance de esta migración (documentado, no implementado): los
-- selectores de escuela/curso al CREAR un movimiento nuevo (WorkLogTab,
-- ComisionesTab, MovementSheet) siguen leyendo school/activity de
-- `rates.rows`/`commission_rates.rows` sin filtrar por is_active — una
-- tarifa desactivada sigue siendo elegible ahí. Señalado como deuda
-- técnica al usuario, pendiente de decisión.
--
-- Aditiva e idempotente: default true dado a cualquier fila existente
-- (todas se consideran activas al migrar, ningún dato se pierde). Si ya
-- hubiera duplicados reales de escuela+curso en producción/TEST antes de
-- este índice, CREATE UNIQUE INDEX fallaría — no es el caso conocido hoy
-- (comprobado contra TEST antes de aplicar), pero si ocurriera habría que
-- desactivar a mano los duplicados sobrantes antes de reintentar.

alter table public.rates
  add column if not exists is_active boolean not null default true;
alter table public.commission_rates
  add column if not exists is_active boolean not null default true;

-- Limpieza previa al índice único: comprobado contra TEST antes de
-- escribir esta migración, SÍ hay duplicados reales hoy (dataset "Ihasia"
-- clonado varias veces sobre la misma cuenta durante pruebas) — p. ej. dos
-- tarifas activas para Ihasia+Open Water con importes distintos.
-- CREATE UNIQUE INDEX fallaría tal cual. Antes de crear el índice,
-- desactiva todas las filas de cada grupo (user_id, school, activity)
-- salvo la más reciente (created_at desc; id desc para desempatar cuando
-- created_at coincide, como en los duplicados reales encontrados) — dato
-- de prueba, no información real que se pueda perder: la fila que se
-- desactiva sigue en la tabla, solo deja de ofrecerse como activa.
with ranked as (
  select id, row_number() over (
    partition by user_id, school, activity
    order by created_at desc nulls last, id desc
  ) as rn
  from public.rates
)
update public.rates r set is_active = false
from ranked where ranked.id = r.id and ranked.rn > 1;

with ranked as (
  select id, row_number() over (
    partition by user_id, school, activity
    order by created_at desc nulls last, id desc
  ) as rn
  from public.commission_rates
)
update public.commission_rates r set is_active = false
from ranked where ranked.id = r.id and ranked.rn > 1;

create unique index if not exists rates_active_school_activity_unique
  on public.rates (user_id, school, activity) where is_active;
create unique index if not exists commission_rates_active_school_activity_unique
  on public.commission_rates (user_id, school, activity) where is_active;

comment on column public.rates.is_active is 'Baja lógica: false = tarifa desactivada, oculta por defecto en Tarifas y fuera del índice único de escuela+curso, pero conservada para que los movimientos ya guardados que la referenciaron sigan calculando su importe.';
comment on column public.commission_rates.is_active is 'Ver comentario en rates.is_active — misma semántica.';

-- Rollback (documentado antes de ejecutar, ver docs/RELEASE-V1-PROGRESS.md):
-- drop index if exists public.rates_active_school_activity_unique;
-- drop index if exists public.commission_rates_active_school_activity_unique;
-- alter table public.rates drop column if exists is_active;
-- alter table public.commission_rates drop column if exists is_active;
