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
import { groupByDayAndActivity } from "./buildExportReportData";

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
const DANGER = "#C2542F";
const MUTED = "#3D5C73";
const MUTED_LIGHT = "#7C93A3";
const HAIRLINE = "#D7E0E8";
// sky-50 — mismo token de fondo "chip/pill info muy suave" documentado en
// docs/DESIGN-SYSTEM.md §4, reutilizado aquí (2026-09-26, pedido
// explícito: "un color de fondo tenue... siguiendo la línea ocean flow")
// como fondo de la cabecera de cada día, en vez de inventar un tono
// nuevo solo para el PDF.
const SKY_50 = "#F1F6FA";

// Enlace real a la app (canónico desde 2026-09-08, ver CLAUDE.md —
// dive-tracker-exgg.vercel.app redirige aquí, este es el que se
// comparte). URL sin protocolo en el texto visible (más limpio de leer
// impreso), pero el `link` sí lleva https:// — un lector de PDF no
// resuelve un enlace relativo sin esquema.
const APP_URL_LABEL = "oceanflow-web.vercel.app";
const APP_URL_LINK = "https://oceanflow-web.vercel.app";

// Mismo SVG que public/brand/logo-mark-navy.svg (el propio isotipo de la
// app, ya en BRAND_NAVY) — copiado aquí en vez de leído por fetch: este
// módulo se importa de forma dinámica bajo demanda (ver la nota de
// arriba) y no tiene acceso a un `fetch` de assets estáticos en todos los
// contextos donde puede correr `generateExportReportPdf`; como marca de
// la app, el archivo cambia muy rara vez, así que una copia local no es
// un riesgo real de desincronización.
const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="345 152 256 238" fill="#063256"><path d="M405.01,195.95c-16.9,18.12-23.56,43.04-21,67.21-.06,7.5,2.3,14.95,4.74,21.99,3.82,11.04,10.37,20.78,18.15,29.89,2.05,2.4,4.21,3.84,6.14,5.69,6.33,6.08,13.79,10.65,21.72,14.47,16.72,8.07,35.61,10.42,54.02,7.15,23.56-4.19,46.4-17.81,59.16-39.8-16.98,14.26-33.92,23.41-54.31,26.26-16.04.97-31.98-1.71-45.52-10.58-5.28-3.46-10.4-7.89-14.23-12.88-5.79-7.56-9.21-16.02-11.26-25.14-1.24-9.7-.4-19.35,3.83-28.46,8.6-18.51,24.19-8.2,37.05-14.59,6.82-3.39,10.78-10.62,7.95-17.88-2.36-6.08-9.47-8.26-15.27-5.8-9.9,4.2-14.51,10.82-22.71,7.12-2.55-3.11-3.42-6.81-1.17-10.78l1.08-1.91c1.76-3.1,3.95-5.96,6.65-8.3,9.22-8,21.1-9.21,32.35-6.36l16.43,7.52c3.77,1.73,8.6,1.1,12.13-1.36,2.57-1.78,5.06-5.27,5.7-9.43,1.24-8.13-3.26-15.21-9.67-19.23-18.77-11.77-54.26-3.39-74.28,9.3,0,0-6.53,3.94-17.69,15.9ZM384.1,250.85s0,0,0,0c0,0,0,.01,0,.02v-.02Z"/><path d="M591.24,247.76c-2.63-23.11-12.63-44.87-27.66-62.57l-8.69-9.2-.78.76,7.93,9.32c14.96,21.04,22.45,46.12,20.84,71.95-2.05,13.39-4.38,26.85-10.55,39.11-4.45,8.85-9.61,17.61-16.26,25.04-8.13,9.07-17.75,17.06-28.24,23.15-23.85,13.87-51.88,18.08-78.84,12.6-2.41-1.4-5.4-1.84-8.07-2.36-24.72-7.73-46.27-23.51-60.63-45.36-9.26-14.09-15.31-30.54-16.98-47.39-1.7-17.15-.29-35.02,5.95-50.96,2.24-5.72,5-11.16,7.93-16.42,2.8-5.03,6.5-9.23,10.14-15.05-5.28,2.68-7.93,8.16-11.41,12.53-4.67,5.87-8.25,12.58-11.54,19.37-6.03,12.46-9.65,26.16-10.8,40.55-.51,6.4-1.73,12.6.15,18.3-.31,9.25,2.14,18.66,4.83,27.35,14.46,46.74,56.67,79.7,105.43,83.32,14.3,1.06,28.88-.53,42.82-4.73,7.98-2.4,15.77-5.62,23.03-9.54,16.91-9.15,31.13-22.13,41.9-37.84,5.64-8.22,9.43-16.85,13.1-26.1,6.95-17.5,8.54-36.91,6.39-55.85ZM468.34,381.42c.1-.03.21-.05.3-.09.02.04.04.06.07.1-.13,0-.24,0-.37,0ZM583.24,247.8c-.02.08-.05.14-.07.23-.03-.08-.05-.16-.09-.25.06,0,.1.01.16.01Z"/></svg>';

