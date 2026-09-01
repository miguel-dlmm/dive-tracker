-- =================================================================
-- Ocean Pulse — esquema consolidado (estado actual)
--
-- Esto es una FOTO de referencia para tener todo el esquema en un
-- solo sitio, no un script para volver a ejecutar contra la BD que
-- ya tienes montada (usa "create table if not exists" por seguridad,
-- pero no lo relances a menos que sea una base de datos nueva).
-- Las ~10 migraciones sueltas del chat ya no hace falta consultarlas.
--
-- 2026-08-30: las 9 tablas de negocio (schools/activities/payment_types/
-- payment_statuses/rates/commission_rates/worklog/comisiones/
-- colleague_payments) llevan "on delete cascade" en su FK a auth.users —
-- antes no lo tenían, y eliminar cualquier usuario con datos reales en
-- alguna de esas tablas fallaba con "Database error deleting user" (el
-- FK sin cascade bloqueaba el borrado de auth.users). Confirmado con
-- datos reales, ver docs/ADR/0018-cascade-borrado-de-usuario.md. "create
-- table if not exists" no aplica esto a tablas que Postgres ya creó —
-- una base de datos existente necesita la migración ALTER TABLE de ese
-- ADR, ejecutada a mano una sola vez.
-- =================================================================

-- ---------- Bootstrap: currencies, profiles, is_admin/is_superadmin ----------
-- Este bloque va antes que cualquier otra cosa por una cadena de
-- dependencias real, no por estilo: la RLS de currencies/nav_sections/
-- app_config necesita is_admin() ya creada; is_admin() hace un `select`
-- contra `profiles`, y Postgres SÍ resuelve esa referencia al crear la
-- función `language sql` (falla con "relation public.profiles does not
-- exist" si no existe todavía — confirmado al crear Supabase TEST); y
-- `profiles.default_currency` referencia `currencies(code)`, así que
-- currencies tiene que existir antes que profiles. Orden obligado:
-- currencies (tabla) -> profiles (tabla) -> is_admin/is_superadmin
-- (funciones). El resto de cada tabla (RLS, triggers, índices que no sean
-- de esta dependencia) se queda en su sección original más abajo, sin
-- moverse — esto es solo lo mínimo que hace falta adelantar.

create table if not exists currencies (
  code text primary key,
  name text not null,
  symbol text not null,
  is_default boolean not null default false
);

-- Regla arquitectónica — se mantiene para todo desarrollo futuro:
-- - auth.users es la ÚNICA fuente de verdad para datos de autenticación
--   (email, password/hash, confirmación, MFA, ciclo de vida de la sesión).
--   Gestionada por Supabase — no se toca directamente. NUNCA se duplica el
--   email (ni ningún otro campo de auth.users) en public.profiles.
-- - public.profiles guarda EXCLUSIVAMENTE datos de perfil de la aplicación
--   que auth.users no tiene: nombre, nickname, preferencias, roles
--   (is_admin/is_superadmin), etc. Es 1:1 con auth.users vía user_id, pero
--   es una tabla separada, no una extensión con columnas de auth mezcladas.
-- - Cuando la app necesita cruzar ambas (p. ej. mostrar el email de otro
--   usuario), se hace vía una función security definer dedicada que decide
--   ella misma quién puede ver qué (ver email_for_nickname y
--   admin_list_profiles más abajo) — nunca dando acceso de cliente directo
--   a auth.users ni copiando su contenido a profiles.
--
-- nickname: identificador público dentro de la app, único (comparación
-- case-insensitive vía el índice de abajo) y alternativa a el email para
-- iniciar sesión (ver email_for_nickname más abajo). No puede contener "@"
-- porque el login decide si lo que se ha escrito es email o nickname
-- comprobando justo eso — si el nickname pudiera llevar "@" el flujo de
-- login sería ambiguo.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  nickname text not null,
  default_currency text references currencies(code), -- preferencia personal; distinto de currencies.is_default (el respaldo global de la app)
  is_admin boolean not null default false,
  is_superadmin boolean not null default false,
  -- true en cuanto el usuario ha fijado su propia contraseña al menos una
  -- vez (via auth.updateUser, tras entrar por el enlace de primer acceso).
  -- Por defecto false para no afectar a cuentas ya existentes ni al
  -- superadmin de arranque; el gate de la app usa este campo para saber si
  -- debe forzar la pantalla de "crear tu contraseña" antes de dejar entrar.
  -- DEPRECATED: sustituido por activated_at (ver justo abajo). Se mantiene
  -- sin tocar durante la migración y se retira en un paso aparte, no en
  -- este mismo cambio — ver la migración aditiva más abajo.
  password_set boolean not null default false,
  -- Momento en que la activación de la cuenta completó la fase de
  -- contraseña (ver activateAccount() en useSession.js) — null mientras
  -- esté pendiente. Sustituye a password_set con la misma semántica de
  -- "puede pasar" pero como instante, no como flag. IMPORTANTE: no
  -- significa que se haya completado TODO el onboarding — un usuario puede
  -- tener activated_at con fecha y aun así tener consentimiento legal
  -- pendiente (ver pendingLegalConsents); son dos puertas independientes
  -- que AuthGate comprueba por separado, nunca una sustituye a la otra.
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint profiles_nickname_no_at check (nickname !~ '@')
);

