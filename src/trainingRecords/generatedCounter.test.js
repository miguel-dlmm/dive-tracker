import { getGeneratedCount, addGeneratedCount } from "./generatedCounter";

describe("generatedCounter", () => {
  beforeEach(() => localStorage.clear());

  it("empieza en 0 sin nada en localStorage", () => {
    expect(getGeneratedCount()).toBe(0);
  });

  it("suma la cantidad indicada y la persiste", () => {
    addGeneratedCount(3);
    expect(getGeneratedCount()).toBe(3);
    addGeneratedCount(2);
    expect(getGeneratedCount()).toBe(5);
  });

  it("ignora cantidades no positivas", () => {
    addGeneratedCount(3);
    addGeneratedCount(0);
    addGeneratedCount(-1);
    expect(getGeneratedCount()).toBe(3);
  });

  it("ignora un valor corrupto en localStorage y no rompe", () => {
    localStorage.setItem("oceanpulse:trainingRecordsGeneratedCount", "not-a-number");
    expect(getGeneratedCount()).toBe(0);
    addGeneratedCount(1);
    expect(getGeneratedCount()).toBe(1);
  });
});
