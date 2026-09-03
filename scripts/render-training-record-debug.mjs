import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

// Herramienta de verificación visual para el mapeo de campos de
// Training Records (Release V1, Fase 5) — no se usa en runtime de la
// app. Descarga cada plantilla real de Supabase Storage, renderiza cada
// página con pdfjs-dist + @napi-rs/canvas, y dibuja un recuadro numerado
// sobre cada campo de formulario en su posición real — así se puede
// contrastar visualmente cada número contra la etiqueta de texto más
// cercana en la propia imagen antes de escribir/confirmar
// templateFieldMaps.js. Fue así como se verificó el mapeo actual de
// OWD/AOWD/SC-DD/SC-EAN (ver ese archivo) — necesario porque los nombres
// de campo del PDF original son IDs opacos, y adivinar el significado
// por proximidad de coordenadas sin comprobar visualmente no es
// aceptable para un documento de certificación real (ver
// docs/RELEASE-V1-PROGRESS.md, Fase 5).
//
// Uso:
//   node --env-file=.env.local scripts/render-training-record-debug.mjs [CODIGO...]
//   (sin argumentos: todas las plantillas de training_record_templates)
//
// Salida: training-records-debug/<CODIGO>-p<N>.png (imagen con recuadros
// numerados) y <CODIGO>-p<N>-index.txt (nombre de campo real de cada
// número) — carpeta no versionada, solo para revisión humana puntual.

const client = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SCALE = 2;
const OUT_DIR = "training-records-debug";

const requestedCodes = process.argv.slice(2);
let query = client.from("training_record_templates").select("code, storage_path");
if (requestedCodes.length) query = query.in("code", requestedCodes);
const { data: templates, error: listError } = await query;
if (listError) { console.error("No se pudo listar plantillas:", listError); process.exit(1); }
if (!templates?.length) { console.error("Ninguna plantilla encontrada."); process.exit(1); }

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const tpl of templates) {
  const { data: fileBlob, error } = await client.storage.from("training-record-templates").download(tpl.storage_path);
  if (error) { console.error(tpl.code, error); continue; }
  const bytes = new Uint8Array(await fileBlob.arrayBuffer());

  const pdDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const fields = pdDoc.getForm().getFields();

  // Página real de cada widget, por referencia de objeto — pdf-lib no
  // expone directamente "en qué página está este campo".
  const pageForRef = new Map();
  pdDoc.getPages().forEach((p, idx) => {
    for (const annot of p.node.Annots()?.asArray() ?? []) pageForRef.set(annot.toString(), idx + 1);
  });
  const fieldsByPage = new Map();
  for (const field of fields) {
    for (const w of field.acroField.getWidgets()) {
      const ref = pdDoc.context.getObjectRef(w.dict);
      const pageNum = ref ? pageForRef.get(ref.toString()) || 1 : 1;
      if (!fieldsByPage.has(pageNum)) fieldsByPage.set(pageNum, []);
      fieldsByPage.get(pageNum).push({ name: field.getName(), rect: w.getRectangle(), type: field.constructor.name });
    }
  }

  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: SCALE });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;

    const pdfHeight = viewport.height / SCALE;
    const pageFields = fieldsByPage.get(pageNum) || [];
    pageFields.forEach((fld, i) => {
      const idx = i + 1;
      const { x, y, width, height } = fld.rect;
      // PDF: y crece hacia arriba. Canvas: y crece hacia abajo.
      const cx = x * SCALE;
      const cy = (pdfHeight - y - height) * SCALE;
      const color = fld.type === "PDFCheckBox" ? "#e11d48" : "#0f766e";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx, cy, width * SCALE, height * SCALE);
      ctx.fillStyle = color;
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(`${idx}`, cx, Math.max(cy - 2, 10));
    });

    fs.writeFileSync(`${OUT_DIR}/${tpl.code}-p${pageNum}.png`, canvas.toBuffer("image/png"));
    fs.writeFileSync(
      `${OUT_DIR}/${tpl.code}-p${pageNum}-index.txt`,
      pageFields.map((fld, i) => `#${i + 1}  ${fld.type.padEnd(16)} ${fld.name}`).join("\n")
    );
    console.log(`${tpl.code} p${pageNum}: ${pageFields.length} campos -> ${OUT_DIR}/${tpl.code}-p${pageNum}.png`);
  }
}