// Margen lateral de página — subido de 40 a 60pt (2026-09-26, pedido
// explícito: "más margen a los lados... para q los textos y las
// cantidades queden algo más juntos") tras el rediseño a ancho completo:
// con la tabla ocupando todo CONTENT_WIDTH, el nombre de la actividad y
// su importe quedaban demasiado separados para leerse cómodo. Subido de
// nuevo a 72pt la misma sesión, pedido explícito tras ver el resultado en
// TEST ("los márgenes del documento un poco más grandes, los laterales").
// Fuente única para pageMargins, la cabecera y el pie (los tres deben
// coincidir o el logo/CTA quedarían desalineados con el resto del
// contenido) y para CONTENT_WIDTH.
const MARGIN_X = 72;
// A4 (595.28pt) menos los márgenes laterales de arriba.
const CONTENT_WIDTH = 595.28 - MARGIN_X * 2;

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
    margin: [0, 22, 0, 8],
    text: [
      { text: "●  ", color, fontSize: 7 },
      { text: text.toUpperCase(), bold: true, fontSize: 8, color, characterSpacing: 0.6 },
    ],
  };
}

// Layout de `adjustmentsTable` — única tabla del informe con una
// cabecera de columnas fija (Fecha/Compañero/Concepto/Importe) en vez de
// una cabecera de día repetida. Fondo `SKY_50` en la fila 0 (2026-09-26,
// pedido explícito: "en la tabla de ajuste de curso, iguala el estilo a
// cursos... fondo a la cabecera") — mismo tratamiento que la cabecera de
// día de `dayGroupedLayout`, aquí simplificado porque la cabecera es
// siempre la fila 0, sin necesidad de precalcular un `Set` de índices.
const headerBandLayout = {
  hLineWidth: (i) => (i === 0 ? 0 : 0.75),
  vLineWidth: () => 0,
  hLineColor: () => HAIRLINE,
  fillColor: (i) => (i === 0 ? SKY_50 : null),
  paddingLeft: () => 0,
  paddingRight: () => 8,
  paddingTop: (i) => (i === 0 ? 9 : 7),
  paddingBottom: (i) => (i === 0 ? 9 : 7),
};

// Separador de día más grueso — pedido explícito 2026-09-26: "entre días
// la línea algo más gruesa o algún separador visual para identificar
// donde empieza cada día". Sin esto, la misma línea fina (0.75pt) entre
// TODAS las filas —incluida la que separa un día del siguiente— no
// distinguía dónde empezaba cada grupo. `dayStartRows` recibe el índice
// de fila (dentro de `body`, no de `dayGroups`) de cada cabecera de día
// salvo la primera del todo (esa línea ya es el borde superior de la
// tabla, sin nada que separar antes) — hace falta un layout dedicado, no
// uno compartido como `headerBandLayout`, porque `hLineWidth`/
// `hLineColor` en pdfmake no reciben más contexto que el índice de línea
// `i` (la línea `i` va inmediatamente ENCIMA de la fila `i`), así que
// hace falta ese índice precalculado para decidir cuál engrosar.
// Fondo de la cabecera de día (2026-09-26, pedido explícito: "un color de
// fondo tenue... formato tabla bonito y elegante") — `dayHeaderRows`
// recibe TODAS las filas de cabecera de día (incluida la primera, a
// diferencia de `dayStartRows`, que la excluye porque esa no necesita
// separador). pdfmake sí soporta `fillColor` como función de layout
// `(rowIndex, node, colIndex)` — igual que `hLineWidth`/`hLineColor`, no
// hace falta fijarlo celda a celda. Más aire vertical (9pt) solo en esas
// filas para que la banda de color no quede apretada — el resto de la
// tabla sigue a 7pt. `paddingLeft`/`paddingRight` de pdfmake son por
// COLUMNA, no por fila (confirmado en el código fuente instalado), así
// que el texto de la cabecera sigue a ras del margen de página, igual
// que el resto del documento (cabecera, aviso, total) — insertar un
// hueco lateral solo aquí rompería esa alineación común en vez de
// mejorarla.
function dayGroupedLayout(dayStartRows, dayHeaderRows) {
  return {
    hLineWidth: (i) => (i === 0 ? 0 : dayStartRows.has(i) ? 1.5 : 0.75),
    vLineWidth: () => 0,
    hLineColor: (i) => (dayStartRows.has(i) ? MUTED_LIGHT : HAIRLINE),
    fillColor: (i) => (dayHeaderRows.has(i) ? SKY_50 : null),
    paddingLeft: () => 0,
    paddingRight: () => 8,
    paddingTop: (i) => (dayHeaderRows.has(i) ? 9 : 7),
    paddingBottom: (i) => (dayHeaderRows.has(i) ? 9 : 7),
  };
}

