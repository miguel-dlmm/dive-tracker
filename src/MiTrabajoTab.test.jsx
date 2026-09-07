import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MiTrabajoTab from "./MiTrabajoTab";
import { ToastProvider } from "./shared";

// Historial de esta cifra (KPIs de cabecera de Mi trabajo, "Generado
// este mes"/"Pendiente de cobrar"/"Cobrado este mes"): Fase 6/7
// adivinaron un tamaño de letra según la longitud del texto ya
// formateado, Fase 9 adivinó un umbral de caracteres para el tamaño del
// icono, Fase 10 permitió partir la cifra en dos líneas (`break-words`)
// como red de seguridad. Las cuatro fallaron en algún punto en
// Safari/iOS real (iPhone 14 Pro Max, mismo viewport que ya emula
// `mobile-check`) porque WebKit renderiza los dígitos más anchos que
// Chromium con la misma fuente/tamaño — algo que no se puede medir
// desde este entorno (CLAUDE.md §8). Feedback en vivo 2026-09-07 tras el
// último cambio: "en chrome lo ves bien pero en safari ios se salta en
// dos líneas" en vez de ocultar el icono — la cifra NUNCA debe partirse
// en dos líneas; en su lugar, ocultar el icono en las 3 tarjetas es lo
// que debe liberar el ancho que falte.
describe("KPIs de Mi trabajo — la cifra nunca se parte en dos líneas (ni truncate ni break-words)", () => {
  it("el importe no lleva `truncate` ni `break-words`, sea cual sea la longitud de la cifra", () => {
    // 500 personas × 20€/persona (tarifa de Open Water en PADI Cozumel,
    // ver RATES_ROWS) = 10.000,00 € — una cifra larga sin tener que
    // fabricar un número gigante a mano.
    renderMiTrabajo({
      worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 500, status: "Pending" }],
    });
    const tile = screen.getByText("Pendiente de cobrar").closest("div[class*='rounded-xl']");
    // Excluye el span invisible de medición (Fase 13: mismas clases de
    // texto, pero sin `w-full` — ver finalTextMeasureRef en MiTrabajoTab.jsx).
    const amount = within(tile).getByText((_content, node) => node?.classList?.contains("font-bold") && node?.classList?.contains("tabular-nums") && node?.classList?.contains("w-full"));
    expect(amount.className).not.toMatch(/truncate/);
    expect(amount.className).not.toMatch(/break-words/);
  });
});

// Pedido explícito (2026-09-07): "y si añadimos el icono del kpi al
// lado del texto?" — icono FIJO junto a la etiqueta ("Generado"/
// "Pendiente"/"Cobrado"), distinto del icono de arriba (junto a la
// cifra) que sí puede encogerse/ocultarse del todo — este nunca se
// oculta, sirve de ancla de identidad de color del KPI.
describe("KPIs de Mi trabajo — icono fijo junto a la etiqueta", () => {
  it("cada etiqueta de KPI lleva su propio icono junto al texto, que nunca se oculta", () => {
    renderMiTrabajo({
      worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 500, status: "Pending" }],
    });
    const label = screen.getByText("Pendiente de cobrar");
    const labelRow = label.closest("span");
    expect(labelRow.querySelector("svg")).toBeTruthy();
  });
});

