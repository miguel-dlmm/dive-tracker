// Polyfills que pdfjs-dist necesita para no reventar al cargarse en un
// Safari/iOS todavía sin las dos APIs de JS muy recientes que da por
// hechas — investigado leyendo el código fuente real de la dependencia
// instalada (node_modules/pdfjs-dist/build/pdf.mjs), no adivinado, porque
// no hay forma de verificar esto en un Safari real desde este entorno
// (ver docs/RELEASE-V1-PROGRESS.md, Fase 5, y CLAUDE.md sobre
// mobile-check — WebKit no arranca aquí).
//
// 1. `Promise.withResolvers()` (ES2024) — pdfjs-dist 6.x lo usa en CADA
//    llamada a getDocument() (PDFDocumentLoadingTask, campos de clase
//    `_capability`/`_setupCapability`). Soportado en Safari solo desde la
//    17.4 (marzo 2024) — en cualquier iOS anterior, exportar a JPG
//    lanzaría "Promise.withResolvers is not a function" en el momento
//    exacto de generar la imagen, con o sin el fix ya existente del
//    import() dinámico en TrainingRecordsTab.jsx (ese fix solo evita que
//    rompa TODA la app; no hace que la exportación en sí funcione en un
//    Safari antiguo).
// 2. `Iterator.prototype.join` — pdf.mjs comprueba
//    `typeof Iterator.prototype.join !== "function"` al cargarse, para
//    rellenarlo si falta (línea ~797 de pdf.mjs). Esa comprobación da por
//    hecho que el propio global `Iterator` YA EXISTE (Iterator Helpers,
//    una propuesta de TC39 más reciente todavía que Promise.withResolvers
//    — Safari la incorporó en la 18.4, marzo 2025). En un motor sin
//    Iterator Helpers, `Iterator` ni siquiera está definido como global,
//    así que la propia comprobación de pdfjs-dist lanza
//    "Can't find variable: Iterator" ANTES de llegar a su propio
//    parcheo — esto es justo el bug ya encontrado y corregido una vez
//    (ver RELEASE-V1-PROGRESS.md, "pantalla en blanco en Safari") pero
//    limitado entonces a evitar que ese chunk cargara en el bundle
//    principal, sin arreglar la exportación en sí para un Safari real
//    por debajo de esas versiones. Aquí se ataja también
//    Promise.withResolvers, la otra pieza que necesitaba el mismo
//    tratamiento.
//
// applyPdfjsPolyfills() es lógica pura sobre un `target` (por defecto
// globalThis) — separada así, igual que buildFillOperations/
// computeSignaturePlacement/computeConcatenatedLayout en este mismo
// módulo, para poder comprobar con tests unitarios que SÍ falta-y-se-
// rellena / SÍ-existe-y-no-se-toca, sin mutar el globalThis real del
// proceso de test (que se compartiría con el resto de la suite).
export function applyPdfjsPolyfills(target = globalThis) {
  // Deliberadamente NO una implementación completa de las propuestas
  // reales — solo lo justo para que las comprobaciones de pdfjs-dist no
  // exploten y su propio código siga funcionando con la forma que él
  // mismo espera.
  if (typeof target.Promise.withResolvers !== "function") {
    target.Promise.withResolvers = function withResolvers() {
      let resolve;
      let reject;
      const promise = new target.Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  if (typeof target.Iterator === "undefined") {
    // Stub mínimo: basta con que `Iterator.prototype` exista como objeto
    // normal para que la comprobación de pdfjs-dist (`typeof
    // Iterator.prototype.join !== "function"`) no lance ReferenceError —
    // el propio pdfjs-dist rellena `.join` a continuación si hace falta.
    // No se intenta enlazar este stub a los iteradores reales del motor
    // (fuera de alcance de un polyfill mínimo, y no lo necesita el código
    // que este proyecto ejecuta de pdfjs-dist).
    target.Iterator = function Iterator() {};
    target.Iterator.prototype = {};
  }
}

// Se importa este archivo ANTES que "pdfjs-dist" en pdfToJpg.js (nunca al
// revés) — en ESM, los módulos importados se evalúan en el mismo orden en
// que aparecen las declaraciones `import` del archivo que los importa, así
// que este parche ya está puesto cuando el propio módulo de pdfjs-dist se
// evalúa por primera vez.
applyPdfjsPolyfills(globalThis);
