import { PDFDocument, PDFName, StandardFonts, rgb } from "pdf-lib";

// Relleno de un Training Record real a partir del mapeo verificado de
// templateFieldMaps.js. Todo ocurre en cliente (decisión de arquitectura de
// la Fase 5, ver docs/RELEASE-V1-PROGRESS.md) — nada de esto pasa por un
// servidor ni se persiste, ni siquiera de forma temporal: el PDF resultante
// se genera en memoria y se ofrece directamente para descargar.
//
// Los valores de texto se DIBUJAN directamente sobre la página
// (page.drawText), no se escriben con form.getTextField(...).setText() —
// dos motivos, los dos pedidos explícitos del usuario (2026-09-02):
// 1. Todo lo que rellena el instructor debe verse en mayúscula, en el color
//    de marca de Ocean Flow (no el negro de la plantilla) y con una fuente
//    parecida a la de la plantilla — la apariencia que genera pdf-lib para
//    un form field usa la fuente/color por defecto del propio campo (DA del
//    PDF original), sin control fino sobre esto.
// 2. El texto debe quedar centrado y por encima de la línea impresa del
//    campo, nunca tapado por ella — dibujar a mano, con la posición vertical
//    calculada desde el propio rectángulo del campo (igual que ya hacía
//    drawSignature), da ese control; la apariencia automática de un form
//    field no lo permite de forma fiable.
// Los campos de texto originales se dejan siempre vacíos (nunca
// form.getTextField(...).setText()) — sirven solo para localizar la
// posición real de cada dato (getFieldRect), igual que ya hacía
// drawSignature con los campos de firma.
//
// Los campos de firma (student/parent/instructor en cada plantilla) son
// PDFTextField reales en el PDF original — comprobado con
// scripts/render-training-record-debug.mjs, no son campos de firma nativos
// de PDF — así que tampoco basta con "escribir" en ellos: se dibuja la
// imagen PNG capturada con signature_pad directamente sobre la página, en
// el rectángulo real de ese campo. Al final se llama a form.flatten():
// retira la capa interactiva (campos vacíos + checkboxes) — el resultado es
// un documento estático, no un formulario reeditable, coherente con que
// esto es un documento de certificación real.
//
// buildFillOperations() está separado de la aplicación real sobre un PDF a
// propósito: es lógica pura (qué campo recibe qué valor, qué fila opcional
// se omite) sin ninguna dependencia de pdf-lib ni de un documento real, así
// que se puede comprobar exhaustivamente con tests unitarios rápidos. La
// aplicación sobre el PDF de verdad (con pdf-lib) se prueba aparte con un
// PDF de prueba mínimo, sin repetir ahí toda la casuística de qué se rellena.

const BRAND_COLOR = rgb(0.0588, 0.4627, 0.4314); // TEAL de Ocean Flow (src/colors.js) — nunca el negro de la plantilla.

function pushIfValue(list, field, value) {
  if (field && value != null && value !== "") list.push({ field, value: String(value) });
}

// Una fila de progreso son 4 campos consecutivos (Iniciales del Alumno,
// Fecha, Iniciales del Instructor, Número SSI Pro) — `date` llega ya
// formateada (DD/MM/AA, ver formatDateDDMMYY en TrainingRecordsTab.jsx),
// nunca un objeto Date: mantiene esta función pura/testable sin depender de
// la fecha real del sistema.
function pushProgressRow(texts, row, values) {
  if (!row || !values) return;
  pushIfValue(texts, row.studentInitials, values.studentInitials);
  pushIfValue(texts, row.date, values.date);
  pushIfValue(texts, row.instructorInitials, values.instructorInitials);
  pushIfValue(texts, row.instructorNumber, values.instructorNumber);
}

/**
 * Traduce los datos de un alumno (roster + formulario del registro) a la
 * lista plana de operaciones que hay que aplicar sobre el PDF: qué campo de
 * texto recibe qué valor, qué casilla queda marcada/desmarcada, y qué
 * firmas hay que dibujar. No toca ningún PDF — pura función de datos, para
 * poder probar toda la casuística sin construir un documento real.
 */
