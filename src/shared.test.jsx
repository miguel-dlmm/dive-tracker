import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { colorFor, formatMoney, oppositeStatus, isPendingStatus, lighten, SearchSelect, DatePicker, MoneyInput, Field, EntryLanguagePicker } from "./shared";
import i18n, { getStoredLanguage, setStoredLanguage } from "./i18n";

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
// Bug real reportado (2026-09-27): el hint de Field (p. ej. "Importe" en
// Ajuste de curso, MovementSheet.jsx, en la columna DERECHA de un grid de
// 2 columnas) seguía saliéndose del viewport en móvil con align="left"
// fijo — el suelo de ancho mínimo de useFloatingPosition (160px) no cabía
// entre un icono ya cerca del borde derecho y el propio borde real de la
// pantalla. align="auto" elige el lado con más espacio en vez de asumir
// siempre "hacia la derecha".
describe("Field — el hint flotante elige el lado con más espacio (align=\"auto\")", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("con el icono cerca del borde IZQUIERDO, el panel se ancla por la izquierda", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      { top: 100, bottom: 114, left: 10, right: 24, width: 14, height: 14 }
    );
    render(<Field label="Importe" hint="Positivo si te paga a ti"><input aria-label="Importe" /></Field>);

    await user.click(screen.getByRole("button", { name: "Ayuda" }));

    const panel = screen.getByText("Positivo si te paga a ti").parentElement;
    expect(panel.style.left).not.toBe("");
    expect(panel.style.right).toBe("");
  });

  it("con el icono cerca del borde DERECHO (p. ej. la columna derecha de un grid de 2 columnas), el panel se ancla por la derecha, no por la izquierda", async () => {
    const user = userEvent.setup();
    // Viewport de 375px (iPhone de referencia) — icono a 350px, a solo
    // 25px del borde derecho: con align="left" fijo, ni el suelo mínimo
    // de 160px cabría ahí sin desbordar.
    window.innerWidth = 375;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      { top: 100, bottom: 114, left: 350, right: 364, width: 14, height: 14 }
    );
    render(<Field label="Importe" hint="Positivo si te paga a ti"><input aria-label="Importe" /></Field>);

    await user.click(screen.getByRole("button", { name: "Ayuda" }));

    const panel = screen.getByText("Positivo si te paga a ti").parentElement;
    expect(panel.style.right).not.toBe("");
    expect(panel.style.left).toBe("");
  });
});

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

// Red de seguridad real tras investigar un bug reportado ("no sé qué pasa"
// al intentar meter un negativo en Ajuste de curso, lote 2026-09-26): no se
// encontró ningún fallo — escribir "-" a mano y usar el botón +/- (única
// vía en el teclado numérico de iOS, que no tiene tecla de signo menos)
// funcionan los dos. Lo único que cambió es la insignia del botón +/-, de
// un carácter de texto suelto a un icono con fondo de color (más fácil de
// ver como control pulsable) — estos tests fijan que el comportamiento
// real (cambiar el signo, propagarlo a onChange) sigue intacto tras ese
// cambio puramente visual.
function ControlledMoneyInput({ initial = "", allowNegative = true }) {
  const [value, setValue] = useState(initial);
  return <MoneyInput value={value} onChange={setValue} allowNegative={allowNegative} aria-label="Importe" />;
}

