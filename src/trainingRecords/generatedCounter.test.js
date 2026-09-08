import { getGeneratedCount, addGeneratedCount } from "./generatedCounter";

describe("generatedCounter", () => {
  beforeEach(() => localStorage.clear());

  it("empieza en 0 sin nada en localStorage", () => {
    expect(getGeneratedCount("u1")).toBe(0);
  });

  it("suma la cantidad indicada y la persiste", () => {
    addGeneratedCount("u1", 3);
    expect(getGeneratedCount("u1")).toBe(3);
    addGeneratedCount("u1", 2);
    expect(getGeneratedCount("u1")).toBe(5);
  });

  it("ignora cantidades no positivas", () => {
    addGeneratedCount("u1", 3);
    addGeneratedCount("u1", 0);
    addGeneratedCount("u1", -1);
    expect(getGeneratedCount("u1")).toBe(3);
  });

  it("ignora un valor corrupto en localStorage y no rompe", () => {
    localStorage.setItem("oceanpulse:trainingRecordsGeneratedCount:u1", "not-a-number");
    expect(getGeneratedCount("u1")).toBe(0);
    addGeneratedCount("u1", 1);
    expect(getGeneratedCount("u1")).toBe(1);
  });

  // Bug real (2026-09-08): "he creado un TR con el admin y cuando entro
  // con una cuenta demo mía sigue poniendo el número de generados pese a
  // q aún no he generado ninguno" — el contador vivía en una única clave
  // global, compartida por cualquier cuenta que usara el mismo navegador.
  it("cada cuenta tiene su propio contador, aislado del de otras cuentas en el mismo navegador", () => {
    addGeneratedCount("admin-1", 5);
    expect(getGeneratedCount("admin-1")).toBe(5);
    expect(getGeneratedCount("demo-2")).toBe(0);

    addGeneratedCount("demo-2", 1);
    expect(getGeneratedCount("demo-2")).toBe(1);
    expect(getGeneratedCount("admin-1")).toBe(5);
  });

  it("sin userId (sesión todavía sin resolver), usa una clave 'anon' separada de cualquier cuenta real", () => {
    addGeneratedCount(undefined, 2);
    expect(getGeneratedCount(undefined)).toBe(2);
    expect(getGeneratedCount("u1")).toBe(0);
  });
});
