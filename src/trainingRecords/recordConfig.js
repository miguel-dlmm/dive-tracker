import { formatDateDDMMYY, todayIso } from "./dateFormat";

// Lógica de negocio del generador de Training Records — separada de la UI
// para poder probarla a fondo sin montar componentes. Cubre: valores por
// defecto de la configuración del documento (COMPARTIDA para todo un
// listado de alumnos, no por alumno — rediseño 2026-09-03, pedido
// explícito del usuario: "no es una configuración de Training Record por
// alumno, es una configuración de Training Record para un listado de
// alumnos"), validación de esa configuración compartida, validación de
// los datos propios de cada alumno (nombre, apellidos, iniciales, firma),
// y la traducción final a la forma que espera pdfFill.js para un alumno
// concreto.
//
// Cada fila de progreso del curso lleva su propia fecha, seleccionable a
// mano directamente desde esa fila (pedido explícito del usuario,
// 2026-09-02) — no hay agrupación de filas bajo una fecha compartida de
// "Día 1"/"Día 2". Las fechas SÍ son compartidas (la clase entera hizo la
// Inmersión 1 el mismo día); lo que varía por alumno es únicamente su
// nombre/iniciales/firma — de ahí que rowDates/examVersion/etc. vivan en
// `config` (una vez por listado) y las firmas vivan en cada alumno.

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
  };
}

// Validación de la configuración COMPARTIDA del documento (pedido
// explícito del usuario): versión de examen, certificación y confirmación
// de examen final cuando la plantilla tiene esa sección; al menos una
// fila de progreso marcada siempre; cada fila marcada (de progreso, de
// inmersión de especialidad completada, o la confirmación de examen)
// necesita su propia fecha. La firma NO se valida aquí — es un dato por
// alumno, ver validateStudentFields().
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
  return { valid: Object.keys(errors).length === 0, errors };
}

// Validación de los datos propios de UN alumno — nombre, apellidos,
// iniciales y firma. Se llama una vez por alumno del listado antes de
// generar en lote.
export function validateStudentFields(student) {
  const errors = {};
  if (!student.firstName?.trim()) errors.firstName = "El nombre es obligatorio.";
  if (!student.lastName?.trim()) errors.lastName = "Los apellidos son obligatorios.";
  if (!student.initials?.trim()) errors.initials = "Las iniciales son obligatorias.";
  if (!student.studentSignature) errors.studentSignature = "Falta la firma del alumno.";
  return { valid: Object.keys(errors).length === 0, errors };
}

function rowValues(studentInitials, dateIso, instructor) {
  return {
    studentInitials,
    date: formatDateDDMMYY(dateIso),
    instructorInitials: instructor.initials,
    instructorNumber: instructor.number,
  };
}

/**
 * Traduce la configuración compartida del listado + los datos de UN
 * alumno concreto a la forma que espera fillTrainingRecordPdf: cada fila
 * lleva su propia fecha (compartida para todo el listado), y la fecha de
 * firma es siempre hoy.
 */
export function buildFillData(templateMap, student, config, instructor) {
  const sessionRows = (templateMap.sessionRows || []).map((row, i) => {
    if (!config.includedRows[i]) return null;
    return rowValues(student.initials, config.rowDates[i], instructor);
  });

  const specialtyDives = (templateMap.optionalSpecialtyDives || []).map((_, i) => {
    const values = config.specialtyDives?.[i];
    if (!values?.adventureId) return null;
    // Pedido explícito: solo se rellena la fila de "Completada" — la de
    // "Sesión en la Piscina" se deja siempre sin usar desde este combo.
    return {
      specialtyName: values.adventureName,
      poolSession: null,
      completed: rowValues(student.initials, values.date, instructor),
    };
  });

  return {
    firstName: student.firstName,
    lastName: student.lastName,
    sessionRows,
    examVersion: config.examVersion,
    upgrade: config.upgrade,
    courseVariant: config.courseVariant,
    examConfirmation: templateMap.examConfirmation ? rowValues(student.initials, config.examConfirmedDate, instructor) : null,
    specialtyDives,
    instructor: { namePrinted: instructor.namePrinted, number: instructor.number },
    signatures: { studentPng: student.studentSignature, parentPng: student.guardianSignature, instructorPng: instructor.signature },
    generatedAtLabel: formatDateDDMMYY(todayIso()),
  };
}
