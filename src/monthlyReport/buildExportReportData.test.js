import { buildExportReportData, listAdjustmentCandidates, groupByDayAndActivity } from "./buildExportReportData";

const paymentStatuses = [
  { name: "Pending", is_default: true },
  { name: "Paid", is_default: false },
];
const rates = [{ school: "Ihasia", activity: "Bautismo", rate: 45, currency: "EUR", is_active: true }];
const commissionRates = [{ school: "Ihasia", activity: "Bautismo", rate: 12, currency: "EUR", is_active: true }];

function worklogRow(overrides) {
  return { id: "w1", date: "2026-09-03", school: "Ihasia", activity: "Bautismo", people: 2, status: "Pending", currency: "EUR", ...overrides };
}
function comisionRow(overrides) {
  return { id: "c1", date: "2026-09-05", school: "Ihasia", activity: "Bautismo", people: 1, status: "Pending", currency: "EUR", ...overrides };
}
function adjustmentRow(overrides) {
  return { id: "a1", date: "2026-09-09", school: "Ihasia", activity: "Bautismo", colleague_name: "Jon", amount: 45, status: "Pending", notes: "Cubrió turno", currency: "EUR", ...overrides };
}

const baseArgs = {
  school: "Ihasia", from: "2026-09-01", to: "2026-09-30",
  rates, commissionRates, fallbackCurrency: "EUR", paymentStatuses,
};

describe("buildExportReportData — alcance por escuela y rango", () => {
  it("solo incluye movimientos de la escuela elegida", () => {
    const worklog = [worklogRow({ id: "w1" }), worklogRow({ id: "w2", school: "Poseidón" })];
    const data = buildExportReportData({ ...baseArgs, worklog, comisiones: [], colleaguePayments: [], showCollected: true });
    expect(data.courses).toHaveLength(1);
    expect(data.courses[0].id).toBe("w1");
  });

  it("solo incluye movimientos dentro del rango de fechas", () => {
    const worklog = [worklogRow({ id: "dentro", date: "2026-09-15" }), worklogRow({ id: "fuera", date: "2026-10-01" })];
    const data = buildExportReportData({ ...baseArgs, worklog, comisiones: [], colleaguePayments: [], showCollected: true });
    expect(data.courses.map((c) => c.id)).toEqual(["dentro"]);
  });
});

describe("buildExportReportData — cobrado/pendiente (mostrar cobrados apagado por defecto)", () => {
  it("con showCollected en false, solo entran los movimientos pendientes", () => {
    const worklog = [worklogRow({ id: "pend", status: "Pending" }), worklogRow({ id: "cobrado", status: "Paid" })];
    const data = buildExportReportData({ ...baseArgs, worklog, comisiones: [], colleaguePayments: [], showCollected: false });
    expect(data.courses.map((c) => c.id)).toEqual(["pend"]);
  });

  it("con showCollected en true, entran ambos", () => {
    const worklog = [worklogRow({ id: "pend", status: "Pending" }), worklogRow({ id: "cobrado", status: "Paid" })];
    const data = buildExportReportData({ ...baseArgs, worklog, comisiones: [], colleaguePayments: [], showCollected: true });
    expect(data.courses).toHaveLength(2);
  });
});

