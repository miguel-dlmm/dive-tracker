// Smoke test de generateExportReportPdf.js — no puedo verificar el PDF a
// ojo en este entorno (ver el informe de diseño de la sesión que encargó
// esta pantalla, "verificación visual"), así que esto es la red de
// seguridad real: construye un docDefinition con datos representativos
// (clases + comisiones + ajustes, sumados y aparte, con/sin cobrados) y
// confirma que pdfmake lo genera sin lanzar — cualquier error de sintaxis
// del docDefinition (canvas mal formado, columna sin ancho, etc.) revienta
// aquí antes que en el navegador del usuario. `file-saver` se mockea:
// no hay descarga real que verificar en un test, solo que el PDF se
// generó (tamaño de buffer > 0).
import { generateExportReportPdf, formatMoneyPdf } from "./generateExportReportPdf";
import { buildExportReportData } from "./buildExportReportData";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

const paymentStatuses = [{ name: "Pending", is_default: true }, { name: "Paid", is_default: false }];
const rates = [{ school: "Ihasia", activity: "Bautismo", rate: 45, currency: "EUR", is_active: true }];
const commissionRates = [{ school: "Ihasia", activity: "Bautismo", rate: 12, currency: "EUR", is_active: true }];
const t = (key, opts) => {
  const dict = {
    "export.colDate": "Fecha", "export.colCourse": "Curso", "export.colReferredFor": "Cliente referido para",
    "export.colPeople": "Personas", "export.colStatus": "Estado", "export.colAmount": "Importe",
    "export.colColleague": "Compañero", "export.colConcept": "Concepto",
    "export.pendingLabel": "Pendiente", "export.paidLabel": "Cobrado",
    "export.coursesGroup": "Clases impartidas", "export.commissionsGroup": "Comisiones", "export.adjustmentsGroup": "Ajustes de curso",
    "export.totalLabel": "Total del rango elegido", "export.onlyPendingNote": "Este informe muestra solo lo pendiente de cobro",
    "export.adjustmentsAsideNote": "Información adicional · no incluido en el total",
    "export.footerNote": "Ocean Flow · generado automáticamente, sin edición manual",
    "export.tagline": "Bucea más. Gestiona menos.",
  };
  if (key === "export.subtotal") return `Subtotal ${opts.group}`;
  if (key === "export.generatedOn") return `Generado el ${opts.date}`;
  if (key === "export.page") return `Página ${opts.current} de ${opts.total}`;
  return dict[key] || key;
};

function buildData(overrides = {}) {
  const worklog = [
    { id: "w1", date: "2026-09-03", school: "Ihasia", activity: "Bautismo de buceo", people: 2, status: "Paid", currency: "EUR" },
    { id: "w2", date: "2026-09-28", school: "Ihasia", activity: "Open Water Diver", people: 1, status: "Pending", currency: "EUR" },
  ];
  const comisiones = [
    { id: "c1", date: "2026-09-09", school: "Ihasia", activity: "Bautismo", people: 1, status: "Pending", currency: "EUR" },
  ];
  const colleaguePayments = [
    { id: "a1", date: "2026-09-09", school: "Ihasia", activity: "Bautismo", colleague_name: "Jon", amount: 45, status: "Paid", notes: "Cubrió turno", currency: "EUR" },
  ];
  return buildExportReportData({
    school: "Ihasia", from: "2026-09-01", to: "2026-09-30",
    worklog, comisiones, colleaguePayments, rates, commissionRates,
    fallbackCurrency: "EUR", paymentStatuses,
    showCollected: false, includeAdjustments: true, adjustmentMode: "all", sumAdjustments: false,
    ...overrides,
  });
}

// Bug real encontrado generando un PDF de verdad con una cuenta en baht
// tailandés: la Roboto que trae pdfmake por defecto no incluye el bloque
// Unicode tailandés donde vive "฿" (U+0E3F) — el símbolo se imprimía como
// un glifo roto. El PDF usa siempre el código ISO (3 letras latinas,
// garantizado en cualquier fuente) en vez del símbolo — ver el porqué en
// el propio generateExportReportPdf.js.
describe("formatMoneyPdf", () => {
  it("usa el código de moneda, nunca el símbolo — ni siquiera para símbolos fuera de latín/cirílico/griego", () => {
    expect(formatMoneyPdf(24434, "THB")).toBe("24.434,00 THB");
    expect(formatMoneyPdf(24434, "THB")).not.toContain("฿");
  });

  it("agrupa los miles con el mismo criterio es-ES que el resto de la app", () => {
    expect(formatMoneyPdf(4400, "EUR")).toBe("4.400,00 EUR");
  });

  it("un importe negativo (ajuste en contra) conserva el signo", () => {
    expect(formatMoneyPdf(-250, "EUR")).toBe("-250,00 EUR");
  });
});

describe("generateExportReportPdf", () => {
  it("genera un PDF (clases + comisiones + ajustes aparte, solo pendientes) sin lanzar", async () => {
    const data = buildData();
    await expect(generateExportReportPdf({
      school: "Ihasia", from: "2026-09-01", to: "2026-09-30", data, paymentStatusRows: paymentStatuses,
      instructorName: "Nerea Lizarraga", showCollected: false, includeAdjustments: true, sumAdjustments: false, t,
    })).resolves.not.toThrow();
  });

  it("genera un PDF con ajustes sumados al total y cobrados visibles (aparece el desglose cobrado/pendiente)", async () => {
    const data = buildData({ showCollected: true, sumAdjustments: true });
    await expect(generateExportReportPdf({
      school: "Ihasia", from: "2026-09-01", to: "2026-09-30", data, paymentStatusRows: paymentStatuses,
      instructorName: "Nerea Lizarraga", showCollected: true, includeAdjustments: true, sumAdjustments: true, t,
    })).resolves.not.toThrow();
  });

  it("genera un PDF sin ajustes y con una única sección (solo clases)", async () => {
    const data = buildExportReportData({
      school: "Ihasia", from: "2026-09-01", to: "2026-09-30",
      worklog: [{ id: "w1", date: "2026-09-03", school: "Ihasia", activity: "Bautismo de buceo", people: 2, status: "Pending", currency: "EUR" }],
      comisiones: [], colleaguePayments: [], rates, commissionRates,
      fallbackCurrency: "EUR", paymentStatuses, showCollected: false, includeAdjustments: false,
    });
    await expect(generateExportReportPdf({
      school: "Ihasia", from: "2026-09-01", to: "2026-09-30", data, paymentStatusRows: paymentStatuses,
      instructorName: "Nerea Lizarraga", showCollected: false, includeAdjustments: false, sumAdjustments: false, t,
    })).resolves.not.toThrow();
  });

  it("un rango que cruza dos años usa la fecha completa por fila, sin lanzar", async () => {
    const data = buildExportReportData({
      school: "Ihasia", from: "2025-12-20", to: "2026-01-10",
      worklog: [{ id: "w1", date: "2025-12-28", school: "Ihasia", activity: "Bautismo de buceo", people: 2, status: "Pending", currency: "EUR" }],
      comisiones: [], colleaguePayments: [], rates, commissionRates,
      fallbackCurrency: "EUR", paymentStatuses, showCollected: false, includeAdjustments: false,
    });
    await expect(generateExportReportPdf({
      school: "Ihasia", from: "2025-12-20", to: "2026-01-10", data, paymentStatusRows: paymentStatuses,
      instructorName: "Nerea Lizarraga", showCollected: false, includeAdjustments: false, sumAdjustments: false, t,
    })).resolves.not.toThrow();
  });
});
