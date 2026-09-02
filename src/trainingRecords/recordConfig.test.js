import { buildDefaultConfig, validateRecordConfig, validateStudentFields, buildFillData } from "./recordConfig";
import { TEMPLATE_FIELD_MAPS } from "./templateFieldMaps";

const OWD = TEMPLATE_FIELD_MAPS.OWD;
const AOWD = TEMPLATE_FIELD_MAPS.AOWD;

describe("buildDefaultConfig", () => {
  it("premarca la versión de examen en Online cuando la plantilla tiene esa sección", () => {
    expect(buildDefaultConfig(OWD).examVersion).toBe("online");
  });

  it("no propone versión de examen si la plantilla no tiene esa sección (AOWD)", () => {
    expect(buildDefaultConfig(AOWD).examVersion).toBeNull();
  });

  it("las filas obligatorias empiezan marcadas y las opcionales (OW5/OW6) sin marcar, sin ninguna fecha puesta", () => {
    const cfg = buildDefaultConfig(OWD);
    // OWD: 8 filas — las 2 últimas (OW5/OW6) son las opcionales del 3er día.
    expect(cfg.includedRows).toHaveLength(8);
    expect(cfg.includedRows.slice(0, 6)).toEqual([true, true, true, true, true, true]);
    expect(cfg.includedRows.slice(6)).toEqual([false, false]);
    expect(cfg.rowDates).toEqual({});
  });
});

// Configuración COMPARTIDA para todo un listado de alumnos (rediseño
// 2026-09-03) — ya no incluye la firma, que pasa a ser un dato propio de
// cada alumno (ver describe de validateStudentFields más abajo).
describe("validateRecordConfig", () => {
  const allRowDates = { 0: "2026-09-01", 1: "2026-09-01", 2: "2026-09-01", 3: "2026-09-01", 4: "2026-09-02", 5: "2026-09-02" };

  it("exige al menos una fila de progreso marcada", () => {
    const cfg = { ...buildDefaultConfig(OWD), includedRows: OWD.sessionRows.map(() => false), rowDates: allRowDates };
    const { valid, errors } = validateRecordConfig(OWD, cfg);
    expect(valid).toBe(false);
    expect(errors.rows).toBeTruthy();
  });

  it("exige la fecha de cada fila marcada, con un error por índice de fila", () => {
    const cfg = { ...buildDefaultConfig(OWD), rowDates: {} };
    const { errors } = validateRecordConfig(OWD, cfg);
    expect(errors.rowDates[0]).toBeTruthy();
    expect(errors.rowDates[2]).toBeTruthy();
    // Las filas opcionales sin marcar (OW5/OW6, índices 6/7) no exigen fecha.
    expect(errors.rowDates[6]).toBeUndefined();
  });

  it("no exige fecha de una fila ya rellenada", () => {
    const cfg = { ...buildDefaultConfig(OWD), rowDates: { ...allRowDates, 0: undefined } };
    const { errors } = validateRecordConfig(OWD, cfg);
    expect(errors.rowDates[0]).toBeTruthy();
    expect(errors.rowDates[1]).toBeUndefined();
  });

  it("exige versión de examen, certificación y confirmación de examen final (con su propia fecha) solo si la plantilla las tiene", () => {
    const base = { ...buildDefaultConfig(OWD), rowDates: allRowDates, examVersion: null, upgrade: null, examConfirmed: false };
    const { errors } = validateRecordConfig(OWD, base);
    expect(errors.examVersion).toBeTruthy();
    expect(errors.upgrade).toBeTruthy();
    expect(errors.examConfirmation).toBeTruthy();

    // AOWD no tiene ninguna de esas 3 secciones — no deben exigirse.
    const aowdCfg = { ...buildDefaultConfig(AOWD), rowDates: { 0: "2026-09-01", 1: "2026-09-01", 2: "2026-09-01" } };
    const aowdResult = validateRecordConfig(AOWD, aowdCfg);
    expect(aowdResult.errors.examVersion).toBeUndefined();
    expect(aowdResult.errors.upgrade).toBeUndefined();
    expect(aowdResult.errors.examConfirmation).toBeUndefined();
  });

  it("marca la confirmación de examen como incompleta si falta su fecha, aunque esté marcada", () => {
    const cfg = { ...buildDefaultConfig(OWD), rowDates: allRowDates, examVersion: "online", upgrade: "openWaterDiver", examConfirmed: true, examConfirmedDate: null };
    const { errors } = validateRecordConfig(OWD, cfg);
    expect(errors.examConfirmation).toBeUndefined();
    expect(errors.examConfirmationDate).toBeTruthy();
  });

  it("exige la fecha de una inmersión de especialidad completada (AOWD)", () => {
    const cfg = { ...buildDefaultConfig(AOWD), rowDates: { 0: "2026-09-01", 1: "2026-09-01", 2: "2026-09-01" } };
    cfg.specialtyDives[0] = { adventureId: "abc", adventureName: "Buceo nocturno", completed: true, date: null };
    const { errors } = validateRecordConfig(AOWD, cfg);
    expect(errors.specialtyDates[0]).toBeTruthy();
  });

  it("válido cuando todos los campos obligatorios están completos, sin necesitar ninguna firma", () => {
    const cfg = { ...buildDefaultConfig(OWD), rowDates: allRowDates, examVersion: "online", upgrade: "openWaterDiver", examConfirmed: true, examConfirmedDate: "2026-09-02" };
    expect(validateRecordConfig(OWD, cfg).valid).toBe(true);
  });
});

