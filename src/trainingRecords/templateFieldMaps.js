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

// Cada fila de progreso lleva su propia fecha, seleccionable a mano
// directamente desde esa fila (pedido explícito del usuario, Release V1,
// Fase 5, corrección 2026-09-02) — no se agrupan varias filas bajo una
// fecha compartida de "Día 1"/"Día 2".
//
// `fixed` (2026-09-04, pedido explícito): en OW, "Sesiones académicas",
// "Sesiones en piscina" y Aguas Abiertas 1-4 dejan de ser una casilla más
// que se pueda desmarcar — de verdad son obligatorias para certificar el
// curso. En AOWD, TODAS las filas de progreso son obligatorias (las 5
// inmersiones de aventura + sesiones académicas). `fixed` es un flag
// aparte de `optional` (no su negación): las filas normales de SC-DD/
// SC-EAN siguen siendo `optional:false` (premarcadas) pero SÍ se pueden
// desmarcar — solo OW/AOWD piden bloquearlas del todo.
function progressRow(base, { optional = false, fixed = false, label } = {}) {
  return {
    label,
    optional,
    fixed,
    studentInitials: P(`${base}-0`),
    date: P(`${base}-1`),
    instructorInitials: P(`${base}-2`),
    instructorNumber: P(`${base}-3`),
  };
}

// ---------------------------------------------------------------------
// Plantillas SIN AcroForm (BD, SC-LV, SC-NV, SC-PB, SC-RR, SC-SR) —
// Release V1, Fase 5, "plantillas restantes" (2026-09-04). Estas 6 no
// tienen ningún campo de formulario interactivo, solo recuadros grises
// impresos como arte estático — así que aquí un "field" es
// { rect: {x,y,width,height} } en vez de un string P(id) (ver
// isRectField/resolveRect en pdfFill.js). Coordenadas en puntos PDF
// (origen abajo-izquierda), extraídas de verdad del content stream real
// del PDF con scripts/extract-flat-template-rects.mjs — nunca a ojo — y
// verificadas visualmente una a una contra el PDF real con
// scripts/render-flat-template-rects-overlay.mjs antes de incorporarlas
// aquí (ver docs/RELEASE-V1-PROGRESS.md, Fase 5, técnica validada con
// SC-LV como piloto). Los datos crudos de cada plantilla quedan en
// training-records-debug/<CÓDIGO>-rects.json y -rects-overlay.png (no
// versionados) por si hace falta volver a contrastarlos.
const R = (x, y, width, height) => ({ rect: { x, y, width, height } });

// Fila de progreso por coordenadas — mismo significado que progressRow()
// de arriba (Iniciales del Alumno/Fecha/Iniciales del Instructor/Número
// SSI Pro), pero cada sub-campo es un rect real en vez de un P(id).
// `instructorNumber` es opcional: SC-RR tiene varias filas de solo 3
// recuadros impresos (sin "Número SSI Pro"), confirmado visualmente, no
// un olvido — cuando `cells` solo trae 3 posiciones, ese sub-campo se deja
// sin mapear y pdfFill.js simplemente no dibuja nada ahí (mismo criterio
// que un valor vacío, ver pushIfValue).
function rectRow(cells, { optional = false, fixed = false, label } = {}) {
  const [si, date, ii, inum] = cells;
  const row = {
    label,
    optional,
    fixed,
    studentInitials: R(...si),
    date: R(...date),
    instructorInitials: R(...ii),
  };
  if (inum) row.instructorNumber = R(...inum);
  return row;
}

