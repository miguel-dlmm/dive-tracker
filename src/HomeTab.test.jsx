import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomeTab from "./HomeTab";

// Cubre "Pendiente de cobrar" (ADR-0004) y "Escuela del mes" (etiqueta
// corta — pasó antes por "Escuela más activa" y por "Escuela favorita
// este mes", acortada de nuevo 2026-09-26 porque ese texto se cortaba en
// móvil real). Ambas tiles viven hoy en el bento de accesos, junto a
// Training Records y "Nuevo movimiento" — el resto de la pantalla (KPIs,
// calendario) ya existía y no cambia.
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
// Mismo array que common:calendar.months (es/common.json) — el título de
// KPIs interpola el nombre del mes actual (rediseño de portada,
// 2026-09-26: "sustituye 'tu impacto este mes' por 'tu impacto en
// [mes]'"), así que el test necesita el nombre real, no un texto fijo.
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const CURRENT_MONTH_NAME = MONTH_NAMES[NOW.getMonth()];
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

function renderHome({ worklog = [], comisiones = [], colleaguePayments = [], rates = [], commissionRates = [], currencies = [{ code: "EUR", symbol: "€", is_default: true }], onEditEntry, onOpenSummary } = {}) {
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
      onEditEntry={onEditEntry}
      onOpenSummary={onOpenSummary}
    />
  );
  return {
    activeSchool: within(screen.getByTestId("active-school-this-month-card")),
    pending: within(screen.getByTestId("pending-collection-card")),
  };
}

