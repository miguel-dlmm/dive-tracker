import { readFileSync } from "node:fs";
import pg from "pg";

// Ejecuta un fichero .sql contra Supabase PRODUCCIÓN mediante una conexión
// Postgres directa. Deliberadamente un script SEPARADO de
// scripts/apply-migration.mjs (TEST) en vez de generalizar aquel para
// aceptar un segundo entorno — apply-migration.mjs guarda hoy su garantía
// estructural en el hecho de que SOLO lee SUPABASE_TEST_DB_URL; tocarlo
// para aceptar producción debilitaría exactamente el candado que hoy
// impide ejecutarlo contra producción por accidente (ver CLAUDE.md,
// "Ramas y entornos"). Este script es ese candado explícito: dos guardas
// independientes, no una — la variable de entorno (SUPABASE_DB_URL,
// misma que ya usa scripts/backup-db.mjs — reutilizada a propósito para
// no mantener dos cadenas de conexión a la misma base) y el flag
// --confirm-production, que hay que pasar aparte incluso teniendo la
// variable ya puesta en el entorno.
//
// Uso:
//   SUPABASE_DB_URL="postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres" \
//     node scripts/apply-migration-prod.mjs scripts/migrations/0001-....sql --confirm-production
//
// Envuelve la migración en una transacción (BEGIN/COMMIT, ROLLBACK si
// falla) — a diferencia de apply-migration.mjs (TEST), donde un fallo a
// medias es barato de limpiar a mano. Contra producción, un DDL parcial
// aplicado es justo el tipo de estado a medias que este script debe
// evitar por diseño, no solo detectar después.

const file = process.argv[2];
const confirmed = process.argv.includes("--confirm-production");

if (!file) {
  console.error("Uso: node scripts/apply-migration-prod.mjs <ruta-al-.sql> --confirm-production");
  process.exit(1);
}

if (!confirmed) {
  console.error(
    "Falta --confirm-production. Este script escribe contra la base de datos\n" +
    "de PRODUCCIÓN — el flag es la confirmación explícita de que es eso lo que\n" +
    "quieres, no un error de haber copiado el comando de TEST. Vuelve a\n" +
    "ejecutar con --confirm-production si es intencional."
  );
  process.exit(1);
}

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error(
    "Falta SUPABASE_DB_URL en el entorno — cadena de conexión directa a\n" +
    "Postgres de PRODUCCIÓN (Supabase Dashboard → Project Settings →\n" +
    "Database → Connection string → \"URI\"), la misma variable que ya usa\n" +
    "scripts/backup-db.mjs. Nunca se comitea, nunca se imprime por consola."
  );
  process.exit(1);
}

let host = "(no se pudo determinar el host de la cadena de conexión)";
try {
  host = new URL(connectionString).host;
} catch {
  // Cadena de conexión no parseable como URL — se deja el mensaje por
  // defecto, no bloquea la ejecución (pg la valida al conectar).
}

console.log(`Aplicando ${file} contra PRODUCCIÓN (${host}) — confirmado con --confirm-production.`);

const sql = readFileSync(file, "utf8");
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log(`Migración aplicada correctamente (transacción confirmada): ${file}`);
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error(`Migración revertida por error, nada quedó aplicado a medias: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
