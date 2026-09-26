-- Contador de Training Records generados + fecha del último, en el
-- perfil (lote 2026-09-17/18, pedido explícito del usuario: verlo desde
-- la ficha de admin de Config → Usuarios, no solo desde el propio
-- dispositivo del instructor). Solo un entero y una fecha — nunca datos
-- de alumnos ni contenido del documento, la garantía de privacidad
-- existente ("nada de lo que rellenes en un Training Record se guarda,
-- solo se descarga", ver src/trainingRecords/generatedCounter.js) no
-- cambia.
alter table public.profiles
  add column if not exists training_records_generated_count integer not null default 0,
  add column if not exists training_records_last_generated_at timestamptz;

-- Incrementa el contador de QUIEN LLAMA, de forma atómica (evita una
-- condición de carrera si se generan varios TR seguidos). auth.uid()
-- decide sobre qué fila escribe, nunca un parámetro user_id — nadie
-- puede incrementar el contador de otra cuenta, ni siquiera un admin.
create or replace function public.increment_training_records_count(by_amount integer)
returns void language sql security definer set search_path = public as $$
  update public.profiles
  set training_records_generated_count = training_records_generated_count + by_amount,
      training_records_last_generated_at = now()
  where user_id = auth.uid();
$$;
