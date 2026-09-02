import { computeConcatenatedLayout } from "./pdfToJpg";

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