describe("MoneyInput — allowNegative", () => {
  it("escribir '-' a mano funciona: el valor negativo llega a onChange", async () => {
    const user = userEvent.setup();
    render(<ControlledMoneyInput />);
    const input = screen.getByLabelText("Importe");
    await user.click(input);
    await user.type(input, "-30");
    expect(input).toHaveValue("-30");
  });

  it("el botón +/- invierte el signo del valor actual", async () => {
    const user = userEvent.setup();
    render(<ControlledMoneyInput initial="30" />);
    expect(screen.getByRole("button", { name: "Cambiar a negativo" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cambiar a negativo" }));

    // Formateado (2 decimales, es-ES) porque el propio click no deja el
    // campo en modo edición — mismo comportamiento que perder el foco.
    expect(screen.getByLabelText("Importe")).toHaveValue("-30,00");
    // El aria-label del propio botón se actualiza con el nuevo estado —
    // sigue siendo pulsable para volver a invertir el signo.
    expect(screen.getByRole("button", { name: "Cambiar a positivo" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cambiar a positivo" }));
    expect(screen.getByLabelText("Importe")).toHaveValue("30,00");
  });

  // Bug real reportado (2026-09-27): con el campo vacío, -Number(0) da
  // -0, y String(-0) es "0" (no "-0") — pulsar el botón no cambiaba nada
  // visible ni dejaba ningún rastro del signo.
  it("el botón +/- funciona también con el campo vacío, sin cantidad metida todavía", async () => {
    const user = userEvent.setup();
    render(<ControlledMoneyInput initial="" />);
    expect(screen.getByRole("button", { name: "Cambiar a negativo" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cambiar a negativo" }));

    expect(screen.getByRole("button", { name: "Cambiar a positivo" })).toBeInTheDocument();
    const input = screen.getByLabelText("Importe");
    await user.click(input);
    await user.type(input, "20");
    expect(input).toHaveValue("-20");
  });

  it("sin allowNegative, no se renderiza ningún botón de signo", () => {
    render(<ControlledMoneyInput initial="30" allowNegative={false} />);
    expect(screen.queryByRole("button", { name: /Cambiar a/ })).not.toBeInTheDocument();
  });
});

// Selector de idioma compacto para pantallas sin sesión (Login,
// Reset/CreatePassword...) — 2026-09-29, pedido explícito. Un solo pase de
// pruebas aquí, directamente sobre el componente compartido, en vez de
// repetir la misma verificación de "cambia i18n.language/localStorage" en
// cada pantalla que lo monta (esas solo comprueban que lo montan, ver
// LoginScreen.test.jsx).
describe("EntryLanguagePicker", () => {
  afterEach(() => {
    i18n.changeLanguage("es");
    setStoredLanguage("es");
  });

  it("arranca mostrando el idioma activo de i18n", () => {
    render(<EntryLanguagePicker />);
    expect(screen.getByLabelText("Idioma")).toHaveValue("es");
  });

  it("elegir un idioma distinto llama a i18n.changeLanguage y lo persiste en localStorage", async () => {
    const user = userEvent.setup();
    render(<EntryLanguagePicker />);

    await user.selectOptions(screen.getByLabelText("Idioma"), "en");

    expect(i18n.language).toBe("en");
    expect(getStoredLanguage()).toBe("en");
  });
});

// getStoredLanguage() con ?lang= en la URL — 2026-09-29, pedido explícito:
// "si al generar los links de lo que sea ya sabemos el idioma del
// usuario, pasémoslo por parámetro... y así cuando acceda a estas páginas
// sueltas su idioma venga ya cargado". Se resuelve una sola vez aquí, no
// en cada pantalla — ver getUrlLanguage en src/i18n/index.js.
describe("getStoredLanguage — parámetro ?lang= de la URL", () => {
  const originalLocation = window.location;

  function setUrl(search) {
    delete window.location;
    window.location = { ...originalLocation, search };
  }

  afterEach(() => {
    window.location = originalLocation;
    setStoredLanguage("es");
  });

  it("?lang= con un idioma soportado gana sobre lo guardado en localStorage", () => {
    setStoredLanguage("es");
    setUrl("?lang=fr");

    expect(getStoredLanguage()).toBe("fr");
  });

  it("?lang= con un idioma soportado se persiste, para que sobreviva a navegar a otra pantalla sin sesión", () => {
    setUrl("?lang=de");
    getStoredLanguage();

    setUrl(""); // simula que la pantalla siguiente ya no lleva el parámetro
    expect(getStoredLanguage()).toBe("de");
  });

  it("?lang= con un valor no soportado se ignora, cae a lo ya guardado", () => {
    setStoredLanguage("it");
    setUrl("?lang=xx");

    expect(getStoredLanguage()).toBe("it");
  });

  it("sin ?lang= en la URL, se comporta igual que siempre (lo guardado, o 'es' por defecto)", () => {
    setStoredLanguage("pt");
    setUrl("");

    expect(getStoredLanguage()).toBe("pt");
  });
});
