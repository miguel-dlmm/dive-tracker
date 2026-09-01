// Mapeo campo↔significado de las 4 plantillas SSI que sí son formularios
// PDF rellenables (Release V1, Fase 5). Los nombres de campo del PDF
// original son IDs opacos sin significado (p. ej.
// "undefined.tr-input-23905086-2") — este archivo es el resultado de
// verificar VISUALMENTE cada campo contra su posición real en la página
// (script scripts/render-training-record-debug.mjs: renderiza cada
// página con pdfjs-dist + @napi-rs/canvas, numera cada campo por encima
// de su recuadro, y se contrastó ese número contra la etiqueta de texto
// real más cercana leída en la propia imagen) — no es una adivinanza por
// proximidad de coordenadas sin comprobar, que es justo lo que este
// proyecto decidió NO hacer para un documento de certificación real (ver
// docs/RELEASE-V1-PROGRESS.md, Fase 5, "hallazgo importante").
//
// Alcance deliberado de esta primera pasada:
// - Solo la página 1 de cada plantilla (el camino principal: alumno
//   completa el curso entero). OWD tiene una página 2 adicional para
//   finalización de Referral Diver/Scuba Diver/Indoor Diver (cuando el
//   alumno NO completa el programa entero) — no mapeada todavía, fuera
//   de alcance de este primer corte.
// - Las filas de inmersión "opcionales" (marcadas como tal en el propio
//   PDF) se dejan en blanco si el curso no las incluye — el generador
//   debe permitir no rellenarlas, no exigirlas.
//
// Estructura común a las 4 plantillas: una fila "de progreso" son 4
// campos consecutivos (Iniciales del Alumno, Fecha, Iniciales del
// Instructor, Número SSI Pro) — se modela como { studentInitials, date,
// instructorInitials, instructorNumber }.

const P = (id) => `undefined.tr-input-${id}`;

function progressRow(base, { optional = false, label } = {}) {
  return {
    label,
    optional,
    studentInitials: P(`${base}-0`),
    date: P(`${base}-1`),
    instructorInitials: P(`${base}-2`),
    instructorNumber: P(`${base}-3`),
  };
}

