// Comprobación de solo lectura, previa al release v1.7.0: confirma si la
// migración scripts/migrations/0023-whatsnew-seen-version.sql (columna
// profiles.whats_new_seen_version) ya está aplicada en producción, antes
// de fusionar a main el commit que depende de esa columna (refactor:
// migra "Qué hay de nuevo" de localStorage a profiles, ya en develop).
// Mismo patrón que verify-production-seed-data.mjs (solo lectura, cliente
// supabase-js normal, nunca DDL).
import { createClient } from "@supabase/supabase-js";

const url = process.env.PROD_SUPABASE_URL;
const key = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan PROD_SUPABASE_URL / PROD_SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const client = createClient(url, key);

const { error } = await client.from("profiles").select("whats_new_seen_version").limit(1);
if (error) {
  console.log("NO aplicada todavía —", error.message);
} else {
  console.log("Ya aplicada: profiles.whats_new_seen_version existe en producción.");
}