// Pendiente de cobrar vive ahora en el hueco principal de KPIs (lote
// 2026-09-26, ver comentario junto a su JSX en HomeTab.jsx) reutilizando
// MoneyKpiTile — a diferencia de la <MoneyLine> estática de antes, la
// cifra hace un conteo ascendente (useCountUp), así que las aserciones
// de importe necesitan `waitFor` en vez de leerse en el primer render
// (mismo motivo que ya tenían los KPIs animados más abajo en este
// archivo).
describe("HomeTab — Pendiente de cobrar", () => {
  // testTimeout explícito (15000, 2026-09-27, hallazgo de robustez): el
  // waitFor de más abajo ya tenía margen hasta 12000ms para el
  // requestAnimationFrame de useCountUp bajo contención real, pero el
  // propio test seguía con el testTimeout por defecto de Vitest (5000ms)
  // — así que Vitest mataba el test a los 5s antes de que el waitFor
  // llegara a agotar su propio margen de 12s. Reproducido en vivo con
  // `npx vitest run --coverage` (suite completa): pasa siempre en
  // aislamiento, falla con la suite completa bajo cobertura por la CPU
  // extra de la instrumentación. No es un problema de aislamiento entre
  // tests, es un timeout exterior más corto que el interior.
  it("suma pendientes de Registro, Comisiones y Compañeros, de cualquier mes (ejemplo de referencia)", async () => {
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
    await waitFor(() => {
      expect(pending.getByText(money("125,00 €"))).toBeInTheDocument();
    }, { timeout: 12000 });
  }, 15000);

  // testTimeout explícito: mismo motivo que el test anterior (waitFor a
  // 12000ms bajo un testTimeout de Vitest de 5000ms por defecto).
  it("Pendiente de cobrar SÍ cuenta entradas de meses anteriores (a diferencia de los KPIs financieros del mes en curso)", async () => {
    const { pending } = renderHome({
      worklog: [{ id: "w1", date: LAST_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }], // 20€, mes anterior
      rates: RATES,
    });
    await waitFor(() => {
      expect(pending.getByText(money("20,00 €"))).toBeInTheDocument();
    }, { timeout: 12000 });
  }, 15000);

  it("excluye pagos de compañeros con importe negativo (es lo que tú debes, no lo que te deben)", async () => {
    const { pending } = renderHome({
      colleaguePayments: [
        { id: "p1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", colleague_name: "Marc", amount: -10, currency: "EUR", status: "Pending" },
      ],
    });
    expect(pending.queryByText(money("10,00 €"))).not.toBeInTheDocument();
    // El detalle ("Nada pendiente"/"N pagos pendientes") vive ahora en el
    // tooltip de la tarjeta (rediseño de portada, lote 2026-09-26: esta
    // información pasó del bento a la fila de KPIs, reutilizando
    // MoneyKpiTile y su mecanismo de tooltip) — FloatingPanel (shared.jsx)
    // hace `createPortal` fuera del propio botón, así que se busca con
    // `screen`, no con `pending` (acotado al testid de la tarjeta).
    await userEvent.click(pending.getByLabelText("Info: Pendiente de cobrar"));
    expect(screen.getByText("Nada pendiente")).toBeInTheDocument();
  });

  // testTimeout explícito: mismo motivo que los tests anteriores del
  // describe (waitFor a 12000ms bajo un testTimeout de Vitest de 5000ms
  // por defecto).
  it("agrupa Pendiente de cobrar por moneda cuando hay más de una", async () => {
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
    // money(), no una regex suelta: con más de una moneda, MoneyKpiTile
    // renderiza cada importe con <Money> (número y símbolo en nodos de
    // texto separados, símbolo más apagado) — una regex de texto plano
    // como /20,00 €/ nunca encuentra un match partido así entre
    // elementos. money() sí lo resuelve (compara el textContent agregado
    // del nodo, ver la nota junto a esa función más arriba).
    await waitFor(() => {
      expect(pending.getByText(money("20,00 €"))).toBeInTheDocument();
      expect(pending.getByText(money("12,00 $"))).toBeInTheDocument();
    }, { timeout: 12000 });
  }, 15000);

  it("muestra el número correcto de pagos pendientes (cuenta entradas, no escuelas)", async () => {
    const { pending } = renderHome({
      worklog: [
        { id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" },
        { id: "w2", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" },
      ],
      rates: RATES,
    });
    await userEvent.click(pending.getByLabelText("Info: Pendiente de cobrar"));
    expect(screen.getByText("2 pagos pendientes")).toBeInTheDocument();
  });
});

// "Nuevo movimiento" — tile propia del bento de accesos (rediseño de
// portada, lote 2026-09-26), antes un botón "+" incrustado dentro de la
// propia tarjeta de "Pendiente de cobrar" (PendingCollectionCard, ya
// retirado). Cubre que Home sigue llamando a onQuickCreate("ganado") con
// el mismo contrato de siempre (entra directo al caso dominante, sin id
// de pestaña antiguo), solo que ahora a través de esta tile dedicada.
describe("HomeTab — acceso rápido 'Nuevo movimiento'", () => {
  it("pulsar la tile llama a onQuickCreate(\"ganado\")", async () => {
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

    await userEvent.click(screen.getByText("Nuevo movimiento"));

    expect(onQuickCreate).toHaveBeenCalledWith("ganado");
  });
});

// "Escuela del mes" (pasó antes por "Escuela más activa" y "Escuela
// favorita este mes", acortada 2026-09-26 — el texto largo se cortaba en
// móvil real) como puente hacia Resumen — nació el 2026-09-07
// sustituyendo a "Generado este mes", que duplicaba el KPI del mismo
// nombre ya visible en la cabecera de Mi trabajo. La tile aporta
// información de menor "peso" (qué escuela ha dado más cursos este mes,
// no una cifra de dinero) pero conserva el mismo rol de puente táctil a
// Mi Trabajo (2026-09-27, pedido explícito: "enlaza la pastilla escuela
// del mes a Mi Trabajo" — antes iba a Resumen).
describe("HomeTab — 'Escuela del mes' como puente hacia Mi Trabajo", () => {
  it("pulsar la tarjeta llama a onOpenTrabajo", async () => {
    const onOpenTrabajo = vi.fn();
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
        onOpenTrabajo={onOpenTrabajo}
      />
    );

    await userEvent.click(screen.getByTestId("active-school-this-month-card"));
    expect(onOpenTrabajo).toHaveBeenCalledTimes(1);
  });

  it("muestra el nombre de la única escuela con movimientos este mes, en singular, junto a la etiqueta 'Escuela del mes'", () => {
    const { activeSchool } = renderHome({
      worklog: [{ id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }],
      rates: RATES,
    });
    expect(activeSchool.getByText("Escuela del mes")).toBeInTheDocument();
    expect(activeSchool.getByText("PADI Cozumel · 1 curso")).toBeInTheDocument();
  });

  it("cuando hay varias escuelas, muestra la de más movimientos con su número de cursos, sin desglosar el resto", () => {
    const { activeSchool } = renderHome({
      worklog: [
        { id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" },
        { id: "w2", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" },
        { id: "w3", date: TODAY, school: "SSI Tulum", activity: "Open Water", people: 1, status: "Paid" },
      ],
      rates: RATES,
    });
    expect(activeSchool.getByText("PADI Cozumel · 2 cursos")).toBeInTheDocument();
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

  // Editar desde el calendario de Home (lote 2026-09-17, pedido explícito:
  // "al hacer click en los movimientos pueda editarlos"). onEditEntry
  // recibe la entrada tal cual la usa el propio desglose (con _source e
  // id) — MovementSheet solo necesita reenviarla como editingEntry (ver
  // startHomeEdit, App.jsx), así que basta comprobar que el clic entrega
  // exactamente ese shape.
  it("un apunte del desglose es pulsable y entrega la entrada a onEditEntry", async () => {
    const user = userEvent.setup();
    const onEditEntry = vi.fn();
    renderHome({
      worklog: [{ id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }],
      rates: RATES,
      onEditEntry,
    });
    await user.click(screen.getByRole("button", { name: /Open Water/ }));
    expect(onEditEntry).toHaveBeenCalledTimes(1);
    const entry = onEditEntry.mock.calls[0][0];
    expect(entry.id).toBe("w1");
    expect(entry._source).toBe("ganado");
  });

  it("sin onEditEntry, el desglose no es pulsable (Resumen, calendario de solo lectura)", () => {
    renderHome({
      worklog: [{ id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }],
      rates: RATES,
    });
    expect(screen.queryByRole("button", { name: /Open Water/ })).not.toBeInTheDocument();
    expect(screen.getByText("Open Water")).toBeInTheDocument();
  });
});

// Fase 3, Release V1: KPIs animados al final de Home. La cifra hace un
// conteo ascendente (useCountUp, motion.js) — se espera con waitFor a que
// termine en vez de asumir que aparece ya resuelta en el primer render.
// 2026-09-03, pedido explícito del usuario: título único "Tu impacto este
// mes" y los 3 KPIs son del mes actual (antes "Cursos impartidos" era un
// total histórico, deliberadamente distinto de los otros dos — se
// unifica).
// "Alumnos" sustituido por "Media diaria" (lote 2026-09-17, ver
// comentario junto a dailyAverageTotals en HomeTab.jsx): el importe
// esperado se calcula igual que el propio componente (total ganado este
// mes ÷ NOW.getDate()) en vez de un valor fijo, porque ese divisor
// depende del día real en que corra el test.
describe("HomeTab — KPIs (media diaria, cursos, captados, todos del mes actual)", () => {
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

    expect(screen.getByText(`Tu impacto en ${CURRENT_MONTH_NAME}`)).toBeInTheDocument();
    expect(screen.getByText("Media diaria")).toBeInTheDocument();
    expect(screen.getByText("Cursos")).toBeInTheDocument();
    expect(screen.getByText("Captados")).toBeInTheDocument();

    // w1 (40€) + w2 (20€) = 60€ ganados este mes, ÷ día del mes de hoy.
    const dailyAverage = Math.round((60 / NOW.getDate()) * 100) / 100;
    const dailyAverageText = dailyAverage.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });

    // timeout 4000 (2026-09-08, hallazgo real): con la suite completa
    // corriendo (muchos archivos de test en paralelo, CPU bajo presión
    // real), el bucle de requestAnimationFrame de useCountUp (motion.js)
    // puede tardar bastante más de 2s en asentarse en su valor final —
    // visto fallar en vivo con la suite completa, nunca en solitario.
    // 2000ms bastaba en aislamiento pero era un margen demasiado justo
    // bajo contención real; no es un cambio de comportamiento, solo más
    // paciencia para el mismo resultado esperado. 12000ms (2026-09-18,
    // sustituye el 8000ms anterior, que ya sustituía un 4000ms previo):
    // la propia tarjeta de "Media diaria" cuenta en CÉNTIMOS (más pasos
    // de animación que un entero pequeño como "Cursos"/"Captados") —
    // visto fallar en vivo con la suite completa incluso a 8000ms bajo
    // contención especialmente alta (otro proceso corriendo su propia
    // suite de tests en paralelo en la misma máquina), nunca en
    // solitario.
    // Media diaria ya no vive en la fila de KPIs (lote 2026-09-26,
    // "cambia el sitio de media diaria por pendiente de cobrar... todo el
    // contenido de esas dos pastillas") — ahora ocupa el hueco del bento
    // que antes era Pendiente de cobrar, pero sigue siendo MoneyKpiTile
    // (pedido explícito: "deja el tooltip de media diaria como tooltip"),
    // así que sigue animando con useCountUp igual que aquí. El conteo
    // ascendente de Pendiente de cobrar (que ocupa ahora el hueco
    // principal de KPIs) se cubre en el describe "Pendiente de cobrar",
    // no aquí.
    await waitFor(() => {
      expect(screen.getByText(money(`${dailyAverageText} €`))).toBeInTheDocument();
      expect(screen.getByText("Cursos").previousSibling).toHaveTextContent("2"); // w1 + w2, solo este mes (w3 es del mes pasado)
      expect(screen.getByText("Captados").previousSibling).toHaveTextContent("4"); // solo c1, este mes
    }, { timeout: 12000 });
    // testTimeout explícito 15000 (2026-09-27, hallazgo de robustez): el
    // waitFor de arriba ya llegaba a 12000ms de margen, pero el propio
    // test seguía con el testTimeout por defecto de Vitest (5000ms) —
    // Vitest lo mataba a los 5s antes de que el waitFor agotara su
    // margen real. Mismo mecanismo que los 3 tests de "Pendiente de
    // cobrar" más arriba en este archivo.
  }, 15000);
});

// "Media diaria" como puente hacia Resumen (2026-09-27, pedido explícito:
// "enlaza la pastilla media diaria a Resumen, mantén por encima el click
// del tooltip de esta pastilla").
describe("HomeTab — 'Media diaria' como puente hacia Resumen", () => {
  it("pulsar la tarjeta llama a onOpenSummary", async () => {
    const onOpenSummary = vi.fn();
    renderHome({ onOpenSummary });
    // El testid "daily-average-card" vive en el <div> contenedor del grid
    // (col-span-2), un nivel POR ENCIMA del propio <motion.div> clicable
    // de MoneyKpiTile — un click ahí no llega al onClick real (los
    // eventos burbujean hacia arriba, nunca hacia abajo). Se pulsa el
    // texto de la propia tarjeta en su lugar.
    await userEvent.click(screen.getByText("Media diaria"));
    expect(onOpenSummary).toHaveBeenCalledTimes(1);
  });

  it("pulsar el '?' del tooltip abre el tooltip sin navegar a Resumen", async () => {
    const onOpenSummary = vi.fn();
    renderHome({ onOpenSummary });
    await userEvent.click(screen.getByRole("button", { name: "Info: Media diaria" }));
    expect(await screen.findByText(/Lo que ganas de media al día/)).toBeInTheDocument();
    expect(onOpenSummary).not.toHaveBeenCalled();
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

// Tarjeta de Training Records — subtítulo dinámico (2026-09-08, pedido
// explícito: "otra manera dinámica y atractiva de integrarlo en la
// home"). El contador vive en localStorage (generatedCounter.js, misma
// clave que TrainingRecordsTab.jsx incrementa al generar con éxito) —
// aquí solo se prueba que HomeTab lo lee y lo refleja, no la lógica de
// sumar (ya cubierta en generatedCounter.test.js).
describe("HomeTab — tarjeta de Training Records", () => {
  beforeEach(() => { localStorage.clear(); });

  function renderHomeWithTR(onOpenTrainingRecords = vi.fn(), userId = "u1") {
    render(
      <HomeTab
        worklog={rowsHook([])} comisiones={rowsHook([])} colleaguePayments={rowsHook([])}
        rates={rowsHook([])} commissionRates={rowsHook([])}
        activities={rowsHook([{ name: "Open Water" }])} schools={rowsHook([{ name: "PADI Cozumel" }])}
        currencies={rowsHook([{ code: "EUR", symbol: "€", is_default: true }])} navSections={rowsHook([])}
        paymentStatuses={PAYMENT_STATUSES} onQuickCreate={vi.fn()} onOpenTrainingRecords={onOpenTrainingRecords}
        userId={userId}
      />
    );
  }

  it("sin ningún Training Record generado todavía, es una invitación de verdad, no un contador en cero", () => {
    renderHomeWithTR();
    // "Training Records" (título) sí se muestra siempre desde el
    // rediseño de tarjeta "stat" (2026-09-27, acceso a la Guía de Buceo
    // en Home): las tres tarjetas de esa fila comparten ahora una banda
    // de color con el nombre fijo arriba, icono, y una única línea de
    // contenido específico debajo. Lo que sigue sin verse — y es lo que
    // este test protege de verdad — es cualquier "0 Generados", que sí
    // volvería a sentirse como un contador vacío en vez de una invitación.
    expect(screen.getByText("Training Records")).toBeInTheDocument();
    expect(screen.getByText("Genera el primero")).toBeInTheDocument();
    expect(screen.queryByText("Generados")).not.toBeInTheDocument();
  });

  it("con Training Records ya generados, cambia a 'Training Records' + la cifra + 'Generados' (mismo patrón que los KPI)", async () => {
    localStorage.setItem("oceanpulse:trainingRecordsGeneratedCount:u1", "7");
    renderHomeWithTR();
    expect(screen.getByText("Training Records")).toBeInTheDocument();
    // "7 Generados" vive en un único nodo de texto desde el rediseño de
    // tarjeta "stat" (2026-09-27, banda de color + una sola línea de
    // contenido) — antes eran dos <span> separados ("7" y "Generados").
    await waitFor(() => {
      expect(screen.getByText("7 Generados")).toBeInTheDocument();
    }, { timeout: 4000 });
    expect(screen.queryByText("Genera el primero")).not.toBeInTheDocument();
  });

  // Bug real (2026-09-08): "he creado un TR con el admin y cuando entro
  // con una cuenta demo mía sigue poniendo el número de generados pese a
  // q aún no he generado ninguno" — el contador vivía en una clave de
  // localStorage compartida por cualquier cuenta del mismo navegador.
  it("los Training Records generados por otra cuenta en el mismo navegador no se cuelan aquí", () => {
    localStorage.setItem("oceanpulse:trainingRecordsGeneratedCount:admin-1", "12");
    renderHomeWithTR(vi.fn(), "demo-2");
    // Si el bug se reprodujera, esta cuenta ("demo-2") vería el estado
    // "con actividad" (cifra + "Generados") heredado de "admin-1" en vez
    // de la invitación real. "Training Records" (el título) ya no sirve
    // para distinguir los dos estados — se muestra en ambos desde el lote
    // de 3 columnas — así que la comprobación real es "Generados" ausente,
    // sin buscar "12" suelto en el documento (coincide por casualidad con
    // el día 12 del calendario de abajo).
    expect(screen.getByText("Genera el primero")).toBeInTheDocument();
    expect(screen.queryByText("Generados")).not.toBeInTheDocument();
  });

  it("pulsar la fila llama a onOpenTrainingRecords", async () => {
    const user = userEvent.setup();
    const onOpenTrainingRecords = vi.fn();
    renderHomeWithTR(onOpenTrainingRecords);
    await user.click(screen.getByText("Genera el primero"));
    expect(onOpenTrainingRecords).toHaveBeenCalledTimes(1);
  });
});
