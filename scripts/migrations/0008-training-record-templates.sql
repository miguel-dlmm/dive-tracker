-- Release V1, Fase 5 — Sistema de generación de Training Records.
-- Aditiva: tabla nueva + bucket de Storage nuevo, nada existente cambia.
-- Rollback documentado en docs/RELEASE-V1-PROGRESS.md antes de aplicar.
create table if not exists public.training_record_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  storage_path text not null,
  optional_dives jsonb not null default '[]',
  status text not null default 'pending_validation' check (status in ('pending_validation','active','rejected')),
  missing_fields jsonb not null default '[]',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.training_record_templates enable row level security;
create policy "read active templates" on public.training_record_templates
  for select using (status = 'active' or public.is_admin(auth.uid()));
create policy "admin write templates" on public.training_record_templates
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public) values ('training-record-templates', 'training-record-templates', false)
  on conflict (id) do nothing;
create policy "read template files" on storage.objects
  for select using (bucket_id = 'training-record-templates' and auth.uid() is not null);
create policy "admin manage template files" on storage.objects
  for all using (bucket_id = 'training-record-templates' and public.is_admin(auth.uid()))
  with check (bucket_id = 'training-record-templates' and public.is_admin(auth.uid()));
