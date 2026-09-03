-- Migración 0003 — Editor de datasets (Bloque 4, 2026-09-01). Añade
-- is_active/is_default a setup_datasets y abre RLS de gestión a
-- superadmin, tanto en setup_datasets como en sus 4 tablas hijas (antes
-- cerradas sin ninguna policy — ver schema.sql para el detalle completo
-- de cada una). Idempotente.

alter table public.setup_datasets
  add column if not exists is_active boolean not null default true,
  add column if not exists is_default boolean not null default false;

create unique index if not exists setup_datasets_single_default
  on public.setup_datasets (is_default) where is_default;

-- Si hay datasets pero ninguno marcado is_default todavía (instalación
-- recién migrada), marca el más antiguo — evita que pickDatasetKey()
-- (externalRegister.js) dependa solo de su fallback justo después de
-- aplicar esta migración.
update public.setup_datasets set is_default = true
where id = (select id from public.setup_datasets order by created_at limit 1)
  and not exists (select 1 from public.setup_datasets where is_default);

drop policy if exists "superadmin manages datasets" on public.setup_datasets;
create policy "superadmin manages datasets" on public.setup_datasets
  for insert with check (public.is_superadmin(auth.uid()));
drop policy if exists "superadmin updates datasets" on public.setup_datasets;
create policy "superadmin updates datasets" on public.setup_datasets
  for update using (public.is_superadmin(auth.uid())) with check (public.is_superadmin(auth.uid()));
drop policy if exists "superadmin deletes datasets" on public.setup_datasets;
create policy "superadmin deletes datasets" on public.setup_datasets
  for delete using (public.is_superadmin(auth.uid()));

drop policy if exists "superadmin manages dataset schools" on public.setup_dataset_schools;
create policy "superadmin manages dataset schools" on public.setup_dataset_schools
  for all using (public.is_superadmin(auth.uid())) with check (public.is_superadmin(auth.uid()));
drop policy if exists "superadmin manages dataset activities" on public.setup_dataset_activities;
create policy "superadmin manages dataset activities" on public.setup_dataset_activities
  for all using (public.is_superadmin(auth.uid())) with check (public.is_superadmin(auth.uid()));
drop policy if exists "superadmin manages dataset rates" on public.setup_dataset_rates;
create policy "superadmin manages dataset rates" on public.setup_dataset_rates
  for all using (public.is_superadmin(auth.uid())) with check (public.is_superadmin(auth.uid()));
drop policy if exists "superadmin manages dataset commission rates" on public.setup_dataset_commission_rates;
create policy "superadmin manages dataset commission rates" on public.setup_dataset_commission_rates
  for all using (public.is_superadmin(auth.uid())) with check (public.is_superadmin(auth.uid()));
