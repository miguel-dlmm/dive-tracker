-- Eliminar payment_type del todo — pasos de BD 3-5 de
-- docs/ADR/0003-eliminar-payment-type.md. Pasos 1-2 (frontend) ya están
-- en develop desde 2026-09-02: computeRateTotal (rateCalc.js) ya no
-- distingue por payment_type, ningún formulario lo expone, toda tarifa
-- nueva se crea con el literal fijo "Per Person" — la columna es, desde
-- entonces, puramente vestigial en cualquier fila, sea cual sea su
-- contenido.
--
-- Número de migración: 0026 ya está reservado por la rama
-- feature/contadores-actividad-guia-y-pdf (sin fusionar todavía) — este
-- fichero usa 0027 para no chocar cuando ambas ramas lleguen a develop.
--
-- **Paso 4 (verificación) ya hecho, pero SOLO en TEST** — confirmado
-- 2026-09-29 vía consulta de solo lectura: `rates` tenía 52 filas
-- "Per Person" + 4 "Instructor"; `commission_rates` tenía 16
-- "Per Person" + 12 "Comisión" + 1 "Instructor". Exactamente el caso
-- que la ADR ya documentaba (addendum 2026-08-30: cuentas con catálogo
-- payment_types propio, sin fila "Per Person"), y sin ningún efecto en
-- el cálculo real desde el paso 1. **Producción NO se ha verificado
-- todavía** — el acceso de solo lectura a la base de producción está
-- bloqueado para el agente en esta sesión (requiere aprobación
-- explícita del usuario). No aplicar este fichero contra producción sin
-- antes repetir la misma consulta ahí:
--   select payment_type, count(*) from rates group by payment_type;
--   select payment_type, count(*) from commission_rates group by payment_type;
--
-- **Este fichero NO se ha ejecutado todavía contra ninguna base de datos
-- real** (ni siquiera TEST) — el permiso para correr DDL destructivo
-- (DROP) fue bloqueado en esta sesión, incluso contra TEST. Solo se
-- comprobó, de solo lectura, que no hay duplicados hoy en
-- setup_dataset_rates/setup_dataset_commission_rates por
-- (dataset_id, school, activity) en TEST — la dedup de abajo no tendría
-- ninguna fila que borrar ahí hoy, pero se deja por seguridad ante datos
-- de producción no verificados. Aplicar con
-- `node --env-file=.env.local scripts/apply-migration.mjs scripts/migrations/0027-eliminar-payment-type.sql`
-- contra TEST primero, verificar manualmente que crear una tarifa sigue
-- funcionando, y solo entonces contra producción.

-- ---------- Paso 3a: dedup defensivo antes de estrechar la PK ----------
-- setup_dataset_rates/setup_dataset_commission_rates tenían payment_type
-- en su PK (dataset_id, school, activity, payment_type) — al quitarlo,
-- dos filas que solo difirieran en payment_type colisionarían. No se
-- ha encontrado ningún caso así en TEST, pero esta dedup hace el paso
-- seguro también si production tuviera alguno: se queda con la fila
-- "Per Person" si existe, si no la primera por ctid.
delete from public.setup_dataset_rates
where ctid in (
  select ctid from (
    select ctid, row_number() over (
      partition by dataset_id, school, activity
      order by (payment_type = 'Per Person') desc, ctid
    ) as rn
    from public.setup_dataset_rates
  ) ranked
  where rn > 1
);

delete from public.setup_dataset_commission_rates
where ctid in (
  select ctid from (
    select ctid, row_number() over (
      partition by dataset_id, school, activity
      order by (payment_type = 'Per Person') desc, ctid
    ) as rn
    from public.setup_dataset_commission_rates
  ) ranked
  where rn > 1
);

-- ---------- Paso 3b: redefinir las PK sin payment_type ----------
alter table public.setup_dataset_rates
  drop constraint setup_dataset_rates_pkey,
  add primary key (dataset_id, school, activity);

alter table public.setup_dataset_commission_rates
  drop constraint setup_dataset_commission_rates_pkey,
  add primary key (dataset_id, school, activity);

-- clone_setup_dataset() ya no puede referenciar payment_type — se
-- redefine entera (create or replace, misma firma) sin esa columna.
create or replace function public.clone_setup_dataset(p_dataset_key text, p_target_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_dataset_id uuid;
begin
  select id into v_dataset_id from public.setup_datasets where key = p_dataset_key;
  if v_dataset_id is null then
    raise exception 'unknown setup dataset: %', p_dataset_key;
  end if;

  insert into public.schools (name, color, is_default, user_id)
  select name, color, is_default, p_target_user_id
  from public.setup_dataset_schools
  where dataset_id = v_dataset_id;

  insert into public.activities (name, color, is_default, user_id)
  select name, color, is_default, p_target_user_id
  from public.setup_dataset_activities
  where dataset_id = v_dataset_id;

  insert into public.rates (school, activity, rate, currency, user_id)
  select school, activity, rate, currency, p_target_user_id
  from public.setup_dataset_rates
  where dataset_id = v_dataset_id;

  insert into public.commission_rates (school, activity, rate, currency, user_id)
  select school, activity, rate, currency, p_target_user_id
  from public.setup_dataset_commission_rates
  where dataset_id = v_dataset_id;
end;
$$;

-- ---------- Paso 5: destructiva — DROP de columnas y tabla ----------
alter table public.rates drop column payment_type;
alter table public.commission_rates drop column payment_type;
alter table public.setup_dataset_rates drop column payment_type;
alter table public.setup_dataset_commission_rates drop column payment_type;

drop table public.payment_types;
