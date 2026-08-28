import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomeTab from "./HomeTab";

// Cubre "Generado este mes" y "Pendiente de cobrar" (ADR-0004) — las dos
// parten de la misma base de datos (worklog + comisiones + compañeros
// positivos) y solo difieren en el filtro que aplican. El resto de la
// pantalla (accesos rápidos, calendario) ya existía y no cambia.
//
// Las aserciones de importe se acotan con data-testid a cada tarjeta (no al
// documento entero): el calendario de abajo también muestra dinero en su
// desglose del día seleccionado, y con datos de ejemplo pequeños las cifras
// pueden coincidir por casualidad con las del calendario sin que signifique
// nada — acotar por tarjeta evita ese falso positivo/negativo.
const rowsHook = (rows) => ({ rows, loaded: true, insertRow: vi.fn(), updateRow: vi.fn(), deleteRow: vi.fn(), bulkUpdateWhere: vi.fn(), setDefault: vi.fn() });

const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);
const LAST_MONTH = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 15).toISOString().slice(0, 10);

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
    generated: within(screen.getByTestId("generated-this-month-card")),
    pending: within(screen.getByTestId("pending-collection-card")),
  };
}

describe("HomeTab — Generado este mes y Pendiente de cobrar", () => {
  it("las dos métricas parten de la misma base, con distinto filtro (ejemplo de referencia)", () => {
    const { generated, pending } = renderHome({
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

    // Generado este mes: 40 (pagado) + 20 (pendiente) + 15 (comisión) + 30 (compañero) = 105 — el de mes anterior (60) queda fuera por fecha, el estado no filtra.
    expect(generated.getByText(money("105,00 €"))).toBeInTheDocument();

    // Pendiente de cobrar: 20 (este mes) + 60 (mes anterior) + 15 (comisión) + 30 (compañero) = 125 — el pagado (40) queda fuera por estado, sin filtro de fecha.
    expect(pending.getByText(money("125,00 €"))).toBeInTheDocument();
  });

  it("Generado este mes no filtra por estado (cuenta lo pagado igual que lo pendiente)", () => {
    const { generated } = renderHome({
      worklog: [{ id: "w1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }], // 20€, pagado
      rates: RATES,
    });
    expect(generated.getByText(money("20,00 €"))).toBeInTheDocument();
  });

  it("Generado este mes excluye entradas de meses anteriores, aunque Pendiente sí las cuente", () => {
    const { generated, pending } = renderHome({
      worklog: [{ id: "w1", date: LAST_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }], // 20€, mes anterior
      rates: RATES,
    });
    expect(pending.getByText(money("20,00 €"))).toBeInTheDocument();
    expect(generated.queryByText(money("20,00 €"))).not.toBeInTheDocument();
  });

  it("excluye pagos de compañeros con importe negativo de ambas métricas (es lo que tú debes, no lo que generas ni te deben)", () => {
    const { generated, pending } = renderHome({
      colleaguePayments: [
        { id: "p1", date: TODAY, school: "PADI Cozumel", activity: "Open Water", colleague_name: "Marc", amount: -10, currency: "EUR", status: "Pending" },
      ],
    });
    expect(pending.getByText("Nada pendiente")).toBeInTheDocument();
    expect(pending.queryByText(money("10,00 €"))).not.toBeInTheDocument();
    expect(generated.queryByText(money("10,00 €"))).not.toBeInTheDocument();
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
