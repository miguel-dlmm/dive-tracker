// Salvaguarda añadida 2026-09-08 tras un incidente real: la Fase 5
// (Training Records) sembró sus 10 filas + PDFs a mano SOLO contra TEST
// durante el desarrollo, sin ningún script ni migración que lo replicara
// en producción — la tabla/bucket existían (la migración de esquema sí
// se aplicó), pero producción se quedó sin ninguna plantilla real, sin
// que nada lo señalara como pendiente durante el release de v1.1.0.
//
// Este script NO sustituye las migraciones (esquema) ni los checks de
// ADR-0010 (tests/build) — es solo lectura, comprueba que un puñado de
// tablas de configuración que la app necesita para funcionar de verdad
// (no solo para tener el esquema correcto) tienen datos reales en
// producción. Pensado para correr como paso manual de la verificación de
// despliegue (ADR-0010, paso 5) en cualquier release que toque una de
// estas tablas — no es un gate de CI (el proyecto no tiene CI, decisión
// ya tomada en ADR-0010).
//
// Añadir aquí una fila nueva cada vez que una fase futura introduzca otra
// tabla de la que la app dependa para no mostrarse "vacía" en producción
// sin avisar — el propio incidente de Training Records es el motivo de
// que esta lista no sea solo teórica.
//
// Uso: node --env-file=.env.local scripts/verify-production-seed-data.mjs

import { createClient } from "@supabase/supabase-js";

const prodUrl = process.env.PROD_SUPABASE_URL;
const prodKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;
if (!prodUrl || !prodKey) {
  console.error("Faltan PROD_SUPABASE_URL / PROD_SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  process.exit(1);
}
const prod = createClient(prodUrl, prodKey);

// { label, table, filter?: (query) => query, min: número mínimo de filas esperado }
const CHECKS = [
  { label: "Moneda por defecto (currencies.is_default)", table: "currencies", filter: (q) => q.eq("is_default", true), min: 1 },
  { label: "Secciones de navegación (nav_sections)", table: "nav_sections", min: 1 },
  { label: "Plantillas activas de Training Records", table: "training_record_templates", filter: (q) => q.eq("status", "active"), min: 1 },
  { label: "Configuración de la app (app_config)", table: "app_config", min: 1 },
];

let failed = false;
console.log(`Verificando datos de producción (${prodUrl})...\n`);
for (const check of CHECKS) {
  // "*", no "id": currencies (PK "code") y nav_sections (PK "key") no
  // tienen columna "id" — con head:true no se devuelven filas de todos
  // modos, así que "*" no cuesta más y funciona para cualquier tabla.
  let query = prod.from(check.table).select("*", { count: "exact", head: true });
  if (check.filter) query = check.filter(query);
  const { count, error } = await query;
  if (error) {
    failed = true;
    console.error(`[ERROR] ${check.label}: ${error.message}`);
    continue;
  }
  if ((count || 0) < check.min) {
    failed = true;
    console.error(`[FALTA] ${check.label}: ${count || 0} filas (se esperaba al menos ${check.min}).`);
  } else {
    console.log(`[ok] ${check.label}: ${count} fila(s).`);
  }
}

if (failed) {
  console.error("\nVerificación de datos de producción FALLIDA — no dar el release por cerrado hasta resolverlo.");
  process.exit(1);
}
console.log("\nTodo correcto.");
