-- Release V1 — enlaces de invitación de un solo uso (24h), generados por un
-- superadmin desde Configuración → Usuarios, que permiten autoregistrarse
-- aunque app_config.allow_external_registration esté desactivado. Pedido
-- explícito del usuario 2026-09-02.
--
-- Por qué una tabla nueva y no un enlace de Supabase Auth (como el resto de
-- enlaces de activación, ver server/users/activationLink.js): esos siempre
-- necesitan un email de destino ya conocido (auth.admin.generateLink exige
-- un usuario existente o, como mucho, un email concreto al que enviarlo) —
-- una invitación genérica que cualquiera pueda visitar y rellenar con SU
-- PROPIO email no encaja en ese mecanismo. Este token es deliberadamente
-- anónimo hasta que alguien lo canjea.
--
-- Rollback documentado ANTES de ejecutar esta migración (regla del
-- usuario para el trabajo de esta noche — ver docs/RELEASE-V1-PROGRESS.md):
--
--   drop table if exists public.invitation_links;

create table if not exists public.invitation_links (
  token uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
comment on table public.invitation_links is 'Enlaces de invitación de un solo uso (24h) — Release V1. Permiten autoregistrarse aunque app_config.allow_external_registration esté desactivado.';

alter table public.invitation_links enable row level security;
-- Sin ninguna policy, a propósito: todo el acceso real (generar el token,
-- validarlo, marcarlo usado) pasa por endpoints de servidor con la service
-- role, que ignora RLS por diseño de Supabase. Un token es un secreto de un
-- solo uso, no un dato de negocio que deba exponerse vía PostgREST directo
-- a ningún cliente (ni anon ni autenticado) — RLS habilitada sin policies
-- deniega el acceso a ambos por defecto.
