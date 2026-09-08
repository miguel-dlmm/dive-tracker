-- Fecha de nacimiento + país de residencia en el perfil (Fase 9,
-- 2026-09-07, pedido explícito del usuario) — ver docs/REDISENO-V2-PROGRESS.md,
-- "Plan de migración #3". Confirmado con el usuario: son datos solo para
-- mostrar en el perfil (Mi perfil → Datos personales), ambos opcionales,
-- sin validación ni uso en ningún otro flujo por ahora.
alter table public.profiles
  add column if not exists birth_date date,
  -- ISO 3166-1 alpha-2 ('ES', 'MX'...) — mismo criterio que `language`:
  -- taxonomía universal fija, no configuración de negocio propia de la
  -- cuenta, así que no hace falta una tabla catálogo aparte.
  add column if not exists country_of_residence text;
