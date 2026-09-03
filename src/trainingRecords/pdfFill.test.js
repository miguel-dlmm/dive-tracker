import { PDFDocument, PDFName } from "pdf-lib";
import { buildFillOperations, fillTrainingRecordPdf, computeSignaturePlacement } from "./pdfFill";

// 2x2 PNG rojo válido — solo para comprobar que embedPng/drawImage no
// revientan, el contenido visual no importa aquí (eso ya se comprobó a
// mano, ver render-training-record-debug.mjs).
const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const TEMPLATE = {
  fields: { firstName: "f.first", lastName: "f.last" },
  sessionRows: [
    { studentInitials: "row0.si", date: "row0.date", instructorInitials: "row0.ii", instructorNumber: "row0.in" },
    { studentInitials: "row1.si", date: "row1.date", instructorInitials: "row1.ii", instructorNumber: "row1.in", optional: true },
  ],
  examVersion: { printed: "exam.printed", online: "exam.online" },
  upgradeCheckboxes: { scubaDiver: "upgrade.scuba", openWaterDiver: "upgrade.owd" },
  courseVariant: { ean32: "variant.32", ean40: "variant.40" },
  examConfirmation: { studentInitials: "conf.si", date: "conf.date", instructorInitials: "conf.ii", instructorNumber: "conf.in" },
  optionalSpecialtyDives: [
    {
      specialtyName: "dive0.name",
      poolSession: { studentInitials: "dive0.pool.si", date: "dive0.pool.date", instructorInitials: "dive0.pool.ii", instructorNumber: "dive0.pool.in" },
      completed: { studentInitials: "dive0.done.si", date: "dive0.done.date", instructorInitials: "dive0.done.ii", instructorNumber: "dive0.done.in" },
    },
  ],
  signatures: {
    student: "sig.student", studentDate: "sig.studentDate",
    parent: "sig.parent", parentDate: "sig.parentDate",
    instructorNamePrinted: "sig.instructorNamePrinted",
    instructor: "sig.instructor", instructorNumber: "sig.instructorNumber", instructorDate: "sig.instructorDate",
  },
};

describe("buildFillOperations", () => {
  it("rellena nombre, apellidos y la primera fila de sesión, con su fecha", () => {
    const { texts } = buildFillOperations(TEMPLATE, {
      firstName: "Ana", lastName: "Garcia",
      sessionRows: [{ studentInitials: "AG", date: "01/09/26", instructorInitials: "JD", instructorNumber: "12345" }],
    });
    expect(texts).toEqual(expect.arrayContaining([
      { field: "f.first", value: "Ana" },
      { field: "f.last", value: "Garcia" },
      { field: "row0.si", value: "AG" },
      { field: "row0.date", value: "01/09/26" },
      { field: "row0.ii", value: "JD" },
      { field: "row0.in", value: "12345" },
    ]));
  });

  // Pedido explícito del usuario (2026-09-02, cierra la decisión que había
  // quedado pendiente en la sesión anterior): la fecha de cada fila de
  // progreso SÍ se rellena ahora (llega ya calculada desde fuera, ver
  // TrainingRecordsTab.jsx) — buildFillOperations solo la traslada, no
  // decide de dónde sale.
  it("rellena la fecha de las 3 firmas con generatedAtLabel, igual para las 3", () => {
    const { texts } = buildFillOperations(TEMPLATE, {
      firstName: "Ana", lastName: "Garcia",
      generatedAtLabel: "02/09/26",
    });
    expect(texts).toEqual(expect.arrayContaining([
      { field: "sig.studentDate", value: "02/09/26" },
      { field: "sig.parentDate", value: "02/09/26" },
      { field: "sig.instructorDate", value: "02/09/26" },
    ]));
  });

  it("omite una fila de sesión opcional sin datos, sin fallar", () => {
    const { texts } = buildFillOperations(TEMPLATE, { firstName: "Ana", lastName: "Garcia" });
    expect(texts.some((t) => t.field.startsWith("row1."))).toBe(false);
  });

  it("marca solo la casilla de versión de examen elegida, nunca las dos", () => {
    const { checkboxes } = buildFillOperations(TEMPLATE, { firstName: "A", lastName: "B", examVersion: "online" });
    expect(checkboxes).toEqual(expect.arrayContaining([
      { field: "exam.printed", checked: false },
      { field: "exam.online", checked: true },
    ]));
  });

  it("marca la variante de curso elegida (SC-EAN)", () => {
    const { checkboxes } = buildFillOperations(TEMPLATE, { firstName: "A", lastName: "B", courseVariant: "ean32" });
    expect(checkboxes).toEqual(expect.arrayContaining([
      { field: "variant.32", checked: true },
      { field: "variant.40", checked: false },
    ]));
  });

  it("omite una inmersión opcional de especialidad sin datos (AOWD)", () => {
    const { texts } = buildFillOperations(TEMPLATE, { firstName: "A", lastName: "B" });
    expect(texts.some((t) => t.field.startsWith("dive0."))).toBe(false);
  });

  it("rellena la inmersión de especialidad cuando sí hay datos", () => {
    const { texts } = buildFillOperations(TEMPLATE, {
      firstName: "A", lastName: "B",
      specialtyDives: [{ specialtyName: "Navegación", completed: { studentInitials: "AG", date: "2026-09-01", instructorInitials: "JD", instructorNumber: "1" } }],
    });
    expect(texts).toEqual(expect.arrayContaining([
      { field: "dive0.name", value: "Navegación" },
      { field: "dive0.done.si", value: "AG" },
    ]));
  });

  it("solo incluye una firma en la lista si hay imagen capturada", () => {
    const { signatures } = buildFillOperations(TEMPLATE, {
      firstName: "A", lastName: "B",
      signatures: { studentPng: TINY_PNG },
    });
    expect(signatures).toEqual([{ field: "sig.student", dataUrl: TINY_PNG }]);
  });

  it("nunca incluye una operación con campo vacío o valor vacío", () => {
    const { texts } = buildFillOperations(TEMPLATE, { firstName: "", lastName: "" });
    expect(texts).toEqual([]);
  });
});

