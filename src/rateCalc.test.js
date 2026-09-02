import { computeRateTotal, buildActivityEntries } from "./rateCalc";

// computeRateTotal — desde 2026-09-02 (ADR-0003, pasos 1-2) siempre
// multiplica tarifa × personas, sin distinguir por payment_type — ver el
// comentario del propio rateCalc.js para el porqué (columna todavía en BD,
// pero el frontend deja de leerla/depender de ella).

describe("computeRateTotal", () => {
  it("multiplica rate * people, siempre", () => {
    const rate = { rate: 20 };
    expect(computeRateTotal(rate, 5)).toBe(100);
  });

  it("una persona", () => {
    const rate = { rate: 30 };
    expect(computeRateTotal(rate, 1)).toBe(30);
  });

  it("cero personas: total 0", () => {
    const rate = { rate: 30 };
    expect(computeRateTotal(rate, 0)).toBe(0);
  });

  it("people recibido como string numérico (valor crudo de un input): se coacciona", () => {
    const rate = { rate: 20 };
    expect(computeRateTotal(rate, "3")).toBe(60);
  });

  it("people undefined: se trata como 0, no como NaN", () => {
    const rate = { rate: 20 };
    expect(computeRateTotal(rate, undefined)).toBe(0);
  });

  it("people como string no numérico: se trata como 0, no como NaN", () => {
    const rate = { rate: 20 };
    expect(computeRateTotal(rate, "abc")).toBe(0);
  });

  it("rate inexistente (null): devuelve 0", () => {
    expect(computeRateTotal(null, 5)).toBe(0);
  });

  it("rate inexistente (undefined): devuelve 0", () => {
    expect(computeRateTotal(undefined, 5)).toBe(0);
  });

  it("rate.rate = 0: el total es 0 aunque haya personas", () => {
    const rate = { rate: 0 };
    expect(computeRateTotal(rate, 4)).toBe(0);
  });

  it("un payment_type todavía presente en el objeto (columna aún en BD) se ignora por completo", () => {
    const rate = { payment_type: "Instructor", rate: 40 };
    expect(computeRateTotal(rate, 7)).toBe(280);
  });
});

describe("buildActivityEntries", () => {
  const RATES = [{ school: "PADI Cozumel", activity: "Open Water", rate: 20, currency: "USD" }];
  const COMMISSION_RATES = [{ school: "PADI Cozumel", activity: "Open Water", rate: 15, currency: "EUR" }];
  const WORKLOG = [{ id: "w1", date: "2026-09-01", school: "PADI Cozumel", activity: "Open Water", people: 2 }];
  const COMISIONES = [{ id: "c1", date: "2026-09-01", school: "PADI Cozumel", activity: "Open Water", people: 1 }];
  const COLLEAGUE_PAYMENTS = [{ id: "p1", date: "2026-09-01", amount: -30 }];

  const args = { worklog: WORKLOG, rates: RATES, comisiones: COMISIONES, commissionRates: COMMISSION_RATES, colleaguePayments: COLLEAGUE_PAYMENTS, fallbackCurrency: "EUR" };

  it("fusiona las 3 fuentes, cada una con su total resuelto por tarifa y _source marcado", () => {
    expect(buildActivityEntries(args)).toEqual([
      { ...WORKLOG[0], total: 40, currency: "USD", _source: "ganado" },
      { ...COMISIONES[0], total: 15, currency: "EUR", _source: "comision" },
      { ...COLLEAGUE_PAYMENTS[0], total: -30, people: 0, _source: "companeros" },
    ]);
  });

  it("sin tarifa que coincida, usa fallbackCurrency y total 0", () => {
    const [ganado] = buildActivityEntries({ ...args, rates: [] });
    expect(ganado).toMatchObject({ total: 0, currency: "EUR" });
  });
});
