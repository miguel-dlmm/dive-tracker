// Polyfills que pdfjs-dist necesita para no reventar al cargarse en un
// Safari/iOS todavía sin las APIs de JS muy recientes que da por hechas —
// investigado leyendo el código fuente real de la dependencia instalada
// (node_modules/pdfjs-dist/build/pdf.mjs y pdf.worker.mjs), no adivinado,
// porque no hay forma de verificar esto en un Safari real desde este
// entorno (ver docs/RELEASE-V1-PROGRESS.md, Fase 5, y CLAUDE.md sobre
// mobile-check — WebKit no arranca aquí). El usuario sí pudo probar en un
// iPhone real y pegar la consola completa (2026-09-07) — los tres errores
// exactos que reportó son justo las piezas que este archivo cubre.
//
// 1. `Promise.withResolvers()` (ES2024) — pdfjs-dist 6.x lo usa en CADA
//    llamada a getDocument() (PDFDocumentLoadingTask, campos de clase
//    `_capability`/`_setupCapability`). Soportado en Safari solo desde la
//    17.4 (marzo 2024).
// 2. `Iterator.prototype.join` — pdf.mjs/pdf.worker.mjs comprueban
//    `typeof Iterator.prototype.join !== "function"` al cargarse, para
//    rellenarlo si falta. Esa comprobación da por hecho que el propio
//    global `Iterator` YA EXISTE (Iterator Helpers, una propuesta de TC39
//    más reciente todavía que Promise.withResolvers — Safari la
//    incorporó en la 18.4, marzo 2025). En un motor sin Iterator Helpers,
//    `Iterator` ni siquiera está definido como global, así que la propia
//    comprobación de pdfjs-dist lanza "Can't find variable: Iterator"
//    ANTES de llegar a su propio parcheo.
// 3. `Promise.try()` (propuesta TC39 más reciente todavía, sin fecha de
//    Safari confirmada a día de hoy) — usado dentro de MessageHandler
//    (`#onMessage`, pdf.mjs Y pdf.worker.mjs) para invocar la acción
//    registrada de cada mensaje. Bug real reportado 2026-09-07 en un
//    iPhone real: "TypeError: Promise.try is not a function" dentro del
//    propio worker (pdfjs-dist.js:7503) — y, como consecuencia directa
//    (no un segundo bug aparte), un "DataCloneError" en pdf.mjs:8717
//    (LoopbackPort.postMessage, la ruta de "fake worker" a la que
//    pdfjs-dist cae cuando el worker real deja de responder bien): al
//    reventar el worker real por el Promise.try que falta, pdfjs-dist
//    intenta su mecanismo de recuperación automática (ejecutar todo en
//    el hilo principal simulando mensajes con structuredClone en vez de
//    postMessage a un hilo real), y ESE camino de recuperación también
//    tropieza. Arreglar el Promise.try que falta evita que el worker
//    real llegue a fallar, así que nunca hace falta ese camino de
//    recuperación — un único parche soluciona los dos errores.
//
// CRÍTICO: estas tres piezas hacen falta en DOS sitios, no solo uno — el
// hilo principal (pdf.mjs, ya cubierto aplicando esto sobre `globalThis`
// más abajo) Y el propio worker (pdf.worker.mjs), que corre en su PROPIO
// ámbito global aislado (`self` dentro del worker) sin heredar nada de lo
// que se parchee en la página. Ver pdfWorkerEntry.js, que aplica esto
// mismo dentro del worker antes de cargar el pdf.worker.mjs real — sin
// eso, el hilo principal quedaría arreglado pero el worker seguiría
// reventando exactamente igual.
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

  if (typeof target.Promise.try !== "function") {
    // Semántica real de la propuesta: ejecuta fn(...args) de forma
    // síncrona pero envuelve CUALQUIER resultado (valor, promesa, o un
    // throw síncrono) en una promesa — es lo que pdfjs-dist necesita de
    // esto (invocar el handler de un mensaje sin que un throw síncrono
    // se salga de la cadena de promesas).
    target.Promise.try = function ptry(fn, ...args) {
      return new target.Promise((resolve) => resolve(fn(...args)));
    };
  }
}

// Se importa este archivo ANTES que "pdfjs-dist" en pdfToJpg.js (nunca al
// revés) — en ESM, los módulos importados se evalúan en el mismo orden en
// que aparecen las declaraciones `import` del archivo que los importa, así
// que este parche ya está puesto cuando el propio módulo de pdfjs-dist se
// evalúa por primera vez.
applyPdfjsPolyfills(globalThis);
