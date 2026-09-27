#!/usr/bin/env node
// Sube las páginas ya rasterizadas de la Guía de Buceo (Koh Tao) al bucket
// público de Supabase Storage "dive-guide". Crea el bucket si no existe.
//
// Uso:
//   node --env-file=.env.local scripts/upload-dive-guide-assets.mjs --dir=/ruta/a/las/imagenes
//
// Sube todo lo que encuentre en --dir con el patrón page-NN.webp bajo el
// prefijo koh-tao/ del bucket. WebP en vez de JPEG (2026-09-27, pedido
// explícito: "optimízalo a tope de ligero sin perder calidad") — mismo
// render a 200dpi desde el PDF original, pero WebP calidad 82 pesa ~40%
// menos que el JPEG equivalente a ojo desnudo (~330KB vs ~550KB de media
// por página) sin pérdida perceptible, ni siquiera haciendo zoom a 4x
// sobre mapas con texto pequeño — probado página a página antes de
// regenerar las 55. Pensado para ejecutarse una vez en TEST y, cuando el
// "libro digital" se apruebe para producción, una vez más contra
// PROD_SUPABASE_URL/PROD_SUPABASE_SERVICE_ROLE_KEY.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "./lib/demoEnv.js";

const BUCKET = "dive-guide";
const PREFIX = "koh-tao";

function resolveClient(args) {
  if (args.prod) {
    const url = process.env.PROD_SUPABASE_URL;
    const key = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error("Faltan PROD_SUPABASE_URL / PROD_SUPABASE_SERVICE_ROLE_KEY en .env.local");
      process.exit(1);
    }
    return createClient(url, key);
  }
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }
  return createClient(url, key);
}

async function ensureBucket(client) {
  const { data: buckets, error } = await client.storage.listBuckets();
  if (error) throw error;
  if (buckets.some((b) => b.name === BUCKET)) return;
  const { error: createError } = await client.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
  });
  if (createError) throw createError;
  console.log(`Bucket "${BUCKET}" creado (público).`);
}

async function main() {
  const args = parseArgs();
  if (!args.dir) {
    console.error("Falta --dir=/ruta/a/las/imagenes");
    process.exit(1);
  }
  const client = resolveClient(args);
  await ensureBucket(client);

  const files = readdirSync(args.dir).filter((f) => /^page-\d+\.webp$/.test(f)).sort();
  if (files.length === 0) {
    console.error(`No se encontró ningún page-NN.webp en ${args.dir}`);
    process.exit(1);
  }

  console.log(`Subiendo ${files.length} páginas a ${BUCKET}/${PREFIX}/ ...`);
  let uploaded = 0;
  for (const file of files) {
    const body = readFileSync(join(args.dir, file));
    const { error } = await client.storage.from(BUCKET).upload(`${PREFIX}/${file}`, body, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) {
      console.error(`Error subiendo ${file}:`, error.message);
      process.exit(1);
    }
    uploaded += 1;
    if (uploaded % 10 === 0 || uploaded === files.length) {
      console.log(`  ${uploaded}/${files.length}`);
    }
  }

  const { data: pub } = client.storage.from(BUCKET).getPublicUrl(`${PREFIX}/${files[0]}`);
  console.log("Listo. Ejemplo de URL pública:", pub.publicUrl);

  // Migración JPEG -> WebP (2026-09-27): borra del bucket cualquier
  // page-NN.jpg que quedara de la subida anterior, para no dejar bytes
  // muertos pagando almacenamiento sin que nada los referencie ya.
  const { data: existing, error: listError } = await client.storage.from(BUCKET).list(PREFIX, { limit: 200 });
  if (listError) throw listError;
  const staleJpgs = existing.filter((f) => f.name.endsWith(".jpg")).map((f) => `${PREFIX}/${f.name}`);
  if (staleJpgs.length > 0) {
    console.log(`Borrando ${staleJpgs.length} .jpg antiguos...`);
    const { error: removeError } = await client.storage.from(BUCKET).remove(staleJpgs);
    if (removeError) throw removeError;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
