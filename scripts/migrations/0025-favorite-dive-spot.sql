-- Sitio de buceo favorito para el widget de condiciones en Home
-- (viento/oleaje/temperatura + previsión por horas). Vive en profiles, no
-- en localStorage: decisión explícita del usuario (2026-09-29) de que sea
-- una preferencia sincronizada entre dispositivos desde el primer día, no
-- el punto de partida por defecto de ADR-0007 (localStorage salvo
-- necesidad real de sincronizar) — aquí la necesidad ya está confirmada,
-- no es preventiva.
--
-- Todo nullable: null = sin favorito todavía, el widget muestra su
-- placeholder (geolocalización del dispositivo o búsqueda manual). Las
-- búsquedas sueltas del propio widget NO se guardan aquí — solo cuando el
-- usuario elige explícitamente "usar como favorito" (mismo patrón que
-- moneda favorita, ADR-0007).
alter table public.profiles
  add column if not exists favorite_dive_spot_name text,
  add column if not exists favorite_dive_spot_country text,
  add column if not exists favorite_dive_spot_lat double precision,
  add column if not exists favorite_dive_spot_lng double precision,
  add column if not exists favorite_tide_station_id text,
  add column if not exists favorite_tide_station_name text,
  add column if not exists favorite_tide_station_distance_km double precision,
  add column if not exists favorite_tide_harmonic_constituents jsonb,
  add column if not exists favorite_tide_station_attribution text;