create unique index if not exists profiles_nickname_lower_key on public.profiles (lower(nickname));

-- Helper para políticas de otras tablas ("¿es admin quien llama?"). security
-- definer para no reevaluar RLS de profiles recursivamente al consultarla.
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin or is_superadmin from public.profiles where user_id = uid), false);
$$;

-- Permiso específico: ¿es esta persona superadmin? Gemela de is_admin(uid),
-- pero sin el "or is_superadmin" — is_admin() sigue devolviendo true para
-- admin O superadmin (se usa donde cualquiera de los dos vale, p. ej.
-- lectura de currencies/nav_sections/app_config); esta función es para los
-- sitios donde hace falta distinguir estrictamente superadmin, como el
-- cambio de is_admin de otra cuenta (ver protect_profile_roles() abajo).
create or replace function public.is_superadmin(uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_superadmin from public.profiles where user_id = uid), false);
$$;

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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  unique (user_id, name)
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#0E7C7B',
  is_default boolean not null default false,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  unique (user_id, name)
);

create table if not exists payment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  unique (user_id, name)
);

create table if not exists payment_statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  color text not null default '#64748B',
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
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

-- currencies ya se creó en el bloque "Bootstrap" del principio del
-- fichero (la necesitaba profiles.default_currency antes de llegar aquí).

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
  -- Si "Regístrate" aparece en el login (ver ADR-0023). Off por defecto:
  -- una instalación nueva nunca expone alta pública sin que un superadmin
  -- lo active a propósito.
  allow_external_registration boolean not null default false,
  constraint app_config_single_row check (id)
);

-- Migración aditiva para instalaciones existentes (TEST/PROD) creadas antes
-- de que app_config tuviera esta columna — ejecutar a mano en el SQL editor
-- de Supabase. Ver ADR-0023. El `create table if not exists` de arriba ya
-- la incluye para instalaciones nuevas desde cero.
--
--   alter table public.app_config
--     add column if not exists allow_external_registration boolean not null default false;

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
  -- Fecha de alta de la tarifa — no editable, no es un campo del
  -- formulario, la fija Postgres sola al crear la fila. Mostrada en la
  -- interfaz como "Alta: <fecha>" (RatesTab.jsx), mismo criterio que
  -- profiles.created_at en Usuarios. Ver docs/ADR/0019.
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid()
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
  created_at timestamptz not null default now(), -- ver nota en rates.created_at
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid()
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid()
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid()
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid()
);

alter table colleague_payments enable row level security;
drop policy if exists "allow all" on colleague_payments;
create policy "own rows" on colleague_payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Auth (Supabase Auth) y perfiles ----------

