-- Bienvenida real para cuentas nuevas (2026-09-27, pedido explícito del
-- usuario): un tour de 6 diapositivas que debe verse una sola vez en la
-- vida de la cuenta, sea cual sea el dispositivo por el que entre después
-- — a diferencia de "Qué hay de nuevo" (localStorage, vale porque es "por
-- versión, por dispositivo"), esto necesita vivir en la propia cuenta.
-- Nulo en cuentas nuevas (dispara el tour una vez, ver AppShell en
-- App.jsx); el update siguiente marca como "ya visto" a toda cuenta
-- existente hoy, para que nadie actual lo vea retroactivamente.
alter table public.profiles
  add column if not exists onboarding_tour_seen_at timestamptz;

update public.profiles
  set onboarding_tour_seen_at = now()
  where onboarding_tour_seen_at is null;
