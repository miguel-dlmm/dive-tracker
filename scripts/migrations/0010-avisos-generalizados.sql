-- Release V1, Fase 6 — generaliza deployment_notices para admitir dos
-- audiencias sobre el mismo mecanismo de "visto una vez"
-- (deployment_notice_views): 'superadmin' (comportamiento actual, sin
-- cambios) y 'all' (cualquier usuario autenticado). Diseño ya cerrado con
-- el usuario antes del lote nocturno — ver docs/RELEASE-V1-PROGRESS.md,
-- Fase 6.
--
-- Nombrada 0010, no 0009: la migración 0009 de este lote
-- (0009-invitation-links.sql) se aplicó antes, sobre Release-V1; 0008
-- vive en feature/training-records, todavía sin fusionar.
--
-- Rollback documentado ANTES de ejecutar esta migración:
--
--   drop policy if exists "insert own view" on public.deployment_notice_views;
--   create policy "superadmin insert own view" on public.deployment_notice_views
--     for insert with check (public.is_superadmin(auth.uid()) and user_id = auth.uid());
--   drop policy if exists "read own views" on public.deployment_notice_views;
--   create policy "superadmin read views" on public.deployment_notice_views
--     for select using (public.is_superadmin(auth.uid()));
--   drop policy if exists "read own audience" on public.deployment_notices;
--   create policy "superadmin read" on public.deployment_notices
--     for select using (public.is_superadmin(auth.uid()));
--   alter table public.deployment_notices drop column if exists audience;

alter table public.deployment_notices
  add column if not exists audience text not null default 'superadmin' check (audience in ('all', 'superadmin'));
comment on column public.deployment_notices.audience is 'A quién va dirigido este aviso — release V1 Fase 6. ''all'' = cualquier usuario autenticado, ''superadmin'' = solo superadmin (comportamiento original).';

drop policy if exists "superadmin read" on public.deployment_notices;
drop policy if exists "read own audience" on public.deployment_notices;
create policy "read own audience" on public.deployment_notices
  for select using (
    (audience = 'superadmin' and public.is_superadmin(auth.uid()))
    or (audience = 'all' and auth.uid() is not null)
  );
-- La policy de escritura no cambia: sigue restringida a superadmin (ver
-- "superadmin write" ya existente en schema.sql).

-- deployment_notice_views tenía las MISMAS dos policies restringidas a
-- superadmin — sin generalizarlas también, un usuario normal con un aviso
-- audience='all' no podría ni leer qué ha visto ya ni marcar uno como
-- visto (RLS le devolvería 0 filas / rechazaría el insert), aunque la
-- policy de deployment_notices de arriba ya le dejara leer el aviso en
-- sí. Encontrado revisando el propio diseño antes de escribir el cliente,
-- no en producción.
drop policy if exists "superadmin read views" on public.deployment_notice_views;
create policy "read own views" on public.deployment_notice_views
  for select using (auth.uid() is not null and user_id = auth.uid());
drop policy if exists "superadmin insert own view" on public.deployment_notice_views;
create policy "insert own view" on public.deployment_notice_views
  for insert with check (auth.uid() is not null and user_id = auth.uid());
