-- =================================================================
-- Ocean Pulse — esquema consolidado (estado actual)
--
-- Esto es una FOTO de referencia para tener todo el esquema en un
-- solo sitio, no un script para volver a ejecutar contra la BD que
-- ya tienes montada (usa "create table if not exists" por seguridad,
-- pero no lo relances a menos que sea una base de datos nueva).
-- Las ~10 migraciones sueltas del chat ya no hace falta consultarlas.
-- =================================================================

-- ---------- Catálogos de configuración ----------

-- schools/activities/payment_types/payment_statuses: user-owned catálogos.
-- unique(user_id, name) en vez de unique(name) — cada usuario tiene su
-- propio espacio de nombres, dos usuarios pueden tener ambos una escuela
-- "PADI Cozumel" sin chocar entre sí.
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  color text not null default '#0F766E',
  user_id uuid not null references auth.users(id) default auth.uid(),
  unique (user_id, name)
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#0E7C7B',
  is_default boolean not null default false,
  user_id uuid not null references auth.users(id) default auth.uid(),
  unique (user_id, name)
);

create table if not exists payment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  user_id uuid not null references auth.users(id) default auth.uid(),
  unique (user_id, name)
);

create table if not exists payment_statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  color text not null default '#64748B',
  user_id uuid not null references auth.users(id) default auth.uid(),
  unique (user_id, name)
);

-- RLS: aislamiento por usuario en los 4 catálogos de arriba.
alter table schools enable row level security;
drop policy if exists "allow all" on schools;
create policy "own rows" on schools for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table activities enable row level security;
drop policy if exists "allow all" on activities;
create policy "own rows" on activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table payment_types enable row level security;
drop policy if exists "allow all" on payment_types;
create policy "own rows" on payment_types for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table payment_statuses enable row level security;
drop policy if exists "allow all" on payment_statuses;
create policy "own rows" on payment_statuses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists currencies (
  code text primary key,
  name text not null,
  symbol text not null,
  is_default boolean not null default false
);

-- RLS: catálogo global — cualquier autenticado puede leerlo, solo
-- admins/superadmins pueden gestionarlo. is_admin(auth.uid()) ya cubre
-- is_admin OR is_superadmin internamente (ver definición de la función).
alter table currencies enable row level security;
drop policy if exists "allow all" on currencies;
drop policy if exists "select all authenticated" on currencies;
create policy "select all authenticated" on currencies for select using (auth.uid() is not null);
drop policy if exists "admin write" on currencies;
create policy "admin write" on currencies for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Color de cada área de la app (Home, Registro, Comisiones, Compañeros,
-- Pagos, Tarifas, Configuración) — usado en nav inferior y botones FAB.
create table if not exists nav_sections (
  key text primary key,
  label text not null,
  color text not null default '#0F766E'
);

-- RLS: mismo patrón que currencies — lectura abierta, escritura solo admin.
alter table nav_sections enable row level security;
drop policy if exists "allow all" on nav_sections;
drop policy if exists "select all authenticated" on nav_sections;
create policy "select all authenticated" on nav_sections for select using (auth.uid() is not null);
drop policy if exists "admin write" on nav_sections;
create policy "admin write" on nav_sections for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Configuración global de la aplicación (hoy: icono del loading; mañana:
-- nombre de la app, branding, ajustes tipo CMS). Fila única compartida por
-- todos los usuarios — NO es una preferencia de usuario, es la app misma.
-- (Existió brevemente como una fila por usuario; se revirtió porque no
-- representaba el concepto correcto — ver migración de arquitectura.)
create table if not exists app_config (
  id boolean primary key default true,
  logo_icon text not null default 'Waves',
  constraint app_config_single_row check (id)
);

-- RLS: mismo patrón que currencies/nav_sections — lectura abierta, escritura solo admin.
alter table app_config enable row level security;
drop policy if exists "allow all" on app_config;
drop policy if exists "select all authenticated" on app_config;
create policy "select all authenticated" on app_config for select using (auth.uid() is not null);
drop policy if exists "admin write" on app_config;
create policy "admin write" on app_config for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------- Tarifas ----------

-- Lo que cobras por impartir tú la actividad.
create table if not exists rates (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  activity text not null,
  payment_type text not null,
  rate numeric not null,
  currency text not null default 'EUR',
  user_id uuid not null references auth.users(id) default auth.uid()
);

alter table rates enable row level security;
drop policy if exists "allow all" on rates;
create policy "own rows" on rates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lo que cobras por traer un cliente que hace la actividad con otra persona.
create table if not exists commission_rates (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  activity text not null,
  payment_type text not null,
  rate numeric not null,
  currency text not null default 'EUR',
  user_id uuid not null references auth.users(id) default auth.uid()
);

alter table commission_rates enable row level security;
drop policy if exists "allow all" on commission_rates;
create policy "own rows" on commission_rates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Movimientos ----------

-- Work Log: actividades que impartes tú.
create table if not exists worklog (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  school text not null,
  activity text not null,
  people int not null default 0,
  notes text default '',
  status text not null default 'Pending',
  currency text not null default 'EUR', -- legado; el importe real usa la moneda de `rates`, no esta columna
  user_id uuid not null references auth.users(id) default auth.uid()
);

alter table worklog enable row level security;
drop policy if exists "allow all" on worklog;
create policy "own rows" on worklog for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Comisiones: clientes que refieres a la escuela (no los impartes tú).
create table if not exists comisiones (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  school text not null,
  activity text not null,
  people int not null default 0,
  currency text not null default 'EUR', -- legado; ver nota en worklog.currency
  notes text default '',
  status text not null default 'Pending',
  user_id uuid not null references auth.users(id) default auth.uid()
);