// Bloque de firmas por coordenadas, mismo layout en las 6 plantillas
// (verificado en cada una): fila 1 = alumno + fecha | nombre del
// instructor (en imprenta) + fecha; fila 2 = padre/madre/tutor + fecha |
// firma del instructor + número SSI Pro.
function rectSignatures([student, studentDate, instructorNamePrinted, instructorDate, parent, parentDate, instructor, instructorNumber]) {
  return {
    student: R(...student),
    studentDate: R(...studentDate),
    instructorNamePrinted: R(...instructorNamePrinted),
    instructorDate: R(...instructorDate),
    parent: R(...parent),
    parentDate: R(...parentDate),
    instructor: R(...instructor),
    instructorNumber: R(...instructorNumber),
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
      progressRow("23905086", { label: "Sesiones Académicas", fixed: true }),
      progressRow("23905088", { label: "Sesiones en Piscina/Aguas Confinadas", fixed: true }),
      progressRow("23905090", { label: "Inmersión de Formación en Aguas Abiertas 1", fixed: true }),
      progressRow("23905092", { label: "Inmersión de Formación en Aguas Abiertas 2", fixed: true }),
      progressRow("23905094", { label: "Inmersión de Formación en Aguas Abiertas 3", fixed: true }),
      progressRow("23905096", { label: "Inmersión de Formación en Aguas Abiertas 4", fixed: true }),
      // Las dos siguientes son las "inmersiones opcionales del tercer día"
      // que menciona el encargo original — el generador debe poder
      // dejarlas en blanco cuando el curso se hizo en 2 días. Estas SÍ
      // siguen siendo una casilla real (no `fixed`).
      progressRow("23905098", { label: "Inmersión de Formación en Aguas Abiertas 5", optional: true }),
      progressRow("23905100", { label: "Inmersión de formación en aguas abiertas 6", optional: true }),
    ],
    examVersion: { printed: P("23905148-0"), online: P("23905150-0") },
    // Checkboxes de actualización opcional (el alumno certifica Scuba
    // Diver u Open Water Diver completo) — casi siempre Open Water Diver.
    upgradeCheckboxes: { scubaDiver: P("23905152-0"), openWaterDiver: P("23905152-1") },
    // "Fecha de examen" (2026-09-04, pedido explícito) — ya no es una
    // casilla de "confirmación" + fecha, es directamente un campo de
    // fecha obligatorio. Ver recordConfig.js (examConfirmedDate, sin
    // `examConfirmed`) y TrainingRecordsTab.jsx.
    examConfirmation: progressRow("23905153", { label: "Fecha de examen" }),
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
    // Rediseño 2026-09-04, pedido explícito: "ALL AOWD fields become
    // obligatory" — las 3 filas (sesiones académicas + las 2 aventuras
    // fijas del curso) pasan a `fixed`, igual que OW. Las filas 2 y 3
    // ganan una etiqueta fija ("Buceo Profundo"/"Navegación", el nombre
    // real de cada aventura) en vez del texto largo/técnico anterior — así
    // las 5 filas de aventura (estas 2 + las 3 electivas de abajo) tienen
    // la misma forma visual.
    sessionRows: [
      progressRow("30037164", { label: "Sesiones Académicas Finalizadas", fixed: true }),
      progressRow("30037167", { label: "Buceo Profundo", fixed: true }),
      progressRow("30037170", { label: "Navegación", fixed: true }),
    ],
    // Las 3 "Aventuras" electivas (antes "Inmersiones de Especialidad" —
    // renombrado, pedido explícito) — cada una tiene un combo (nombre de
    // la aventura, catálogo en BBDD, ver training_record_adventures) y una
    // fila de finalización con su propia fecha. La fila de "sesión de
    // piscina" se deja sin usar desde este combo — el encargo pide
    // rellenar solo la fila de finalización, ver TrainingRecordsTab.jsx.
    // Con "ALL AOWD fields obligatory" estas 3 dejan de ser electivas de
    // verdad en el sentido de "se pueden saltar": hay que elegir una
    // aventura distinta en cada una — sigue siendo `optional` en el
    // sentido de "no tiene un campo PDF fijo", el nombre de la propiedad
    // (optionalSpecialtyDives) se conserva por compatibilidad con
    // pdfFill.js/recordConfig.js, no implica que la validación las trate
    // como opcionales.
    optionalSpecialtyDives: [
      {
        label: "Aventura 1",
        specialtyName: P("30037175-0"),
        poolSession: progressRow("30037177", { label: "Sesión en la Piscina/Aguas Confinadas | Si es necesario" }),
        completed: progressRow("30037179", { label: "Aventura 1 completada" }),
      },
      {
        label: "Aventura 2",
        specialtyName: P("30037181-0"),
        poolSession: progressRow("30037183", { label: "Sesión en la Piscina/Aguas Confinadas | Si es necesario" }),
        completed: progressRow("30037185", { label: "Aventura 2 completada" }),
      },
      {
        label: "Aventura 3",
        specialtyName: P("30037187-0"),
        poolSession: progressRow("30037189", { label: "Sesión en la Piscina/Aguas Confinadas | Si es necesario" }),
        completed: progressRow("30037191", { label: "Aventura 3 completada" }),
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
    // "Fecha de examen" (2026-09-04, pedido explícito, mismo criterio que
    // OWD) — campo de fecha obligatorio, sin casilla de confirmación.
    examConfirmation: progressRow("23152443", { label: "Fecha de examen" }),
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
    // "Fecha de examen" (2026-09-04, pedido explícito, mismo criterio que
    // OWD) — campo de fecha obligatorio, sin casilla de confirmación.
    examConfirmation: progressRow("36027036", { label: "Fecha de examen" }),
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

  // Sin AcroForm — ver bloque de arriba. Verificado visualmente con
  // training-records-debug/BD-rects-overlay.png (2026-09-04): curso corto
  // de una sola sesión, sin versión de examen (es un cuestionario V/F, sin
  // checkbox impresa/online) y sin ninguna fila marcada "(opcional)" en el
  // PDF real — las 3 filas de progreso y la confirmación del cuestionario
  // se dejan `optional:false` (premarcadas, aún así desmarcables), mismo
  // criterio por defecto que SC-DD/SC-EAN.
  BD: {
    name: "Basic Diver",
    sourcePdfPage: 1,
    fields: {
      firstName: R(109.98, 754.805, 217.26, 17),
      lastName: R(336.24, 754.805, 217.26, 17),
    },
    sessionRows: [
      rectRow([[40.5, 647.65, 51.75, 17], [101.25, 647.65, 51.75, 17], [162, 647.65, 51.75, 17], [222.75, 647.65, 51.75, 17]], { label: "Sesiones Académicas Completadas" }),
      rectRow([[40.5, 584.192, 51.75, 17], [101.25, 584.192, 51.75, 17], [162, 584.192, 51.75, 17], [222.75, 584.192, 51.75, 17]], { label: "Habilidades de Buceo en Piscina/Aguas Confinadas Completadas" }),
      rectRow([[40.5, 520.734, 51.75, 17], [101.25, 520.734, 51.75, 17], [162, 520.734, 51.75, 17], [222.75, 520.734, 51.75, 17]], { label: "Introducción al Buceo en Aguas Abiertas Completado" }),
    ],
    // El PDF no tiene checkbox de "versión impresa/online" — es un
    // cuestionario verdadero/falso que el instructor revisa con el
    // participante, ver la fila de confirmación de abajo.
    examConfirmation: rectRow([[319.5, 204.748, 51.75, 17], [380.25, 204.748, 51.75, 17], [441, 204.748, 51.75, 17], [501.75, 204.748, 51.75, 17]], { label: "Confirmación del Cuestionario" }),
    signatures: rectSignatures([
      [40.5, 86.695, 171, 17], [220.5, 86.695, 63, 17], [310.5, 86.42, 171, 17], [490.5, 86.42, 63, 17],
      [40.5, 55.5, 171, 17], [220.5, 55.5, 63, 17], [310.5, 55.5, 171, 17], [490.5, 55.5, 63, 17],
    ]),
  },

  // Verificado visualmente con training-records-debug/SC-LV-rects-overlay.png
  // (2026-09-04) — plantilla piloto de la técnica (ver
  // docs/RELEASE-V1-PROGRESS.md, Fase 5, "Técnica validada..."). Checkboxes
  // de versión de examen: el PDF no las dibuja como recuadro relleno (solo
  // contorno), así que no las captura la extracción de rects — posición
  // derivada por patrón desde una plantilla con AcroForm real (SC-DD: hueco
  // de 5.4pt entre el borde derecho del checkbox de 6×6pt y el inicio del
  // texto de la etiqueta, constante confirmada exacta contra SC-DD),
  // aplicada a la posición real del texto de esta plantilla via
  // page.getTextContent().
  "SC-LV": {
    name: "Night & Limited Visibility",
    sourcePdfPage: 1,
    fields: {
      firstName: R(109.98, 754.805, 217.26, 17),
      lastName: R(336.24, 754.805, 217.26, 17),
    },
    sessionRows: [
      rectRow([[40.5, 627.473, 51.75, 17], [101.25, 627.473, 51.75, 17], [162, 627.473, 51.75, 17], [222.75, 627.473, 51.75, 17]], { label: "Sesiones Académicas Completadas" }),
      rectRow([[40.5, 521.72, 51.75, 17], [101.25, 521.72, 51.75, 17], [162, 521.72, 51.75, 17], [222.75, 521.72, 51.75, 17]], { label: "Habilidades en la Piscina/Aguas Confinadas", optional: true }),
      rectRow([[40.5, 415.967, 51.75, 17], [101.25, 415.967, 51.75, 17], [162, 415.967, 51.75, 17], [222.75, 415.967, 51.75, 17]], { label: "Inmersión de Formación en Aguas Abiertas 1 Completada" }),
      rectRow([[40.5, 310.213, 51.75, 17], [101.25, 310.213, 51.75, 17], [162, 310.213, 51.75, 17], [222.75, 310.213, 51.75, 17]], { label: "Inmersión de Formación en Aguas Abiertas 2 Completada" }),
      rectRow([[40.5, 204.46, 51.75, 17], [101.25, 204.46, 51.75, 17], [162, 204.46, 51.75, 17], [222.75, 204.46, 51.75, 17]], { label: "Inmersión Adicional en Aguas Abiertas", optional: true }),
    ],
    examVersion: { printed: R(339.5265, 419.1378, 6, 6), online: R(342.3975, 343.6479, 6, 6) },
    examConfirmation: rectRow([[319.5, 204.716, 51.75, 17], [380.25, 204.716, 51.75, 17], [441, 204.716, 51.75, 17], [501.75, 204.716, 51.75, 17]], { label: "Fecha de examen" }),
    signatures: rectSignatures([
      [40.5, 86.695, 171, 17], [220.5, 86.695, 63, 17], [310.5, 86.42, 171, 17], [490.5, 86.42, 63, 17],
      [40.5, 55.5, 171, 17], [220.5, 55.5, 63, 17], [310.5, 55.5, 171, 17], [490.5, 55.5, 63, 17],
    ]),
  },

  // Verificado visualmente con training-records-debug/SC-NV-rects-overlay.png
  // (2026-09-04) — mismo layout exacto que SC-LV, ver esa entrada para el
  // criterio de checkboxes.
  "SC-NV": {
    name: "Navigation",
    sourcePdfPage: 1,
    fields: {
      firstName: R(109.98, 754.805, 217.26, 17),
      lastName: R(336.24, 754.805, 217.26, 17),
    },
    sessionRows: [
      rectRow([[40.5, 627.473, 51.75, 17], [101.25, 627.473, 51.75, 17], [162, 627.473, 51.75, 17], [222.75, 627.473, 51.75, 17]], { label: "Sesiones Académicas Completadas" }),
      rectRow([[40.5, 521.72, 51.75, 17], [101.25, 521.72, 51.75, 17], [162, 521.72, 51.75, 17], [222.75, 521.72, 51.75, 17]], { label: "Habilidades en la Piscina/Aguas Confinadas", optional: true }),
      rectRow([[40.5, 415.967, 51.75, 17], [101.25, 415.967, 51.75, 17], [162, 415.967, 51.75, 17], [222.75, 415.967, 51.75, 17]], { label: "Inmersión de Formación en Aguas Abiertas 1 Completada" }),
      rectRow([[40.5, 310.213, 51.75, 17], [101.25, 310.213, 51.75, 17], [162, 310.213, 51.75, 17], [222.75, 310.213, 51.75, 17]], { label: "Inmersión de Formación en Aguas Abiertas 2 Completada" }),
      rectRow([[40.5, 204.46, 51.75, 17], [101.25, 204.46, 51.75, 17], [162, 204.46, 51.75, 17], [222.75, 204.46, 51.75, 17]], { label: "Inmersión Adicional en Aguas Abiertas", optional: true }),
    ],
    examVersion: { printed: R(339.5265, 391.9896, 6, 6), online: R(342.3975, 326.4176, 6, 6) },
    examConfirmation: rectRow([[319.5, 204.841, 51.75, 17], [380.25, 204.841, 51.75, 17], [441, 204.841, 51.75, 17], [501.75, 204.841, 51.75, 17]], { label: "Fecha de examen" }),
    signatures: rectSignatures([
      [40.5, 86.695, 171, 17], [220.5, 86.695, 63, 17], [310.5, 86.42, 171, 17], [490.5, 86.42, 63, 17],
      [40.5, 55.5, 171, 17], [220.5, 55.5, 63, 17], [310.5, 55.5, 171, 17], [490.5, 55.5, 63, 17],
    ]),
  },

  // Verificado visualmente con training-records-debug/SC-PB-rects-overlay.png
  // (2026-09-04) — mismo layout que SC-LV/SC-NV; la única diferencia real
  // es el texto de las etiquetas (esta plantilla alterna piscina/aguas
  // abiertas en las 2 inmersiones principales, el PDF las etiqueta con el
  // texto partido en 2 líneas — "Inmersión de formación en piscina/aguas
  // confinadas o aguas abiertas N completada").
  "SC-PB": {
    name: "Perfect Buoyancy",
    sourcePdfPage: 1,
    fields: {
      firstName: R(109.98, 754.805, 217.26, 17),
      lastName: R(336.24, 754.805, 217.26, 17),
    },
    sessionRows: [
      rectRow([[40.5, 639.718, 51.75, 17], [101.25, 639.718, 51.75, 17], [162, 639.718, 51.75, 17], [222.75, 639.718, 51.75, 17]], { label: "Sesiones Académicas Completadas" }),
      rectRow([[40.5, 558.453, 51.75, 17], [101.25, 558.453, 51.75, 17], [162, 558.453, 51.75, 17], [222.75, 558.453, 51.75, 17]], { label: "Habilidades en la Piscina/Aguas Confinadas", optional: true }),
      rectRow([[40.5, 440.455, 51.75, 17], [101.25, 440.455, 51.75, 17], [162, 440.455, 51.75, 17], [222.75, 440.455, 51.75, 17]], { label: "Inmersión de Formación en Piscina/Aguas Confinadas o Aguas Abiertas 1 Completada" }),
      rectRow([[40.5, 322.457, 51.75, 17], [101.25, 322.457, 51.75, 17], [162, 322.457, 51.75, 17], [222.75, 322.457, 51.75, 17]], { label: "Inmersión de Formación en Piscina/Aguas Confinadas o Aguas Abiertas 2 Completada" }),
      rectRow([[40.5, 204.46, 51.75, 17], [101.25, 204.46, 51.75, 17], [162, 204.46, 51.75, 17], [222.75, 204.46, 51.75, 17]], { label: "Inmersión de Formación en Piscina/Aguas Confinadas o Aguas Abiertas Adicional Completada", optional: true }),
    ],
    examVersion: { printed: R(339.5265, 419.1378, 6, 6), online: R(342.3975, 343.6479, 6, 6) },
    examConfirmation: rectRow([[319.5, 204.716, 51.75, 17], [380.25, 204.716, 51.75, 17], [441, 204.716, 51.75, 17], [501.75, 204.716, 51.75, 17]], { label: "Fecha de examen" }),
    signatures: rectSignatures([
      [40.5, 86.695, 171, 17], [220.5, 86.695, 63, 17], [310.5, 86.42, 171, 17], [490.5, 86.42, 63, 17],
      [40.5, 55.5, 171, 17], [220.5, 55.5, 63, 17], [310.5, 55.5, 171, 17], [490.5, 55.5, 63, 17],
    ]),
  },
};
