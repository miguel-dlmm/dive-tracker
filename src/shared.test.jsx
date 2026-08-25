import { colorFor, applyListFilters, formatMoney, oppositeStatus, lighten } from "./shared";

// Estos tests documentan el comportamiento ACTUAL de las funciones puras de
// shared.jsx, como red de seguridad antes de dividir/refactorizar el
// archivo. No corrigen ningún comportamiento, aunque resulte sorprendente
// (ver hallazgos reportados aparte).

describe("colorFor", () => {
  const rows = [
    { name: "Buceo", color: "#FF0000" },
    { name: "Snorkel", color: "#00FF00" },
  ];

  it("devuelve el color de la fila cuyo name coincide", () => {
    expect(colorFor(rows, "Buceo")).toBe("#FF0000");
  });

  it("devuelve el fallback por defecto si no encuentra el name", () => {
    expect(colorFor(rows, "Curso")).toBe("#6B7280");
  });

  it("devuelve un fallback personalizado si se indica", () => {
    expect(colorFor(rows, "Curso", "#000000")).toBe("#000000");
  });

  it("devuelve el fallback si la tabla de filas está vacía", () => {
    expect(colorFor([], "Buceo")).toBe("#6B7280");
  });

  it("devuelve el fallback si la fila coincide pero su color es una cadena vacía", () => {
    const withEmptyColor = [{ name: "Buceo", color: "" }];
    expect(colorFor(withEmptyColor, "Buceo")).toBe("#6B7280");
  });
});

describe("applyListFilters", () => {
  const rows = [
    { date: "2026-01-05", school: "Escuela A", activity: "Buceo" },
    { date: "2026-01-15", school: "Escuela B", activity: "Snorkel" },
    { date: "2026-02-01", school: "Escuela A", activity: "Curso" },
  ];

  it("sin filtros, devuelve todas las filas", () => {
    expect(applyListFilters(rows, {})).toEqual(rows);
  });

  it("filtra por fecha desde (from)", () => {
    const result = applyListFilters(rows, { from: "2026-01-10" });
    expect(result.map((r) => r.activity)).toEqual(["Snorkel", "Curso"]);
  });

  it("filtra por fecha hasta (to)", () => {
    const result = applyListFilters(rows, { to: "2026-01-10" });
    expect(result.map((r) => r.activity)).toEqual(["Buceo"]);
  });

  it("filtra por rango from + to combinados", () => {
    const result = applyListFilters(rows, { from: "2026-01-06", to: "2026-01-31" });
    expect(result.map((r) => r.activity)).toEqual(["Snorkel"]);
  });

  it("filtra por escuela exacta", () => {
    const result = applyListFilters(rows, { school: "Escuela A" });
    expect(result.map((r) => r.activity)).toEqual(["Buceo", "Curso"]);
  });

  it("con activity como array vacío, no filtra por actividad (todas)", () => {
    const result = applyListFilters(rows, { activity: [] });
    expect(result).toEqual(rows);
  });

  it("filtra por una o varias actividades seleccionadas", () => {
    const result = applyListFilters(rows, { activity: ["Buceo", "Curso"] });
    expect(result.map((r) => r.activity)).toEqual(["Buceo", "Curso"]);
  });

  it("combina todos los filtros a la vez", () => {
    const result = applyListFilters(rows, {
      from: "2026-01-01",
      to: "2026-01-31",
      school: "Escuela A",
      activity: ["Buceo"],
    });
    expect(result.map((r) => r.activity)).toEqual(["Buceo"]);
  });

  it("devuelve una lista vacía si no hay filas", () => {
    expect(applyListFilters([], { school: "Escuela A" })).toEqual([]);
  });
});