// 2026-09-04, pedido explícito del usuario: "firmas superpuestas arriba,
// nunca cortadas" + "firmas más grandes". Estos tests cubren la lógica
// pura de posicionamiento/tamaño, sin necesitar un PDFDocument real.
describe("computeSignaturePlacement", () => {
  it("ancla el borde SUPERIOR de la firma al borde superior del campo, nunca centrada", () => {
    const rect = { x: 100, y: 50, width: 80, height: 20 };
    const { y, height } = computeSignaturePlacement(rect, 300, 150); // ratio 2:1
    expect(y + height).toBeCloseTo(rect.y + rect.height, 5);
  });

  it("crece más allá del propio rectángulo (boost > 1x) — todo el margen extra queda por debajo, nunca por encima", () => {
    const rect = { x: 0, y: 100, width: 40, height: 10 };
    const { y, height } = computeSignaturePlacement(rect, 400, 100); // 4:1, el ancho manda la escala
    expect(height).toBeGreaterThan(rect.height);
    // El borde superior sigue siendo el del rect — el desbordamiento no se
    // reparte hacia arriba.
    expect(y + height).toBeCloseTo(rect.y + rect.height, 5);
  });

  it("centra horizontalmente dentro del rectángulo", () => {
    const rect = { x: 10, y: 0, width: 100, height: 100 };
    const { x, width } = computeSignaturePlacement(rect, 50, 50);
    expect(x + width / 2).toBeCloseTo(rect.x + rect.width / 2, 5);
  });

  it("conserva la proporción de la imagen original", () => {
    const rect = { x: 0, y: 0, width: 80, height: 20 };
    const { width, height } = computeSignaturePlacement(rect, 300, 150); // 2:1
    expect(width / height).toBeCloseTo(2, 5);
  });
});

async function buildFixturePdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([300, 300]);
  const form = pdfDoc.getForm();
  const addText = (name, x, y, w, h) => form.createTextField(name).addToPage(page, { x, y, width: w, height: h });
  const addCheckbox = (name, x, y) => form.createCheckBox(name).addToPage(page, { x, y, width: 12, height: 12 });

  addText("f.first", 10, 280, 100, 14);
  addText("f.last", 10, 260, 100, 14);
  addText("row0.si", 10, 240, 30, 14);
  addText("row0.date", 45, 240, 30, 14);
  addText("row0.ii", 80, 240, 30, 14);
  addText("row0.in", 115, 240, 30, 14);
  addCheckbox("exam.printed", 10, 220);
  addCheckbox("exam.online", 30, 220);
  addText("sig.student", 10, 40, 80, 30);
  addText("sig.studentDate", 100, 40, 60, 14);

  return pdfDoc.save();
}

const MINIMAL_TEMPLATE = {
  fields: { firstName: "f.first", lastName: "f.last" },
  sessionRows: [{ studentInitials: "row0.si", date: "row0.date", instructorInitials: "row0.ii", instructorNumber: "row0.in" }],
  examVersion: { printed: "exam.printed", online: "exam.online" },
  signatures: { student: "sig.student", studentDate: "sig.studentDate" },
};

