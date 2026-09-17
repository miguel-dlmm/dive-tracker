// generateExportReportPdf.js — construye y descarga el PDF de "Exportar
// informe" con pdfmake. Se importa siempre de forma dinámica (ver
// ExportReportSheet.jsx: `await import("./generateExportReportPdf")`) para
// que pdfmake (con Roboto embebida) nunca entre en el bundle principal —
// solo se descarga cuando alguien pulsa "Generar PDF".
//
// pdfmake 0.3.x (la versión instalada) cambió el registro de fuentes
// respecto a las guías más comunes en internet: ya no es
// `pdfMake.vfs = pdfFonts.pdfMake.vfs`, sino `addVirtualFileSystem(vfs)`
// sobre el propio `vfs_fonts.js` (que ahora exporta el mapa de fuentes
// directamente, sin el envoltorio `{pdfMake:{vfs}}` de versiones
// anteriores) — verificado leyendo el paquete instalado, no asumido de
// memoria. Roboto ya viene como fuente por defecto de la build de
// navegador, sin configurarla a mano.
import pdfMake from "pdfmake/build/pdfmake";
import vfsFonts from "pdfmake/build/vfs_fonts";
import { isPendingStatus } from "../shared";

let vfsReady = false;
function ensureFonts() {
  if (vfsReady) return;
  pdfMake.addVirtualFileSystem(vfsFonts);
  vfsReady = true;
}

const NAVY = "#063256";
const SKY = "#8AACCE";
const TEAL = "#0F766E";
const GOLD = "#8C6118";
const SLATE = "#5B7286";
const SUCCESS = "#15803D";
const WARNING = "#B45309";
const WARNING_BG = "#FCF1E5";
const DANGER = "#C2542F";
const MUTED = "#3D5C73";
const HAIRLINE = "#D7E0E8";

// A4 (595.28pt) menos los márgenes laterales de pageMargins (40+40).
const CONTENT_WIDTH = 515.28;

const pad2 = (n) => String(n).padStart(2, "0");
function ddmmyyyy(iso) {
  const [y, m, d] = iso.split("-");
  return `${pad2(d)}/${pad2(m)}/${y}`;
}
function ddmm(iso) {
  const [, m, d] = iso.split("-");
  return `${pad2(d)}/${pad2(m)}`;
}

