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

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_default boolean not null default false,
  color text not null default '#0F766E'
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  color text not null default '#0E7C7B',
  is_default boolean not null default false
);

create table if not exists payment_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_default boolean not null default false
);

create table if not exists payment_statuses (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_default boolean not null default false,
  color text not null default '#64748B'
);

create table if not exists currencies (
  code text primary key,
  name text not null,
  symbol text not null,
  is_default boolean not null default false
);

-- Color de cada área de la app (Home, Registro, Comisiones, Compañeros,
-- Pagos, Tarifas, Configuración) — usado en nav inferior y botones FAB.
create table if not exists nav_sections (
  key text primary key,
  label text not null,
  color text not null default '#0F766E'
);

-- Fila única de ajustes globales (hoy: icono del loading).
create table if not exists app_settings (
  id boolean primary key default true,
  logo_icon text not null default 'Waves',
  constraint app_settings_single_row check (id)
);

-- ---------- Tarifas ----------

-- Lo que cobras por impartir tú la actividad.
create table if not exists rates (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  activity text not null,
  payment_type text not null,
  rate numeric not null,
  currency text not null default 'EUR'
);

-- Lo que cobras por traer un cliente que hace la actividad con otra persona.
create table if not exists commission_rates (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  activity text not null,
  payment_type text not null,
  rate numeric not null,
  currency text not null default 'EUR'
);

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
  currency text not null default 'EUR' -- legado; el importe real usa la moneda de `rates`, no esta columna
);

-- Comisiones: clientes que refieres a la escuela (no los impartes tú).
create table if not exists comisiones (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  school text not null,
  activity text not null,
  people int not null default 0,
  currency text not null default 'EUR', -- legado; ver nota en worklog.currency
  notes text default '',
  status text not null default 'Pending'
);

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
  currency text not null default 'EUR'
);

-- ---------- Auth (Supabase Auth) y perfiles ----------

-- Identidad real vía Supabase Auth (tabla auth.users, gestionada por
-- Supabase — no se toca directamente, contraseñas ya con hash). public.
-- profiles guarda los campos propios de la app que auth.users no tiene,
-- 1:1 con auth.users.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
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

-- profiles no tiene RLS todavía (igual que el resto de tablas de este
-- fichero, ver nota de RLS justo debajo) — se activa en el paso de la
-- migración que sustituya "allow all" por políticas reales en toda la BD.

-- ---------- RLS ----------
-- Todas las tablas: RLS activado con política "allow all" (sin auth
-- todavía, single-user). Patrón repetido por tabla:
--
-- alter table <tabla> enable row level security;
-- drop policy if exists "allow all" on <tabla>;
-- create policy "allow all" on <tabla> for all using (true) with check (true);
--
-- Cuando se añada autenticación, esto es lo primero que cambia: añadir
-- user_id a cada tabla y sustituir "allow all" por políticas reales.

-- ---------- Notas de diseño del esquema ----------
-- - No existe tabla "activity_types" (Instructor/Comisión) — se eliminó al
--   separar Work Log y Comisiones en flujos independientes.
-- - worklog.currency / comisiones.currency quedan como columnas legado por
--   compatibilidad, pero el código YA NO las usa para calcular el importe
--   mostrado — deriva la moneda de la tarifa (`rates.currency` /
--   `commission_rates.currency`) en tiempo real. Podrían eliminarse en una
--   migración futura si se confirma que no se necesitan para nada histórico.
