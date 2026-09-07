-- Añade francés, italiano, alemán, catalán y euskera a los idiomas
-- soportados por profiles.language (hasta ahora limitado a es/en por el
-- check de la migración 0007-idioma-perfil.sql). Aditiva y no destructiva:
-- solo amplía la lista de valores permitidos, ninguna fila existente
-- cambia. Encontrado como bloqueador real al probar el selector de
-- idioma en Mi perfil tras añadir las traducciones fr/it/de/ca/eu —
-- i18next las acepta en cliente pero Supabase rechazaba el UPDATE con el
-- check antiguo.
-- Rollback documentado antes de aplicar:
--   alter table public.profiles drop constraint if exists profiles_language_check;
--   alter table public.profiles add constraint profiles_language_check
--     check (language in ('es', 'en'));
--   -- (solo válido si ninguna fila quedó con uno de los 5 idiomas nuevos)
alter table public.profiles
  drop constraint if exists profiles_language_check;

alter table public.profiles
  add constraint profiles_language_check
  check (language in ('es', 'en', 'fr', 'it', 'de', 'ca', 'eu'));

comment on column public.profiles.language is 'Idioma preferido de la interfaz (es/en/fr/it/de/ca/eu) — Release V1 Fase 2 + idiomas adicionales.';
