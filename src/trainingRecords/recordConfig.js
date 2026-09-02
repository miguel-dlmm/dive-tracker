import { formatDateDDMMYY, todayIso } from "./dateFormat";

// Lógica de negocio del formulario de configuración del documento —
// separada de StudentRecordSheet.jsx (UI) para poder probarla a fondo sin
// montar componentes. Cubre: valores por defecto de un registro nuevo, qué
// grupos de fecha (Día 1/2/3) hay que pedir según la plantilla y lo que ya
// se ha marcado, validación de campos obligatorios antes de generar, y la
// traducción final a la forma que espera pdfFill.js (fechas ya aplicadas a
// cada fila, ya en formato DD/MM/AA).

export function buildDefaultConfig(templateMap) {
  return {
    includedRows: (templateMap?.sessionRows || []).map((row) => !row.optional),
    examVersion: templateMap?.examVersion ? "online" : null, // premarcado Online — pedido explícito del usuario.
    upgrade: templateMap?.upgradeCheckboxes ? "openWaterDiver" : null,
    courseVariant: null,
    examConfirmed: false,
    specialtyDives: (templateMap?.optionalSpecialtyDives || []).map(() => ({ adventureId: null, adventureName: "", completed: false })),
    signatures: { studentPng: null, parentPng: null },
    dayDates: {},
  };
}

// Los días "posibles" de una plantilla (no necesariamente activos todavía)
// — determina si es una plantilla de un solo día (SC-DD/SC-EAN: un único
// selector genérico "Fecha del curso") o de varios (OWD/AOWD: "Día 1",
// "Día 2"...).
function possibleDays(templateMap) {
  const fromRows = (templateMap?.sessionRows || []).map((r) => r.day || 1);
  const fromDives = templateMap?.optionalSpecialtyDives?.length ? [2] : [];
  return [...new Set([1, ...fromRows, ...fromDives])].sort((a, b) => a - b);
}

// Los días REALMENTE activos ahora mismo, según qué filas opcionales están
// marcadas y si hay alguna aventura elegida — Día 1 siempre está presente
// (pedido explícito: "siempre se pedirá la fecha de inicio del curso").
export function activeDayGroups(templateMap, config) {
  const days = new Set([1]);
  (templateMap?.sessionRows || []).forEach((row, i) => {
    if (!row.optional || config.includedRows[i]) days.add(row.day || 1);
  });
  if (templateMap?.optionalSpecialtyDives && config.specialtyDives?.some((d) => d.adventureId)) days.add(2);
  return [...days].sort((a, b) => a - b);
}

export function dayGroupLabels(templateMap) {
  const multiDay = possibleDays(templateMap).length > 1;
  return multiDay ? { 1: "Día 1", 2: "Día 2", 3: "Día 3" } : { 1: "Fecha del curso" };
}

// Validación de los campos obligatorios del documento (pedido explícito
// del usuario): versión de examen, certificación, confirmación de examen
// final y firma del alumno cuando la plantilla tiene esa sección; al menos
// una fila de progreso marcada siempre; la fecha del Día 1 siempre. No
// exige una sección que la plantilla no tiene (p. ej. AOWD no tiene
// versión de examen).
export function validateRecordConfig(templateMap, config) {
  const errors = {};
  if (!config.includedRows.some(Boolean)) errors.rows = "Marca al menos una fila del progreso del curso.";
  if (!config.dayDates[1]) errors.day1 = "La fecha de inicio del curso es obligatoria.";
  if (templateMap.examVersion && !config.examVersion) errors.examVersion = "Elige la versión del examen.";
  if (templateMap.upgradeCheckboxes && !config.upgrade) errors.upgrade = "Elige la certificación.";
  if (templateMap.examConfirmation && !config.examConfirmed) errors.examConfirmation = "Confirma que se ha completado el examen final.";
  if (!config.signatures?.studentPng) errors.studentSignature = "Falta la firma del alumno.";
  return { valid: Object.keys(errors).length === 0, errors };
}

function rowValues(studentInitials, day, config, instructor) {
  return {
    studentInitials,
    date: formatDateDDMMYY(config.dayDates[day]),
    instructorInitials: instructor.initials,
    instructorNumber: instructor.number,
  };
}

/**
 * Traduce el estado del formulario (config) a la forma que espera
 * fillTrainingRecordPdf: cada fila ya lleva su fecha del día que le toca,
 * la fecha de examen es la más tardía de los días activos ("el último
 * día", pedido explícito), y la fecha de firma es siempre hoy.
 */
export function buildFillData(templateMap, student, config, instructor) {
  const activeDays = activeDayGroups(templateMap, config);
  const lastActiveDay = Math.max(...activeDays);

  const sessionRows = (templateMap.sessionRows || []).map((row, i) => {
    if (!config.includedRows[i]) return null;
    return rowValues(student.initials, row.day || 1, config, instructor);
  });

  const specialtyDives = (templateMap.optionalSpecialtyDives || []).map((_, i) => {
    const values = config.specialtyDives?.[i];
    if (!values?.adventureId) return null;
    // Pedido explícito: solo se rellena la fila de "Completada" — la de
    // "Sesión en la Piscina" se deja siempre sin usar desde este combo.
    return {
      specialtyName: values.adventureName,
      poolSession: null,
      completed: rowValues(student.initials, 2, config, instructor),
    };
  });

  return {
    firstName: student.firstName,
    lastName: student.lastName,
    sessionRows,
    examVersion: config.examVersion,
    upgrade: config.upgrade,
    courseVariant: config.courseVariant,
    examConfirmation: templateMap.examConfirmation ? rowValues(student.initials, lastActiveDay, config, instructor) : null,
    specialtyDives,
    instructor: { namePrinted: instructor.namePrinted, number: instructor.number },
    signatures: { studentPng: config.signatures?.studentPng, parentPng: config.signatures?.parentPng, instructorPng: instructor.signature },
    generatedAtLabel: formatDateDDMMYY(todayIso()),
  };
}