describe("buildExportReportData — ajustes de curso", () => {
  it("sin includeAdjustments, no aparecen aunque haya candidatos en rango", () => {
    const colleaguePayments = [adjustmentRow()];
    const data = buildExportReportData({ ...baseArgs, worklog: [], comisiones: [], colleaguePayments, showCollected: true, includeAdjustments: false });
    expect(data.adjustments).toHaveLength(0);
  });

  it('modo "all": entran todos los candidatos de la escuela+rango', () => {
    const colleaguePayments = [adjustmentRow({ id: "a1" }), adjustmentRow({ id: "a2", date: "2026-09-19" })];
    const data = buildExportReportData({ ...baseArgs, worklog: [], comisiones: [], colleaguePayments, showCollected: true, includeAdjustments: true, adjustmentMode: "all" });
    expect(data.adjustments.map((a) => a.id).sort()).toEqual(["a1", "a2"]);
  });

  it('modo "choose": solo entran los ids seleccionados a mano', () => {
    const colleaguePayments = [adjustmentRow({ id: "a1" }), adjustmentRow({ id: "a2", date: "2026-09-19" })];
    const data = buildExportReportData({
      ...baseArgs, worklog: [], comisiones: [], colleaguePayments, showCollected: true,
      includeAdjustments: true, adjustmentMode: "choose", selectedAdjustmentIds: ["a2"],
    });
    expect(data.adjustments.map((a) => a.id)).toEqual(["a2"]);
  });

  it("sumAdjustments=false (aparte): el total principal NO incluye los ajustes", () => {
    const worklog = [worklogRow({ status: "Paid" })]; // 2 personas * 45 = 90
    const colleaguePayments = [adjustmentRow({ amount: 45, status: "Paid" })];
    const data = buildExportReportData({
      ...baseArgs, worklog, comisiones: [], colleaguePayments, showCollected: true,
      includeAdjustments: true, adjustmentMode: "all", sumAdjustments: false,
    });
    expect(data.mainTotal.EUR).toBe(90);
    expect(data.adjustmentsSubtotal.EUR).toBe(45);
  });

  it("sumAdjustments=true (sumar al total): el total principal SÍ incluye los ajustes elegidos", () => {
    const worklog = [worklogRow({ status: "Paid" })]; // 90
    const colleaguePayments = [adjustmentRow({ amount: 45, status: "Paid" })];
    const data = buildExportReportData({
      ...baseArgs, worklog, comisiones: [], colleaguePayments, showCollected: true,
      includeAdjustments: true, adjustmentMode: "all", sumAdjustments: true,
    });
    expect(data.mainTotal.EUR).toBe(135);
  });

  it("un ajuste negativo (dinero que debes tú) se descuenta si se suma al total", () => {
    const worklog = [worklogRow({ status: "Paid" })]; // 90
    const colleaguePayments = [adjustmentRow({ amount: -20, status: "Paid" })];
    const data = buildExportReportData({
      ...baseArgs, worklog, comisiones: [], colleaguePayments, showCollected: true,
      includeAdjustments: true, adjustmentMode: "all", sumAdjustments: true,
    });
    expect(data.mainTotal.EUR).toBe(70);
  });
});

describe("buildExportReportData — comisiones y totales por moneda", () => {
  it("suma comisiones aparte de clases, cada una en su tabla", () => {
    const worklog = [worklogRow({ status: "Paid" })]; // 90
    const comisiones = [comisionRow({ status: "Paid" })]; // 1 persona * 12 = 12
    const data = buildExportReportData({ ...baseArgs, worklog, comisiones, colleaguePayments: [], showCollected: true });
    expect(data.coursesSubtotal.EUR).toBe(90);
    expect(data.commissionsSubtotal.EUR).toBe(12);
    expect(data.mainTotal.EUR).toBe(102);
  });

  it("dos monedas distintas se totalizan por separado, nunca mezcladas", () => {
    const worklog = [worklogRow({ status: "Paid" })];
    const comisiones = [comisionRow({ status: "Paid", currency: "USD" })];
    const usdCommissionRates = [{ school: "Ihasia", activity: "Bautismo", rate: 15, currency: "USD", is_active: true }];
    const data = buildExportReportData({ ...baseArgs, commissionRates: usdCommissionRates, worklog, comisiones, colleaguePayments: [], showCollected: true });
    expect(data.mainTotal).toEqual({ EUR: 90, USD: 15 });
  });

  it("paidTotal/pendingTotal separan cobrado de pendiente dentro del mismo total principal", () => {
    const worklog = [worklogRow({ id: "w1", status: "Paid" }), worklogRow({ id: "w2", status: "Pending", people: 1 })];
    const data = buildExportReportData({ ...baseArgs, worklog, comisiones: [], colleaguePayments: [], showCollected: true });
    expect(data.paidTotal.EUR).toBe(90);
    expect(data.pendingTotal.EUR).toBe(45);
  });
});

