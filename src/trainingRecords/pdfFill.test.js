import { PDFDocument } from "pdf-lib";
import { buildFillOperations, fillTrainingRecordPdf } from "./pdfFill";

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
  it("rellena nombre, apellidos y la primera fila de sesión", () => {
    const { texts } = buildFillOperations(TEMPLATE, {
      firstName: "Ana", lastName: "Garcia",
      sessionRows: [{ studentInitials: "AG", date: "2026-09-01", instructorInitials: "JD", instructorNumber: "12345" }],
    });
    expect(texts).toEqual(expect.arrayContaining([
      { field: "f.first", value: "Ana" },
      { field: "f.last", value: "Garcia" },
      { field: "row0.si", value: "AG" },
      { field: "row0.ii", value: "JD" },
      { field: "row0.in", value: "12345" },
    ]));
  });

  it("nunca rellena ningún campo de fecha, aunque se le pase una (pendiente de decidir, 2026-09-02)", () => {
    const { texts } = buildFillOperations(TEMPLATE, {
      firstName: "Ana", lastName: "Garcia",
      sessionRows: [{ studentInitials: "AG", date: "2026-09-01", instructorInitials: "JD", instructorNumber: "12345" }],
      student: { date: "2026-09-01" }, parent: { date: "2026-09-01" }, instructor: { date: "2026-09-01" },
    });
    expect(texts.some((t) => /date/i.test(t.field))).toBe(false);
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
      sessionRows: [{ studentInitials: "AG", date: "2026-09-01", instructorInitials: "JD", instructorNumber: "12345" }],
      examVersion: "online",
      student: { date: "2026-09-01" },
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
});