-- public.profiles ya se creó en el bloque "Bootstrap" del principio del
-- fichero (is_admin() la necesitaba antes de llegar aquí) — ver ahí mismo
-- la regla arquitectónica de auth.users vs. profiles y el criterio de
-- nickname. El resto de este bloque (migración aditiva, trigger de alta,
-- RPCs, protección de roles, RLS de profiles) sí va aquí, sin mover.

-- Migración aditiva password_set -> activated_at (fase 1 de 2). Ejecutar a
-- mano en el SQL editor de Supabase antes o junto con el despliegue del
-- código que empieza a leer/escribir activated_at — password_set se deja
-- intacto a propósito, así el código que todavía no se ha desplegado sigue
-- funcionando durante la ventana de transición. No requiere cambios de
-- RLS/triggers/RPCs: ninguno de los tres referencia password_set hoy.
-- Fase 2 (retirar password_set) es una migración aparte, deliberadamente
-- no incluida aquí — solo debe ejecutarse una vez el código nuevo lleve un
-- tiempo estable en producción. Confirmado 2026-08-31 (limpieza técnica,
-- ver ADR-0021): ningún archivo de src/ ni server/ lee ni escribe
-- password_set ya — activated_at lo sustituyó por completo desde
-- ADR-0015 (2026-08-29). Lista para ejecutar en cuanto se apruebe, TEST
-- primero:
--
--   alter table public.profiles drop column if exists password_set;
--
--   alter table public.profiles
--     add column if not exists activated_at timestamptz;
--
--   update public.profiles
--     set activated_at = now()
--     where password_set = true
--       and activated_at is null;

-- Crea automáticamente la fila de profiles al darse de alta un auth.users
-- nuevo (hoy: solo el alta manual del admin vía la función de creación de
-- usuarios; mañana: también altas por signup público, sin cambios en este
-- trigger). Lee first_name/last_name/nickname de los metadatos del usuario
-- (raw_user_meta_data) pasados al crear la cuenta.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, first_name, last_name, nickname)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'nickname'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- is_admin()/is_superadmin() ya están definidas al principio del fichero
-- (antes de "Catálogos de configuración") — sus políticas RLS las
-- necesitan disponibles antes de que exista `profiles`.

-- RPC estrecha para el login por nickname: recibe un nickname y devuelve
-- solo el email asociado (o null), nada más de la fila de profiles.
-- security definer para saltar la RLS privada de profiles — pero como solo
-- expone el email, no hay fuga de datos. Debe ser invocable por "anon"
-- porque se llama ANTES de autenticar, desde la pantalla de login.
create or replace function public.email_for_nickname(p_nickname text)
returns text
language sql security definer set search_path = public stable as $$
  select au.email
  from public.profiles p
  join auth.users au on au.id = p.user_id
  where lower(p.nickname) = lower(p_nickname)
  limit 1;
$$;

grant execute on function public.email_for_nickname(text) to anon, authenticated;

-- RPC estrecha para el login: ¿debe mostrarse "Regístrate"? (ver ADR-0023).
-- security definer por el mismo motivo que email_for_nickname — expone
-- solo este booleano, invocable por "anon" porque LoginScreen la llama
-- antes de autenticar. app_config no puede leerse directo desde el cliente
-- sin sesión (su policy de SELECT exige auth.uid() is not null), de ahí
-- esta función en vez de relajar esa policy para toda la tabla.
create or replace function public.external_registration_enabled()
returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce((select allow_external_registration from public.app_config where id), false);
$$;

grant execute on function public.external_registration_enabled() to anon, authenticated;

-- RPC admin-only para el directorio de usuarios (Configuración → Usuarios).
-- profiles no tiene columna email a propósito (ver regla arquitectónica de
-- arriba) y RLS no da acceso de cliente a auth.users, así que esta función
-- security definer hace el join y decide ella misma si quien llama puede
-- ver algo: la propia consulta filtra por is_admin(auth.uid()), así que un
-- usuario normal recibe un conjunto vacío, nunca un error que confirme que
-- la función existe con datos de otros. A diferencia de email_for_nickname
-- (pensada para el login, antes de autenticar), esta solo es invocable por
-- "authenticated" — nunca "anon".
create or replace function public.admin_list_profiles()
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  nickname text,
  email text,
  is_admin boolean,
  is_superadmin boolean,
  created_at timestamptz
)
language sql security definer set search_path = public stable as $$
  select p.user_id, p.first_name, p.last_name, p.nickname, au.email, p.is_admin, p.is_superadmin, p.created_at
  from public.profiles p
  join auth.users au on au.id = p.user_id
  where public.is_admin(auth.uid())
  order by p.nickname;
