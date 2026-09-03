// Este import va SIEMPRE antes que "pdfjs-dist" — pone los polyfills que
// esa dependencia necesita (Promise.withResolvers, Iterator) antes de que
// su propio código se evalúe por primera vez. Ver pdfjsPolyfills.js para
// el porqué exacto (Safari por debajo de la 17.4/18.4 según la API).
import "./pdfjsPolyfills";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

// Exportación a JPG del Training Record ya generado (Release V1, Fase 5) —
// pedido explícito del encargo original, deferido varias sesiones por no
// poder verificar en un navegador real el *worker* de pdfjs-dist en el
// build de Vite (ver docs/RELEASE-V1-PROGRESS.md). El `?url` de Vite
// resuelve el worker a un asset servido aparte — GlobalWorkerOptions
// necesita esa URL antes de la primera llamada a getDocument(), por eso se
// fija aquí, a nivel de módulo, no dentro de la función.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// scale=2 sobre el tamaño base del PDF (72dpi) da ~144dpi — nítido para
// leer en pantalla/compartir por WhatsApp sin generar un archivo enorme
// (una plantilla de 1-2 páginas A4 apaisada).
const DEFAULT_SCALE = 2;
const PAGE_GAP = 12;
const JPG_QUALITY = 0.92;

/**
 * Calcula dónde coloca cada página en el lienzo final que las concatena
 * verticalmente (documentos multipágina como OWD, 2 páginas) — cada
 * página se escala al ancho de la más ancha, conservando su proporción.
 * Lógica pura, sin canvas ni pdfjs, para poder probarla sin un navegador
 * real (mismo criterio que buildFillOperations() en pdfFill.js).
 */
export function computeConcatenatedLayout(pageSizes, gap = PAGE_GAP) {
  const maxWidth = Math.max(...pageSizes.map((p) => p.width));
  let y = 0;
  const placements = pageSizes.map((size, i) => {
    const scale = maxWidth / size.width;
    const width = maxWidth;
    const height = size.height * scale;
    const placement = { x: 0, y, width, height };
    y += height + (i < pageSizes.length - 1 ? gap : 0);
    return placement;
  });
  return { width: maxWidth, height: y, placements };
}

/**
 * Renderiza todas las páginas de un PDF ya relleno/aplanado a un único JPG
 * (páginas concatenadas verticalmente si hay más de una) — enteramente en
 * cliente, mismo criterio de arquitectura que el relleno en sí (nada pasa
 * por un servidor).
 * @param {Uint8Array} pdfBytes
 * @returns {Promise<Uint8Array>} bytes JPEG
 */
export async function renderPdfToJpgBytes(pdfBytes, { scale = DEFAULT_SCALE } = {}) {
  // disableImageDecoder: pdfjs-dist 6.x usa por defecto la ImageDecoder de
  // WebCodecs para decodificar imágenes — bug real reportado por el
  // usuario en Safari real (preview de Vercel): "TypeError: undefined is
  // not a constructor (evaluating 'new Rr')", porque WebCodecs no está
  // soportado de forma fiable en Safari. Opción oficial de pdf.js (desde
  // 4.9.124) para volver al decodificador JS interno, sin ese requisito —
  // ver https://github.com/mozilla/pdf.js/issues/19060.
  const doc = await pdfjsLib.getDocument({ data: pdfBytes, disableImageDecoder: true }).promise;
  const pageCanvases = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    // Cada página depende del mismo PDFDocumentProxy, no son independientes.
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    pageCanvases.push(canvas);
  }

  const layout = computeConcatenatedLayout(pageCanvases.map((c) => ({ width: c.width, height: c.height })));
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = Math.round(layout.width);
  finalCanvas.height = Math.round(layout.height);
  const ctx = finalCanvas.getContext("2d");
  // JPEG no soporta transparencia — sin este fondo, cualquier zona sin
  // cubrir (el hueco entre páginas) saldría negra en vez de blanca.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  layout.placements.forEach((placement, i) => {
    ctx.drawImage(pageCanvases[i], placement.x, placement.y, placement.width, placement.height);
  });

  const blob = await new Promise((resolve) => finalCanvas.toBlob(resolve, "image/jpeg", JPG_QUALITY));
  return new Uint8Array(await blob.arrayBuffer());
}