// Sustituye el umbral de caracteres de kpiIconTierFor (retirado) por una
// MEDICIÓN real: si la cifra ya renderizada se sale de su propio ancho
// (scrollWidth > clientWidth), se oculta el icono en las 3 tarjetas a la
// vez — funciona igual en cualquier motor de render porque no depende de
// contar caracteres. jsdom no calcula layout real, así que aquí se
// simulan esas medidas directamente sobre HTMLElement.prototype (mismo
// criterio que ya usó la Fase 10 para reproducir el bug de overflow con
// medidas reales del DOM en vez de una suposición).
// Fase 13, 2026-09-07 — pedido explícito: "el icono... se va encogiendo
// según crece el número... en el momento en que vaya a salirse de la
// caja, el icono desaparece". Sustituye el tier binario normal/hidden
// (Fase 11.1/11.2) por una escala continua (0 a 1) — sigue MIDIENDO el
// DOM real (nunca contando caracteres, mismo motivo que 11.2: WebKit
// renderiza más ancho que Chromium), pero ahora contra la cifra FINAL
// (el span invisible de medición, `aria-hidden="true"`) para no tener
// que remedir en cada fotograma del conteo. El icono nunca se desmonta
// — su tamaño real se comprueba por estilo (width/opacity), no por
// presencia/ausencia del <svg>.
describe("KPIs de Mi trabajo — el icono se encoge de forma continua según lo que MIDE el DOM", () => {
  const worklogEntry = { id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 500, status: "Pending" };

  afterEach(() => {
    delete Element.prototype.scrollWidth;
    delete Element.prototype.clientWidth;
  });

  // Recuerda: el mock de Element.prototype es GLOBAL (mismo valor para
  // cualquier elemento), así que tanto la fila (clientWidth) como el
  // span de medición (scrollWidth) devuelven las mismas cifras. La
  // fórmula real (MiTrabajoTab.jsx) es
  // scale = clamp((rowClientWidth - 34 - textScrollWidth) / 36, 0, 1).
  function mockWidths(scrollWidth, clientWidth) {
    Object.defineProperty(Element.prototype, "scrollWidth", { configurable: true, get() { return scrollWidth; } });
    Object.defineProperty(Element.prototype, "clientWidth", { configurable: true, get() { return clientWidth; } });
  }
  it("con espacio de sobra, el icono queda a tamaño completo (escala 1) en las 3 tarjetas", async () => {
    mockWidths(80, 150); // slack = (150-34) - 80 = 36 -> scale 1
    renderMiTrabajo({ worklog: [worklogEntry] });
    const tile = screen.getByText("Generado este mes").closest("div[class*='rounded-xl']");
    const icon = tile.querySelector(".rounded-full");
    // Motion no fija el estilo de golpe en el primer render — necesita
    // al menos un fotograma de su propio ciclo de animación, incluso
    // con reduced motion (duración ~0), para reflejarlo como estilo
    // inline (mismo comportamiento ya visto en WhatsNew.test.jsx).
    await waitFor(() => expect(icon.style.width).toBe("28px"));
    expect(icon.style.opacity).toBe("1");
  });

  it("justo en el límite, el icono se oculta del todo (escala 0) en las 3 tarjetas a la vez", async () => {
    mockWidths(140, 100); // slack = (100-34) - 140 = -74 -> scale 0
    const user = userEvent.setup();
    renderMiTrabajo({ worklog: [worklogEntry] });
    const generatedTile = screen.getByText("Generado este mes").closest("div[class*='rounded-xl']");
    const pendingTile = screen.getByText("Pendiente de cobrar").closest("div[class*='rounded-xl']");
    const collectedTile = screen.getByText("Cobrado este mes").closest("div[class*='rounded-xl']");
    await waitFor(() => expect(generatedTile.querySelector(".rounded-full").style.width).toBe("0px"));
    expect(pendingTile.querySelector(".rounded-full").style.width).toBe("0px");
    expect(collectedTile.querySelector(".rounded-full").style.width).toBe("0px");
    // "Pendiente de cobrar" tiene además el icono del tooltip ("?") —
    // ese SÍ debe seguir ahí, es un elemento distinto del icono del KPI,
    // y nunca depende de esta escala.
    await user.click(within(pendingTile).getByLabelText(/Info:/));
    expect(within(pendingTile).getByLabelText(/Ocultar info:/)).toBeInTheDocument();
  });

  it("en el punto intermedio, el icono queda a una escala estrictamente entre 0 y 1 (encogimiento gradual, no un salto)", async () => {
    mockWidths(100, 150); // slack = (150-34) - 100 = 16 -> scale 16/36 ≈ 0.444
    renderMiTrabajo({ worklog: [worklogEntry] });
    const tile = screen.getByText("Generado este mes").closest("div[class*='rounded-xl']");
    await waitFor(() => {
      const width = parseFloat(tile.querySelector(".rounded-full").style.width);
      expect(width).toBeGreaterThan(0);
      expect(width).toBeLessThan(28);
    });
  });
});