$$;

grant execute on function public.admin_list_profiles() to authenticated;

-- PostgREST (la API que usa supabase-js para .rpc()) cachea qué funciones
-- existen. Tras crear/reemplazar una función nueva, si no se avisa, .rpc()
-- puede devolver temporalmente un error tipo "Could not find the function
-- ... in the schema cache" aunque la función ya exista en la BD. Este NOTIFY
-- fuerza a PostgREST a recargar su caché de esquema inmediatamente.
notify pgrst, 'reload schema';

-- Protección de roles a nivel de base de datos — se aplica pase lo que pase
-- en el frontend, incluso si una policy RLS ya dejó pasar el UPDATE:
-- - is_superadmin NUNCA es modificable desde la app, por nadie. La única
--   forma de crear o quitar un superadmin es una migración directa contra
--   la base de datos (SQL editor / dashboard de Supabase), nunca la UI.
-- - Un admin no puede quitarle is_admin a una cuenta protegida (superadmin).
-- - Solo un SUPERADMIN puede cambiar is_admin en OTRA cuenta (no la propia,
--   y no un admin normal — ver server/users/updateAdminStatus.js).
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
    if auth.uid() is not null and not public.is_superadmin(auth.uid()) then
      raise exception 'only a superadmin can grant or revoke admin privileges';
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
-- volverse admin desde la app. Tras crear la primera cuenta (nickname
-- "admin") vía el dashboard de Supabase, hay que promoverla a mano UNA VEZ
-- (no forma parte de ningún flujo de la app a propósito).
--
-- IMPORTANTE, confirmado al bootstrapear Supabase TEST: protect_profile_
-- roles_trigger (ver arriba) bloquea CUALQUIER cambio a is_superadmin sin
-- excepción — los triggers de Postgres no se saltan por rol, a diferencia
-- de la RLS, así que ni siquiera service_role puede saltárselo. Hace
-- falta desactivar el trigger, hacer el cambio, y reactivarlo — requiere
-- conexión directa a Postgres (psql o SQL Editor de Supabase), la API
-- REST/PostgREST no puede ejecutar `alter table ... disable trigger`:
--
-- alter table public.profiles disable trigger protect_profile_roles_trigger;
-- update public.profiles set is_admin = true, is_superadmin = true where nickname = 'admin';
-- alter table public.profiles enable trigger protect_profile_roles_trigger;

-- ---------- RLS ----------
-- Estado actual — migración de RLS completa en las 12 tablas:
-- - profiles: privado por defecto, admins ven/editan todo (ver arriba).
-- - schools/activities/payment_types/payment_statuses/rates/commission_rates/
--   worklog/comisiones/colleague_payments: auth.uid() = user_id (ver arriba).
-- - currencies/nav_sections/app_config: select abierto a cualquier
--   autenticado, insert/update/delete solo is_admin(auth.uid()) (ver arriba).
-- - El email (auth.users) nunca se expone vía RLS directa — solo a través
--   de las funciones security definer email_for_nickname (login) y
--   admin_list_profiles (directorio de usuarios, solo admins/superadmins).
--
-- Ninguna tabla usa ya el patrón "allow all" (using(true)/with check(true)).

-- ---------- Datasets de configuración inicial (snapshots) ----------

