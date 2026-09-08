import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { colorFor, applyListFilters, formatMoney, oppositeStatus, isPendingStatus, lighten, SearchSelect, DatePicker } from "./shared";

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
    expect(formatMoney(1234.5, "EUR", currencyRows)).toBe("1.234,50 €");
  });

  // Bug real reportado (Fase 8, 2026-09-07): sin useGrouping: "always",
  // Intl con locale "es-ES" en modo "auto" (su valor por defecto) no
  // pone el punto de millar en números de 4 cifras (1000-9999) — sí lo
  // pone a partir de 5 cifras. Comprobado en Node antes de corregirlo:
  // `(4400).toLocaleString("es-ES", {...})` daba "4400,00", no
  // "4.400,00". Este test fija el caso exacto reportado para que no
  // pueda volver a colarse silenciosamente.
  it("pone el punto de millar también en importes de 4 cifras (1000-9999)", () => {
    expect(formatMoney(4400, "EUR", currencyRows)).toBe("4.400,00 €");
    expect(formatMoney(1000, "EUR", currencyRows)).toBe("1.000,00 €");
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

describe("isPendingStatus", () => {
  const STATES = [
    { name: "Pendiente", is_default: true },
    { name: "Pagado", is_default: false },
  ];

  it("es true para el estado marcado is_default", () => {
    expect(isPendingStatus("Pendiente", STATES)).toBe(true);
  });

  it("es false para un estado que no es is_default", () => {
    expect(isPendingStatus("Pagado", STATES)).toBe(false);
  });

  it("es false si el estado no existe en el catálogo", () => {
    expect(isPendingStatus("Desconocido", STATES)).toBe(false);
  });

  it("es false si el catálogo está vacío", () => {
    expect(isPendingStatus("Pendiente", [])).toBe(false);
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

// Bug real reportado 2026-09-07 (país de residencia en Mi perfil, un
// SearchSelect con campo de búsqueda): en móvil, escribir en el campo
// abre el teclado virtual, que encoge `visualViewport.height` de golpe
// — antes, ese encogimiento podía hacer que el panel flotante decidiera
// de nuevo si abrirse arriba o abajo MIENTRAS ya estaba abierto,
// saltando de un lado a otro sin que el usuario tocara nada relacionado
// con la posición ("si lo toco salta"). Arreglado congelando esa
// decisión en el instante de abrir (useFloatingPosition, shared.jsx).
describe("useFloatingPosition (vía SearchSelect) — la dirección arriba/abajo no cambia mientras el panel está abierto", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("si al abrir hay poco espacio debajo, el panel abre hacia arriba y sigue arriba aunque el viewport crezca después (el teclado se cierra)", async () => {
    const user = userEvent.setup();
    // Ancla pegada al fondo de un viewport de 768px: solo 38px libres
    // debajo (menos del umbral de 280), 700px libres encima — abre arriba.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      { top: 700, bottom: 730, left: 0, right: 300, width: 300, height: 30 }
    );
    render(<SearchSelect value="" onChange={() => {}} options={[{ value: "a", label: "Alpha" }]} placeholder="Elige" />);

    await user.click(screen.getByRole("textbox", { name: "Elige" }));
    const panel = screen.getByRole("listbox");
    expect(panel.style.top).toBe("");
    expect(panel.style.bottom).not.toBe("");

    // El viewport "crece" (equivalente a que el teclado se cierre) y se
    // dispara el recálculo — sin la congelación, esto haría `openUp`
    // false (ahora sobraría espacio debajo) y el panel saltaría abajo.
    window.innerHeight = 2000;
    window.dispatchEvent(new Event("resize"));

    expect(panel.style.top).toBe("");
    expect(panel.style.bottom).not.toBe("");
  });

  // Bug real reportado 2026-09-08, segunda vuelta (misma pantalla, y
  // también en Registro — dos layouts distintos, confirma que la causa
  // vivía en el hook compartido): "sigue tapado al escribir, y al
  // filtrar el panel queda flotando muy separado del campo, a la altura
  // de otro campo distinto". Causa real: el primer intento (más abajo)
  // corregía la dirección UNA ÚNICA VEZ, solo al primer `resize` de
  // `visualViewport` — pero en iOS, el `resize` del teclado y el SCROLL
  // nativo que hace Safari para revelar el campo por encima del teclado
  // son dos señales distintas, y el hook nunca escuchaba `scroll` de
  // `visualViewport` para la decisión de dirección (sí para el resto de
  // `top`/`bottom`/`maxHeight`, pero no para arriba/abajo) — si el que
  // de verdad "asienta" la posición final es el scroll, la corrección
  // nunca llegaba a dispararse. Fix: escuchar también `scroll`, con
  // DEBOUNCE en vez de "una vez" — así da igual cuántos eventos
  // intermedios lleguen ni en qué orden, la dirección se recalcula
  // cuando el viewport deja de moverse, usando siempre la medida más
  // reciente del campo.
  it("corrige la dirección cuando el asentamiento llega como scroll de visualViewport, no solo como resize", async () => {
    const user = userEvent.setup();
    // jsdom no tiene visualViewport por defecto — se simula uno mínimo
    // (EventTarget real, para que addEventListener/removeEventListener y
    // dispatchEvent funcionen de verdad). getBoundingClientRect usa una
    // variable mutable (no un valor fijo) para poder simular que el
    // campo cambia de posición ENTRE la apertura y el scroll nativo.
    let rect = { top: 500, bottom: 530, left: 0, right: 300, width: 300, height: 30 };
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => rect);
    const vv = Object.assign(new EventTarget(), { height: 400, width: 400 });
    const originalVv = window.visualViewport;
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true, writable: true });

    render(<SearchSelect value="" onChange={() => {}} options={[{ value: "a", label: "Alpha" }]} placeholder="Elige" />);
    await user.click(screen.getByRole("textbox", { name: "Elige" }));
    const panel = screen.getByRole("listbox");
    // Al abrir: campo casi al fondo del viewport (top 500 de 400 de
    // alto) -> poco sitio debajo, abre hacia arriba.
    expect(panel.style.top).toBe("");
    expect(panel.style.bottom).not.toBe("");

    // El teclado ya está abierto (visualViewport no vuelve a encoger),
    // pero Safari desplaza la página para revelar el campo por encima
    // del teclado — el campo pasa a estar cerca de la parte de arriba
    // (top 100), con sitio de sobra debajo. Esto llega como un SCROLL de
    // visualViewport, nunca como un resize.
    rect = { top: 100, bottom: 130, left: 0, right: 300, width: 300, height: 30 };
    vv.dispatchEvent(new Event("scroll"));

    await waitFor(() => expect(panel.style.bottom).toBe(""));
    expect(panel.style.top).not.toBe("");

    Object.defineProperty(window, "visualViewport", { value: originalVv, configurable: true, writable: true });
  });

  it("varios resize/scroll de visualViewport seguidos (el teclado animándose) no dejan la dirección fijada con una medida de tránsito", async () => {
    const user = userEvent.setup();
    let rect = { top: 300, bottom: 330, left: 0, right: 300, width: 300, height: 30 };
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => rect);
    const vv = Object.assign(new EventTarget(), { height: 730, width: 400 });
    const originalVv = window.visualViewport;
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true, writable: true });

    render(<SearchSelect value="" onChange={() => {}} options={[{ value: "a", label: "Alpha" }]} placeholder="Elige" />);
    await user.click(screen.getByRole("textbox", { name: "Elige" }));
    const panel = screen.getByRole("listbox");
    expect(panel.style.bottom).toBe(""); // abrió hacia abajo (400px libres)

    // Primer evento (resize): el teclado empieza a abrirse, pero el
    // campo TODAVÍA no se ha desplazado (medida de tránsito) — con el
    // fix anterior (una única corrección), esta sería la única medida
    // usada para siempre.
    vv.height = 300;
    vv.dispatchEvent(new Event("resize"));

    // Segundo evento (scroll), llega antes de que se cumplan los 120ms
    // de debounce del primero: el scroll nativo termina de traer el
    // campo arriba del todo — la corrección final debe reflejar ESTA
    // medida, no la de tránsito del primer evento.
    rect = { top: 100, bottom: 130, left: 0, right: 300, width: 300, height: 30 };
    vv.dispatchEvent(new Event("scroll"));

    // Con rect.top=100 y vh=300, sobra sitio debajo (170px) y apenas hay
    // sitio encima (100px) — debe seguir abriendo hacia abajo, nunca
    // saltar a "arriba" con la medida de tránsito del primer evento.
    await waitFor(() => expect(panel.style.bottom).toBe(""));
    expect(panel.style.top).not.toBe("");

    Object.defineProperty(window, "visualViewport", { value: originalVv, configurable: true, writable: true });
  });
});