// Segunda vuelta del rediseño de tabla (2026-09-18) — la primera
// (columna de actividad a ancho estimado por caracteres + tabla
// centrada más estrecha que el resto del documento) generaba justo la
// queja siguiente: "ahora es todo demasiado estrecho y los totales y
// cabeceras son a todo lo ancho... queda ridículo". Aprobado por mockup
// (ver artifact de la sesión) antes de tocar este archivo: un único
// ancho para TODO el documento — la tabla vuelve a ir a CONTENT_WIDTH
// completo, igual que la cabecera, el aviso y la caja de total, con la
// columna de actividad a `"*"` (rellena lo que sobra) en vez de un
// ancho estimado por caracteres. Se retira toda la heurística de ancho
// de texto y el truco de centrado — ya no hacen falta.
const AMOUNT_COL = 96;

// Tabla agrupada por día y, dentro de cada día, por actividad+estado —
// sustituye a la antigua "una fila por movimiento" (pedido explícito tras
// generar un informe real: muchas sesiones idénticas del mismo curso el
// mismo día se imprimían como filas repetidas, y la tabla de 5 columnas se
// leía muy ancha y desperdigada en un PDF que se abre sobre todo en el
// móvil).
// Cabecera de día (2026-09-18, aprobado por mockup): ya no es una banda
// de color sólido tipo hoja de cálculo — es una fecha + total del día.
// La línea justo encima de cada cabecera de día (salvo la primera del
// informe) es más gruesa y de un gris más marcado que el resto de
// hairlines de la tabla (`dayGroupedLayout`, ver más abajo) — pedido
// explícito 2026-09-26: "entre días la línea algo más gruesa... para
// identificar donde empieza cada día", ya que con el mismo grosor en
// toda la tabla no había forma de distinguir a golpe de vista dónde
// terminaba un día y empezaba el siguiente.
// Pesos, segunda corrección (2026-09-26, pedido explícito: "no era en un
// tono más oscuro, es alterar el tamaño... para darle más peso a la
// cabecera, como en todos los listados") — el primer intento (2026-09-26,
// ya revertido) le dio más peso a la cabecera de día solo con color; el
// pedido real era de TAMAÑO: la cabecera de día pasa a ser el texto más
// grande de la fila (12.5pt, el que antes tenía la actividad) y la
// actividad baja al tamaño que antes tenía la cabecera de día (10.5pt) —
// intercambiados sin más, para que la cabecera de día domine igual que el
// encabezado de grupo en el resto de listados de la app.
// Formato "N × Actividad" (p. ej. "2 × Refresh"), como una línea de
// factura, en vez de "Refresh" + "2 personas" en el detalle aparte —
// pedido explícito 2026-09-26 para Cursos, extendido a Comisiones la
// misma sesión ("ajusta también los estilos de las comisiones para ser
// igual a cursos impartidos") — ya no hace falta un flag por grupo,
// las dos tablas comparten el mismo formato siempre. "N sesiones" se
// retira de la línea de detalle (pedido explícito: "ya está indicado en
// el número que va por delante del nombre del curso") — el conteo de
// personas ya vive en el título, así que la línea de detalle solo le
// queda el estado (Cobrado/Pendiente) cuando `showCollected` está
// activo; sin eso, la mayoría de filas no llevan segunda línea.
function groupedActivityTable({ dayGroups, showCollected, paymentStatusRows, t, rowDate }) {
  const body = [];
  const dayStartRows = new Set();
  const dayHeaderRows = new Set();
  dayGroups.forEach((day, dayIndex) => {
    if (dayIndex > 0) dayStartRows.add(body.length);
    dayHeaderRows.add(body.length);
    const dayTotalText = Object.entries(day.dayTotal).map(([code, amount]) => formatMoneyPdf(amount, code)).join("  ·  ");
    body.push([
      { text: rowDate(day.date), bold: true, fontSize: 12.5, color: MUTED, characterSpacing: 0.3 },
      { text: dayTotalText, bold: true, fontSize: 12.5, color: MUTED, alignment: "right" },
    ]);
    day.groups.forEach((g) => {
      const captionParts = [];
      if (showCollected) captionParts.push(isPendingStatus(g.status, paymentStatusRows) ? t("export.pendingLabel") : t("export.paidLabel"));
      const titleText = `${g.people} × ${g.activity}`;
      body.push([
        {
          stack: [
            { text: titleText, bold: true, fontSize: 10.5, color: "#1E2A33" },
            ...(captionParts.length > 0 ? [{ text: captionParts.join("  ·  "), fontSize: 9.5, color: MUTED_LIGHT, margin: [0, 2, 0, 0] }] : []),
          ],
        },
        { text: formatMoneyPdf(g.total, g.currency), alignment: "right", bold: true, color: NAVY, fontSize: 10.5 },
      ]);
    });
  });
  return { table: { widths: ["*", AMOUNT_COL], body }, layout: dayGroupedLayout(dayStartRows, dayHeaderRows) };
}