export function buildFillOperations(templateMap, data) {
  const texts = [];
  const checkboxes = [];
  const signatures = [];

  pushIfValue(texts, templateMap.fields.firstName, data.firstName);
  pushIfValue(texts, templateMap.fields.lastName, data.lastName);

  (templateMap.sessionRows || []).forEach((row, i) => pushProgressRow(texts, row, data.sessionRows?.[i]));

  if (templateMap.examVersion) {
    checkboxes.push({ field: templateMap.examVersion.printed, checked: data.examVersion === "printed" });
    checkboxes.push({ field: templateMap.examVersion.online, checked: data.examVersion === "online" });
  }
  if (templateMap.upgradeCheckboxes) {
    checkboxes.push({ field: templateMap.upgradeCheckboxes.scubaDiver, checked: data.upgrade === "scubaDiver" });
    checkboxes.push({ field: templateMap.upgradeCheckboxes.openWaterDiver, checked: data.upgrade === "openWaterDiver" });
  }
  if (templateMap.courseVariant) {
    checkboxes.push({ field: templateMap.courseVariant.ean32, checked: data.courseVariant === "ean32" });
    checkboxes.push({ field: templateMap.courseVariant.ean40, checked: data.courseVariant === "ean40" });
  }
  if (templateMap.examConfirmation) pushProgressRow(texts, templateMap.examConfirmation, data.examConfirmation);

  (templateMap.optionalSpecialtyDives || []).forEach((dive, i) => {
    const values = data.specialtyDives?.[i];
    if (!values) return;
    pushIfValue(texts, dive.specialtyName, values.specialtyName);
    pushProgressRow(texts, dive.poolSession, values.poolSession);
    pushProgressRow(texts, dive.completed, values.completed);
  });

  const sig = templateMap.signatures;
  pushIfValue(texts, sig.instructorNamePrinted, data.instructor?.namePrinted);
  pushIfValue(texts, sig.instructorNumber, data.instructor?.number);
  // Fecha de firma: SIEMPRE la fecha de generación del PDF (pedido
  // explícito del usuario, 2026-09-02), igual para las 3 firmas y para
  // cualquier plantilla — nunca una fecha distinta por firma.
  pushIfValue(texts, sig.studentDate, data.generatedAtLabel);
  pushIfValue(texts, sig.parentDate, data.generatedAtLabel);
  pushIfValue(texts, sig.instructorDate, data.generatedAtLabel);

  if (sig.student && data.signatures?.studentPng) signatures.push({ field: sig.student, dataUrl: data.signatures.studentPng });
  if (sig.parent && data.signatures?.parentPng) signatures.push({ field: sig.parent, dataUrl: data.signatures.parentPng });
  if (sig.instructor && data.signatures?.instructorPng) signatures.push({ field: sig.instructor, dataUrl: data.signatures.instructorPng });

  return { texts, checkboxes, signatures };
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Las 4 plantillas activas (verificado con las 4, no solo una) tienen cada
// campo de su AcroForm con un /Parent que apunta, por error del generador
// original del PDF, al propio diccionario AcroForm (que tiene /Fields, no
// /Kids) en vez de a un campo padre real o no tener /Parent en absoluto. Como
// el campo SÍ está listado directamente en AcroForm.Fields, pdf-lib no lo
// necesita para nada — pero su `form.flatten()` sigue el /Parent roto,
// intenta buscar el campo dentro de los (inexistentes) /Kids de ese "padre",
// y lanza "Tried to remove inexistent field" para el primer campo de
// cualquier plantilla, sin excepción. Sin este saneado, generar cualquier
// Training Record fallaba siempre — no es un caso límite de una plantilla
// concreta.
function stripBrokenParentRefs(pdfDoc, form) {
  for (const field of form.getFields()) {
    const acroDict = field.acroField.dict;
    const parentRef = acroDict.get(PDFName.of("Parent"));
    if (!parentRef) continue;
    const parentDict = pdfDoc.context.lookup(parentRef);
    if (!parentDict || !parentDict.get(PDFName.of("Kids"))) {
      acroDict.delete(PDFName.of("Parent"));
    }
  }
}

function getFieldRect(form, fieldName) {
  const field = form.getTextField(fieldName);
  return field.acroField.getWidgets()[0].getRectangle();
}

// Tamaño de fuente que quepa en el alto real del campo, con un límite
// razonable — los campos de firma/nombre son más altos que una fila de
// progreso normal, no tiene sentido un mismo tamaño fijo para todos.
function fontSizeForRect(rect) {
  return Math.max(Math.min(rect.height * 0.55, 10), 6);
}

// Centrado horizontal, y verticalmente por ENCIMA de la línea impresa del
// campo (pedido explícito del usuario: "nunca que la línea los tape") — la
// línea vive en el propio arte estático de la plantilla, alineada con la
// parte baja del rectángulo del campo, así que el texto se ancla a una
// fracción de esa altura en vez de centrarse en el medio del campo (que
// dejaría parte del texto por debajo de la línea).
function drawFieldText(page, font, rect, text) {
  const size = fontSizeForRect(rect);
  const upper = text.toUpperCase();
  const width = font.widthOfTextAtSize(upper, size);
  const x = rect.x + Math.max((rect.width - width) / 2, 1);
  const y = rect.y + rect.height * 0.38;
  page.drawText(upper, { x, y, size, font, color: BRAND_COLOR });
}

// scale sin tope de 1x (a diferencia de antes) — pedido explícito del
// usuario: las firmas se veían demasiado pequeñas, y "si parte de la firma
// cae sobre la línea, no pasa nada" — SIGNATURE_BOOST permite que ocupen
// más que su rectángulo original, siempre centradas sobre el mismo punto.
const SIGNATURE_BOOST = 1.7;

async function drawSignature(pdfDoc, page, form, fieldName, signaturePngDataUrl) {
  const rect = getFieldRect(form, fieldName);
  const pngImage = await pdfDoc.embedPng(dataUrlToBytes(signaturePngDataUrl));
  const padding = 2;
  const maxWidth = Math.max(rect.width - padding * 2, 1) * SIGNATURE_BOOST;
  const maxHeight = Math.max(rect.height - padding * 2, 1) * SIGNATURE_BOOST;
  const scale = Math.min(maxWidth / pngImage.width, maxHeight / pngImage.height);
  const width = pngImage.width * scale;
  const height = pngImage.height * scale;
  page.drawImage(pngImage, {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  });
}

/**
 * Rellena una plantilla de Training Record con los datos de un alumno.
 *
 * @param {Uint8Array} pdfBytes - bytes del PDF original (descargado de
 *   Supabase Storage, sin modificar).
 * @param {object} templateMap - una entrada de TEMPLATE_FIELD_MAPS.
 * @param {object} data - ver forma esperada en TrainingRecordsTab.jsx.
 * @returns {Promise<Uint8Array>} PDF final, aplanado (ya no editable) y con
 *   una única página — la de templateMap.sourcePdfPage, cualquier otra
 *   página que trajera la plantilla original (p. ej. la página 2 de OWD,
 *   finalización de Referral/Scuba/Indoor Diver, fuera de alcance) se
 *   retira antes de guardar.
 */
export async function fillTrainingRecordPdf(pdfBytes, templateMap, data) {
  const { texts, checkboxes, signatures } = buildFillOperations(templateMap, data);

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const pageIndex = (templateMap.sourcePdfPage || 1) - 1;
  const page = pdfDoc.getPages()[pageIndex];
  // Helvetica: fuente estándar de PDF (no hace falta incrustar un archivo
  // de fuente aparte), visualmente muy próxima a la fuente sans-serif que
  // ya usan estas plantillas — pedido explícito del usuario ("una fuente
  // similar a la de la plantilla").
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  texts.forEach(({ field, value }) => drawFieldText(page, font, getFieldRect(form, field), value));
  checkboxes.forEach(({ field, checked }) => {
    if (!field) return;
    const checkbox = form.getCheckBox(field);
    if (checked) checkbox.check();
    else checkbox.uncheck();
  });
  for (const { field, dataUrl } of signatures) {
    // eslint-disable-next-line no-await-in-loop -- cada imagen depende del PDFDocument compartido, no son independientes
    await drawSignature(pdfDoc, page, form, field, dataUrl);
  }

  stripBrokenParentRefs(pdfDoc, form);
  form.flatten();
  // Solo se genera/rellena la página con los campos del curso (ver
  // sourcePdfPage) — OWD trae una página 2 adicional en la plantilla
  // original (finalización de Referral/Scuba/Indoor Diver, fuera del
  // camino principal, no mapeada) que antes se colaba entera y en blanco
  // en el PDF final. Se retira cualquier otra página, de atrás hacia
  // adelante para no desplazar los índices todavía por retirar.
  for (let i = pdfDoc.getPageCount() - 1; i >= 0; i--) {
    if (i !== pageIndex) pdfDoc.removePage(i);
  }
  return pdfDoc.save();
}
