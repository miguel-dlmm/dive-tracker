-- Migración 0014 — cierra un hueco real encontrado al verificar el
-- despliegue de v1.0.0 en producción (2026-09-04): "registro externo de
-- usuarios" (ADR-0023) es una feature de un ciclo de release anterior a la
-- serie de migraciones numeradas (0001+, ver ADR-0020) — se aplicó a mano
-- en TEST en su momento, pero nunca llegó a producción. schema.sql (líneas
-- ~268-292 y ~455-467) ya documentaba el DDL exacto como "ejecutar a mano
-- en el SQL editor de Supabase si hace falta", pero al no tener un fichero
-- de migración numerado propio, quedó fuera de la aplicación sistemática
-- de esta noche (0001-0013) y solo se detectó al ver un error real de
-- consola en producción tras el despliegue (PGRST202, función no
-- encontrada). Mismo DDL que ya vive en schema.sql, ahora también aquí
-- para que quede aplicado de forma trazable y no vuelva a faltar en un
-- futuro entorno nuevo. Idempotente.

alter table public.app_config
  add column if not exists allow_external_registration boolean not null default false;

create or replace function public.external_registration_enabled()
returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce((select allow_external_registration from public.app_config where id), false);
$$;

grant execute on function public.external_registration_enabled() to anon, authenticated;
