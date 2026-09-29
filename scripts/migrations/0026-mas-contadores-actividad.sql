-- Más contadores de actividad en el perfil (pedido explícito 2026-09-29,
-- docs/BACKLOG.md): aperturas de la Guía de Buceo de Koh Tao y PDFs de
-- resumen exportados, para verlos desde la ficha de admin de Config →
-- Usuarios — mismo patrón ya aprobado para
-- training_records_generated_count (0021-training-records-count.sql):
-- solo un entero y una fecha por contador, nunca contenido real (ni
-- páginas leídas de la Guía ni datos del informe exportado).
alter table public.profiles
  add column if not exists dive_guide_opened_count integer not null default 0,
  add column if not exists dive_guide_last_opened_at timestamptz,
  add column if not exists summary_pdf_exported_count integer not null default 0,
  add column if not exists summary_pdf_last_exported_at timestamptz;

-- Incrementan el contador de QUIEN LLAMA, de forma atómica — mismo
-- criterio que increment_training_records_count: auth.uid() decide sobre
-- qué fila escribe, nunca un parámetro user_id, así que nadie puede
-- incrementar el contador de otra cuenta, ni siquiera un admin.
create or replace function public.increment_dive_guide_opened_count()
returns void language sql security definer set search_path = public as $$
  update public.profiles
  set dive_guide_opened_count = dive_guide_opened_count + 1,
      dive_guide_last_opened_at = now()
  where user_id = auth.uid();
$$;

create or replace function public.increment_summary_pdf_exported_count()
returns void language sql security definer set search_path = public as $$
  update public.profiles
  set summary_pdf_exported_count = summary_pdf_exported_count + 1,
      summary_pdf_last_exported_at = now()
  where user_id = auth.uid();
$$;
