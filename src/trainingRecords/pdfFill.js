import { PDFDocument } from "pdf-lib";

// Relleno de un Training Record real a partir del mapeo verificado de
// templateFieldMaps.js. Todo ocurre en cliente (decisión de arquitectura de
// la Fase 5, ver docs/RELEASE-V1-PROGRESS.md) — nada de esto pasa por un
// servidor ni se persiste, ni siquiera de forma temporal: el PDF resultante
// se genera en memoria y se ofrece directamente para descargar.
//
// Los campos de firma (student/parent/instructor en cada plantilla) son
// PDFTextField reales en el PDF original — comprobado con
// scripts/render-training-record-debug.mjs, no son campos de firma nativos
// de PDF — así que no basta con "escribir" en ellos. Para que la firma
// táctil capturada con signature_pad quede en el documento, se dibuja la
// imagen PNG directamente sobre la página en el rectángulo real de ese
// campo (mismo rectángulo que ya usa el propio script de depuración para
// numerar los campos), y el campo de texto se deja vacío. Al final se llama
// a form.flatten(): convierte todos los campos en contenido fijo de la
// página y retira la capa interactiva — el resultado es un documento
// estático, no un formulario reeditable, coherente con que esto es un
// documento de certificación real.
//
// buildFillOperations() está separado de la aplicación real sobre un PDF a
// propósito: es lógica pura (qué campo recibe qué valor, qué fila opcional
// se omite) sin ninguna dependencia de pdf-lib ni de un documento real, así
// que se puede comprobar exhaustivamente con tests unitarios rápidos. La
// aplicación sobre el PDF de verdad (con pdf-lib) se prueba aparte con un
// PDF de prueba mínimo, sin repetir ahí toda la casuística de qué se rellena.

function pushIfValue(list, field, value) {
  if (field && value != null && value !== "") list.push({ field, value: String(value) });
}

// Las fechas (de cada fila de progreso, y las de firma más abajo) se dejan
// deliberadamente SIN RELLENAR por ahora — pedido explícito del usuario
// 2026-09-02, a falta de decidir de dónde sale cada fecha (¿la del propio
// movimiento en Mi trabajo? ¿la que teclee el instructor a mano?). Cuando
// se cierre esa decisión, este es el único sitio que hay que tocar para
// empezar a rellenarlas.
function pushProgressRow(texts, row, values) {
  if (!row || !values) return;
  pushIfValue(texts, row.studentInitials, values.studentInitials);
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
  // sig.instructorDate / sig.studentDate / sig.parentDate: sin rellenar por
  // ahora, ver comentario de pushProgressRow más arriba.

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

async function drawSignature(pdfDoc, page, form, fieldName, signaturePngDataUrl) {
  const field = form.getTextField(fieldName);
  const widget = field.acroField.getWidgets()[0];
  const rect = widget.getRectangle();
  const pngImage = await pdfDoc.embedPng(dataUrlToBytes(signaturePngDataUrl));
  const padding = 2;
  const maxWidth = Math.max(rect.width - padding * 2, 1);
  const maxHeight = Math.max(rect.height - padding * 2, 1);
  const scale = Math.min(maxWidth / pngImage.width, maxHeight / pngImage.height, 1);
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
 * @returns {Promise<Uint8Array>} PDF final, aplanado (ya no editable) —
 *   scope de campos: solo la página 1 (ver templateFieldMaps.js,
 *   "sourcePdfPage: 1"), por eso pdfDoc.getPages()[0] siempre es válido
 *   aquí sin necesitar resolver en qué página vive cada campo.
 */
export async function fillTrainingRecordPdf(pdfBytes, templateMap, data) {
  const { texts, checkboxes, signatures } = buildFillOperations(templateMap, data);

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const page = pdfDoc.getPages()[0];

  texts.forEach(({ field, value }) => form.getTextField(field).setText(value));
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

  form.flatten();
  return pdfDoc.save();
}