// Datos propios de UN alumno del listado — nombre, apellidos, iniciales y
// firma, independientes de la configuración compartida de arriba.
describe("validateStudentFields", () => {
  const validStudent = { firstName: "Ana", lastName: "Garcia", initials: "AG", studentSignature: "data:image/png;base64,AAA" };

  it("exige nombre, apellidos, iniciales y firma del alumno", () => {
    const { valid, errors } = validateStudentFields({ firstName: "", lastName: "", initials: "", studentSignature: null });
    expect(valid).toBe(false);
    expect(errors.firstName).toBeTruthy();
    expect(errors.lastName).toBeTruthy();
    expect(errors.initials).toBeTruthy();
    expect(errors.studentSignature).toBeTruthy();
  });

  it("no exige firma del tutor — es opcional", () => {
    expect(validateStudentFields(validStudent).valid).toBe(true);
  });
});

describe("buildFillData", () => {
  const instructor = { namePrinted: "Miguel Instructor", initials: "MI", number: "12345", signature: "data:image/png;base64,SIG" };
  const student = { firstName: "Ana", lastName: "Garcia", initials: "AG", studentSignature: "data:image/png;base64,STU", guardianSignature: null };

  it("aplica a cada fila la fecha puesta a mano en esa fila, no una fecha compartida", () => {
    const cfg = { ...buildDefaultConfig(OWD), rowDates: { 0: "2026-09-02", 2: "2026-09-01" } };
    const data = buildFillData(OWD, student, cfg, instructor);
    expect(data.sessionRows[0].date).toBe("02/09/26");
    expect(data.sessionRows[2].date).toBe("01/09/26");
  });

  it("la fecha de confirmación de examen es la puesta a mano en esa fila, no derivada de otras filas", () => {
    const cfg = { ...buildDefaultConfig(OWD), rowDates: { 0: "2026-09-01" }, examConfirmedDate: "2026-09-05" };
    const data = buildFillData(OWD, student, cfg, instructor);
    expect(data.examConfirmation.date).toBe("05/09/26");
  });

  it("no incluye examConfirmation si la plantilla no tiene esa sección (AOWD)", () => {
    const cfg = { ...buildDefaultConfig(AOWD), rowDates: { 0: "2026-09-01" } };
    const data = buildFillData(AOWD, student, cfg, instructor);
    expect(data.examConfirmation).toBeNull();
  });

  it("una aventura elegida (compartida para todo el listado) rellena solo la fila 'Completada' con su propia fecha, nunca la de sesión de piscina", () => {
    const cfg = { ...buildDefaultConfig(AOWD), rowDates: { 0: "2026-09-01" } };
    cfg.specialtyDives[0] = { adventureId: "abc", adventureName: "Buceo nocturno", completed: true, date: "2026-09-02" };
    const data = buildFillData(AOWD, student, cfg, instructor);
    expect(data.specialtyDives[0]).toEqual({
      specialtyName: "Buceo nocturno",
      poolSession: null,
      completed: { studentInitials: "AG", date: "02/09/26", instructorInitials: "MI", instructorNumber: "12345" },
    });
    expect(data.specialtyDives[1]).toBeNull();
  });

  it("las firmas vienen del propio alumno (studentSignature/guardianSignature), la del instructor siempre del perfil", () => {
    const cfg = { ...buildDefaultConfig(OWD), rowDates: { 0: "2026-09-01" } };
    const data = buildFillData(OWD, student, cfg, instructor);
    expect(data.signatures.studentPng).toBe("data:image/png;base64,STU");
    expect(data.signatures.parentPng).toBeNull();
    expect(data.signatures.instructorPng).toBe("data:image/png;base64,SIG");
  });

  it("generatedAtLabel es la fecha de hoy, no una fecha del formulario", () => {
    const cfg = { ...buildDefaultConfig(OWD), rowDates: { 0: "2026-09-01" } };
    const data = buildFillData(OWD, student, cfg, instructor);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    expect(data.generatedAtLabel).toBe(`${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${String(now.getFullYear()).slice(2)}`);
  });
});