const rowsHook = (rows) => ({
  rows, loaded: true,
  insertRow: vi.fn().mockResolvedValue(rows[0]),
  updateRow: vi.fn().mockResolvedValue(rows[0]),
  deleteRow: vi.fn().mockResolvedValue(),
  restoreRow: vi.fn().mockResolvedValue(),
  bulkUpdateWhere: vi.fn().mockImplementation(async (predicate) => rows.filter(predicate).length),
  setDefault: vi.fn(),
});

const SCHOOLS = rowsHook([{ name: "PADI Cozumel", is_default: true }]);
const ACTIVITIES = rowsHook([{ name: "Open Water", is_default: true }, { name: "Advanced", is_default: false }]);
const PAYMENT_STATUSES = rowsHook([{ name: "Pending", is_default: true }, { name: "Paid", is_default: false }]);
const CURRENCIES = rowsHook([
  { code: "EUR", symbol: "€", name: "Euro", is_default: true },
  { code: "USD", symbol: "$", name: "Dólar estadounidense", is_default: false },
]);
const RATES_ROWS = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 20, currency: "EUR" }];
const COMMISSION_RATES_ROWS = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 5, currency: "EUR" }];

// <Money> separa cifra y símbolo en nodos distintos; este matcher compara
// el texto combinado del nodo sin espacios (ver PaymentsTab.test.jsx).
// aria-hidden !== "true" (Fase 13, 2026-09-07): cada MoneyKpiTile tiene
// además un span invisible con la MISMA cifra ya formateada, solo para
// medir su ancho real sin depender de la animación de conteo (ver
// finalTextMeasureRef en MiTrabajoTab.jsx) — sin este filtro, ese span
// coincide igual de bien que el visible y el matcher encuentra dos.
function money(expected) {
  const target = expected.replace(/\s+/g, "");
  return (_content, node) => {
    if (!node) return false;
    if (node.getAttribute("aria-hidden") === "true") return false;
    const text = (el) => el.textContent.replace(/\s+/g, "");
    return text(node) === target && Array.from(node.children).every((child) => text(child) !== target);
  };
}

function renderMiTrabajo({ worklog = [], comisiones = [], colleaguePayments = [], schools = SCHOOLS, rates, commissionRates } = {}) {
  const hooks = {
    worklog: rowsHook(worklog),
    comisiones: rowsHook(comisiones),
    colleaguePayments: rowsHook(colleaguePayments),
    rates: rates || rowsHook(RATES_ROWS),
    commissionRates: commissionRates || rowsHook(COMMISSION_RATES_ROWS),
  };
  render(
    <ToastProvider>
      <MiTrabajoTab
        schools={schools} activities={ACTIVITIES} paymentStatuses={PAYMENT_STATUSES} currencies={CURRENCIES}
        rates={hooks.rates} commissionRates={hooks.commissionRates}
        worklog={hooks.worklog} comisiones={hooks.comisiones} colleaguePayments={hooks.colleaguePayments}
      />
    </ToastProvider>
  );
  return hooks;
}