// El PDF usa siempre el CÓDIGO de moneda (EUR, THB, USD...), nunca el
// símbolo de currencies.symbol — bug real encontrado al generar un PDF de
// verdad (única forma de verlo: este entorno no tiene forma de comprobar
// a ojo el resultado hasta descargarlo): el símbolo del baht tailandés
// (฿) se imprimía como un glifo roto (un tofu box) porque la Roboto que
// trae pdfmake por defecto solo cubre latín/cirílico/griego, no el bloque
// Unicode tailandés donde vive ese símbolo concreto. Como el símbolo es
// texto libre editable en Configuración → Monedas, no hay ninguna forma
// de garantizar que la fuente embebida lo cubra siempre; el código ISO sí
// son siempre 3 letras latinas mayúsculas, sin excepción — se sacrifica
// un poco de la fidelidad visual de la app (símbolo bonito) a cambio de
// que ninguna moneda pueda salir rota en un documento que se manda fuera
// de la app. Misma agrupación es-ES que formatMoney (shared.jsx) — solo
// cambia qué va después del número.
export function formatMoneyPdf(amount, code) {
  const n = (amount || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
  return `${n} ${code}`;
}

// pdfmake no tiene "border-radius" en tablas — un rectángulo con esquinas
// redondeadas se dibuja con `canvas` (que sí soporta el parámetro `r`) y el
// contenido de verdad se superpone encima con un margen superior negativo
// (el propio canvas ya reserva su alto en el flujo del documento; el bloque
// siguiente "sube" ese mismo alto menos el hueco que se le quiera dejar
// arriba). Es el patrón estándar de pdfmake para "caja de color con texto
// dentro" — nunca placeholders sin probar: los radios (10pt caja de total,
// 8pt aviso) replican los tokens `radius-card`/`radius-control` que ya usa
// el resto de la app (docs/DESIGN-SYSTEM.md §4).
function roundedBox({ height, radius, color, topInset, content, marginTop = 16 }) {
  return {
    margin: [0, marginTop, 0, 0],
    stack: [
      { canvas: [{ type: "rect", x: 0, y: 0, w: CONTENT_WIDTH, h: height, r: radius, color }] },
      { margin: [14, -(height - topInset), 14, 0], ...content },
    ],
  };
}

// Punto de color + etiqueta, como un solo run de texto (nunca canvas
// posicionado a mano dentro de columnas): con un único punto de fallo
// (el motor de texto de pdfmake, ya fiable) en vez de dos elementos que
// puedan desalinearse verticalmente entre sí sin poder verlo en pantalla
// aquí mismo.
function groupLabel(text, color) {
  return {
    margin: [0, 18, 0, 6],
    text: [
      { text: "●  ", color, fontSize: 7 },
      { text: text.toUpperCase(), bold: true, fontSize: 8, color, characterSpacing: 0.6 },
    ],
  };
}

const hairlineLayout = {
  hLineWidth: (i) => (i === 0 ? 0 : 0.75),
  vLineWidth: () => 0,
  hLineColor: () => HAIRLINE,
  paddingLeft: () => 0,
  paddingRight: () => 8,
  paddingTop: () => 6,
  paddingBottom: () => 6,
};

function statusCell(statusName, paymentStatusRows, t) {
  const pending = isPendingStatus(statusName, paymentStatusRows);
  return { text: pending ? t("export.pendingLabel") : t("export.paidLabel"), color: pending ? WARNING : SUCCESS, bold: true, fontSize: 8 };
}

function moneyCell(amount, code) {
  return { text: formatMoneyPdf(amount, code), alignment: "right", bold: true, color: NAVY, fontSize: 9 };
}

// Los anchos de columna de esta tabla y de adjustmentsTable suman siempre
// CONTENT_WIDTH y la columna Importe es siempre la última con el mismo
// ancho fijo (64) en las dos — así su borde derecho cae exactamente en el
// mismo punto en cualquier tabla del documento, aunque tengan un número de
// columnas distinto (bug real reportado: "el total no queda alineado en
// la columna" — antes cada tabla repartía su propio "*" de forma
// independiente, sin garantía de que las columnas Importe de tablas
// distintas cayeran en la misma x).
function entriesTable({ entries, paymentStatusRows, t, kind, rowDate }) {
  const secondColLabel = kind === "commissions" ? t("export.colReferredFor") : t("export.colCourse");
  const header = [
    { text: t("export.colDate"), style: "th" },
    { text: secondColLabel, style: "th" },
    { text: t("export.colPeople"), style: "th", alignment: "center" },
    { text: t("export.colStatus"), style: "th" },
    { text: t("export.colAmount"), style: "th", alignment: "right" },
  ];
  const body = entries.map((e) => [
    { text: rowDate(e.date), color: MUTED, fontSize: 9, noWrap: true },
    { text: e.activity, fontSize: 9 },
    { text: String(e.people || 0), alignment: "center", fontSize: 9 },
    statusCell(e.status, paymentStatusRows, t),
    moneyCell(e.total, e.currency),
  ]);
  return { table: { headerRows: 1, widths: [34, "*", 30, 48, 64], body: [header, ...body] }, layout: hairlineLayout };
}

function adjustmentsTable({ entries, t, rowDate }) {
  const header = [
    { text: t("export.colDate"), style: "th" },
    { text: t("export.colColleague"), style: "th" },
    { text: t("export.colConcept"), style: "th" },
    { text: t("export.colAmount"), style: "th", alignment: "right" },
  ];
  const body = entries.map((e) => [
    { text: rowDate(e.date), color: MUTED, fontSize: 9, noWrap: true },
    { text: e.colleague_name, fontSize: 9 },
    { text: e.notes || "—", fontSize: 9, color: MUTED },
    { text: formatMoneyPdf(e.total, e.currency), alignment: "right", bold: true, color: e.total < 0 ? DANGER : SUCCESS, fontSize: 9 },
  ]);
  return { table: { headerRows: 1, widths: [34, "*", "*", 64], body: [header, ...body] }, layout: hairlineLayout };
}

function subtotalLine(label, totals) {
  const lines = Object.entries(totals).map(([code, amount]) => formatMoneyPdf(amount, code)).join("  ·  ");
  return {
    margin: [0, 3, 0, 0],
    columns: [
      { width: "*", text: label, fontSize: 8.5, bold: true, color: MUTED },
      { width: "auto", text: lines, fontSize: 8.5, bold: true, color: NAVY },
    ],
  };
}

function totalBox({ totals, label, splitPaidPending, t }) {
  const figureLines = Object.entries(totals).map(([code, amount]) => formatMoneyPdf(amount, code));
  const columns = [{
    width: "*",
    stack: [
      { text: label.toUpperCase(), fontSize: 8, bold: true, color: SKY, characterSpacing: 0.5 },
      { text: figureLines.join("  ·  "), fontSize: 20, bold: true, color: "#FFFFFF", margin: [0, 3, 0, 0] },
    ],
  }];
  if (splitPaidPending) {
    const { paid, pending } = splitPaidPending;
    const fmtSplit = (totalsObj) => Object.entries(totalsObj).map(([code, amount]) => formatMoneyPdf(amount, code)).join("  ·  ") || "—";
    columns.push({
      width: "auto",
      alignment: "right",
      stack: [
        { text: `${t("export.paidLabel").toUpperCase()}   ${fmtSplit(paid)}`, fontSize: 7.5, color: "#7FD9A4" },
        { text: `${t("export.pendingLabel").toUpperCase()}   ${fmtSplit(pending)}`, fontSize: 7.5, color: "#F3C382", margin: [0, 4, 0, 0] },
      ],
    });
  }
  return roundedBox({
    height: 64, radius: 10, color: NAVY, topInset: 16, marginTop: 18,
    content: { columns, columnGap: 16 },
  });
}

function pendingBanner(text) {
  return roundedBox({
    height: 27, radius: 8, color: WARNING_BG, topInset: 8, marginTop: 12,
    content: { text, color: WARNING, bold: true, fontSize: 8.5 },
  });
}

export async function generateExportReportPdf({
  school, from, to, data, paymentStatusRows, instructorName, showCollected, includeAdjustments, sumAdjustments, t,
}) {
  ensureFonts();
  const styles = { th: { bold: true, fontSize: 7, color: MUTED, characterSpacing: 0.4 } };

  const now = new Date();
  const generatedLabel = t("export.generatedOn", { date: `${ddmmyyyy(now.toISOString().slice(0, 10))}, ${pad2(now.getHours())}:${pad2(now.getMinutes())}` });
  // Fila corta ("03/09") salvo que el rango cruce un cambio de año — el
  // año completo ya está siempre visible una vez, en la cabecera, así que
  // repetirlo en cada fila solo restaba ancho a la columna (bug real
  // reportado: "las fechas se caen de línea" — 10 caracteres de
  // "dd/mm/yyyy" no cabían en la columna de fecha).
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const rowDate = sameYear ? ddmm : ddmmyyyy;

  const content = [];

  content.push({
    columns: [
      { width: "*", text: school, fontSize: 15, bold: true, color: NAVY },
      { width: "auto", alignment: "right", text: `${ddmmyyyy(from)} – ${ddmmyyyy(to)}\n${instructorName || ""}`, fontSize: 8.5, color: MUTED, lineHeight: 1.3 },
    ],
  });

  if (!showCollected) content.push(pendingBanner(t("export.onlyPendingNote")));

  const pushGroup = (label, color, table, subtotalLabel, totals) => {
    content.push(groupLabel(label, color));
    content.push(table);
    content.push(subtotalLine(subtotalLabel, totals));
  };

  if (data.courses.length > 0) {
    pushGroup(
      t("export.coursesGroup"), TEAL,
      entriesTable({ entries: data.courses, paymentStatusRows, t, kind: "courses", rowDate }),
      t("export.subtotal", { group: t("export.coursesGroup").toLowerCase() }), data.coursesSubtotal
    );
  }
  if (data.commissions.length > 0) {
    pushGroup(
      t("export.commissionsGroup"), GOLD,
      entriesTable({ entries: data.commissions, paymentStatusRows, t, kind: "commissions", rowDate }),
      t("export.subtotal", { group: t("export.commissionsGroup").toLowerCase() }), data.commissionsSubtotal
    );
  }

  const showAdjustmentsBeforeTotal = includeAdjustments && sumAdjustments && data.adjustments.length > 0;
  if (showAdjustmentsBeforeTotal) {
    pushGroup(
      t("export.adjustmentsGroup"), SLATE,
      adjustmentsTable({ entries: data.adjustments, t, rowDate }),
      t("export.subtotal", { group: t("export.adjustmentsGroup").toLowerCase() }), data.adjustmentsSubtotal
    );
  }

  content.push(totalBox({
    totals: data.mainTotal,
    label: t("export.totalLabel"),
    splitPaidPending: showCollected ? { paid: data.paidTotal, pending: data.pendingTotal } : null,
    t,
  }));

  const showAdjustmentsAfterTotal = includeAdjustments && !sumAdjustments && data.adjustments.length > 0;
  if (showAdjustmentsAfterTotal) {
    content.push({ margin: [0, 20, 0, 0], canvas: [{ type: "line", x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.75, lineColor: HAIRLINE, dash: { length: 3 } }] });
    content.push({ margin: [0, 7, 0, 0], text: t("export.adjustmentsAsideNote"), fontSize: 7.5, bold: true, color: "#8095A6", characterSpacing: 0.3 });
    content.push(groupLabel(t("export.adjustmentsGroup"), SLATE));
    content.push(adjustmentsTable({ entries: data.adjustments, t, rowDate }));
  }

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 56, 40, 46],
    header: (currentPage, pageCount) => ({
      margin: [40, 20, 40, 0],
      columns: [
        { width: "*", text: "Ocean Flow", bold: true, fontSize: 11, color: NAVY },
        { width: "auto", text: t("export.page", { current: currentPage, total: pageCount }), fontSize: 8, color: MUTED },
      ],
    }),
    footer: () => ({
      margin: [40, 10, 40, 0],
      columns: [{ width: "*", text: `${t("export.footerNote")} · ${generatedLabel}`, fontSize: 7, color: "#94A3AF" }],
    }),
    content,
    styles,
    defaultStyle: { font: "Roboto" },
  };

  const filename = `Ocean Flow - ${school} - ${from} a ${to}.pdf`;
  await pdfMake.createPdf(docDefinition).download(filename);
}