describe("buildExportReportData — informe vacío", () => {
  it("isEmpty es true sin ningún movimiento en el rango", () => {
    const data = buildExportReportData({ ...baseArgs, worklog: [], comisiones: [], colleaguePayments: [], showCollected: true });
    expect(data.isEmpty).toBe(true);
  });

  it("isEmpty es false en cuanto hay al menos un movimiento", () => {
    const data = buildExportReportData({ ...baseArgs, worklog: [worklogRow()], comisiones: [], colleaguePayments: [], showCollected: true });
    expect(data.isEmpty).toBe(false);
  });
});

describe("listAdjustmentCandidates", () => {
  it("filtra por escuela y rango, sin depender de includeAdjustments", () => {
    const colleaguePayments = [
      adjustmentRow({ id: "dentro" }),
      adjustmentRow({ id: "otra-escuela", school: "Poseidón" }),
      adjustmentRow({ id: "fuera-de-rango", date: "2026-08-01" }),
    ];
    const candidates = listAdjustmentCandidates({ school: "Ihasia", from: "2026-09-01", to: "2026-09-30", colleaguePayments, fallbackCurrency: "EUR" });
    expect(candidates.map((c) => c.id)).toEqual(["dentro"]);
  });
});

describe("groupByDayAndActivity", () => {
  it("agrega varias sesiones idénticas (misma actividad, mismo día, mismo estado) en una sola línea", () => {
    const entries = [
      { date: "2026-09-04", activity: "Try Scuba", people: 1, status: "Pending", currency: "EUR", total: 800 },
      { date: "2026-09-04", activity: "Try Scuba", people: 1, status: "Pending", currency: "EUR", total: 800 },
      { date: "2026-09-04", activity: "Try Scuba", people: 1, status: "Pending", currency: "EUR", total: 800 },
    ];
    const days = groupByDayAndActivity(entries);
    expect(days).toHaveLength(1);
    expect(days[0].groups).toHaveLength(1);
    expect(days[0].groups[0]).toMatchObject({ activity: "Try Scuba", sessions: 3, people: 3, total: 2400 });
    expect(days[0].dayTotal).toEqual({ EUR: 2400 });
  });

  it("no mezcla actividades distintas del mismo día en la misma línea", () => {
    const entries = [
      { date: "2026-09-04", activity: "Try Scuba", people: 1, status: "Pending", currency: "EUR", total: 800 },
      { date: "2026-09-04", activity: "Fun Dive", people: 3, status: "Pending", currency: "EUR", total: 900 },
    ];
    const days = groupByDayAndActivity(entries);
    expect(days).toHaveLength(1);
    expect(days[0].groups.map((g) => g.activity).sort()).toEqual(["Fun Dive", "Try Scuba"]);
    expect(days[0].dayTotal).toEqual({ EUR: 1700 });
  });

  it("no mezcla cobrado y pendiente de la misma actividad bajo un único importe", () => {
    const entries = [
      { date: "2026-09-04", activity: "Try Scuba", people: 1, status: "Paid", currency: "EUR", total: 800 },
      { date: "2026-09-04", activity: "Try Scuba", people: 1, status: "Pending", currency: "EUR", total: 800 },
    ];
    const days = groupByDayAndActivity(entries);
    expect(days[0].groups).toHaveLength(2);
    expect(days[0].groups.map((g) => g.status).sort()).toEqual(["Paid", "Pending"]);
  });

  it("mantiene el orden de los días tal como llegan las entradas", () => {
    const entries = [
      { date: "2026-09-20", activity: "A", people: 1, status: "Pending", currency: "EUR", total: 10 },
      { date: "2026-09-04", activity: "B", people: 1, status: "Pending", currency: "EUR", total: 20 },
    ];
    const days = groupByDayAndActivity(entries);
    expect(days.map((d) => d.date)).toEqual(["2026-09-20", "2026-09-04"]);
  });

  it("sin entradas, devuelve una lista vacía", () => {
    expect(groupByDayAndActivity([])).toEqual([]);
  });
});