// Navegación por década/año/mes/día añadida 2026-09-08 (pedido explícito,
// fecha de nacimiento: "poder navegar en bloques de 10 años, luego elegir
// el mes, y luego el día, para no generar tantos clics como hace falta
// ahora"). Sustituye al salto de año de un clic por año que ya existía en
// el nivel de día.
describe("DatePicker — navegación por década/año/mes/día", () => {
  it("abre en el nivel de día, con la cabecera 'mes año' como botón que abre el nivel de mes", async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2024-03-15" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Elegir fecha" }));

    expect(screen.getByRole("button", { name: "15 de Marzo" })).toBeInTheDocument(); // celda del día 15, no ambigua con la cabecera
    const monthHeader = screen.getByRole("button", { name: "Elegir mes" });
    expect(monthHeader).toHaveTextContent("Marzo 2024");
  });

  it("tocar la cabecera de día abre el nivel de mes con los 12 meses y salto de año", async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2024-03-15" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Elegir fecha" }));
    await user.click(screen.getByRole("button", { name: "Elegir mes" }));

    expect(screen.getByRole("button", { name: "Julio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Año anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir año" })).toHaveTextContent("2024");
  });

  it("elegir un mes vuelve al nivel de día con ese mes ya mostrado", async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2024-03-15" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Elegir fecha" }));
    await user.click(screen.getByRole("button", { name: "Elegir mes" }));
    await user.click(screen.getByRole("button", { name: "Julio" }));

    expect(screen.getByRole("button", { name: "Elegir mes" })).toHaveTextContent("Julio 2024");
  });

  it("desde el nivel de mes, tocar el año abre el nivel de año con la década (+1 a cada lado) y salto de década", async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2024-03-15" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Elegir fecha" }));
    await user.click(screen.getByRole("button", { name: "Elegir mes" }));
    await user.click(screen.getByRole("button", { name: "Elegir año" }));

    expect(screen.getByText("2020–2029")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Década anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2024" })).toBeInTheDocument();
    // Los años de fuera de la década (uno de cada lado) también aparecen, atenuados — ver yearCells en shared.jsx.
    expect(screen.getByRole("button", { name: "2019" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2030" })).toBeInTheDocument();
  });

  it("elegir un año vuelve al nivel de mes con ese año ya mostrado", async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2024-03-15" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Elegir fecha" }));
    await user.click(screen.getByRole("button", { name: "Elegir mes" }));
    await user.click(screen.getByRole("button", { name: "Elegir año" }));
    await user.click(screen.getByRole("button", { name: "2019" }));

    expect(screen.getByRole("button", { name: "Elegir año" })).toHaveTextContent("2019");
  });

  it("saltar de década mueve la rejilla en bloques de 10 años", async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2024-03-15" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Elegir fecha" }));
    await user.click(screen.getByRole("button", { name: "Elegir mes" }));
    await user.click(screen.getByRole("button", { name: "Elegir año" }));

    await user.click(screen.getByRole("button", { name: "Década anterior" }));
    expect(screen.getByText("2010–2019")).toBeInTheDocument();
  });

  it("cerrar y volver a abrir reinicia siempre al nivel de día", async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2024-03-15" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Elegir fecha" }));
    await user.click(screen.getByRole("button", { name: "Elegir mes" }));
    await user.click(screen.getByRole("button", { name: "Elegir año" }));
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Elegir fecha" }));
    expect(screen.getByRole("button", { name: "Elegir mes" })).toBeInTheDocument();
    expect(screen.queryByText("2020–2029")).not.toBeInTheDocument();
  });
});
