#!/usr/bin/env node
// Copia de seguridad manual de la base de datos — política MVP para el
// plan Free de Supabase, que no incluye NINGUNA copia automática (a
// diferencia de Pro, que sí trae backups diarios). Ver
// docs/ADR/0017-politica-de-backups-mvp.md para el análisis completo y las
// condiciones que justificarían pasar a Pro en vez de mantener esto.
//
// Usa `pg_dump` directamente (herramienta estándar de PostgreSQL, no algo
// propio de Supabase) en formato "custom" (-F c): comprimido y restaurable
// selectivamente con `pg_restore`, a diferencia de un volcado SQL plano.
//
// Requiere SUPABASE_DB_URL en el entorno — la cadena de conexión directa a
// Postgres (Supabase Dashboard → Project Settings → Database → Connection
// string → "URI", con la contraseña de la base de datos, NO las claves
// anon/service_role de la app). Nunca se comitea, nunca se imprime por
// consola aquí ni se registra en ningún log.
//
// Uso:
//   SUPABASE_DB_URL="postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres" \
//     node scripts/backup-db.mjs
//
// El fichero resultante cae en backups/ (gitignored — nunca al repo, son
// datos financieros reales) con fecha en el nombre. Instrucciones de
// restauración y de verificación (simulacro de restore) en el ADR.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error(
    "Falta SUPABASE_DB_URL. Cadena de conexión directa a Postgres (no las\n" +
    "claves anon/service_role) — Supabase Dashboard → Project Settings →\n" +
    "Database → Connection string → \"URI\". Ver docs/ADR/0017-politica-de-backups-mvp.md."
  );
  process.exit(1);
}

const pgDumpCheck = spawnSync("pg_dump", ["--version"]);
if (pgDumpCheck.error || pgDumpCheck.status !== 0) {
  console.error(
    "pg_dump no está disponible en este sistema. Instálalo (viene con\n" +
    "PostgreSQL, p. ej. `brew install postgresql@16` en macOS) o usa\n" +
    "`supabase db dump` (Supabase CLI) como alternativa equivalente."
  );
  process.exit(1);
}

const backupsDir = join(process.cwd(), "backups");
if (!existsSync(backupsDir)) mkdirSync(backupsDir);

const stamp = new Date().toISOString().slice(0, 10);
const outFile = join(backupsDir, `ocean-flow-${stamp}.dump`);

console.log(`Generando copia de seguridad -> ${outFile}`);
const result = spawnSync(
  "pg_dump",
  [dbUrl, "--no-owner", "--no-privileges", "-F", "c", "-f", outFile],
  { stdio: ["ignore", "inherit", "inherit"] }
);

if (result.status !== 0) {
  console.error("pg_dump terminó con error — revisa el mensaje anterior.");
  process.exit(result.status || 1);
}

console.log("Copia de seguridad completada.");
console.log(`Restaurar en un proyecto/base vacíos con:\n  pg_restore --no-owner --no-privileges -d <cadena-de-conexion-destino> ${outFile}`);