-- Snapshot de una configuración de escuela+actividades+tarifas en un
-- momento dado, para poder clonarla en la cuenta de un usuario nuevo (o,
-- más adelante, importarla a mano desde Configuración). NO es una plantilla
-- viva: una vez creado un dataset, cambios posteriores en schools/
-- activities/rates del admin NUNCA lo modifican, y clone_setup_dataset()
-- (próximo paso) SOLO lee de estas tablas, nunca de las tablas en vivo del
-- admin. El admin es exclusivamente el origen de un volcado puntual y
-- manual (ver el script de generación, ejecutado una vez); a partir de ahí
-- el dataset es la única fuente de verdad para clonar.
create table if not exists public.setup_datasets (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,   -- slug estable, p. ej. 'ihasia' — lo referencian frontend/RPC
  label text not null,        -- p. ej. 'Ihasia' — lo que ve el superadmin en el desplegable
  created_at timestamptz not null default now(),
  constraint setup_datasets_key_lowercase check (key = lower(key))
);

-- school/activity en setup_dataset_rates son texto, igual que en la propia
-- tabla rates — no hace falta remapear ids entre el dataset y las filas
-- nuevas del usuario clonado, el enlace ya es por nombre en todo el esquema.
create table if not exists public.setup_dataset_schools (
  dataset_id uuid not null references public.setup_datasets(id) on delete cascade,
  name text not null,
  color text not null default '#0F766E',
  is_default boolean not null default false,
  primary key (dataset_id, name)
);

create table if not exists public.setup_dataset_activities (
  dataset_id uuid not null references public.setup_datasets(id) on delete cascade,
  name text not null,
  color text not null default '#0E7C7B',
  is_default boolean not null default false,
  primary key (dataset_id, name)
);

create table if not exists public.setup_dataset_rates (
  dataset_id uuid not null references public.setup_datasets(id) on delete cascade,
  school text not null,
  activity text not null,
  payment_type text not null,
  rate numeric not null,
  currency text not null default 'EUR',
  primary key (dataset_id, school, activity, payment_type)
);

-- Igual que setup_dataset_rates pero para comisiones (referir un cliente a
-- la escuela en vez de impartir tú la actividad).
create table if not exists public.setup_dataset_commission_rates (
  dataset_id uuid not null references public.setup_datasets(id) on delete cascade,
  school text not null,
  activity text not null,
  payment_type text not null,
  rate numeric not null,
  currency text not null default 'EUR',
  primary key (dataset_id, school, activity, payment_type)
);

-- payment_statuses/payment_types NO forman parte del dataset a propósito:
-- a diferencia de schools/activities/rates/commission_rates, no dependen
-- del contexto de una escuela — son configuración de la cuenta/aplicación.
-- Hoy siguen siendo tablas por usuario (unique(user_id, name), sin tabla
-- global todavía) y no se siembran en el alta de usuario ni por dataset ni
-- por ningún otro mecanismo — gestión global pendiente de una fase futura.
-- El dataset se mantiene deliberadamente estrecho: solo lo que varía de
-- una escuela/negocio a otra, para no mezclar dos responsabilidades.

-- setup_datasets: solo admin/superadmin necesita verlo (desplegable de
-- "configuración inicial" al crear un usuario, y más adelante la import
-- manual desde Configuración). Sin policy de insert/update/delete: los
-- datasets se crean a mano vía SQL editor, no desde la app.
alter table public.setup_datasets enable row level security;
drop policy if exists "admin reads datasets" on public.setup_datasets;
create policy "admin reads datasets" on public.setup_datasets
  for select using (public.is_admin(auth.uid()));

-- setup_dataset_schools/activities/rates/commission_rates: RLS activada,
-- SIN policies — cerradas por defecto, a propósito. Nada del frontend las
-- lee nunca directamente ni las leerá en el futuro: todo acceso (clonar al
-- crear un usuario, o la futura importación manual desde Configuración)
-- pasa exclusivamente por funciones security definer (clone_setup_dataset(),
-- próximo paso), nunca por un select/insert/update/delete directo del
-- cliente contra estas tablas.
alter table public.setup_dataset_schools enable row level security;
alter table public.setup_dataset_activities enable row level security;
alter table public.setup_dataset_rates enable row level security;
alter table public.setup_dataset_commission_rates enable row level security;

