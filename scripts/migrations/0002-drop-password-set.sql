-- Migración 0002 — retira profiles.password_set, sustituida por
-- activated_at desde ADR-0015 (2026-08-29). Confirmado (limpieza técnica
-- 2026-09-01, ADR-0021): ningún archivo de src/ ni server/ la lee ni la
-- escribe. Idempotente (if exists).

alter table public.profiles drop column if exists password_set;
