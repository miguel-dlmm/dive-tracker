// Este import va SIEMPRE antes que "pdfjs-dist" — pone los polyfills que
// esa dependencia necesita (Promise.withResolvers, Iterator, Promise.try)
// antes de que su propio código se evalúe por primera vez, EN EL HILO
// PRINCIPAL. Ver pdfjsPolyfills.js para el porqué exacto (Safari por
// debajo de la 17.4/18.4/sin Promise.try según la API).
import "./pdfjsPolyfills";
import * as pdfjsLib from "pdfjs-dist";
// Import estático (no un ?worker&url) porque este SÍ debe acabar en el
// bundle del hilo principal, no en el del worker — ver el bloque
// globalThis.pdfjsWorker más abajo para el porqué exacto.
import { WorkerMessageHandler } from "pdfjs-dist/build/pdf.worker.mjs";
// pdfWorkerEntry.js, NO "pdfjs-dist/build/pdf.worker.mjs?url" directamente
// (bug real reportado 2026-09-07, iPhone real) — el worker corre en su
// propio ámbito global, así que necesita los mismos polyfills aplicados
// DENTRO de él, no solo en la página; ver pdfWorkerEntry.js y la nota
// larga de pdfjsPolyfills.js para el análisis completo.
// "?worker&url", NO solo "?url" — un simple `?url` sobre un .js normal
// hace que Vite lo trate como un módulo más a bundlear dentro del chunk
// que lo importa (el `import()` dinámico de pdf.worker.mjs de dentro
// dejaba de generar su propio chunk de worker: el bug quedaba
// "arreglado" en el código pero el worker real de 2,2MB desaparecía del
// build, verificado con `ls dist/assets` antes de dar esto por bueno).
// El sufijo especial de Vite para Web Workers (`?worker&url`) sí trata
// el archivo como el punto de entrada de un worker aparte, con su propio
// grafo de módulos empaquetado — igual tratamiento que ya recibía
// pdf.worker.mjs directamente antes de este cambio, solo que ahora sobre
// este archivo intermedio.
import pdfWorkerUrl from "./pdfWorkerEntry.js?worker&url";

// Exportación a JPG del Training Record ya generado (Release V1, Fase 5) —
// pedido explícito del encargo original, deferido varias sesiones por no
// poder verificar en un navegador real el *worker* de pdfjs-dist en el
// build de Vite (ver docs/RELEASE-V1-PROGRESS.md). El `?url` de Vite
// resuelve el worker a un asset servido aparte — GlobalWorkerOptions
// necesita esa URL antes de la primera llamada a getDocument(), por eso se
// fija aquí, a nivel de módulo, no dentro de la función.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Bug real confirmado 2026-09-07 (consola de un Safari real, pegada por
// el usuario): "Setting up fake worker failed: undefined is not an
// object (evaluating 'e.setup')". Causa exacta, encontrada leyendo el
// propio código fuente de pdfjs-dist (pdf.mjs, PDFWorker): cuando no
// consigue crear un Worker real (o directamente no se arriesga a
// intentarlo — no hace falta saber el motivo exacto en Safari para
// arreglar esto), cae a su modo interno "fake worker", que hace
// `await import(GlobalWorkerOptions.workerSrc)` DIRECTAMENTE EN EL HILO
// PRINCIPAL esperando encontrar `WorkerMessageHandler` entre las
// exportaciones — pero `pdfWorkerEntry.js` (workerSrc) nunca lo
// exportaba, solo tiene un `import()` de efecto secundario (necesario
// para el modo worker real, ver ese archivo). `undefined.setup(...)`
// revienta con exactamente ese mensaje.
// pdf.js mira ANTES una vía pensada justo para bundlers como este
// (`PDFWorker.#mainThreadWorkerMessageHandler`, en pdf.mjs): si
// `globalThis.pdfjsWorker.WorkerMessageHandler` ya existe, la usa
// directamente y ni siquiera intenta el import() de arriba. Con esto
// puesto, el modo fake-worker de Safari deja de depender de que
// pdfWorkerEntry.js exporte nada. Se probó primero reexportar
// WorkerMessageHandler desde el propio pdfWorkerEntry.js (con
// top-level await) — el build de producción lo eliminaba por
// tree-shaking, porque ningún módulo de la app lo "usa" de forma
// estática (solo pdf.js, en tiempo de ejecución, vía un import()
// dinámico que el bundler no rastrea). Esta vía sí es fiable: el import
// de arriba es estático, así que Rollup/Rolldown nunca puede eliminarlo.
globalThis.pdfjsWorker = { WorkerMessageHandler };

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
    // Anota qué página exacta falló — sin esto, un fallo aquí llegaba al
    // toast de error genérico de TrainingRecordsTab.jsx sin ninguna pista
    // de en qué punto del render se rompió.
    try {
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      throw new Error(`Fallo al renderizar la página ${pageNum}/${doc.numPages} a canvas: ${err?.message || err}`, { cause: err });
    }
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

  // `toBlob` puede llamar a su callback con `null` en vez de lanzar un
  // error real (lienzo "tainted", memoria agotada, formato no soportado)
  // — sin este guard, `blob.arrayBuffer()` explotaba con un
  // "Cannot read properties of null" genérico que no decía nada sobre la
  // causa real. Bug real reportado en iOS Safari 2026-09-07 ("el generar
  // JPG no funciona"): no se pudo reproducir en este entorno (sin
  // Safari/WebKit real disponible, ver CLAUDE.md §8), así que este cambio
  // no es la corrección confirmada del error concreto — es endurecer el
  // punto más frágil ya identificado del pipeline para que, si vuelve a
  // fallar, el mensaje de consola diga con qué canvas y en qué paso, en
  // vez de un TypeError sin contexto.
  const blob = await new Promise((resolve, reject) => {
    finalCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(`toBlob devolvió null (canvas ${finalCanvas.width}x${finalCanvas.height}, ${doc.numPages} página(s))`))),
      "image/jpeg",
      JPG_QUALITY
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}
