import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

// Extrae las coordenadas REALES de los recuadros grises (áreas
// rellenables dibujadas como gráficos, no como campos de AcroForm) de una
// plantilla sin formulario interactivo — vía operatorList de pdfjs-dist
// (parseo real del content stream, no medición a ojo sobre la imagen).
// pdfjs-dist ya fusiona "dibujar rectángulo + rellenar" en un único
// constructPath cuyo args es directamente [minX, minY, maxX, maxY] para
// un rectángulo simple (verificado con SC-LV) — basta con quedarse los
// que van precedidos del color de relleno gris claro de estas plantillas
// (#f1f1f2, el mismo en las 4 ya soportadas).
// Uso: node --env-file=.env.local scripts/_extract-rects.mjs <CODIGO>

const code = process.argv[2];
const client = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: tpl, error: tplErr } = await client.from("training_record_templates").select("code, storage_path").eq("code", code).single();
if (tplErr) { console.error(tplErr); process.exit(1); }
const { data: fileBlob, error } = await client.storage.from("training-record-templates").download(tpl.storage_path);
if (error) { console.error(error); process.exit(1); }
const bytes = new Uint8Array(await fileBlob.arrayBuffer());

const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
const page = await doc.getPage(1);
const opList = await page.getOperatorList();
const { OPS } = pdfjsLib;

function isLightGrey(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
  if (!m) return false;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
  return Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && r > 220 && r < 250;
}

const rects = [];
let lastFill = null;
for (let i = 0; i < opList.fnArray.length; i++) {
  const op = opList.fnArray[i];
  const args = opList.argsArray[i];
  if (op === OPS.setFillRGBColor) lastFill = args[0];
  else if (op === OPS.constructPath && args?.length === 3 && args[2]?.length === 4) {
    const [x1, y1, x2, y2] = args[2];
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    if (width > 5 && height > 5 && isLightGrey(lastFill)) {
      rects.push({ x: Math.min(x1, x2), y: Math.min(y1, y2), width, height });
    }
  }
}

// Orden de lectura natural: arriba a abajo, izquierda a derecha (redondeo
// grueso de Y para agrupar cajas de la misma fila visual pese a un pixel
// de diferencia).
rects.sort((a, b) => (Math.round(b.y / 5) - Math.round(a.y / 5)) || (a.x - b.x));
fs.mkdirSync("training-records-debug", { recursive: true });
fs.writeFileSync(`training-records-debug/${code}-rects.json`, JSON.stringify(rects, null, 2));
console.log(`${rects.length} recuadros grises encontrados -> training-records-debug/${code}-rects.json`);
rects.forEach((r, i) => console.log(i, JSON.stringify(r)));
