-- Release V1, Fase 5 (Training Records) — pedido explícito del usuario
-- 2026-09-02: los datos de instructor (iniciales, número SSI Pro) que el
-- generador necesita en cada registro pasan de vivir en localStorage
-- (TrainingRecordsTab.jsx, por dispositivo) a vivir en el perfil real del
-- usuario — así se rellenan una vez y están disponibles en cualquier
-- dispositivo donde inicie sesión, igual que el resto de "Mi perfil". El
-- nombre impreso del instructor no es una columna nueva: se deriva de
-- profiles.first_name + profiles.last_name, que ya existen — evita
-- duplicar el mismo dato en dos sitios.
--
-- Aditiva, ambas columnas nullable (sin default): un usuario que no genera
-- Training Records nunca las rellena, y el generador ya sabe bloquear la
-- generación con un mensaje claro si faltan (ver TrainingRecordsTab.jsx).
alter table public.profiles
  add column if not exists instructor_initials text,
  add column if not exists ssi_pro_number text;

comment on column public.profiles.instructor_initials is 'Iniciales del instructor para Training Records (Release V1 Fase 5) — se rellenan en Mi perfil, no por dispositivo.';
comment on column public.profiles.ssi_pro_number is 'Número de profesional SSI del instructor, usado al rellenar Training Records (Release V1 Fase 5).';

-- Rollback (documentado antes de ejecutar, ver docs/RELEASE-V1-PROGRESS.md):
-- alter table public.profiles drop column if exists instructor_initials;
-- alter table public.profiles drop column if exists ssi_pro_number;
