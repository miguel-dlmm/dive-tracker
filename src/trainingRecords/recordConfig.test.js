import { buildDefaultConfig, activeDayGroups, dayGroupLabels, validateRecordConfig, buildFillData } from "./recordConfig";
import { TEMPLATE_FIELD_MAPS } from "./templateFieldMaps";

const OWD = TEMPLATE_FIELD_MAPS.OWD;
const AOWD = TEMPLATE_FIELD_MAPS.AOWD;
const SCDD = TEMPLATE_FIELD_MAPS["SC-DD"];

describe("buildDefaultConfig", () => {
  it("premarca la versión de examen en Online cuando la plantilla tiene esa sección", () => {
    expect(buildDefaultConfig(OWD).examVersion).toBe("online");
  });

  it("no propone versión de examen si la plantilla no tiene esa sección (AOWD)", () => {
    expect(buildDefaultConfig(AOWD).examVersion).toBeNull();
  });

  it("las filas obligatorias empiezan marcadas y las opcionales (OW5/OW6) sin marcar", () => {
    const cfg = buildDefaultConfig(OWD);
    // OWD: 8 filas — las 2 últimas (OW5/OW6) son las opcionales del 3er día.
    expect(cfg.includedRows).toHaveLength(8);
    expect(cfg.includedRows.slice(0, 6)).toEqual([true, true, true, true, true, true]);
    expect(cfg.includedRows.slice(6)).toEqual([false, false]);
  });
});

describe("dayGroupLabels", () => {
  it("plantilla multi-día (OWD) usa etiquetas 'Día N'", () => {
    expect(dayGroupLabels(OWD)).toEqual({ 1: "Día 1", 2: "Día 2", 3: "Día 3" });
  });

  it("plantilla de un solo día (SC-DD) usa una etiqueta genérica", () => {
    expect(dayGroupLabels(SCDD)).toEqual({ 1: "Fecha del curso" });
  });
});

describe("activeDayGroups", () => {
  it("Día 1 siempre está activo, aunque no haya nada más marcado", () => {
    const cfg = buildDefaultConfig(SCDD);
    expect(activeDayGroups(SCDD, cfg)).toEqual([1]);
  });

  it("OWD con la configuración por defecto activa Día 1 y Día 2 (filas obligatorias), no Día 3", () => {
    const cfg = buildDefaultConfig(OWD);
    expect(activeDayGroups(OWD, cfg)).toEqual([1, 2]);
  });

  it("marcar una fila opcional del Día 3 (OW5/OW6) activa ese grupo", () => {
    const cfg = buildDefaultConfig(OWD);
    cfg.includedRows[6] = true; // OW5, optional, day 3
    expect(activeDayGroups(OWD, cfg)).toEqual([1, 2, 3]);
  });

  it("AOWD activa Día 2 solo cuando se elige alguna aventura", () => {
    const cfg = buildDefaultConfig(AOWD);
    expect(activeDayGroups(AOWD, cfg)).toEqual([1]);
    cfg.specialtyDives[0] = { adventureId: "abc", adventureName: "Buceo nocturno", completed: true };
    expect(activeDayGroups(AOWD, cfg)).toEqual([1, 2]);
  });
});