-- Clona un dataset de configuración inicial (setup_dataset_*) en las
-- tablas en vivo de un usuario. Fuente EXCLUSIVA: setup_dataset_schools/
-- activities/rates/commission_rates, filtradas por dataset_id — nunca lee
-- schools/activities/rates/... de ningún otro usuario, ni referencia la
-- cuenta admin en absoluto (esa conexión se cortó en el volcado puntual
-- del paso 2). payment_statuses/payment_types quedan fuera del dataset a
-- propósito (ver comentario más arriba) — esta función nunca las toca.
-- Cada fila insertada obtiene un id nuevo (default gen_random_uuid()) y
-- user_id = p_target_user_id — sin ninguna referencia compartida con las
-- filas del dataset ni con la cuenta origen del volcado.
--
-- Atómico: el cuerpo de una función plpgsql se ejecuta como una única
-- sentencia desde la perspectiva de quien llama — si cualquier insert
-- falla (p. ej. p_target_user_id no existe en auth.users, violando la FK
-- de schools/activities/rates), toda la función se revierte, no quedan
-- filas parciales.
--
-- security definer, concedida SOLO a service_role (nunca a authenticated
-- ni anon): esto es intencional y aplica también a su segundo uso futuro.
-- Tanto el alta de usuario como la futura importación manual desde
-- Configuración deben invocar esta función desde código de servidor
-- (server/, con el cliente de service role) — igual que create-user ya
-- hace hoy — nunca con una llamada RPC directa desde la sesión del
-- cliente. Así se evita depender de auth.uid() dentro de la función (que
-- sería null en el contexto de service_role) para decidir permisos: la
-- autorización ya ocurre antes, en el código de servidor que llama a esta
-- función, igual que el chequeo de superadmin en create-user.
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

  insert into public.rates (school, activity, payment_type, rate, currency, user_id)
  select school, activity, payment_type, rate, currency, p_target_user_id
  from public.setup_dataset_rates
  where dataset_id = v_dataset_id;

  insert into public.commission_rates (school, activity, payment_type, rate, currency, user_id)
  select school, activity, payment_type, rate, currency, p_target_user_id
  from public.setup_dataset_commission_rates
  where dataset_id = v_dataset_id;
end;
$$;

grant execute on function public.clone_setup_dataset(text, uuid) to service_role;

-- ---------- RGPD/LOPD — consentimiento legal ----------

-- Evidencia de aceptación de la Política de Privacidad y los Términos de
-- Uso. El CONTENIDO de cada documento vive versionado en código
-- (src/legal/privacyPolicy.js, src/legal/termsOfUse.js — cada uno exporta
-- su propio DOCUMENT_TYPE/VERSION), no en esta tabla: aquí solo se guarda
-- qué versión aceptó cada usuario y cuándo, lo mínimo necesario para poder
-- demostrar el consentimiento. Publicar una versión nueva de un documento
-- es cambiar la constante VERSION en el código — todavía no hay una tabla
-- legal_documents ni CMS para ello (deliberado, MVP; ver CLAUDE.md).
create table if not exists public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,     -- 'privacy_policy' | 'terms_of_use'
  document_version text not null,  -- p. ej. 'v1'
  accepted_at timestamptz not null default now(),
  unique (user_id, document_type, document_version)
);

-- RLS: registro de auditoría de solo-inserción. Cada usuario inserta y lee
-- únicamente su propio consentimiento; admins pueden leer el de cualquiera
-- (para poder comprobar en el futuro quién falta por aceptar una versión
-- nueva). Sin policy de update/delete a propósito — es un log inmutable.
alter table public.legal_consents enable row level security;
drop policy if exists "insert own consent" on public.legal_consents;
create policy "insert own consent" on public.legal_consents
  for insert with check (auth.uid() = user_id);
drop policy if exists "select own or admin sees all" on public.legal_consents;
create policy "select own or admin sees all" on public.legal_consents
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- ---------- Avisos de despliegue para el superadmin (ADR-0024/0025) ----------