// Ancho a juego con `groupedActivityTable`/`subtotalLine` — mismo AMOUNT_COL
// para que el importe de ajustes quede alineado en la misma columna que el
// resto del informe. "Concepto" a `"*"` en vez de un ancho fijo, igual que
// la columna de actividad de arriba.
// Estilo igualado a Cursos (2026-09-26, pedido explícito: "iguala el
// estilo a cursos, no el formato que es diferente en sí, solo el
// estilo: pesos de los totales con respecto a conceptos, fondo a la
// cabecera") — el FORMATO sigue siendo genuinamente distinto (4 columnas
// tabulares: fecha/compañero/concepto/importe, no el título+detalle
// apilado de Cursos), pero los PESOS relativos ahora son los mismos:
// "Concepto" (lo más parecido a la actividad) pasa a 10.5pt en negrita
// y casi negro, igual que el título de una fila de Cursos; "Importe"
// baja de 11pt a 10.5pt para quedar al mismo tamaño que "Concepto" (ya
// era negrita); "Fecha"/"Compañero" pasan a un tono secundario (9.5pt,
// MUTED_LIGHT, sin negrita), el mismo tratamiento que la línea de
// detalle de Cursos. El color por signo de "Importe" (verde/rojo) se
// mantiene — es una señal real (cobro a favor o en contra), no solo
// decorativa, así que no se sustituye por el NAVY plano de Cursos.
function adjustmentsTable({ entries, t, rowDate }) {
  const header = [
    { text: t("export.colDate"), style: "th" },
    { text: t("export.colColleague"), style: "th" },
    { text: t("export.colConcept"), style: "th" },
    { text: t("export.colAmount"), style: "th", alignment: "right" },
  ];
  const body = entries.map((e) => [
    { text: rowDate(e.date), fontSize: 9.5, color: MUTED_LIGHT, noWrap: true },
    { text: e.colleague_name, fontSize: 9.5, color: MUTED_LIGHT },
    { text: e.notes || "—", bold: true, fontSize: 10.5, color: "#1E2A33" },
    { text: formatMoneyPdf(e.total, e.currency), alignment: "right", bold: true, color: e.total < 0 ? DANGER : SUCCESS, fontSize: 10.5 },
  ]);
  return { table: { headerRows: 1, widths: [55, 150, "*", AMOUNT_COL], body: [header, ...body] }, layout: headerBandLayout };
}

