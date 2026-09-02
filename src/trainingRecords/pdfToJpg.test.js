// Regresión (2026-09-02, reportado por el usuario en Safari real):
// "TypeError: undefined is not a constructor (evaluating 'new Rr')" al
// exportar a JPG — pdfjs-dist 6.x usa por defecto la ImageDecoder de
// WebCodecs, sin soporte fiable en Safari. getDocument() debe pedir
// explícitamente el decodificador JS interno (disableImageDecoder: true,
// ver https://github.com/mozilla/pdf.js/issues/19060).
const getDocument = vi.fn();
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: (...args) => getDocument(...args),
}));
vi.mock("pdfjs-dist/build/pdf.worker.mjs?url", () => ({ default: "worker.mjs" }));

import { computeConcatenatedLayout, renderPdfToJpgBytes } from "./pdfToJpg";

describe("renderPdfToJpgBytes", () => {
  it("pide a pdfjs-dist que no use ImageDecoder (WebCodecs), sin soporte fiable en Safari", async () => {
    getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 0 }) });
    await renderPdfToJpgBytes(new Uint8Array([1, 2, 3])).catch(() => {}); // 0 páginas -> falla al concatenar, no interesa aquí
    expect(getDocument).toHaveBeenCalledWith(expect.objectContaining({ disableImageDecoder: true }));
  });
});

describe("computeConcatenatedLayout", () => {
  it("coloca una única página sin ningún hueco", () => {
    const { width, height, placements } = computeConcatenatedLayout([{ width: 600, height: 800 }]);
    expect(width).toBe(600);
    expect(height).toBe(800);
    expect(placements).toEqual([{ x: 0, y: 0, width: 600, height: 800 }]);
  });

  it("apila varias páginas verticalmente, separadas por el hueco dado", () => {
    const { height, placements } = computeConcatenatedLayout(
      [{ width: 600, height: 800 }, { width: 600, height: 800 }],
      10
    );
    expect(placements[0]).toEqual({ x: 0, y: 0, width: 600, height: 800 });
    expect(placements[1]).toEqual({ x: 0, y: 810, width: 600, height: 800 });
    expect(height).toBe(1610);
  });

  it("escala una página más estrecha al ancho de la más ancha, conservando su proporción", () => {
    // Página 2 con la mitad de ancho y la mitad de alto que la página 1 —
    // debe crecer al mismo ancho manteniendo la misma proporción 1:1.
    const { width, placements } = computeConcatenatedLayout([{ width: 600, height: 600 }, { width: 300, height: 300 }], 0);
    expect(width).toBe(600);
    expect(placements[1]).toEqual({ x: 0, y: 600, width: 600, height: 600 });
  });

  it("no añade hueco tras la última página", () => {
    const { height } = computeConcatenatedLayout([{ width: 600, height: 800 }, { width: 600, height: 800 }], 50);
    expect(height).toBe(1650); // 800 + 50 + 800, sin un segundo hueco al final
  });
});