alter table comisiones enable row level security;
drop policy if exists "allow all" on comisiones;
create policy "own rows" on comisiones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Pagos entre compañeros (cubrirse turnos, etc.) — independiente de rates.
create table if not exists colleague_payments (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  school text not null,
  activity text not null,
  colleague_name text not null,
  amount numeric not null, -- puede ser negativo
  status text not null default 'Pending',
  notes text default '',
  currency text not null default 'EUR',
  user_id uuid not null references auth.users(id) default auth.uid()
);

alter table colleague_payments enable row level security;
drop policy if exists "allow all" on colleague_payments;
create policy "own rows" on colleague_payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Auth (Supabase Auth) y perfiles ----------

-- Identidad real vía Supabase Auth (tabla auth.users, gestionada por
-- Supabase — no se toca directamente, contraseñas ya con hash). public.
-- profiles guarda los campos propios de la app que auth.users no tiene,
-- 1:1 con auth.users.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  default_currency text references currencies(code), -- preferencia personal; distinto de currencies.is_default (el respaldo global de la app)
  is_admin boolean not null default false,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Crea automáticamente la fila de profiles al darse de alta un auth.users
-- nuevo (hoy: solo el alta manual del admin; mañana: también altas por
-- signup público, sin cambios en este trigger). Lee username/display_name
-- de los metadatos del usuario (raw_user_meta_data) pasados al crear la
-- cuenta; si no hay username en los metadatos, usa la parte local del email.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'display_name'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper para políticas de otras tablas ("¿es admin quien llama?"). security
-- definer para no reevaluar RLS de profiles recursivamente al consultarla.
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin or is_superadmin from public.profiles where user_id = uid), false);
$$;

-- Protección de roles a nivel de base de datos — se aplica pase lo que pase
-- en el frontend, incluso si una policy RLS ya dejó pasar el UPDATE:
-- - is_superadmin NUNCA es modificable desde la app, por nadie. La única
--   forma de crear o quitar un superadmin es una migración directa contra
--   la base de datos (SQL editor / dashboard de Supabase), nunca la UI.
-- - Un admin no puede quitarle is_admin a una cuenta protegida (superadmin).
-- - Solo un admin puede cambiar is_admin en OTRA cuenta (no la propia).
create or replace function public.protect_profile_roles()
returns trigger as $$
begin
  if new.is_superadmin is distinct from old.is_superadmin then
    raise exception 'is_superadmin cannot be changed through the app';
  end if;

  if old.is_superadmin and new.is_admin is distinct from old.is_admin then
    raise exception 'cannot modify admin status of a protected superadmin account';
  end if;

  if new.is_admin is distinct from old.is_admin then
    if not public.is_admin(auth.uid()) then
      raise exception 'only admins can grant or revoke admin privileges';
    end if;
    if auth.uid() = old.user_id then
      raise exception 'cannot change your own admin status';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists protect_profile_roles_trigger on public.profiles;
create trigger protect_profile_roles_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_roles();

-- profiles: privado por defecto. Cada usuario ve/edita su propia fila;
-- admins y superadmins ven y editan cualquier fila (la propia gestión fina
-- de qué columnas puede tocar cada cual la hace el trigger de arriba, no
-- esta policy). Sin policy de insert/delete: las filas solo se crean via
-- el trigger handle_new_user (security definer, no pasa por RLS).
alter table public.profiles enable row level security;

drop policy if exists "select own or admin sees all" on public.profiles;
create policy "select own or admin sees all" on public.profiles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "update own or admin updates any" on public.profiles;
create policy "update own or admin updates any" on public.profiles
  for update using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- ---------- Bootstrap: primer superadmin ----------
-- En una base de datos nueva, handle_new_user() crea cada profiles row con
-- is_admin = false, is_superadmin = false por defecto — no hay forma de
-- volverse admin desde la app. Tras crear la primera cuenta (username
-- "admin") vía el dashboard de Supabase, hay que promoverla a mano UNA VEZ
-- con esta consulta (no forma parte de ningún flujo de la app a propósito,
-- ver protect_profile_roles_trigger más arriba):
--
-- update public.profiles set is_admin = true, is_superadmin = true where username = 'admin';

-- ---------- RLS ----------
-- Estado actual — migración de RLS completa en las 12 tablas:
-- - profiles: privado por defecto, admins ven/editan todo (ver arriba).
-- - schools/activities/payment_types/payment_statuses/rates/commission_rates/
--   worklog/comisiones/colleague_payments: auth.uid() = user_id (ver arriba).
-- - currencies/nav_sections/app_config: select abierto a cualquier
--   autenticado, insert/update/delete solo is_admin(auth.uid()) (ver arriba).
--
-- Ninguna tabla usa ya el patrón "allow all" (using(true)/with check(true)).

-- ---------- Notas de diseño del esquema ----------
-- - No existe tabla "activity_types" (Instructor/Comisión) — se eliminó al
--   separar Work Log y Comisiones en flujos independientes.
-- - worklog.currency / comisiones.currency quedan como columnas legado por
--   compatibilidad, pero el código YA NO las usa para calcular el importe
--   mostrado — deriva la moneda de la tarifa (`rates.currency` /
--   `commission_rates.currency`) en tiempo real. Podrían eliminarse en una
--   migración futura si se confirma que no se necesitan para nada histórico.
