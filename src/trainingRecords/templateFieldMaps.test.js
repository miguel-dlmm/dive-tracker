import { TEMPLATE_FIELD_MAPS } from "./templateFieldMaps";

// Comprobación estructural pura (sin red) — la verificación real contra
// los PDF de Supabase vive en scripts/verify-training-record-field-maps.mjs
// (necesita descargar los ficheros reales, no apta para el suite normal).
// Esto cubre solo errores mecánicos: referencias duplicadas dentro de la
// misma plantilla, o un campo que no sigue el patrón esperado.
//
// Dos formas de "field" conviven en este archivo (ver pdfFill.js,
// isRectField/resolveRect): un string "undefined.tr-input-<id>-<n>" para
// las 4 plantillas con AcroForm real (OWD/AOWD/SC-DD/SC-EAN), o un objeto
// { rect: {x,y,width,height} } para las plantillas sin ningún campo de
// formulario (BD/SC-LV/SC-NV/SC-PB/SC-RR/SC-SR) — coordenadas extraídas y
// verificadas visualmente, ver scripts/extract-flat-template-rects.mjs.
// collectFieldRefs() recoge los dos tipos por separado para poder aplicar
// la comprobación de "no duplicados" a cada uno con su propia noción de
// igualdad (un string se compara por valor; un rect se compara por sus 4
// coordenadas — dos objetos rect distintos con el mismo contenido nunca
// deberían considerarse "el mismo campo reutilizado por error").

function collectFieldRefs(node) {
  const stringRefs = [];
  const rectRefs = [];
  for (const value of Object.values(node)) {
    if (typeof value === "string" && value.startsWith("undefined.tr-input-")) {
      stringRefs.push(value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        const nested = collectFieldRefs(item);
        stringRefs.push(...nested.stringRefs);
        rectRefs.push(...nested.rectRefs);
      });
    } else if (value && typeof value === "object" && typeof value.rect === "object") {
      const r = value.rect;
      rectRefs.push(`${r.x},${r.y},${r.width},${r.height}`);
    } else if (value && typeof value === "object") {
      const nested = collectFieldRefs(value);
      stringRefs.push(...nested.stringRefs);
      rectRefs.push(...nested.rectRefs);
    }
  }
  return { stringRefs, rectRefs };
}

function usesRectAddressing(template) {
  return typeof template.fields.firstName === "object";
}

describe("templateFieldMaps", () => {
  it.each(Object.keys(TEMPLATE_FIELD_MAPS))("%s: ningún campo se referencia dos veces", (code) => {
    const { stringRefs, rectRefs } = collectFieldRefs(TEMPLATE_FIELD_MAPS[code]);
    const dupStrings = stringRefs.filter((f, i) => stringRefs.indexOf(f) !== i);
    const dupRects = rectRefs.filter((f, i) => rectRefs.indexOf(f) !== i);
    expect(dupStrings).toEqual([]);
    expect(dupRects).toEqual([]);
  });

  it.each(Object.keys(TEMPLATE_FIELD_MAPS))("%s: todos los campos siguen el patrón esperado según su modo de direccionamiento", (code) => {
    const template = TEMPLATE_FIELD_MAPS[code];
    const { stringRefs, rectRefs } = collectFieldRefs(template);
    if (usesRectAddressing(template)) {
      expect(rectRefs.length).toBeGreaterThan(0);
      expect(stringRefs).toEqual([]);
      for (const ref of rectRefs) {
        const [x, y, width, height] = ref.split(",").map(Number);
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);
      }
    } else {
      expect(stringRefs.length).toBeGreaterThan(0);
      expect(rectRefs).toEqual([]);
      for (const ref of stringRefs) {
        expect(ref).toMatch(/^undefined\.tr-input-\d+-\d+$/);
      }
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

  // Ninguna fila `fixed` puede llevar también `optional: true` — con
  // `optional: true`, buildDefaultConfig (recordConfig.js) inicializa
  // `includedRows[i]` en `false`, y una fila `fixed` se renderiza siempre
  // como marcada/deshabilitada (ProgressRowToggle, TrainingRecordsTab.jsx)
  // sin que el usuario pueda corregir ese `includedRows[i]` a mano — el
  // resultado sería una fila que la UI muestra como "Obligatorio" pero que
  // en realidad queda excluida en silencio del documento generado.
  it.each(Object.keys(TEMPLATE_FIELD_MAPS))("%s: ninguna fila 'fixed' es también 'optional'", (code) => {
    const template = TEMPLATE_FIELD_MAPS[code];
    (template.sessionRows || []).forEach((row) => {
      if (row.fixed) expect(row.optional).not.toBe(true);
    });
  });

  // Pedido explícito del usuario (2026-09-08) — qué filas de progreso son
  // obligatorias de verdad (`fixed: true`) en cada plantilla, por índice
  // (0-based) dentro de `sessionRows`. Regresión directa contra ese
  // encargo: un cambio futuro que reordene o desmarque una fila por error
  // lo detecta este test, no solo una revisión visual.
  it.each([
    ["OWD", [0, 1, 2, 3, 4, 5]], // Sesiones académicas, piscina, Aguas Abiertas 1-4 (ya existía)
    ["AOWD", [0, 1, 2]], // las 3 filas fijas (ya existía)
    ["SC-DD", [0, 2, 3]], // Deep Diving: 1ª, 3ª y 4ª
    ["SC-EAN", [0, 1, 2]], // Nitrox: las 3 primeras
    ["BD", [0, 1, 2]], // Basic Diver: todas
    ["SC-LV", [0, 2]], // Night & Limited Visibility: 1ª y 3ª
    ["SC-NV", [0, 1, 2, 3]], // Navigation: las 4 primeras
    ["SC-PB", [0, 1, 2]], // Perfect Buoyancy: las 3 primeras
    ["SC-SR", [0, 1, 2, 3, 4, 5, 6]], // Diver Stress & Rescue: las 7 primeras
    ["SC-RR", [0, 1, 2, 3, 4, 5, 6]], // React Right: todas
  ])("%s: las filas obligatorias son exactamente las esperadas", (code, expectedFixedIndexes) => {
    const template = TEMPLATE_FIELD_MAPS[code];
    const actualFixedIndexes = template.sessionRows
      .map((row, i) => (row.fixed ? i : null))
      .filter((i) => i !== null);
    expect(actualFixedIndexes).toEqual(expectedFixedIndexes);
  });

  // La confirmación de examen (o del cuestionario, en BD) ya es
  // obligatoria de por sí en toda plantilla que la tenga — se renderiza
  // como fecha suelta sin casilla (DateOnlyRow, TrainingRecordsTab.jsx) y
  // validateRecordConfig (recordConfig.js) la exige siempre. Cubre la
  // parte "...y examen"/"...confirmación del cuestionario" del pedido del
  // usuario sin necesitar ningún flag `fixed` en `examConfirmation`.
  it.each(["SC-DD", "SC-EAN", "BD", "SC-LV", "SC-NV", "SC-PB", "SC-SR", "SC-RR"])(
    "%s: tiene confirmación de examen/cuestionario obligatoria",
    (code) => {
      expect(TEMPLATE_FIELD_MAPS[code].examConfirmation).toBeTruthy();
    }
  );
});
