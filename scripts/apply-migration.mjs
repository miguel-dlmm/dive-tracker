import { readFileSync } from "node:fs";
import pg from "pg";

// Ejecuta un fichero .sql contra Supabase TEST mediante una conexión
// Postgres directa (SUPABASE_TEST_DB_URL en .env.local, nunca comiteada).
// Necesario porque el cliente supabase-js normal (anon/service role) no
// expone ejecución de DDL arbitrario, solo lectura/escritura de filas vía
// PostgREST — ver docs/ADR/0020-migraciones-supabase-y-separacion-test.md
// para el contexto completo (esa ADR sigue "Propuesta", este script es
// deliberadamente más pequeño: solo ejecuta un .sql dado, no adopta la CLI
// de Supabase ni supabase/migrations/).
//
// Uso:
//   node --env-file=.env.local scripts/apply-migration.mjs scripts/migrations/0001-deployment-notices.sql
const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/apply-migration.mjs <ruta-al-.sql>");
  process.exit(1);
}

const connectionString = process.env.SUPABASE_TEST_DB_URL;
if (!connectionString) {
  console.error("Falta SUPABASE_TEST_DB_URL en el entorno (ver .env.local) — nunca se ejecuta contra producción con este script.");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log(`Migración aplicada correctamente: ${file}`);
} finally {
  await client.end();
}