// fontSize por defecto (9.5) para Comisiones/Ajustes; Cursos pide el
// mismo tamaño que la cabecera de día (2026-09-26, pedido explícito:
// "quiero el subtotal por cursos... igual de grande que el día (la
// cabecera de día)") — 12.5pt, igual que `groupedActivityTable` arriba.
// Solo Cursos por ahora, Comisiones/Ajustes no lo pidieron.
function subtotalLine(label, totals, fontSize = 9.5) {
  const lines = Object.entries(totals).map(([code, amount]) => formatMoneyPdf(amount, code)).join("  ·  ");
  return {
    margin: [0, 6, 0, 0],
    columns: [
      { width: "*", text: label, fontSize, bold: true, color: MUTED },
      { width: AMOUNT_COL, text: lines, fontSize, bold: true, color: NAVY, alignment: "right" },
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

export async function generateExportReportPdf({
  school, from, to, data, paymentStatusRows, instructorName, showCollected, includeAdjustments, sumAdjustments, t,
}) {
  ensureFonts();
  const styles = { th: { bold: true, fontSize: 8.5, color: MUTED, characterSpacing: 0.4 } };

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

  // El aviso "solo pendiente de cobro" se retiró (2026-09-18, pedido
  // explícito: "quita la banda de info... este listado solo refleja los
  // pagos pendientes") — con cobrados ocultos por defecto, todo el
  // informe ya son importes pendientes sin necesidad de decirlo aparte.

  const courseDayGroups = groupByDayAndActivity(data.courses);
  const commissionDayGroups = groupByDayAndActivity(data.commissions);

  // pushGroup empuja etiqueta+tabla+subtotal seguidos, todos a
  // CONTENT_WIDTH — ya no hace falta envolverlos en ningún bloque
  // centrado (ver AMOUNT_COL arriba): todo el documento comparte un
  // único ancho.
  const pushGroup = (label, color, table, subtotalLabel, totals, subtotalFontSize) => {
    content.push(groupLabel(label, color), table, subtotalLine(subtotalLabel, totals, subtotalFontSize));
  };

  if (data.courses.length > 0) {
    pushGroup(
      t("export.coursesGroup"), TEAL,
      groupedActivityTable({ dayGroups: courseDayGroups, showCollected, paymentStatusRows, t, rowDate }),
      t("export.subtotal", { group: t("export.coursesGroup").toLowerCase() }), data.coursesSubtotal, 12.5
    );
  }
  if (data.commissions.length > 0) {
    pushGroup(
      t("export.commissionsGroup"), GOLD,
      groupedActivityTable({ dayGroups: commissionDayGroups, showCollected, paymentStatusRows, t, rowDate }),
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
    pageMargins: [MARGIN_X, 56, MARGIN_X, 46],
    // Isotipo real de la app (no solo el nombre en texto) + nombre —
    // pedido explícito del usuario 2026-09-18: "branding de Ocean Flow
    // en el pdf, logo... todo debe ser 100% corporativo línea y marca
    // Ocean Flow". `columns` anidadas (no `stack`) para que el logo y el
    // texto se alineen en la misma línea de base sin depender de un
    // `margin` a ojo — mismo patrón que usa la propia cabecera de la app
    // (App.jsx, icono + "Ocean Flow" en fila).
    header: (currentPage, pageCount) => ({
      margin: [MARGIN_X, 20, MARGIN_X, 0],
      columns: [
        {
          width: "*",
          columns: [
            { svg: LOGO_SVG, width: 13, height: 12.1 },
            { width: "auto", text: "Ocean Flow", bold: true, fontSize: 11, color: NAVY, margin: [6, 0.5, 0, 0] },
          ],
          columnGap: 0,
        },
        { width: "auto", text: t("export.page", { current: currentPage, total: pageCount }), fontSize: 8, color: MUTED },
      ],
    }),
    // Pie con CTA real hacia la app (pedido explícito: "logo, cta, url de
    // la app") — reutiliza el eslogan ya existente del login
    // (auth:login.tagline, "Bucea más. Gestiona menos.") en vez de
    // inventar un texto de marketing nuevo, y el enlace es clicable de
    // verdad (`link`, no solo texto con pinta de URL) para quien reciba
    // el PDF y quiera curiosear la app. Discreto a propósito — dos líneas
    // de 7pt en gris apagado, no un banner: el documento sigue siendo
    // sobre todo el cuadre de cuentas con la escuela. `stack` (no dos
    // propiedades `footer`/`footerBottom` separadas — pdfmake solo
    // reconoce una única función `footer` en la definición del
    // documento, cualquier otra clave se ignora en silencio, sin error):
    // la nota de generación automática va en su propia línea para que no
    // compita con el CTA en el mismo run de texto ni fuerce un salto de
    // línea impredecible según cuánto ocupe cada uno.
    footer: () => ({
      margin: [MARGIN_X, 10, MARGIN_X, 0],
      stack: [
        {
          text: [
            { text: "Ocean Flow", bold: true, color: SLATE },
            { text: ` — ${t("export.tagline")} · ` },
            { text: APP_URL_LABEL, link: APP_URL_LINK, color: TEAL },
          ],
          fontSize: 7,
          color: "#94A3AF",
        },
        { text: `${t("export.footerNote")} · ${generatedLabel}`, fontSize: 7, color: "#94A3AF", margin: [0, 2, 0, 0] },
      ],
    }),
    content,
    styles,
    defaultStyle: { font: "Roboto" },
  };

  const filename = `Ocean Flow - ${school} - ${from} a ${to}.pdf`;
  await pdfMake.createPdf(docDefinition).download(filename);
}
