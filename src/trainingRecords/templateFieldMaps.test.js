import { TEMPLATE_FIELD_MAPS } from "./templateFieldMaps";

// Comprobación estructural pura (sin red) — la verificación real contra
// los PDF de Supabase vive en scripts/verify-training-record-field-maps.mjs
// (necesita descargar los ficheros reales, no apta para el suite normal).
// Esto cubre solo errores mecánicos: referencias duplicadas dentro de la
// misma plantilla, o un campo que no sigue el patrón esperado del PDF
// original ("undefined.tr-input-<id>-<n>").

function collectFieldRefs(node) {
  const refs = [];
  for (const value of Object.values(node)) {
    if (typeof value === "string" && value.startsWith("undefined.tr-input-")) {
      refs.push(value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => refs.push(...collectFieldRefs(item)));
    } else if (value && typeof value === "object") {
      refs.push(...collectFieldRefs(value));
    }
  }
  return refs;
}

describe("templateFieldMaps", () => {
  it.each(Object.keys(TEMPLATE_FIELD_MAPS))("%s: ningún campo se referencia dos veces", (code) => {
    const refs = collectFieldRefs(TEMPLATE_FIELD_MAPS[code]);
    const duplicates = refs.filter((f, i) => refs.indexOf(f) !== i);
    expect(duplicates).toEqual([]);
  });

  it.each(Object.keys(TEMPLATE_FIELD_MAPS))("%s: todos los campos siguen el patrón real del PDF", (code) => {
    const refs = collectFieldRefs(TEMPLATE_FIELD_MAPS[code]);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref).toMatch(/^undefined\.tr-input-\d+-\d+$/);
    }
  });

  it.each(Object.keys(TEMPLATE_FIELD_MAPS))("%s: tiene nombre, campos de nombre/apellidos y firmas", (code) => {
    const template = TEMPLATE_FIELD_MAPS[code];
    expect(template.name).toBeTruthy();
    expect(template.fields.firstName).toBeTruthy();
    expect(template.fields.lastName).toBeTruthy();
    expect(template.signatures.student).toBeTruthy();
    expect(template.signatures.instructor).toBeTruthy();
  });
});
