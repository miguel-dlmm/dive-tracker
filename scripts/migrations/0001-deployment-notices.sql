-- Migración 0001 — Avisos de despliegue para el superadmin (ADR-0024/0025).
-- Idempotente: puede ejecutarse más de una vez sin error (if not exists /
-- drop policy if exists en todo). Mismo DDL que schema.sql — ver ese
-- fichero para los comentarios completos de diseño.

create table if not exists public.deployment_notices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  commit_hash text not null unique,
  branch text not null,
  summary text not null,
  changes jsonb not null default '[]',
  suggested_tests jsonb not null default '[]',
  tests_status text,
  build_status text,
  preview_url text
);

create table if not exists public.deployment_notice_views (
  notice_id uuid not null references public.deployment_notices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);

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
drop policy if exists "superadmin insert own view" on public.deployment_notice_views;
create policy "superadmin insert own view" on public.deployment_notice_views
  for insert with check (public.is_superadmin(auth.uid()) and user_id = auth.uid());
