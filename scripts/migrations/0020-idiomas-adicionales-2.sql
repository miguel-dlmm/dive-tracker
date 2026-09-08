-- Añade neerlandés, tailandés, indonesio, vietnamita, birmano, malayo,
-- ruso y portugués (Brasil) a los idiomas soportados por profiles.language
-- — mismo patrón que 0018-idiomas-adicionales.sql (que amplió el check
-- original de 0007-idioma-perfil.sql, limitado a es/en, con fr/it/de/ca/eu).
-- Aditiva y no destructiva: solo amplía la lista de valores permitidos,
-- ninguna fila existente cambia. Sin esto, i18next acepta el idioma nuevo
-- en cliente pero Supabase rechaza el UPDATE con el check antiguo — mismo
-- bloqueador real que ya encontró la migración 0018 al añadir sus 5 idiomas.
-- Rollback documentado antes de aplicar:
--   alter table public.profiles drop constraint if exists profiles_language_check;
--   alter table public.profiles add constraint profiles_language_check
--     check (language in ('es', 'en', 'fr', 'it', 'de', 'ca', 'eu'));
--   -- (solo válido si ninguna fila quedó con uno de los 8 idiomas nuevos)
alter table public.profiles
  drop constraint if exists profiles_language_check;

alter table public.profiles
  add constraint profiles_language_check
  check (language in ('es', 'en', 'fr', 'it', 'de', 'ca', 'eu', 'nl', 'th', 'id', 'vi', 'my', 'ms', 'ru', 'pt'));

comment on column public.profiles.language is 'Idioma preferido de la interfaz (es/en/fr/it/de/ca/eu/nl/th/id/vi/my/ms/ru/pt) — Release V1 Fase 2 + idiomas adicionales.';