describe("formatMoney", () => {
  const currencyRows = [
    { code: "EUR", symbol: "€" },
    { code: "USD", symbol: "$" },
  ];

  it("formatea un importe con el símbolo de la moneda encontrada", () => {
    expect(formatMoney(1234.5, "EUR", currencyRows)).toBe("1234,50 €");
  });

  it("formatea importes negativos", () => {
    expect(formatMoney(-42.5, "USD", currencyRows)).toBe("-42,50 $");
  });

  it("trata amount null como 0", () => {
    expect(formatMoney(null, "EUR", currencyRows)).toBe("0,00 €");
  });

  it("trata amount undefined como 0", () => {
    expect(formatMoney(undefined, "EUR", currencyRows)).toBe("0,00 €");
  });

  it("si el code no está en currencyRows, usa el propio code como símbolo", () => {
    expect(formatMoney(10, "GBP", currencyRows)).toBe("10,00 GBP");
  });

  it("si el code es una cadena vacía y no hay moneda, el símbolo queda vacío", () => {
    expect(formatMoney(10, "", currencyRows)).toBe("10,00 ");
  });

  it("redondea a 2 decimales y agrupa miles en formato es-ES", () => {
    expect(formatMoney(1234567.891, "EUR", currencyRows)).toBe("1.234.567,89 €");
  });
});

describe("oppositeStatus", () => {
  const TWO_STATES = [
    { name: "Pendiente", is_default: true },
    { name: "Pagado", is_default: false },
  ];
  const THREE_STATES = [
    { name: "Pendiente", is_default: true },
    { name: "Parcial", is_default: false },
    { name: "Pagado", is_default: false },
  ];
  const ONE_STATE = [{ name: "Único", is_default: true }];

  it("con 2 estados, alterna entre ambos", () => {
    expect(oppositeStatus("Pendiente", TWO_STATES)).toBe("Pagado");
    expect(oppositeStatus("Pagado", TWO_STATES)).toBe("Pendiente");
  });

  it("con más de 2 estados, desde el estado por defecto salta al primer no-default", () => {
    expect(oppositeStatus("Pendiente", THREE_STATES)).toBe("Parcial");
  });

  it("con más de 2 estados, desde CUALQUIER estado no-default vuelve siempre al estado por defecto (no rota entre los no-default)", () => {
    expect(oppositeStatus("Parcial", THREE_STATES)).toBe("Pendiente");
    expect(oppositeStatus("Pagado", THREE_STATES)).toBe("Pendiente");
  });

  it("con un único estado disponible, no cambia (devuelve el mismo nombre)", () => {
    expect(oppositeStatus("Único", ONE_STATE)).toBe("Único");
  });

  it("si el estado actual no existe en la lista, lo trata como si fuera 'por defecto' y salta al primer no-default", () => {
    expect(oppositeStatus("Desconocido", TWO_STATES)).toBe("Pagado");
  });
});

describe("lighten", () => {
  it("aclara un color hex válido con # con el amount por defecto (0.88)", () => {
    expect(lighten("#6B7280")).toBe("rgb(237, 238, 240)");
  });

  it("acepta un hex sin # (mismo resultado)", () => {
    expect(lighten("6B7280")).toBe("rgb(237, 238, 240)");
  });

  it("con amount 0 no aclara nada (devuelve el color original)", () => {
    expect(lighten("#FF0000", 0)).toBe("rgb(255, 0, 0)");
  });

  it("con amount 0.5 mezcla el color a la mitad con blanco", () => {
    expect(lighten("#FF0000", 0.5)).toBe("rgb(255, 128, 128)");
  });

  it("sin hex (undefined), usa el fallback gris de la propia función", () => {
    expect(lighten(undefined)).toBe("rgb(237, 238, 240)");
  });

  it("con un hex inválido (no hexadecimal), trata los canales no parseables como 0 en vez de fallar o avisar", () => {
    // Comportamiento actual documentado, no corregido: "zzzzzz" no es hex
    // válido y produce un gris silencioso en vez de un error o el fallback.
    expect(lighten("zzzzzz")).toBe("rgb(224, 224, 224)");
  });
});
