import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";
import { TEMPLATE_FIELD_MAPS } from "../src/trainingRecords/templateFieldMaps.js";

// Comprueba que cada campo referenciado en templateFieldMaps.js existe de
// verdad en el PDF real de Supabase Storage, y que ningún nombre de campo
// se usa dos veces con un significado distinto dentro de la misma
// plantilla. No verifica que el SIGNIFICADO sea correcto (eso ya se hizo
// a mano, ver docs/RELEASE-V1-PROGRESS.md, Fase 5) — solo que el mapeo no
// tenga errores tipográficos ni referencias a campos inexistentes.
//
// Uso: node --env-file=.env.local scripts/verify-training-record-field-maps.mjs

const client = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function collectFieldRefs(map, path = "") {
  const refs = [];
  for (const [key, value] of Object.entries(map)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof value === "string" && value.startsWith("undefined.tr-input-")) {
      refs.push({ path: currentPath, field: value });
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => refs.push(...collectFieldRefs(item, `${currentPath}[${i}]`)));
    } else if (value && typeof value === "object") {
      refs.push(...collectFieldRefs(value, currentPath));
    }
  }
  return refs;
}

let ok = true;
for (const [code, template] of Object.entries(TEMPLATE_FIELD_MAPS)) {
  const { data: rows, error: dbError } = await client
    .from("training_record_templates")
    .select("storage_path")
    .eq("code", code)
    .maybeSingle();
  if (dbError || !rows) {
    console.error(`${code}: no se encontró la plantilla en training_record_templates`, dbError);
    ok = false;
    continue;
  }

  const { data: fileBlob, error: dlError } = await client.storage
    .from("training-record-templates")
    .download(rows.storage_path);
  if (dlError) {
    console.error(`${code}: no se pudo descargar el PDF`, dlError);
    ok = false;
    continue;
  }

  const bytes = new Uint8Array(await fileBlob.arrayBuffer());
  const pdDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const realFieldNames = new Set(pdDoc.getForm().getFields().map((f) => f.getName()));

  const refs = collectFieldRefs(template);
  const seenPaths = new Map(); // field -> [paths] — detecta un mismo campo referenciado dos veces con significados distintos
  let templateOk = true;
  for (const { path, field } of refs) {
    if (!realFieldNames.has(field)) {
      console.error(`${code}: campo inexistente en el PDF real — ${path} -> ${field}`);
      templateOk = false;
    }
    if (!seenPaths.has(field)) seenPaths.set(field, []);
    seenPaths.get(field).push(path);
  }
  for (const [field, paths] of seenPaths) {
    if (paths.length > 1) {
      console.error(`${code}: el campo ${field} está mapeado ${paths.length} veces (${paths.join(", ")}) — probable error`);
      templateOk = false;
    }
  }
  if (realFieldNames.size !== refs.length) {
    console.warn(`${code}: el PDF tiene ${realFieldNames.size} campos reales, el mapeo referencia ${refs.length} — revisar si falta alguno (puede ser intencional, p. ej. página 2 de OWD)`);
  }

  ok = ok && templateOk;
  console.log(`${code}: ${templateOk ? "OK" : "FALLOS"} — ${refs.length}/${realFieldNames.size} campos mapeados`);
}

if (!ok) {
  console.error("\nHay errores en el mapeo — revisar antes de marcar ninguna plantilla como 'active'.");
  process.exit(1);
}
console.log("\nTodos los campos referenciados existen en el PDF real y no hay duplicados.");
