-- Release V1 — pedido explícito del usuario 2026-09-03: "Datos
-- personales" gana un campo "Profesional" (Divemaster/Instructor),
-- reflejado también en el carnet de instructor de Mi perfil (antes el
-- carnet mostraba siempre el mismo texto fijo "Instructor SSI",
-- independientemente de cuál fuera el nivel real del usuario).
--
-- Se guarda un código corto, no la etiqueta que ve el usuario (mismo
-- criterio que profiles.language: 'es'/'en', no "Español"/"English") —
-- la etiqueta se resuelve en el frontend. check en vez de una tabla de
-- catálogo aparte: es una taxonomía fija del sector (como los tipos de
-- movimiento Curso/Comisión/Ajuste), no configuración de negocio propia
-- de cada instructor — no aplica la convención de "nada hardcodeado que
-- sea configuración del negocio" de CLAUDE.md, que es para cosas como
-- escuelas/cursos que sí varían por cuenta.
--
-- Aditiva, nullable, sin default: una cuenta existente no tiene por qué
-- rellenarlo, y el carnet ya sabe mostrar un genérico si no hay ninguno.
alter table public.profiles
  add column if not exists professional_level text
  check (professional_level in ('divemaster', 'instructor'));

comment on column public.profiles.professional_level is 'Nivel profesional de buceo (divemaster/instructor) — se muestra en "Datos personales" y en el carnet de instructor de Mi perfil.';

-- Rollback (documentado antes de ejecutar, ver docs/RELEASE-V1-PROGRESS.md):
-- alter table public.profiles drop column if exists professional_level;