// Reducción de complejidad (2026-08-30): filtrar por escuela cuando solo
// existe una no filtra nada — el control desaparece hasta que exista una
// segunda escuela configurada.
describe("MiTrabajoTab — filtro de Escuela, solo con más de una escuela", () => {
  it("no muestra el filtro 'Escuela' con una sola escuela configurada", async () => {
    const user = userEvent.setup();
    renderMiTrabajo({});
    await user.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(screen.queryByText("Escuela")).not.toBeInTheDocument();
  });

  it("muestra el filtro 'Escuela' en cuanto hay una segunda escuela", async () => {
    const user = userEvent.setup();
    renderMiTrabajo({ schools: rowsHook([{ name: "PADI Cozumel" }, { name: "Ihasia" }]) });
    await user.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(screen.getByText("Escuela")).toBeInTheDocument();
  });
});

// Un elemento de cada tipo — el ajuste es negativo (le pagas tú a Ana) y
// pendiente, para comprobar que cuenta en la lista pero no en la cabecera.
function mixedDataset() {
  return {
    worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }], // 20€
    comisiones: [{ id: "c1", date: "2026-08-11", school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Pending" }], // 10€
    colleaguePayments: [{ id: "p1", date: "2026-08-12", school: "PADI Cozumel", activity: "Open Water", colleague_name: "Ana", amount: -15, currency: "EUR", status: "Pending" }],
  };
}