describe("validateRecordConfig", () => {
  const validSignatures = { studentPng: "data:image/png;base64,AAA" };

  it("exige al menos una fila de progreso marcada", () => {
    const cfg = { ...buildDefaultConfig(OWD), includedRows: OWD.sessionRows.map(() => false), dayDates: { 1: "2026-09-01" }, signatures: validSignatures };
    const { valid, errors } = validateRecordConfig(OWD, cfg);
    expect(valid).toBe(false);
    expect(errors.rows).toBeTruthy();
  });

  it("exige la fecha del Día 1", () => {
    const cfg = { ...buildDefaultConfig(OWD), dayDates: {}, signatures: validSignatures };
    const { errors } = validateRecordConfig(OWD, cfg);
    expect(errors.day1).toBeTruthy();
  });

  it("exige versión de examen, certificación y confirmación de examen final solo si la plantilla las tiene", () => {
    const base = { ...buildDefaultConfig(OWD), dayDates: { 1: "2026-09-01" }, examVersion: null, upgrade: null, examConfirmed: false, signatures: validSignatures };
    const { errors } = validateRecordConfig(OWD, base);
    expect(errors.examVersion).toBeTruthy();
    expect(errors.upgrade).toBeTruthy();
    expect(errors.examConfirmation).toBeTruthy();

    // AOWD no tiene ninguna de esas 3 secciones — no deben exigirse.
    const aowdCfg = { ...buildDefaultConfig(AOWD), dayDates: { 1: "2026-09-01" }, signatures: validSignatures };
    const aowdResult = validateRecordConfig(AOWD, aowdCfg);
    expect(aowdResult.errors.examVersion).toBeUndefined();
    expect(aowdResult.errors.upgrade).toBeUndefined();
    expect(aowdResult.errors.examConfirmation).toBeUndefined();
  });

  it("exige la firma del alumno", () => {
    const cfg = { ...buildDefaultConfig(OWD), dayDates: { 1: "2026-09-01" }, examVersion: "online", upgrade: "openWaterDiver", examConfirmed: true, signatures: {} };
    const { errors } = validateRecordConfig(OWD, cfg);
    expect(errors.studentSignature).toBeTruthy();
  });

  it("válido cuando todos los campos obligatorios están completos", () => {
    const cfg = { ...buildDefaultConfig(OWD), dayDates: { 1: "2026-09-01", 2: "2026-09-02" }, examVersion: "online", upgrade: "openWaterDiver", examConfirmed: true, signatures: validSignatures };
    expect(validateRecordConfig(OWD, cfg).valid).toBe(true);
  });
});

describe("buildFillData", () => {
  const student = { firstName: "Ana", lastName: "Garcia", initials: "AG" };
  const instructor = { namePrinted: "Miguel Instructor", initials: "MI", number: "12345", signature: "data:image/png;base64,SIG" };

  it("aplica la fecha del Día 1 a las filas del Día 1 y del Día 2 a las del Día 2", () => {
    const cfg = { ...buildDefaultConfig(OWD), dayDates: { 1: "2026-09-01", 2: "2026-09-02" } };
    const data = buildFillData(OWD, student, cfg, instructor);
    // Fila 0 = "Sesiones Académicas", day 2 -> 02/09/26; fila 2 = OW1, day 1 -> 01/09/26.
    expect(data.sessionRows[0].date).toBe("02/09/26");
    expect(data.sessionRows[2].date).toBe("01/09/26");
  });

  it("la fecha de confirmación de examen es la del último día activo", () => {
    const cfg = { ...buildDefaultConfig(OWD), dayDates: { 1: "2026-09-01", 2: "2026-09-02", 3: "2026-09-03" } };
    cfg.includedRows[6] = true; // activa Día 3
    const data = buildFillData(OWD, student, cfg, instructor);
    expect(data.examConfirmation.date).toBe("03/09/26");
  });

  it("no incluye examConfirmation si la plantilla no tiene esa sección (AOWD)", () => {
    const cfg = { ...buildDefaultConfig(AOWD), dayDates: { 1: "2026-09-01" } };
    const data = buildFillData(AOWD, student, cfg, instructor);
    expect(data.examConfirmation).toBeNull();
  });

  it("una aventura elegida rellena solo la fila 'Completada', nunca la de sesión de piscina", () => {
    const cfg = { ...buildDefaultConfig(AOWD), dayDates: { 1: "2026-09-01", 2: "2026-09-02" } };
    cfg.specialtyDives[0] = { adventureId: "abc", adventureName: "Buceo nocturno", completed: true };
    const data = buildFillData(AOWD, student, cfg, instructor);
    expect(data.specialtyDives[0]).toEqual({
      specialtyName: "Buceo nocturno",
      poolSession: null,
      completed: { studentInitials: "AG", date: "02/09/26", instructorInitials: "MI", instructorNumber: "12345" },
    });
    expect(data.specialtyDives[1]).toBeNull();
  });

  it("la firma del instructor viene siempre del perfil, no del formulario", () => {
    const cfg = { ...buildDefaultConfig(OWD), dayDates: { 1: "2026-09-01" } };
    const data = buildFillData(OWD, student, cfg, instructor);
    expect(data.signatures.instructorPng).toBe("data:image/png;base64,SIG");
  });

  it("generatedAtLabel es la fecha de hoy, no una fecha del formulario", () => {
    const cfg = { ...buildDefaultConfig(OWD), dayDates: { 1: "2026-09-01" } };
    const data = buildFillData(OWD, student, cfg, instructor);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    expect(data.generatedAtLabel).toBe(`${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${String(now.getFullYear()).slice(2)}`);
  });
});
