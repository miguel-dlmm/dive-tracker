import { computeRateTotal, buildEntriesBySource, buildActivityEntries } from "./rateCalc";

// Estos tests documentan el comportamiento ACTUAL de computeRateTotal, la
// función única que sustituye a las 7 copias del cálculo de importe
// duplicadas en WorkLogTab, ComisionesTab, PaymentsTab, SummaryTab y
// HomeTab. No corrigen ningún comportamiento.

describe("computeRateTotal", () => {
  it("tarifa 'Per Person' con varias personas: multiplica rate * people", () => {
    const rate = { payment_type: "Per Person", rate: 20 };
    expect(computeRateTotal(rate, 5)).toBe(100);
  });

  it("tarifa fija ('Fixed'): ignora el número de personas", () => {
    const rate = { payment_type: "Fixed", rate: 50 };
    expect(computeRateTotal(rate, 5)).toBe(50);
  });

  it("una persona con tarifa 'Per Person'", () => {
    const rate = { payment_type: "Per Person", rate: 30 };
    expect(computeRateTotal(rate, 1)).toBe(30);
  });

  it("cero personas con tarifa 'Per Person': total 0", () => {
    const rate = { payment_type: "Per Person", rate: 30 };
    expect(computeRateTotal(rate, 0)).toBe(0);
  });

  it("cero personas con tarifa fija: el total sigue siendo la tarifa", () => {
    const rate = { payment_type: "Fixed", rate: 50 };
    expect(computeRateTotal(rate, 0)).toBe(50);
  });

  it("people recibido como string numérico (valor crudo de un input): se coacciona", () => {
    const rate = { payment_type: "Per Person", rate: 20 };
    expect(computeRateTotal(rate, "3")).toBe(60);
  });

  it("people undefined: se trata como 0, no como NaN", () => {
    const rate = { payment_type: "Per Person", rate: 20 };
    expect(computeRateTotal(rate, undefined)).toBe(0);
  });

  it("people como string no numérico: se trata como 0, no como NaN", () => {
    const rate = { payment_type: "Per Person", rate: 20 };
    expect(computeRateTotal(rate, "abc")).toBe(0);
  });

  it("rate inexistente (null): devuelve 0", () => {
    expect(computeRateTotal(null, 5)).toBe(0);
  });

  it("rate inexistente (undefined): devuelve 0", () => {
    expect(computeRateTotal(undefined, 5)).toBe(0);
  });

  it("rate.rate = 0 con tarifa 'Per Person': el total es 0 aunque haya personas", () => {
    const rate = { payment_type: "Per Person", rate: 0 };
    expect(computeRateTotal(rate, 4)).toBe(0);
  });

  it("rate.rate = 0 con tarifa fija: el total es 0", () => {
    const rate = { payment_type: "Fixed", rate: 0 };
    expect(computeRateTotal(rate, 4)).toBe(0);
  });

  it("payment_type desconocido (distinto de 'Per Person'): se trata como fijo", () => {
    const rate = { payment_type: "Otro tipo cualquiera", rate: 40 };
    expect(computeRateTotal(rate, 7)).toBe(40);
  });
});

// buildEntriesBySource — extraída de HomeTab.jsx/SummaryTab.jsx
// (docs/BACKLOG.md, "Reutilizar componente entre Home y Resumen") al
// duplicar ambas pantallas byte a byte el mismo cálculo. buildActivityEntries
// ya se probaba solo indirectamente (a través de HomeTab/PaymentsTab); estos
// tests cubren las dos funciones directamente.
describe("buildEntriesBySource / buildActivityEntries", () => {
  const RATES = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 20, currency: "USD" }];
  const COMMISSION_RATES = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Fixed", rate: 15, currency: "EUR" }];
  const WORKLOG = [{ id: "w1", date: "2026-09-01", school: "PADI Cozumel", activity: "Open Water", people: 2 }];
  const COMISIONES = [{ id: "c1", date: "2026-09-01", school: "PADI Cozumel", activity: "Open Water", people: 1 }];
  const COLLEAGUE_PAYMENTS = [{ id: "p1", date: "2026-09-01", amount: -30 }];

  const args = { worklog: WORKLOG, rates: RATES, comisiones: COMISIONES, commissionRates: COMMISSION_RATES, colleaguePayments: COLLEAGUE_PAYMENTS, fallbackCurrency: "EUR" };

  it("separa las 3 fuentes, cada una con su total resuelto por tarifa y _source marcado", () => {
    const { ganado, comision, companeros } = buildEntriesBySource(args);

    expect(ganado).toEqual([{ ...WORKLOG[0], total: 40, currency: "USD", _source: "ganado" }]);
    expect(comision).toEqual([{ ...COMISIONES[0], total: 15, currency: "EUR", _source: "comision" }]);
    expect(companeros).toEqual([{ ...COLLEAGUE_PAYMENTS[0], total: -30, people: 0, _source: "companeros" }]);
  });

  it("sin tarifa que coincida, usa fallbackCurrency y total 0", () => {
    const { ganado } = buildEntriesBySource({ ...args, rates: [] });
    expect(ganado[0]).toMatchObject({ total: 0, currency: "EUR" });
  });

  it("buildActivityEntries devuelve las 3 fuentes ya fusionadas en un único array, mismo contenido que buildEntriesBySource", () => {
    const { ganado, comision, companeros } = buildEntriesBySource(args);
    expect(buildActivityEntries(args)).toEqual([...ganado, ...comision, ...companeros]);
  });
});
