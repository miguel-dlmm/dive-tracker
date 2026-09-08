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
// 4. `Uint8Array.prototype.toHex()`/`.toBase64()` y `Uint8Array.fromBase64()`
//    (propuesta TC39 "Uint8Array to/from base64/hex", sin soporte
//    confirmado en Safari a día de hoy) — bug real reportado 2026-09-08
//    en un Mac/iPhone real, mismo patrón que el punto 3: pdf.mjs calcula
//    la "huella" (fingerprint) de cada PDF con
//    `hashOriginal.toHex()` (PDFDocument.get fingerprints, pdf.worker.mjs)
//    sobre un `Uint8Array` normal (los bytes del `/ID` del trailer o un
//    hash MD5) — no un método propio de pdfjs-dist, da por hecho que el
//    motor ya trae esta API nativa. Sin ella: "UnknownErrorException:
//    i.toHex is not a function" dentro del worker/loopback y, exactamente
//    igual que el punto 3, un "DataCloneError" secundario al intentar
//    propagar esa excepción de vuelta por el canal de mensajes de
//    pdfjs-dist — el mismo mecanismo de recuperación que ya falla con
//    cualquier excepción no nativa. `toBase64()`/`fromBase64()` (usados
//    en pdf.mjs para incrustar fuentes como data-URL y en pdf.worker.mjs
//    para adjuntos de flujo) se rellenan a la vez por ser la misma
//    propuesta — si Safari no trae una, no trae ninguna de las cuatro.
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

  // target.Uint8Array es opcional (los tests de Promise/Iterator de
  // arriba pasan un target mínimo que no lo necesita) — en uso real
  // (globalThis o self, ver applyPdfjsPolyfills(globalThis) más abajo y
  // pdfWorkerEntry.js) siempre está presente.
  if (target.Uint8Array) {
    // CHUNK: evita "Maximum call stack size exceeded" al usar spread sobre
    // un array grande (String.fromCharCode(...bytes)) — una fuente
    // embebida en un PDF puede pesar varios cientos de KB.
    const CHUNK = 0x8000;
    const bytesToBase64 = (bytes) => {
      let binary = "";
      for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      return target.btoa(binary);
    };
    const base64ToBytes = (base64) => {
      const binary = target.atob(base64);
      const bytes = new target.Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    };
    const bytesToHex = (bytes) => {
      let hex = "";
      for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
      return hex;
    };
    if (typeof target.Uint8Array.prototype.toHex !== "function") {
      target.Uint8Array.prototype.toHex = function toHex() { return bytesToHex(this); };
    }
    if (typeof target.Uint8Array.prototype.toBase64 !== "function") {
      target.Uint8Array.prototype.toBase64 = function toBase64() { return bytesToBase64(this); };
    }
    if (typeof target.Uint8Array.fromBase64 !== "function") {
      target.Uint8Array.fromBase64 = function fromBase64(base64) { return base64ToBytes(base64); };
    }
  }
}

// Se importa este archivo ANTES que "pdfjs-dist" en pdfToJpg.js (nunca al
// revés) — en ESM, los módulos importados se evalúan en el mismo orden en
// que aparecen las declaraciones `import` del archivo que los importa, así
// que este parche ya está puesto cuando el propio módulo de pdfjs-dist se
// evalúa por primera vez.
applyPdfjsPolyfills(globalThis);
