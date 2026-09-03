-- Migración 0016 — baja lógica (soft delete) + fecha de alta/modificación
-- para los 3 movimientos económicos (worklog, comisiones,
-- colleague_payments — la "Mi trabajo" unificada, ver
-- docs/ADR/0005-mi-trabajo-unificacion-economica.md). Trabajo nocturno
-- autónomo (sesión 2026-09-04): decisión documentada aquí en detalle
-- porque no hubo aprobación humana previa (excepción explícita del
-- usuario para esta noche a la regla "proponer plan antes de tocar
-- esquema" de CLAUDE.md).
--
-- QUÉ Y POR QUÉ:
-- 1. Nunca borrar de verdad un movimiento (dinero real del instructor):
--    hoy `deleteRow` hace un DELETE SQL real — cualquier borrado
--    accidental es irrecuperable. `deleted_at` (nullable) marca la baja
--    lógica sin destruir la fila; toda lectura de la app pasa a filtrar
--    `deleted_at is null`.
-- 2. `created_at`/`updated_at`, pedidas junto con la anterior — hoy
--    ninguna de las 3 tablas las tiene. `created_at` se autorrellena con
--    el `default now()` de Postgres (igual que ya hacen `rates`/
--    `commission_rates`, ver su comentario junto a la columna en
--    schema.sql). `updated_at` no tiene equivalente de "default" en
--    Postgres para UPDATE — necesita un trigger `BEFORE UPDATE` que la
--    reescriba sola; no existía ningún trigger de este tipo en todo
--    schema.sql (se buscó expresamente antes de escribir este, para no
--    reinventar un patrón ya resuelto) — `public.set_updated_at()` es el
--    primero, pensado desde ya como reutilizable por cualquier tabla
--    futura que necesite lo mismo.
--
-- DECISIÓN DE DISEÑO — columnas en cada tabla, NO una tabla aparte
-- (dejada explícitamente a mi criterio por el usuario):
-- Evaluadas 2 opciones:
--   (a) 3 columnas nuevas en cada una de las 3 tablas (elegida).
--   (b) una tabla de auditoría/lifecycle aparte (p. ej.
--       movement_lifecycle(movement_type, movement_id, deleted_at,
--       created_at, updated_at)), referenciada por (tipo, id).
-- (b) se descartó: estos 3 timestamps son atributos intrínsecos de CADA
-- fila (su propio ciclo de vida), no una relación con cardinalidad
-- propia ni un concepto que varias tablas comparten de verdad — es
-- exactamente el caso que CLAUDE.md pide NO abstraer ("extraer
-- abstracciones solo cuando exista una necesidad real", regla 3 de
-- "Principios de diseño y arquitectura"). Una tabla aparte añadiría: (1)
-- un JOIN en cada lectura de worklog/comisiones/colleague_payments (hoy
-- un simple `select *` vía useSupabaseTable), (2) una clave compuesta sin
-- FK real (no se puede apuntar a 3 tablas con una sola FK de Postgres),
-- (3) riesgo real de desincronización (fila borrada de verdad en la
-- tabla de negocio sin borrar su fila de lifecycle, o al revés). Columnas
-- directas no tienen ninguno de estos 3 costes y son el patrón que la
-- propia app ya usa (`rates.created_at`, `profiles.deactivated_at` —
-- ver 0006-fecha-de-baja.sql). Idempotente.

alter table public.worklog
  add column if not exists deleted_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.comisiones
  add column if not exists deleted_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.colleague_payments
  add column if not exists deleted_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Índice parcial: todas las lecturas de la app (useSupabaseTable con
-- softDelete) filtran `deleted_at is null` en cada carga — un índice
-- parcial sobre las filas vivas (la inmensa mayoría de las consultas
-- reales) es más barato que uno completo y no indexa lo que nunca se
-- consulta (las filas ya dadas de baja).
create index if not exists worklog_not_deleted_idx on public.worklog (user_id) where deleted_at is null;
create index if not exists comisiones_not_deleted_idx on public.comisiones (user_id) where deleted_at is null;
create index if not exists colleague_payments_not_deleted_idx on public.colleague_payments (user_id) where deleted_at is null;

-- Trigger reutilizable de `updated_at` — primero de su tipo en el
-- esquema (ver nota arriba). SECURITY INVOKER (por defecto, no se marca
-- security definer): corre con los permisos de quien hace el UPDATE, que
-- ya está sujeto a la política RLS "own rows" existente de cada tabla —
-- no necesita privilegios elevados, solo tocar NEW.
create or replace function public.set_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.worklog;
create trigger set_updated_at before update on public.worklog
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.comisiones;
create trigger set_updated_at before update on public.comisiones
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.colleague_payments;
create trigger set_updated_at before update on public.colleague_payments
  for each row execute function public.set_updated_at();

-- ROLLBACK (documentado, no ejecutado — solo si hiciera falta revertir):
--   drop trigger if exists set_updated_at on public.worklog;
--   drop trigger if exists set_updated_at on public.comisiones;
--   drop trigger if exists set_updated_at on public.colleague_payments;
--   drop function if exists public.set_updated_at();
--   drop index if exists worklog_not_deleted_idx;
--   drop index if exists comisiones_not_deleted_idx;
--   drop index if exists colleague_payments_not_deleted_idx;
--   alter table public.worklog drop column if exists deleted_at, drop column if exists created_at, drop column if exists updated_at;
--   alter table public.comisiones drop column if exists deleted_at, drop column if exists created_at, drop column if exists updated_at;
--   alter table public.colleague_payments drop column if exists deleted_at, drop column if exists created_at, drop column if exists updated_at;
-- Nota: un rollback de las columnas perdería para siempre cualquier fila
-- ya "dada de baja" únicamente vía deleted_at (nunca tuvo DELETE real) —
-- solo ejecutar el rollback de columnas si antes se decide explícitamente
-- descartar esas filas, no como paso reversible sin más.