describe("MiTrabajoTab — unificación de Curso/Comisión/Ajuste", () => {
  beforeEach(() => localStorage.clear());

  it("por defecto muestra los pendientes de los 3 tipos, con el KPI 'Pendiente de cobrar' limitado a lo que te deben (sin el ajuste negativo)", () => {
    // KPI animado en céntimos (useCountUp, motion.js) — un waitFor con
    // timeout fijo resultó frágil bajo carga (toda la suite a la vez):
    // el conteo necesita llegar prácticamente al 100% de su propia
    // duración para que Math.round() coincida exacto con el céntimo (a
    // diferencia de un KPI entero pequeño, que ya redondea bien mucho
    // antes de terminar). Forzar prefers-reduced-motion aquí hace que
    // useCountUp fije el valor final de un solo golpe, sin animación —
    // determinista, sin depender de reloj real ni de la carga de la
    // máquina que ejecuta el test.
    const original = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    try {
      renderMiTrabajo(mixedDataset());

      expect(screen.getByRole("button", { name: "Pendientes · 3" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText(money("30,00 €"))).toBeInTheDocument(); // KPI: 20 (curso) + 10 (comisión), sin el ajuste
      expect(screen.getByText(money("20,00 €"))).toBeInTheDocument();
      expect(screen.getByText(money("10,00 €"))).toBeInTheDocument();
      expect(screen.getByText(money("15,00 €"))).toBeInTheDocument(); // el ajuste sí aparece en la lista
      expect(screen.getByText("con Ana", { exact: false })).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  // pendingTotals (MiTrabajoTab.jsx) no filtra por mes — a diferencia de
  // Generado/Cobrado, "Pendiente de cobrar" es deuda acumulada de
  // siempre. Este tooltip es el único de los 3 KPIs: aclara justo esa
  // diferencia, para que la cifra no parezca "no cuadrar" en cuanto hay
  // algo sin cobrar de un mes anterior.
  it("'Pendiente de cobrar' tiene un tooltip que avisa de que incluye pendientes de meses anteriores; los otros dos KPIs no lo tienen", async () => {
    const user = userEvent.setup();
    renderMiTrabajo(mixedDataset());

    const tooltipText = "Esta cantidad refleja pagos pendientes de meses anteriores.";
    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument();

    // Solo el KPI "Pendiente de cobrar" lleva el icono de info — Generado
    // y Cobrado se quedan igual que antes.
    expect(screen.getAllByRole("button", { name: /^Info:/ })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Info: Pendiente de cobrar" }));
    expect(screen.getByText(tooltipText)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ocultar info: Pendiente de cobrar" }));
    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument();
  });

  // Pedido explícito 2026-09-07: si no hay NADA pendiente de un mes
  // anterior, la cifra de "Pendiente de cobrar" ya cuadra sola con
  // Generado/Cobrado (ambos del mes en curso) — el tooltip no aclara
  // nada en ese caso, así que no debe aparecer.
  it("sin pendientes de meses anteriores (todo lo pendiente es de este mes), el tooltip no aparece", () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    renderMiTrabajo({
      worklog: [{ id: "w1", date: `${thisMonth}-01`, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }],
    });
    expect(screen.queryByRole("button", { name: /^Info:/ })).not.toBeInTheDocument();
  });

  it("un ajuste negativo pendiente ofrece 'Marcar liquidado' en vez de 'Confirmar cobro'", () => {
    renderMiTrabajo(mixedDataset());
    expect(screen.getByRole("button", { name: /Marcar liquidado/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Confirmar cobro$/ })).toHaveLength(2);
  });

  it("el filtro de Tipo (dentro de Filtrar) limita la lista a un solo tipo", async () => {
    const user = userEvent.setup();
    renderMiTrabajo(mixedDataset());

    await user.click(screen.getByRole("button", { name: "Filtrar" }));
    await user.click(screen.getByLabelText("Tipo"));
    await user.click(screen.getByRole("option", { name: "Ajuste de curso" }));

    expect(screen.getByText("con Ana", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(money("20,00 €"))).not.toBeInTheDocument();
    expect(screen.queryByText(money("10,00 €"))).not.toBeInTheDocument();
  });

  it("Confirmar cobro actualiza la tabla correspondiente al tipo de la fila, tras la animación de salida", async () => {
    const user = userEvent.setup();
    const { worklog, comisiones } = renderMiTrabajo(mixedDataset());

    // Orden descendente (más reciente primero): comisión (c1, 08-11) antes
    // que curso (w1, 08-10) — el botón de curso es el segundo, no el primero.
    const [, cursoBtn] = screen.getAllByRole("button", { name: /^Confirmar cobro$/ });
    await user.click(cursoBtn);

    // La mutación real se difiere hasta que la fila termina de animarse
    // fuera de la lista activa (ver changeStatus) — no es inmediata al clic.
    await waitFor(() => expect(worklog.updateRow).toHaveBeenCalledWith("w1", { status: "Paid" }));
    expect(comisiones.updateRow).not.toHaveBeenCalled();
  });

  it("el toast de 'Confirmar cobro' ofrece Deshacer, que revierte el estado original", async () => {
    const user = userEvent.setup();
    const { worklog } = renderMiTrabajo(mixedDataset());

    const [, cursoBtn] = screen.getAllByRole("button", { name: /^Confirmar cobro$/ });
    await user.click(cursoBtn);

    const undoBtn = await screen.findByRole("button", { name: "Deshacer" });
    await user.click(undoBtn);

    await waitFor(() => {
      expect(worklog.updateRow).toHaveBeenNthCalledWith(1, "w1", { status: "Paid" });
      expect(worklog.updateRow).toHaveBeenNthCalledWith(2, "w1", { status: "Pending" });
    });
  });

  it("'Cobrar todos' pide confirmación explícita y se puede cancelar sin tocar ninguna tabla", async () => {
    const user = userEvent.setup();
    const { worklog, comisiones, colleaguePayments } = renderMiTrabajo(mixedDataset());

    await user.click(screen.getByRole("button", { name: "Cobrar todos" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("¿Cobrar 3 movimientos pendientes?");
    // El dataset mezclado incluye un ajuste negativo (deuda, no cobro) —
    // el diálogo debe reflejarlo en vez de decir "cobrado" sin más.
    expect(dialog).toHaveTextContent("cobrado(s) o liquidado(s)");

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(worklog.bulkUpdateWhere).not.toHaveBeenCalled();
    expect(comisiones.bulkUpdateWhere).not.toHaveBeenCalled();
    expect(colleaguePayments.bulkUpdateWhere).not.toHaveBeenCalled();
  });

  it("'Cobrar todos' actualiza las tablas correspondientes tras confirmar en el diálogo", async () => {
    const user = userEvent.setup();
    const { worklog, comisiones, colleaguePayments } = renderMiTrabajo(mixedDataset());

    await user.click(screen.getByRole("button", { name: "Cobrar todos" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cobrar" }));

    expect(worklog.bulkUpdateWhere).toHaveBeenCalled();
    expect(comisiones.bulkUpdateWhere).toHaveBeenCalled();
    expect(colleaguePayments.bulkUpdateWhere).toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("'Cobrar todos' dice solo 'cobrado' (sin mención a liquidar) cuando no hay ajustes negativos de por medio", async () => {
    const user = userEvent.setup();
    renderMiTrabajo({
      worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }],
    });

    await user.click(screen.getByRole("button", { name: "Cobrar todos" }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("¿Cobrar 1 movimiento pendiente?");
    expect(dialog).not.toHaveTextContent("liquidado");
  });

  it("'Marcar todos como pendientes' solo aparece en Cobrados, pide confirmación y actualiza tras confirmar", async () => {
    const user = userEvent.setup();
    const { worklog, comisiones } = renderMiTrabajo({
      worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
      comisiones: [{ id: "c1", date: "2026-08-11", school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }],
    });

    expect(screen.queryByRole("button", { name: "Marcar todos como pendientes" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cobrados" }));
    await user.click(screen.getByRole("button", { name: "Marcar todos como pendientes" }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("¿Marcar 2 movimientos cobrados como pendientes?");

    await user.click(within(dialog).getByRole("button", { name: "Marcar pendientes" }));

    expect(worklog.bulkUpdateWhere).toHaveBeenCalled();
    expect(comisiones.bulkUpdateWhere).toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("'Marcar todos como pendientes' se puede cancelar sin tocar ninguna tabla", async () => {
    const user = userEvent.setup();
    const { worklog } = renderMiTrabajo({
      worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    await user.click(screen.getByRole("button", { name: "Cobrados" }));
    await user.click(screen.getByRole("button", { name: "Marcar todos como pendientes" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(worklog.bulkUpdateWhere).not.toHaveBeenCalled();
  });

  it("elimina la fila correcta desde el menú '⋯', tras la animación de salida", async () => {
    // Pendientes se ordena de más reciente a más antiguo: ajuste, comisión, curso.
    const user = userEvent.setup();
    const { colleaguePayments } = renderMiTrabajo(mixedDataset());

    await user.click(screen.getAllByLabelText("Más acciones")[0]);
    await user.click(screen.getByRole("menuitem", { name: /Eliminar/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

    // El diálogo cierra al instante (modo optimista) y el borrado real se
    // dispara tras la animación de salida — no es inmediato al confirmar.
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(colleaguePayments.deleteRow).toHaveBeenCalledWith("p1"));
  });

  // Bloque baja lógica de movimientos, 2026-09-04: eliminar deja de ser
  // destructivo — el toast de confirmación ofrece "Deshacer", que debe
  // llamar a restoreRow() de la tabla correspondiente (no a insertRow, ni
  // a un segundo deleteRow) para el registro correcto.
  it("el toast de eliminar ofrece Deshacer, que restaura el movimiento borrado", async () => {
    const user = userEvent.setup();
    const { colleaguePayments } = renderMiTrabajo(mixedDataset());

    await user.click(screen.getAllByLabelText("Más acciones")[0]);
    await user.click(screen.getByRole("menuitem", { name: /Eliminar/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(colleaguePayments.deleteRow).toHaveBeenCalledWith("p1"));

    const undoBtn = await screen.findByRole("button", { name: "Deshacer" });
    await user.click(undoBtn);

    await waitFor(() => expect(colleaguePayments.restoreRow).toHaveBeenCalledWith("p1"));
  });

  it("editar desde el menú '⋯' abre la misma hoja que crear, precargada, y guarda los cambios en la tabla del curso", async () => {
    const user = userEvent.setup();
    const { worklog } = renderMiTrabajo(mixedDataset());

    await user.click(screen.getAllByLabelText("Más acciones")[2]);
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));

    expect(screen.getByRole("heading", { name: "Editar curso impartido" })).toBeInTheDocument();
    // Notas viaja colapsada por defecto — solo se ve si la entrada ya
    // tenía texto o tras pulsar "+ Añadir nota".
    await user.click(screen.getByRole("button", { name: /Añadir nota/ }));
    const notesInput = screen.getByLabelText("Notas");
    await user.type(notesInput, "Grupo grande");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(worklog.updateRow).toHaveBeenCalledWith("w1", expect.objectContaining({ notes: "Grupo grande" }));
  });

  it("el FAB abre directo el formulario de Curso; cambiar a Comisión con el selector integrado crea una comisión nueva", async () => {
    const user = userEvent.setup();
    const { comisiones } = renderMiTrabajo({});

    await user.click(screen.getByRole("button", { name: "Añadir" }));
    expect(screen.getByRole("heading", { name: "Nuevo curso impartido" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Comisión/ }));
    const peopleInput = screen.getByRole("spinbutton");
    await user.clear(peopleInput);
    await user.type(peopleInput, "2");
    await user.click(screen.getByRole("button", { name: /^Guardar$/ }));

    expect(comisiones.insertRow).toHaveBeenCalledWith(expect.objectContaining({
      school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Pending",
    }));
  });

  it("Ajuste usa la moneda global por defecto, sin ningún campo para elegirla en el formulario", async () => {
    const user = userEvent.setup();
    renderMiTrabajo({});

    await user.click(screen.getByRole("button", { name: "Añadir" }));
    await user.click(screen.getByRole("tab", { name: /Ajuste de curso/ }));

    // Sin campo "Moneda": la moneda (EUR, la de la app por defecto — no hay
    // favorita guardada en este test) se muestra como referencia dentro de
    // la propia etiqueta de "Importe", no como un desplegable aparte.
    expect(screen.queryByLabelText("Moneda")).not.toBeInTheDocument();
    expect(screen.getByText("Importe · EUR")).toBeInTheDocument();
  });

  it("Ajuste usa la moneda favorita guardada (localStorage, ADR-0007) cuando existe", async () => {
    const user = userEvent.setup();
    localStorage.setItem("oceanpulse:favoriteCurrency:anon", "USD");
    renderMiTrabajo({});

    await user.click(screen.getByRole("button", { name: "Añadir" }));
    await user.click(screen.getByRole("tab", { name: /Ajuste de curso/ }));

    expect(screen.getByText("Importe · USD")).toBeInTheDocument();
  });

  // Feedback explícito 2026-08-30: la explicación de qué significa un
  // importe positivo/negativo pasa de un párrafo siempre visible sobre el
  // formulario a una ayuda contextual del propio campo — oculta hasta que
  // se pide, para no recargar la pantalla.
  it("el campo Importe de Ajuste de curso tiene una ayuda contextual oculta por defecto", async () => {
    const user = userEvent.setup();
    renderMiTrabajo({});

    await user.click(screen.getByRole("button", { name: "Añadir" }));
    await user.click(screen.getByRole("tab", { name: /Ajuste de curso/ }));

    const helpText = "Positivo si te paga a ti; negativo si le pagas tú a él/ella";
    expect(screen.queryByText(helpText)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ayuda" }));
    expect(screen.getByText(helpText)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ocultar ayuda" }));
    expect(screen.queryByText(helpText)).not.toBeInTheDocument();
  });

  // Bug real reportado por el usuario: en Safari iOS, el teclado numérico
  // de inputMode="decimal" no tiene tecla de signo menos, así que era
  // imposible escribir un importe negativo a mano en Ajuste de curso — el
  // único movimiento donde un negativo tiene sentido (pagas tú al
  // compañero). Botón +/- como camino alternativo que no depende de esa
  // tecla (MoneyInput, shared.jsx, prop allowNegative).
  it("el campo Importe de Ajuste de curso tiene un botón +/- para poner un importe negativo sin depender del teclado", async () => {
    const user = userEvent.setup();
    renderMiTrabajo({});

    await user.click(screen.getByRole("button", { name: "Añadir" }));
    await user.click(screen.getByRole("tab", { name: /Ajuste de curso/ }));

    const importeInput = screen.getByPlaceholderText("90 ó -30");
    await user.type(importeInput, "30");
    expect(screen.getByRole("button", { name: "Cambiar a negativo" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cambiar a negativo" }));
    expect(importeInput.value).toMatch(/^-30/); // formateado (2 decimales) al perder el foco al pulsar el botón
    expect(screen.getByRole("button", { name: "Cambiar a positivo" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cambiar a positivo" }));
    expect(importeInput.value).toMatch(/^30/);
    expect(importeInput.value).not.toMatch(/^-/);
  });

  it("añadir tarifa se expande dentro de la misma hoja (no abre un segundo modal) y guarda la tarifa nueva", async () => {
    const user = userEvent.setup();
    const { rates } = renderMiTrabajo({});

    await user.click(screen.getByRole("button", { name: "Añadir" })); // abre directo en Curso impartido
    await user.click(screen.getByLabelText("Curso"));
    await user.click(screen.getByRole("option", { name: "Advanced" }));

    await user.click(screen.getByRole("button", { name: "Añadir tarifa" }));

    // Sigue siendo la misma hoja de creación — un único título, no un
    // segundo modal apilado encima.
    expect(screen.getAllByRole("heading", { name: /curso impartido/i })).toHaveLength(1);

    await user.type(screen.getByLabelText("Tarifa · EUR"), "30");
    await user.click(screen.getByRole("button", { name: "Guardar tarifa" }));

    expect(rates.insertRow).toHaveBeenCalledWith(expect.objectContaining({
      school: "PADI Cozumel", activity: "Advanced", currency: "EUR", rate: 30,
    }));
  });

  // Bug real reportado y confirmado (Fase 9, 2026-09-07): rateFor
  // (MovementSheet.jsx) buscaba la tarifa de una escuela+curso sin
  // filtrar por is_active — una tarifa desactivada podía usarse
  // igualmente para calcular el importe de un movimiento nuevo, en vez
  // de ofrecer "Añadir tarifa" como si no existiera ninguna vigente.
  it("una tarifa desactivada no se usa para calcular el importe — se ofrece 'Añadir tarifa' igual que si no existiera ninguna", async () => {
    const user = userEvent.setup();
    // Sustituye RATES_ROWS (activa, Open Water) por una desactivada
    // para el mismo curso.
    renderMiTrabajo({ rates: rowsHook([{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 20, currency: "EUR", is_active: false }]) });

    await user.click(screen.getByRole("button", { name: "Añadir" })); // abre directo en Curso impartido
    await user.click(screen.getByLabelText("Curso"));
    await user.click(screen.getByRole("option", { name: "Open Water" }));

    // No debe aparecer ningún importe calculado (20,00 €, la tarifa
    // desactivada) — en su lugar, el mismo aviso de "Añadir tarifa" que
    // se ve cuando no hay tarifa en absoluto.
    expect(screen.queryByText("20,00 €")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Añadir tarifa" })).toBeInTheDocument();
  });

  it("Curso se precarga con la última actividad usada en esa escuela, no con el valor global por defecto", async () => {
    const user = userEvent.setup();
    renderMiTrabajo({
      worklog: [
        { id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" },
        { id: "w2", date: "2026-08-20", school: "PADI Cozumel", activity: "Advanced", people: 1, status: "Paid" },
      ],
    });

    await user.click(screen.getByRole("button", { name: "Añadir" }));

    expect(screen.getByLabelText("Curso")).toHaveTextContent("Advanced");
  });
});
