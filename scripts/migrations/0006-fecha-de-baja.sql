-- Migración 0006 — profiles.deactivated_at (Bloque 11): cuándo se
-- desactivó una cuenta, pedido explícito y ya documentado como pendiente
-- en docs/BACKLOG.md desde 2026-08-29. Idempotente.

alter table public.profiles add column if not exists deactivated_at timestamptz;
