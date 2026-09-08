import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomeTab from "./HomeTab";

// Cubre "Pendiente de cobrar" (ADR-0004) y "Escuela más activa este mes"
// (2026-09-07, sustituye a la antigua tarjeta "Generado este mes" —
// duplicaba el KPI "Generado este mes" que ya muestra Mi trabajo). El
// resto de la pantalla (accesos rápidos, calendario) ya existía y no
// cambia.
//
// Las aserciones de importe se acotan con data-testid a cada tarjeta (no al
// documento entero): el calendario de abajo también muestra dinero en su
// desglose del día seleccionado, y con datos de ejemplo pequeños las cifras
// pueden coincidir por casualidad con las del calendario sin que signifique
// nada — acotar por tarjeta evita ese falso positivo/negativo.
const rowsHook = (rows) => ({ rows, loaded: true, insertRow: vi.fn(), updateRow: vi.fn(), deleteRow: vi.fn(), bulkUpdateWhere: vi.fn(), setDefault: vi.fn() });

// Bug real de zona horaria (mismo ya corregido 2026-08-30 en
// SummaryTab.test.jsx — ver la nota extensa junto a
// "suma correcta en los límites del periodo" ahí): toISOString()
// convierte a medianoche UTC, no a la fecha LOCAL de "hoy" — en un huso
// con offset positivo (este entorno corre en Asia/Bangkok, UTC+7), entre
// la medianoche local y la medianoche UTC (las primeras ~17h de cada
// día local) toISOString().slice(0,10) devuelve el día ANTERIOR al que
// la propia app considera "hoy" (todayStr(), shared.jsx, que sí usa
// getFullYear()/getMonth()/getDate() locales). `TODAY` desincronizado de
// lo que la app real considera hoy rompía en directo, no en teoría, el
// 2026-09-08 — reproducido: un test que sembraba un movimiento con
// `date: TODAY` esperando que el calendario lo auto-seleccionara como
// "de hoy" fallaba porque el componente ya había cruzado la medianoche
// local. `localDateStr` sustituye a toISOString en todo este archivo.
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const NOW = new Date();
const TODAY = localDateStr(NOW);
const LAST_MONTH = localDateStr(new Date(NOW.getFullYear(), NOW.getMonth() - 1, 15));

const PAYMENT_STATUSES = rowsHook([
  { name: "Pending", is_default: true },
  { name: "Paid", is_default: false },
]);

const RATES = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 20, currency: "EUR" }];
const COMMISSION_RATES = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 5, currency: "EUR" }];

// <Money> (tarjeta "Generado") separa cifra y símbolo en nodos distintos,
// para atenuar el símbolo; <MoneyLine> (tarjeta "Pendiente") los renderiza
// como texto plano. Este matcher trata ambos igual, comparando el texto
// combinado del nodo sin espacios.
function money(expected) {
  const target = expected.replace(/\s+/g, "");
  return (_content, node) => {
    if (!node) return false;
    const text = (el) => el.textContent.replace(/\s+/g, "");
    return text(node) === target && Array.from(node.children).every((child) => text(child) !== target);
  };
}

function renderHome({ worklog = [], comisiones = [], colleaguePayments = [], rates = [], commissionRates = [], currencies = [{ code: "EUR", symbol: "€", is_default: true }] } = {}) {
  render(
    <HomeTab
      worklog={rowsHook(worklog)}
      comisiones={rowsHook(comisiones)}
      colleaguePayments={rowsHook(colleaguePayments)}
      rates={rowsHook(rates)}
      commissionRates={rowsHook(commissionRates)}
      activities={rowsHook([{ name: "Open Water" }])}
      schools={rowsHook([{ name: "PADI Cozumel" }])}
      currencies={rowsHook(currencies)}
      navSections={rowsHook([])}
      paymentStatuses={PAYMENT_STATUSES}
      onQuickCreate={vi.fn()}
    />
  );
  return {
    activeSchool: within(screen.getByTestId("active-school-this-month-card")),
    pending: within(screen.getByTestId("pending-collection-card")),
  };
}

