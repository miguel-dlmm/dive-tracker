-- Migración 0005 — Perfil de usuario (Bloque 5). Avatar (icono lucide-react
-- + color de marca, catálogo cerrado) y retirada de profiles.default_currency
-- (columna sin ningún uso real en el código — confirmado por grep en src/ y
-- server/ — sustituida en la práctica por localStorage desde ADR-0007).
-- Idempotente.

alter table public.profiles
  add column if not exists avatar_icon text,
  add column if not exists avatar_color text,
  drop column if exists default_currency;
