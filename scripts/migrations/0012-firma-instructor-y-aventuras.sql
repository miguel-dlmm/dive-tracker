-- Release V1, Fase 5 (Training Records) — lote de trabajo 2026-09-02,
-- pedido explícito del usuario:
-- 1. La firma del instructor se guarda en el perfil (una sola vez, editable
--    en cualquier momento) en vez de firmarse documento a documento —
--    aditiva, nullable (nadie tiene firma hasta que la guarda la primera
--    vez), igual criterio que instructor_initials/ssi_pro_number
--    (migración 0009).
-- 2. Catálogo de "aventuras" opcionales para el combo de Advanced Open
--    Water Diver — pedido explícito: "recuerda que no almacenamos valores
--    nunca en código" (convención 1 de CLAUDE.md). Tabla nueva en vez de
--    una columna: son varias filas de un catálogo abierto (editable más
--    adelante desde Configuración si hace falta), no un enum cerrado.
alter table public.profiles
  add column if not exists instructor_signature text;
comment on column public.profiles.instructor_signature is 'Firma del instructor (PNG en base64, capturada con signature_pad) para Training Records — se guarda una vez y se reutiliza en cada generación (Release V1 Fase 5).';

create table if not exists public.training_record_adventures (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.training_record_adventures enable row level security;
create policy "read adventures" on public.training_record_adventures
  for select using (auth.uid() is not null);
create policy "admin write adventures" on public.training_record_adventures
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into public.training_record_adventures (name, sort_order) values
  ('Flotabilidad perfecta', 1),
  ('Buceo nocturno', 2),
  ('Computador de buceo', 3),
  ('Barco hundido', 4),
  ('Identificación de peces', 5),
  ('Corrientes', 6)
on conflict (name) do nothing;

-- Rollback (documentado antes de ejecutar):
-- drop policy if exists "admin write adventures" on public.training_record_adventures;
-- drop policy if exists "read adventures" on public.training_record_adventures;
-- drop table if exists public.training_record_adventures;
-- alter table public.profiles drop column if exists instructor_signature;