describe("fillTrainingRecordPdf", () => {
  it("rellena texto, marca una casilla, dibuja la firma y aplana el resultado", async () => {
    const fixtureBytes = await buildFixturePdf();
    const filledBytes = await fillTrainingRecordPdf(fixtureBytes, MINIMAL_TEMPLATE, {
      firstName: "Ana", lastName: "Garcia",
      sessionRows: [{ studentInitials: "AG", date: "01/09/26", instructorInitials: "JD", instructorNumber: "12345" }],
      examVersion: "online",
      generatedAtLabel: "02/09/26",
      signatures: { studentPng: TINY_PNG },
    });

    const resultDoc = await PDFDocument.load(filledBytes);
    // Tras flatten(), el formulario ya no tiene campos interactivos — el
    // documento queda estático, no reeditable.
    expect(resultDoc.getForm().getFields()).toHaveLength(0);
  });

  it("no falla si faltan bloques opcionales (sin firma, sin variante de curso)", async () => {
    const fixtureBytes = await buildFixturePdf();
    await expect(
      fillTrainingRecordPdf(fixtureBytes, MINIMAL_TEMPLATE, { firstName: "Ana", lastName: "Garcia" })
    ).resolves.toBeInstanceOf(Uint8Array);
  });

  // Regresión (2026-09-02, reportado por el usuario): la plantilla OWD real
  // trae una página 2 adicional (finalización de Referral/Scuba/Indoor
  // Diver, fuera de alcance, no mapeada) — el PDF generado se colaba
  // entero, con esa página 2 siempre en blanco. Solo debe quedar la página
  // con los campos del curso (sourcePdfPage).
  it("descarta cualquier página del PDF original que no sea la de sourcePdfPage", async () => {
    const pdfDoc = await PDFDocument.load(await buildFixturePdf());
    pdfDoc.addPage([300, 300]); // simula la página 2 de OWD, sin ningún campo mapeado
    const twoPageBytes = await pdfDoc.save();

    const filledBytes = await fillTrainingRecordPdf(twoPageBytes, { ...MINIMAL_TEMPLATE, sourcePdfPage: 1 }, {
      firstName: "Ana", lastName: "Garcia",
    });

    const resultDoc = await PDFDocument.load(filledBytes);
    expect(resultDoc.getPageCount()).toBe(1);
  });

  // Regresión (2026-09-02, verificado con las 4 plantillas reales activas
  // vía Supabase Storage, no solo con este fixture): las plantillas SSI
  // reales tienen cada campo con un /Parent que apunta, por error del
  // generador original del PDF, al propio diccionario AcroForm en vez de a
  // un campo padre real o a ningún /Parent. pdf-lib no sabe resolver esto y
  // form.flatten() lanzaba "Tried to remove inexistent field" para
  // cualquier campo — ver stripBrokenParentRefs() en pdfFill.js. Los
  // fixtures de arriba, construidos con form.createTextField(...), no
  // reproducen el problema porque generan campos sin ese /Parent roto — hay
  // que fabricarlo a mano para que este test pueda fallar sin el fix.
  it("rellena y aplana un PDF cuyos campos tienen el /Parent roto (apuntando al propio AcroForm), como las plantillas reales", async () => {
    // Fixture aparte, sin puntos en los nombres de campo: pdf-lib interpreta
    // un punto en form.createTextField(name) como separador de jerarquía
    // (crea campos no-terminales intermedios), lo que enmascararía el bug
    // real — las plantillas SSI reales no tienen esa jerarquía, cada campo
    // es un único nivel con un /Parent roto apuntando al AcroForm.
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([300, 300]);
    const form = pdfDoc.getForm();
    form.createTextField("first").addToPage(page, { x: 10, y: 280, width: 100, height: 14 });
    form.createTextField("last").addToPage(page, { x: 10, y: 260, width: 100, height: 14 });
    form.createTextField("sig").addToPage(page, { x: 10, y: 40, width: 80, height: 30 });

    const acroFormRef = pdfDoc.catalog.get(PDFName.of("AcroForm"));
    for (const field of form.getFields()) {
      field.acroField.dict.set(PDFName.of("Parent"), acroFormRef);
    }
    const corruptedBytes = await pdfDoc.save();

    // Con el /Parent apuntando al AcroForm (sin /T), pdf-lib calcula el
    // nombre completo de cada campo como "undefined.<nombre original>" —
    // exactamente el motivo por el que templateFieldMaps.js ya usa ese
    // mismo prefijo para las 4 plantillas reales (helper P(), ver ese
    // archivo).
    const CORRUPTED_TEMPLATE = {
      fields: { firstName: "undefined.first", lastName: "undefined.last" },
      sessionRows: [],
      signatures: { student: "undefined.sig" },
    };

    await expect(
      fillTrainingRecordPdf(corruptedBytes, CORRUPTED_TEMPLATE, {
        firstName: "Ana", lastName: "Garcia",
        signatures: { studentPng: TINY_PNG },
      })
    ).resolves.toBeInstanceOf(Uint8Array);
  });
});
