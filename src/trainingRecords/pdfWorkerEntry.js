// Punto de entrada REAL del worker de pdfjs-dist — en vez de apuntar
// GlobalWorkerOptions.workerSrc directamente al pdf.worker.mjs de la
// dependencia (pdfToJpg.js lo hacía así hasta ahora).
//
// Motivo (bug real reportado 2026-09-07, iPhone real: "TypeError:
// Promise.try is not a function" dentro del worker + "DataCloneError" como
// consecuencia — ver pdfjsPolyfills.js para el análisis completo): un
// Web Worker corre en su PROPIO ámbito global aislado, sin heredar nada
// de lo que pdfjsPolyfills.js ya parchea en la página principal
// (globalThis ahí es la página; `self` aquí dentro es un objeto global
// completamente distinto). El pdf.worker.mjs real comprueba
// `Promise.try`/`Promise.withResolvers`/`Iterator.prototype.join` nada
// más cargarse — si faltan en el Safari del usuario, revienta antes de
// procesar el primer mensaje real, aunque el hilo principal ya esté
// parcheado.
//
// Este archivo se carga a sí mismo COMO worker (GlobalWorkerOptions.
// workerSrc apunta aquí, ver pdfToJpg.js) — aplica los mismos parches
// sobre `self` (el globalThis real dentro de un worker) y solo DESPUÉS
// carga el pdf.worker.mjs real. El import del worker real es dinámico a
// propósito: un `import` estático se evaluaría ANTES que el resto de
// este archivo (las declaraciones import se izan al principio del
// módulo en ESM), dejando el worker real cargarse sin parches de todos
// modos — con import() dinámico, se ejecuta exactamente en el orden en
// que aparece el código, después de aplicar los parches.
import { applyPdfjsPolyfills } from "./pdfjsPolyfills.js";

applyPdfjsPolyfills(self);

import("pdfjs-dist/build/pdf.worker.mjs");

// Nota sobre un bug real de Safari relacionado (2026-09-07, consola de
// Safari real: "Setting up fake worker failed: undefined is not an
// object (evaluating 'e.setup')") — la causa NO estaba en este fichero:
// cuando pdf.js no consigue crear un Worker real, cae a su modo interno
// "fake worker", que hace `await import(GlobalWorkerOptions.workerSrc)`
// (es decir, importa ESTE fichero) DIRECTAMENTE EN EL HILO PRINCIPAL y
// espera un `WorkerMessageHandler` entre sus exportaciones — que este
// fichero nunca tuvo (solo tiene un `import()` de efecto secundario,
// necesario para el modo worker real). La corrección real vive en
// pdfToJpg.js: `globalThis.pdfjsWorker = { WorkerMessageHandler }`,
// el mecanismo que el propio pdf.js comprueba ANTES de intentar
// importar workerSrc (ver `_setupFakeWorkerGlobal`/
// `#mainThreadWorkerMessageHandler` en pdfjs-dist/build/pdf.mjs) — con
// eso ya puesto, el modo fake-worker nunca llega a intentar importar
// este fichero, así que sus exportaciones dejan de importar. Se probó
// primero reexportar WorkerMessageHandler aquí mismo (con top-level
// await, para no romper el orden parche-antes-que-worker) — funcionaba
// en desarrollo pero el build de producción lo eliminaba por
// tree-shaking (nada en el propio grafo de módulos de la app "usa" esa
// exportación de forma estática — solo el propio pdf.js, en tiempo de
// ejecución, vía un import() dinámico que el bundler no puede rastrear).
// El mecanismo de pdfToJpg.js evita ese problema del todo.
