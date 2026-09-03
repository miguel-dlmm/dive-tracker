-- Release V1, Fase 2 — idioma preferido del perfil (multidioma es/en).
-- Aditiva: nueva columna con default 'es' (regla del documento maestro:
-- español por defecto), check limita a los 2 idiomas soportados hoy.
-- Rollback documentado en docs/RELEASE-V1-PROGRESS.md antes de aplicar:
--   alter table public.profiles drop column if exists language;
alter table public.profiles
  add column if not exists language text not null default 'es'
  check (language in ('es', 'en'));

comment on column public.profiles.language is 'Idioma preferido de la interfaz (es/en) — Release V1 Fase 2.';

-- handle_new_user() copia language de los metadatos del alta (registro
-- externo o admin) igual que ya hace con first_name/last_name/nickname —
-- coalesce a 'es' porque insertar explícitamente NULL desde metadata
-- ausente saltaría el default de la columna (el default de tabla no
-- aplica cuando el INSERT especifica el valor, aunque sea NULL).
-- Rollback: recrear esta función tal como estaba antes (sin la columna
-- language en el insert) — ver schema.sql en git antes de este commit.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, first_name, last_name, nickname, language)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'nickname',
    coalesce(new.raw_user_meta_data->>'language', 'es')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