describe("HomeTab — Pendiente de cobrar", () => {
  it("suma pendientes de Registro, Comisiones y Compañeros, de cualquier mes (ejemplo de referencia)", () => {
    const { pending } = renderHome({
      worklog: [
        { id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }, // 40€, pagado, este mes
        { id: "w2", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }, // 20€, pendiente, este mes
        { id: "w3", date: LAST_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 3, status: "Pending" }, // 60€, pendiente, mes anterior
      ],
      comisiones: [
        { id: "c1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 3, status: "Pending" }, // 15€, pendiente, este mes
      ],
      colleaguePayments: [
        { id: "p1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", colleague_name: "Ana", amount: 30, currency: "EUR", status: "Pending" }, // +30€, pendiente, este mes
      ],
      rates: RATES,
      commissionRates: COMMISSION_RATES,
    });

    // Pendiente de cobrar: 20 (este mes) + 60 (mes anterior) + 15 (comisión) + 30 (compañero) = 125 — el pagado (40) queda fuera por estado, sin filtro de fecha.
    expect(pending.getByText(money("125,00 €"))).toBeInTheDocument();
  });

  it("Pendiente de cobrar SÍ cuenta entradas de meses anteriores (a diferencia de los KPIs financieros del mes en curso)", () => {
    const { pending } = renderHome({
      worklog: [{ id: "w1", date: LAST_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }], // 20€, mes anterior
      rates: RATES,
    });
    expect(pending.getByText(money("20,00 €"))).toBeInTheDocument();
  });

  it("excluye pagos de compañeros con importe negativo (es lo que tú debes, no lo que te deben)", () => {
    const { pending } = renderHome({
      colleaguePayments: [
        { id: "p1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", colleague_name: "Marc", amount: -10, currency: "EUR", status: "Pending" },
      ],
    });
    expect(pending.getByText("Nada pendiente")).toBeInTheDocument();
    expect(pending.queryByText(money("10,00 €"))).not.toBeInTheDocument();
  });

  it("agrupa Pendiente de cobrar por moneda cuando hay más de una", () => {
    const { pending } = renderHome({
      currencies: [
        { code: "EUR", symbol: "€", is_default: true },
        { code: "USD", symbol: "$" },
      ],
      worklog: [{ id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }], // 20 EUR
      colleaguePayments: [
        { id: "p1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", colleague_name: "Ana", amount: 12, currency: "USD", status: "Pending" },
      ],
      rates: RATES,
    });
    expect(pending.getByText(/20,00 €/)).toBeInTheDocument();
    expect(pending.getByText(/12,00 \$/)).toBeInTheDocument();
  });

  it("muestra el número correcto de pagos pendientes (cuenta entradas, no escuelas)", () => {
    const { pending } = renderHome({
      worklog: [
        { id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" },
        { id: "w2", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" },
      ],
      rates: RATES,
    });
    expect(pending.getByText("2 pagos pendientes")).toBeInTheDocument();
  });
});

// El acceso "Añadir movimiento" vive integrado en la tarjeta "Pendiente de
// cobrar" (botón "+", ver PendingCollectionCard) en vez de como fila propia
// debajo — cubre que Home sigue llamando a onQuickCreate("ganado") con el
// mismo contrato de siempre (entra directo al caso dominante, sin id de
// pestaña antiguo), solo que ahora a través de ese botón integrado.
describe("HomeTab — acceso rápido integrado en Pendiente de cobrar", () => {
  it("el botón «+» de la tarjeta llama a onQuickCreate(\"ganado\")", async () => {
    const onQuickCreate = vi.fn();
    render(
      <HomeTab
        worklog={rowsHook([])}
        comisiones={rowsHook([])}
        colleaguePayments={rowsHook([])}
        rates={rowsHook([])}
        commissionRates={rowsHook([])}
        activities={rowsHook([{ name: "Open Water" }])}
        schools={rowsHook([{ name: "PADI Cozumel" }])}
        currencies={rowsHook([{ code: "EUR", symbol: "€", is_default: true }])}
        navSections={rowsHook([])}
        paymentStatuses={PAYMENT_STATUSES}
        onQuickCreate={onQuickCreate}
      />
    );

    await userEvent.click(screen.getByLabelText("Añadir movimiento"));

    expect(onQuickCreate).toHaveBeenCalledWith("ganado");
  });
});

// "Escuela más activa" como puente hacia Resumen (2026-09-07) — sustituye
// a "Generado este mes", que duplicaba el KPI del mismo nombre ya visible
// en la cabecera de Mi trabajo. La tarjeta nueva aporta información de
// menor "peso" (qué escuela ha dado más movimientos este mes, no una
// cifra de dinero) pero conserva el mismo rol de puente táctil a Resumen.
describe("HomeTab — 'Escuela más activa' como puente hacia Resumen", () => {
  it("pulsar la tarjeta llama a onOpenSummary", async () => {
    const onOpenSummary = vi.fn();
    render(
      <HomeTab
        worklog={rowsHook([{ id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }])}
        comisiones={rowsHook([])}
        colleaguePayments={rowsHook([])}
        rates={rowsHook(RATES)}
        commissionRates={rowsHook([])}
        activities={rowsHook([{ name: "Open Water" }])}
        schools={rowsHook([{ name: "PADI Cozumel" }])}
        currencies={rowsHook([{ code: "EUR", symbol: "€", is_default: true }])}
        navSections={rowsHook([])}
        paymentStatuses={PAYMENT_STATUSES}
        onQuickCreate={vi.fn()}
        onOpenSummary={onOpenSummary}
      />
    );

    await userEvent.click(screen.getByTestId("active-school-this-month-card"));
    expect(onOpenSummary).toHaveBeenCalledTimes(1);
  });

  it("muestra el nombre de la única escuela con movimientos este mes, en singular", () => {
    const { activeSchool } = renderHome({
      worklog: [{ id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }],
      rates: RATES,
    });
    expect(activeSchool.getByText("PADI Cozumel")).toBeInTheDocument();
    expect(activeSchool.getByText("1 movimiento este mes")).toBeInTheDocument();
  });

  it("cuando hay varias escuelas, muestra la de más movimientos y cuenta cuántas escuelas hay en total", () => {
    const { activeSchool } = renderHome({
      worklog: [
        { id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" },
        { id: "w2", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" },
        { id: "w3", date: TODAY, school: "SSI Tulum", activity: "Open Water", people: 1, status: "Paid" },
      ],
      rates: RATES,
    });
    expect(activeSchool.getByText("PADI Cozumel")).toBeInTheDocument();
    expect(activeSchool.getByText("2 movimientos · 2 escuelas este mes")).toBeInTheDocument();
  });

  it("sin movimientos este mes, muestra el estado vacío en vez de una escuela", () => {
    const { activeSchool } = renderHome({ worklog: [], rates: RATES });
    expect(activeSchool.getByText("Sin actividad este mes")).toBeInTheDocument();
  });
});

// Calendario — día de hoy marcado visualmente (2026-08-30): antes un día
// con actividad se veía exactamente igual sea o no el de hoy. El marcador
// (punto bajo el número) es solo visual — se comprueba aquí a través del
// aria-label que lo acompaña, para que la información también llegue a
// quien usa un lector de pantalla.
describe("HomeTab — calendario: el día de hoy queda marcado", () => {
  it("el botón del día de hoy anuncia '(hoy)' cuando tiene actividad", () => {
    renderHome({
      worklog: [{ id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
      rates: RATES,
    });
    expect(screen.getByLabelText(/\(hoy\)$/)).toBeInTheDocument();
  });

  it("si hoy no tiene actividad, su botón de 'Añadir movimiento' es el único que lleva '(hoy)'", () => {
    renderHome({}); // sin worklog: hoy queda vacío/creable, como cualquier otro día del mes
    const emptyDayLabels = screen.getAllByLabelText(/^Añadir movimiento el /).map((el) => el.getAttribute("aria-label"));
    const withHoy = emptyDayLabels.filter((l) => l.endsWith("(hoy)"));
    expect(withHoy).toHaveLength(1);
  });
});

// Feedback explícito 2026-08-30: la instrucción de uso del calendario pasa
// de un párrafo suelto DEBAJO de todo el calendario a vivir DENTRO de la
// propia tarjeta, encima de la fila de días de la semana, sin punto final.
describe("HomeTab — calendario: instrucción de uso encima, dentro de la tarjeta", () => {
  it("el texto de instrucción no termina en punto, y precede a la fila de días de la semana", () => {
    renderHome({});
    const caption = screen.getByText("Toca un día para ver el detalle, o uno vacío para añadir un movimiento");
    expect(caption.textContent.endsWith(".")).toBe(false);
    const weekdayHeader = screen.getByText("L");
    expect(caption.compareDocumentPosition(weekdayHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// Corrección 7/7 (2026-09-01): el calendario de Home ya no está fijo al
// mes actual — se puede navegar con "‹"/"›". Cubre los tres casos que
// pide la corrección: mes actual (marcado, sin atajo "Hoy"), mes anterior
// con actividad (los datos aparecen, no los del mes actual), y mes sin
// actividad (no revienta, ninguna celda queda marcada).
describe("HomeTab — calendario: navegación entre meses", () => {
  it("el mes actual se muestra sin el atajo 'Hoy' (ya estás en él)", () => {
    renderHome({});
    expect(screen.queryByRole("button", { name: "Hoy" })).not.toBeInTheDocument();
  });

  it("retroceder un mes muestra los datos de ese mes (no los del actual) y ofrece volver con 'Hoy'", async () => {
    const user = userEvent.setup();
    renderHome({
      worklog: [
        { id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }, // 20€, este mes
        { id: "w2", date: LAST_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }, // 40€, mes anterior
      ],
      rates: RATES,
    });

    await user.click(screen.getByRole("button", { name: "Mes anterior" }));

    expect(screen.getByRole("button", { name: "Hoy" })).toBeInTheDocument();
    // autoSelectFirstDay vuelve a auto-seleccionar el primer día con datos
    // del mes ahora visible (LAST_MONTH, día 15) — su desglose muestra 40€,
    // no los 20€ de hoy.
    const label = screen.getByText("Generado el día");
    expect(label.parentElement).toHaveTextContent("40,00");
  });

  it("navegar a un mes sin actividad no rompe el calendario y no deja ningún día marcado", async () => {
    const user = userEvent.setup();
    renderHome({
      worklog: [{ id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
      rates: RATES,
    });

    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));

    await waitFor(() => expect(screen.queryByText("Generado el día")).not.toBeInTheDocument());
  });

  it("navegar dos meses seguidos rápido nunca deja el detalle de un día de un mes distinto al que se muestra", () => {
    // Bug real encontrado en verificación manual: sin esperar a que
    // termine la transición del primer clic, un segundo clic rápido podía
    // dejar visible "Día 1 de <mes anterior>" con el encabezado ya en el
    // mes siguiente — un día y un mes que nunca deberían combinarse.
    renderHome({
      worklog: [{ id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
      rates: RATES,
    });
    const next = screen.getByRole("button", { name: "Mes siguiente" });

    fireEvent.click(next);
    fireEvent.click(next);

    expect(screen.queryByText("Generado el día")).not.toBeInTheDocument();
  });

  it("'Hoy' vuelve al mes actual tras navegar", async () => {
    const user = userEvent.setup();
    renderHome({
      worklog: [{ id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
      rates: RATES,
    });

    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    await user.click(screen.getByRole("button", { name: "Hoy" }));

    expect(screen.queryByRole("button", { name: "Hoy" })).not.toBeInTheDocument();
    const label = screen.getByText("Generado el día");
    expect(label.parentElement).toHaveTextContent("20,00");
  });

  // Pedido explícito (Fase 9, 2026-09-07): "aparecerá marcado el día de
  // hoy si tiene alguna entrada... en caso de estar vacío se
  // seleccionará el primer día del mes con movimientos" — antes siempre
  // caía al primer día CON actividad del mes, aunque hoy también
  // tuviera la suya y no fuera el primero.
  it("con actividad en un día anterior y también hoy, se auto-selecciona hoy (no el primer día del mes)", () => {
    const earlierDay = localDateStr(new Date(NOW.getFullYear(), NOW.getMonth(), Math.max(1, NOW.getDate() - 1)));
    renderHome({
      worklog: [
        { id: "w1", date: earlierDay, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }, // 20€
        { id: "w2", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }, // 40€
      ],
      rates: RATES,
    });

    const label = screen.getByText("Generado el día");
    expect(label.parentElement).toHaveTextContent("40,00"); // el de hoy, no los 20€ del día anterior
  });
});

// Feedback explícito 2026-08-30: total combinado (Curso+Comisión+Ajuste,
// mismo criterio que "Generado este mes") del día seleccionado, para no
// tener que sumar mentalmente el desglose de abajo.
describe("HomeTab — calendario: total del día seleccionado", () => {
  it("muestra 'Generado el día' con la suma de todas las fuentes de ese día", () => {
    renderHome({
      worklog: [{ id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
      colleaguePayments: [{ id: "p1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", colleague_name: "Ana", amount: 5, currency: "EUR", status: "Paid" }],
      rates: RATES,
    });
    // autoSelectFirstDay ya abre el detalle del primer día con datos (hoy).
    // Acotado al propio total del día (no al documento entero): "Generado
    // este mes" muestra la misma cifra por coincidencia, al ser todos los
    // datos de ejemplo del mismo día de hoy.
    const label = screen.getByText("Generado el día");
    expect(label.parentElement).toHaveTextContent("25,00"); // 20€ del curso + 5€ del ajuste
  });
});

// Fase 3, Release V1: KPIs animados al final de Home. La cifra hace un
// conteo ascendente (useCountUp, motion.js) — se espera con waitFor a que
// termine en vez de asumir que aparece ya resuelta en el primer render.
// 2026-09-03, pedido explícito del usuario: título único "Tu impacto este
// mes" y los 3 KPIs son del mes actual (antes "Cursos impartidos" era un
// total histórico, deliberadamente distinto de los otros dos — se
// unifica).
describe("HomeTab — KPIs (alumnos, cursos, captados, todos del mes actual)", () => {
  it("los 3 KPIs cuentan solo el mes actual", async () => {
    renderHome({
      worklog: [
        { id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" },
        { id: "w2", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" },
        { id: "w3", date: LAST_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 3, status: "Paid" },
      ],
      comisiones: [
        { id: "c1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 4, status: "Paid" },
        { id: "c2", date: LAST_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 9, status: "Paid" },
      ],
      rates: RATES,
      commissionRates: COMMISSION_RATES,
    });

    expect(screen.getByText("Tu impacto este mes")).toBeInTheDocument();
    expect(screen.getByText("Alumnos")).toBeInTheDocument();
    expect(screen.getByText("Cursos")).toBeInTheDocument();
    expect(screen.getByText("Captados")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Alumnos").previousSibling).toHaveTextContent("3"); // 2 + 1, solo este mes
      expect(screen.getByText("Cursos").previousSibling).toHaveTextContent("2"); // w1 + w2, solo este mes (w3 es del mes pasado)
      expect(screen.getByText("Captados").previousSibling).toHaveTextContent("4"); // solo c1, este mes
    }, { timeout: 2000 });
  });
});

// "Instalar la app" (2026-09-08, tercera vuelta): el banner descartable
// de antes se retiró entero — sustituido por un texto pequeño
// ("Descargar app"), junto al título de los KPIs. Sin estado de
// "descartado": solo se oculta si no llega el handler (mismo criterio
// defensivo que onOpenTrainingRecords) o si la app ya corre instalada.
describe("HomeTab — enlace 'Descargar app'", () => {
  function renderHomeWithInstall(onOpenInstallApp = vi.fn()) {
    render(
      <HomeTab
        worklog={rowsHook([])} comisiones={rowsHook([])} colleaguePayments={rowsHook([])}
        rates={rowsHook([])} commissionRates={rowsHook([])}
        activities={rowsHook([{ name: "Open Water" }])} schools={rowsHook([{ name: "PADI Cozumel" }])}
        currencies={rowsHook([{ code: "EUR", symbol: "€", is_default: true }])} navSections={rowsHook([])}
        paymentStatuses={PAYMENT_STATUSES} onQuickCreate={vi.fn()} onOpenInstallApp={onOpenInstallApp}
      />
    );
  }

  it("no aparece si no se pasa onOpenInstallApp", () => {
    render(
      <HomeTab
        worklog={rowsHook([])} comisiones={rowsHook([])} colleaguePayments={rowsHook([])}
        rates={rowsHook([])} commissionRates={rowsHook([])}
        activities={rowsHook([{ name: "Open Water" }])} schools={rowsHook([{ name: "PADI Cozumel" }])}
        currencies={rowsHook([{ code: "EUR", symbol: "€", is_default: true }])} navSections={rowsHook([])}
        paymentStatuses={PAYMENT_STATUSES} onQuickCreate={vi.fn()}
      />
    );
    expect(screen.queryByText("Descargar app")).not.toBeInTheDocument();
  });

  it("pulsar el texto llama a onOpenInstallApp", async () => {
    const user = userEvent.setup();
    const onOpenInstallApp = vi.fn();
    renderHomeWithInstall(onOpenInstallApp);
    await user.click(screen.getByText("Descargar app"));
    expect(onOpenInstallApp).toHaveBeenCalledTimes(1);
  });
});
