import { formatDateDDMMYY, todayIso } from "./dateFormat";

// Lógica de negocio del formulario de configuración del documento —
// separada de StudentRecordSheet.jsx (UI) para poder probarla a fondo sin
// montar componentes. Cubre: valores por defecto de un registro nuevo,
// validación de campos obligatorios antes de generar, y la traducción
// final a la forma que espera pdfFill.js (fechas ya en formato DD/MM/AA).
//
// Cada fila de progreso del curso lleva su propia fecha, seleccionable a
// mano directamente desde esa fila (pedido explícito del usuario,
// corrección 2026-09-02) — no hay agrupación de filas bajo una fecha
// compartida de "Día 1"/"Día 2".

export function buildDefaultConfig(templateMap) {
  return {
    includedRows: (templateMap?.sessionRows || []).map((row) => !row.optional),
    rowDates: {},
    examVersion: templateMap?.examVersion ? "online" : null, // premarcado Online — pedido explícito del usuario.
    upgrade: templateMap?.upgradeCheckboxes ? "openWaterDiver" : null,
    courseVariant: null,
    examConfirmed: false,
    examConfirmedDate: null,
    specialtyDives: (templateMap?.optionalSpecialtyDives || []).map(() => ({ adventureId: null, adventureName: "", completed: false, date: null })),
    signatures: { studentPng: null, parentPng: null },
  };
}

// Validación de los campos obligatorios del documento (pedido explícito
// del usuario): versión de examen, certificación, confirmación de examen
// final y firma del alumno cuando la plantilla tiene esa sección; al menos
// una fila de progreso marcada siempre; cada fila marcada (de progreso, de
// inmersión de especialidad completada, o la confirmación de examen)
// necesita su propia fecha.
export function validateRecordConfig(templateMap, config) {
  const errors = {};
  if (!config.includedRows.some(Boolean)) errors.rows = "Marca al menos una fila del progreso del curso.";

  const rowDateErrors = {};
  (templateMap.sessionRows || []).forEach((row, i) => {
    if (config.includedRows[i] && !config.rowDates[i]) rowDateErrors[i] = "Falta la fecha de esta fila.";
  });
  if (Object.keys(rowDateErrors).length > 0) errors.rowDates = rowDateErrors;

  const specialtyDateErrors = {};
  (templateMap.optionalSpecialtyDives || []).forEach((_, i) => {
    const dive = config.specialtyDives?.[i];
    if (dive?.adventureId && !dive.date) specialtyDateErrors[i] = "Falta la fecha de esta inmersión.";
  });
  if (Object.keys(specialtyDateErrors).length > 0) errors.specialtyDates = specialtyDateErrors;

  if (templateMap.examVersion && !config.examVersion) errors.examVersion = "Elige la versión del examen.";
  if (templateMap.upgradeCheckboxes && !config.upgrade) errors.upgrade = "Elige la certificación.";
  if (templateMap.examConfirmation) {
    if (!config.examConfirmed) errors.examConfirmation = "Confirma que se ha completado el examen final.";
    else if (!config.examConfirmedDate) errors.examConfirmationDate = "Falta la fecha de la confirmación de examen.";
  }
  if (!config.signatures?.studentPng) errors.studentSignature = "Falta la firma del alumno.";
  return { valid: Object.keys(errors).length === 0, errors };
}

function rowValues(studentInitials, dateIso, config, instructor) {
  return {
    studentInitials,
    date: formatDateDDMMYY(dateIso),
    instructorInitials: instructor.initials,
    instructorNumber: instructor.number,
  };
}

/**
 * Traduce el estado del formulario (config) a la forma que espera
 * fillTrainingRecordPdf: cada fila lleva su propia fecha ya elegida a
 * mano, y la fecha de firma es siempre hoy.
 */
export function buildFillData(templateMap, student, config, instructor) {
  const sessionRows = (templateMap.sessionRows || []).map((row, i) => {
    if (!config.includedRows[i]) return null;
    return rowValues(student.initials, config.rowDates[i], config, instructor);
  });

  const specialtyDives = (templateMap.optionalSpecialtyDives || []).map((_, i) => {
    const values = config.specialtyDives?.[i];
    if (!values?.adventureId) return null;
    // Pedido explícito: solo se rellena la fila de "Completada" — la de
    // "Sesión en la Piscina" se deja siempre sin usar desde este combo.
    return {
      specialtyName: values.adventureName,
      poolSession: null,
      completed: rowValues(student.initials, values.date, config, instructor),
    };
  });

  return {
    firstName: student.firstName,
    lastName: student.lastName,
    sessionRows,
    examVersion: config.examVersion,
    upgrade: config.upgrade,
    courseVariant: config.courseVariant,
    examConfirmation: templateMap.examConfirmation ? rowValues(student.initials, config.examConfirmedDate, config, instructor) : null,
    specialtyDives,
    instructor: { namePrinted: instructor.namePrinted, number: instructor.number },
    signatures: { studentPng: config.signatures?.studentPng, parentPng: config.signatures?.parentPng, instructorPng: instructor.signature },
    generatedAtLabel: formatDateDDMMYY(todayIso()),
  };
}