-- Un aviso por commit de trabajo (no por deploy de Vercel en sí — un commit
-- puede no llegar a desplegarse todavía). commit_hash es la clave de
-- idempotencia real: un segundo intento de notificar el mismo commit no
-- crea una fila nueva ni reenvía el email (ver server/notifications/
-- notifyDeployment.js), así que reintentos o llamadas duplicadas desde
-- varias pestañas/procesos nunca duplican el aviso.
create table if not exists public.deployment_notices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  commit_hash text not null unique,
  branch text not null,
  summary text not null,
  changes jsonb not null default '[]',         -- array de strings
  suggested_tests jsonb not null default '[]', -- array de strings
  tests_status text,   -- p.ej. "442 passed (442)"
  build_status text,   -- p.ej. "ok" / "warnings: chunk >500kB"
  preview_url text      -- null si todavía no hay Preview Deployment
);

-- Quién (qué superadmin) ya vio cada aviso en el slide in-app. Tabla puente
-- normal con PK compuesta en vez del jsonb `viewed_by` que proponía el
-- diseño original de ADR-0024 — decisión tomada al implementar: un
-- `insert ... on conflict do nothing` es atómico e idempotente de verdad
-- ante varias pestañas del mismo superadmin marcando "visto" a la vez,
-- mientras que un jsonb array actualizado con lectura-modificación-escritura
-- desde el cliente puede perder una marca si dos pestañas escriben casi a
-- la vez (la escritura que llega después pisa a la anterior). Con una fila
-- por (aviso, usuario) y clave primaria compuesta, la segunda escritura
-- simplemente no hace nada en vez de arriesgarse a perder la primera.
create table if not exists public.deployment_notice_views (
  notice_id uuid not null references public.deployment_notices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);

-- Migración aditiva para instalaciones existentes — ejecutar a mano en el
-- SQL editor de Supabase si las tablas de arriba no existen todavía. Los
-- `create table if not exists` ya las crean solas en una instalación nueva.
--
--   create table if not exists public.deployment_notices (...);
--   create table if not exists public.deployment_notice_views (...);
--   (mismo DDL de arriba — no repetido aquí para no divergir en dos sitios)

-- RLS: exclusivamente superadmin, tanto lectura como escritura — nunca
-- is_admin(), que también es true para un admin normal (ver definición de
-- is_admin(uid) al principio del fichero). El encargo original pedía
-- "solo ADMIN [superadmin] verá"; una policy con is_admin() dejaría a un
-- admin normal leer estos avisos directamente vía el cliente de Supabase
-- aunque la UI nunca se los muestre — el control real tiene que vivir aquí,
-- no solo en que el componente esté gateado por profile.is_superadmin.
alter table public.deployment_notices enable row level security;
drop policy if exists "superadmin read" on public.deployment_notices;
create policy "superadmin read" on public.deployment_notices
  for select using (public.is_superadmin(auth.uid()));
drop policy if exists "superadmin write" on public.deployment_notices;
create policy "superadmin write" on public.deployment_notices
  for all using (public.is_superadmin(auth.uid())) with check (public.is_superadmin(auth.uid()));

alter table public.deployment_notice_views enable row level security;
drop policy if exists "superadmin read views" on public.deployment_notice_views;
create policy "superadmin read views" on public.deployment_notice_views
  for select using (public.is_superadmin(auth.uid()));
-- insert restringido a "marcar mi propio visto" — un superadmin nunca
-- marca un aviso como visto en nombre de otro.
drop policy if exists "superadmin insert own view" on public.deployment_notice_views;
create policy "superadmin insert own view" on public.deployment_notice_views
  for insert with check (public.is_superadmin(auth.uid()) and user_id = auth.uid());

-- ---------- Notas de diseño del esquema ----------
-- - No existe tabla "activity_types" (Instructor/Comisión) — se eliminó al
--   separar Work Log y Comisiones en flujos independientes.
-- - worklog.currency / comisiones.currency quedan como columnas legado por
--   compatibilidad, pero el código YA NO las usa para calcular el importe
--   mostrado — deriva la moneda de la tarifa (`rates.currency` /
--   `commission_rates.currency`) en tiempo real. Podrían eliminarse en una
--   migración futura si se confirma que no se necesitan para nada histórico.
