-- Migración 0003 — enriquece deployment_notices con el formato de aviso
-- pedido explícitamente por el usuario el 2026-09-01: cambios técnicos y
-- funcionales por separado, confirmación de cambios de UI, pasos a
-- probar/hacer, y preview de la rama suelta vs. preview ya integrada en
-- nightjob-2026.08.31. Idempotente (add column if not exists).

alter table public.deployment_notices
  add column if not exists technical_changes jsonb not null default '[]',
  add column if not exists functional_changes jsonb not null default '[]',
  add column if not exists has_ui_changes boolean not null default false,
  add column if not exists ui_changes_note text,
  add column if not exists steps jsonb not null default '[]',
  add column if not exists integration_preview_url text;