export const TEMPLATE_FIELD_MAPS = {
  OWD: {
    name: "Open Water Diver",
    sourcePdfPage: 1,
    fields: {
      firstName: P("23905082-0"),
      lastName: P("23905082-1"),
    },
    sessionRows: [
      progressRow("23905086", { label: "Sesiones Académicas" }),
      progressRow("23905088", { label: "Sesiones en Piscina/Aguas Confinadas" }),
      progressRow("23905090", { label: "Inmersión de Formación en Aguas Abiertas 1" }),
      progressRow("23905092", { label: "Inmersión de Formación en Aguas Abiertas 2" }),
      progressRow("23905094", { label: "Inmersión de Formación en Aguas Abiertas 3" }),
      progressRow("23905096", { label: "Inmersión de Formación en Aguas Abiertas 4" }),
      // Las dos siguientes son las "inmersiones opcionales del tercer día"
      // que menciona el encargo original — el generador debe poder
      // dejarlas en blanco cuando el curso se hizo en 2 días.
      progressRow("23905098", { label: "Inmersión de Formación en Aguas Abiertas 5", optional: true }),
      progressRow("23905100", { label: "Inmersión de formación en aguas abiertas 6", optional: true }),
    ],
    examVersion: { printed: P("23905148-0"), online: P("23905150-0") },
    // Checkboxes de actualización opcional (el alumno certifica Scuba
    // Diver u Open Water Diver completo) — casi siempre Open Water Diver.
    upgradeCheckboxes: { scubaDiver: P("23905152-0"), openWaterDiver: P("23905152-1") },
    examConfirmation: progressRow("23905153", { label: "Confirmación de Examen Final" }),
    signatures: {
      student: P("23905104-0"),
      studentDate: P("23905104-1"),
      parent: P("23905105-0"),
      parentDate: P("23905105-1"),
      instructor: P("23905106-0"),
      instructorNumber: P("23905266-0"),
      instructorDate: P("23905266-1"),
    },
  },

  AOWD: {
    name: "Advanced Open Water Diver",
    sourcePdfPage: 1,
    fields: {
      firstName: P("30037160-0"),
      lastName: P("30037160-1"),
    },
    sessionRows: [
      progressRow("30037164", { label: "Sesiones Académicas Finalizadas" }),
      progressRow("30037167", { label: "Inmersión de Formación en Aguas Abiertas Completada | Deep Diving" }),
      progressRow("30037170", { label: "Inmersión de Formación en Aguas Abiertas Completada | Navegación" }),
    ],
    // Las 3 inmersiones optativas de especialidad — cada una tiene un
    // campo de texto libre con el nombre de la especialidad elegida, más
    // una fila de sesión de piscina (si hizo falta) y una de finalización.
    optionalSpecialtyDives: [
      {
        label: "Inmersión de Formación en Aguas Abiertas 3",
        specialtyName: P("30037175-0"),
        poolSession: progressRow("30037177", { label: "Sesión en la Piscina/Aguas Confinadas | Si es necesario" }),
        completed: progressRow("30037179", { label: "Inmersión de Formación en Aguas Abiertas 3 Completada" }),
      },
      {
        label: "Inmersión de Formación en Aguas Abiertas 4",
        specialtyName: P("30037181-0"),
        poolSession: progressRow("30037183", { label: "Sesión en la Piscina/Aguas Confinadas | Si es necesario" }),
        completed: progressRow("30037185", { label: "Inmersión de Formación en Aguas Abiertas 4 Completada" }),
      },
      {
        label: "Inmersión de Formación en Aguas Abiertas 5",
        specialtyName: P("30037187-0"),
        poolSession: progressRow("30037189", { label: "Sesión en la Piscina/Aguas Confinadas | Si es necesario" }),
        completed: progressRow("30037191", { label: "Inmersión de Formación en Aguas Abiertas 5 Completada" }),
      },
    ],
    signatures: {
      student: P("30037193-0"),
      studentDate: P("30037193-1"),
      parent: P("30037194-0"),
      parentDate: P("30037194-1"),
      instructorNamePrinted: P("30037195-0"),
      instructorDate: P("30037195-1"),
      instructor: P("30037196-0"),
      instructorNumber: P("30037196-1"),
    },
  },

  "SC-DD": {
    name: "Deep Diving",
    sourcePdfPage: 1,
    fields: {
      firstName: P("23152421-0"),
      lastName: P("23152421-1"),
    },
    sessionRows: [
      progressRow("23152425", { label: "Sesiones Académicas Finalizadas" }),
      progressRow("23152427", { label: "Habilidades en Piscina/Aguas Confinadas", optional: true }),
      progressRow("23152429", { label: "Inmersión de Formación en Aguas Abiertas 1 Completada" }),
      progressRow("23152431", { label: "Inmersión de Formación en Aguas Abiertas 2 Completada" }),
      progressRow("23152433", { label: "Inmersión de Formación en Aguas Abiertas 3 Completada" }),
      progressRow("23152435", { label: "Inmersión Adicional en Aguas Abiertas", optional: true }),
    ],
    examVersion: { printed: P("23152439-0"), online: P("23152441-0") },
    examConfirmation: progressRow("23152443", { label: "Confirmación de Examen Final" }),
    signatures: {
      student: P("23152445-0"),
      studentDate: P("23152445-1"),
      parent: P("23152446-0"),
      parentDate: P("23152446-1"),
      instructorNamePrinted: P("23152447-0"),
      instructorDate: P("23152447-1"),
      instructor: P("23152448-0"),
      instructorNumber: P("23152448-1"),
    },
  },

  "SC-EAN": {
    name: "Enriched Air Nitrox",
    sourcePdfPage: 1,
    fields: {
      firstName: P("36027014-0"),
      lastName: P("36027014-1"),
    },
    sessionRows: [
      progressRow("36027018", { label: "Sesiones Académicas Finalizadas" }),
      progressRow("36027020", { label: "Habilidades en Piscina/Aguas Confinadas", optional: true }),
      progressRow("36027022", { label: "Inmersión de Formación en Aguas Abiertas Completada", optional: true }),
      progressRow("36027024", { label: "Inmersión de Formación en Aguas Abiertas Adicional Completada", optional: true }),
    ],
    examVersion: { printed: P("36027032-0"), online: P("36027034-0") },
    examConfirmation: progressRow("36027036", { label: "Confirmación de Examen Final" }),
    // Variante del curso — solo una de las dos aplica.
    courseVariant: { ean32: P("36027038-0"), ean40: P("36027038-1") },
    signatures: {
      student: P("36027040-0"),
      studentDate: P("36027040-1"),
      parent: P("36027041-0"),
      parentDate: P("36027041-1"),
      instructorNamePrinted: P("36027042-0"),
      instructorDate: P("36027042-1"),
      instructor: P("36027043-0"),
      instructorNumber: P("36027043-1"),
    },
  },
};
