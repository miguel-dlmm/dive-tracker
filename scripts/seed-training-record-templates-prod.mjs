// Siembra en PRODUCCIÓN las plantillas de Training Records que hoy solo
// existen en TEST (tabla + bucket de Storage) — la migración 0008 creó el
// esquema en ambos entornos, pero las 10 filas + los PDF reales se
// sembraron a mano solo contra TEST durante el desarrollo de la Fase 5
// (2026-09-01/02), sin ningún script reutilizable ni migración que lo
// replicara contra producción. Bug real reportado 2026-09-08: con el
// registro externo ya habilitado en producción, la sección Training
// Records no ofrecía ninguna plantilla, sin ningún aviso.
//
// Siembra las 10 plantillas con el mismo `status` que ya tienen en TEST
// (todas `active`) — confirmado por el usuario 2026-09-08: las 10 están
// completas y validadas de verdad (cierre real de Fase 5, 2026-09-05,
// `docs/RELEASE-V1-PROGRESS.md`); una duda inicial sobre si las 6 sin
// campos de formulario debían quedar en `pending_validation` (una
// limitación documentada, pero ya de una fecha anterior, 2026-09-02) se
// resolvió confirmando que ya no aplica.
//
// Idempotente: upsert por `code` (no por id) — se puede re-ejecutar sin
// duplicar filas ni volver a subir un fichero ya presente.
//
// Requiere en .env.local: VITE_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
// (origen, TEST) y PROD_SUPABASE_URL/PROD_SUPABASE_SERVICE_ROLE_KEY
// (destino, producción). Uso: node --env-file=.env.local
// scripts/seed-training-record-templates-prod.mjs

import { createClient } from "@supabase/supabase-js";

const BUCKET = "training-record-templates";

const testUrl = process.env.VITE_SUPABASE_URL;
const testKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const prodUrl = process.env.PROD_SUPABASE_URL;
const prodKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;

if (!testUrl || !testKey || !prodUrl || !prodKey) {
  console.error("Faltan variables de entorno (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / PROD_SUPABASE_URL / PROD_SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}

const test = createClient(testUrl, testKey);
const prod = createClient(prodUrl, prodKey);

const { data: templates, error: fetchErr } = await test
  .from("training_record_templates")
  .select("id, name, code, storage_path, optional_dives, missing_fields, status")
  .order("code");
if (fetchErr) { console.error("Error leyendo TEST:", fetchErr); process.exit(1); }

console.log(`${templates.length} plantillas encontradas en TEST. Sembrando en PROD (${prodUrl})...\n`);

for (const tpl of templates) {
  const status = tpl.status;

  const { data: existing } = await prod.from("training_record_templates").select("id").eq("code", tpl.code).maybeSingle();
  if (existing) {
    console.log(`[skip] ${tpl.code} ya existe en PROD (id ${existing.id}) — no se toca ni el fichero ni la fila.`);
    continue;
  }

  const { data: fileBlob, error: downloadErr } = await test.storage.from(BUCKET).download(tpl.storage_path);
  if (downloadErr) { console.error(`[error] ${tpl.code}: no se pudo descargar de TEST (${tpl.storage_path}):`, downloadErr); continue; }
  const bytes = new Uint8Array(await fileBlob.arrayBuffer());

  const { error: uploadErr } = await prod.storage.from(BUCKET).upload(tpl.storage_path, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadErr) { console.error(`[error] ${tpl.code}: no se pudo subir a PROD:`, uploadErr); continue; }

  const { error: insertErr } = await prod.from("training_record_templates").insert({
    id: tpl.id, // mismo id que TEST — sin FK cruzado entre proyectos, solo para que coincidan si algún día hace falta comparar
    name: tpl.name,
    code: tpl.code,
    storage_path: tpl.storage_path,
    optional_dives: tpl.optional_dives,
    missing_fields: tpl.missing_fields,
    status,
    created_by: null, // ningún usuario de TEST existe en auth.users de PROD
  });
  if (insertErr) { console.error(`[error] ${tpl.code}: fichero subido pero falló el insert:`, insertErr); continue; }

  console.log(`[ok] ${tpl.code} (${status}) sembrado en PROD — ${tpl.storage_path}`);
}

console.log("\nHecho. Verificar con la app real (Training Records) antes de dar por cerrado.");
