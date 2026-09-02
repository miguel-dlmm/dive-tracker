import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

// Numera visualmente los recuadros extraídos por _extract-rects.mjs sobre
// el render real de la página, para contrastar cada número contra la
// etiqueta de texto más cercana (mismo criterio que
// render-training-record-debug.mjs usa para campos de AcroForm).
const code = process.argv[2];
const rects = JSON.parse(fs.readFileSync(`training-records-debug/${code}-rects.json`, "utf8")).filter((r) => !(r.width > 500 && r.height > 700));

const client = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: tpl } = await client.from("training_record_templates").select("code, storage_path").eq("code", code).single();
const { data: fileBlob } = await client.storage.from("training-record-templates").download(tpl.storage_path);
const bytes = new Uint8Array(await fileBlob.arrayBuffer());

const SCALE = 2;
const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
const page = await doc.getPage(1);
const viewport = page.getViewport({ scale: SCALE });
const canvas = createCanvas(viewport.width, viewport.height);
const ctx = canvas.getContext("2d");
await page.render({ canvasContext: ctx, viewport }).promise;

const pdfHeight = viewport.height / SCALE;
rects.forEach((r, i) => {
  const cx = r.x * SCALE;
  const cy = (pdfHeight - r.y - r.height) * SCALE;
  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx, cy, r.width * SCALE, r.height * SCALE);
  ctx.fillStyle = "#e11d48";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(`${i}`, cx, Math.max(cy - 2, 10));
});

fs.writeFileSync(`training-records-debug/${code}-rects-overlay.png`, canvas.toBuffer("image/png"));
console.log(`-> training-records-debug/${code}-rects-overlay.png (${rects.length} recuadros)`);
