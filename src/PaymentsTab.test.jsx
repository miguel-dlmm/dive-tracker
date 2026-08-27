import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentsTab from "./PaymentsTab";
import { ToastProvider } from "./shared";

const rowsHook = (rows) => ({
  rows, loaded: true,
  insertRow: vi.fn(),
  updateRow: vi.fn().mockResolvedValue(rows[0]),
  deleteRow: vi.fn(),
  bulkUpdateWhere: vi.fn().mockImplementation(async (predicate) => rows.filter(predicate).length),
  setDefault: vi.fn(),
});

const PAYMENT_STATUSES = rowsHook([
  { name: "Pending", is_default: true },
  { name: "Paid", is_default: false },
]);
const CURRENCIES = rowsHook([{ code: "EUR", symbol: "€", is_default: true }]);
const ACTIVITIES = rowsHook([{ name: "Open Water" }]);
const RATES_ROWS = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 20, currency: "EUR" }];
const COMMISSION_RATES_ROWS = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 5, currency: "EUR" }];

// <Money> separa cifra y símbolo en nodos distintos (para atenuar el
// símbolo); este matcher compara el texto combinado del nodo sin espacios,
// sin importar cómo lo reparta el DOM.
function money(expected) {
  const target = expected.replace(/\s+/g, "");
  return (_content, node) => {
    if (!node) return false;
    const text = (el) => el.textContent.replace(/\s+/g, "");
    return text(node) === target && Array.from(node.children).every((child) => text(child) !== target);
  };
}

function renderPayments({ worklog = [], comisiones = [], colleaguePayments = [], withToast = false } = {}) {
  const hooks = {
    worklog: rowsHook(worklog),
    comisiones: rowsHook(comisiones),
    colleaguePayments: rowsHook(colleaguePayments),
    rates: rowsHook(RATES_ROWS),
    commissionRates: rowsHook(COMMISSION_RATES_ROWS),
  };
  const ui = (
    <PaymentsTab
      activities={ACTIVITIES} paymentStatuses={PAYMENT_STATUSES} currencies={CURRENCIES}
      rates={hooks.rates} commissionRates={hooks.commissionRates}
      worklog={hooks.worklog} comisiones={hooks.comisiones} colleaguePayments={hooks.colleaguePayments}
    />
  );
  render(withToast ? <ToastProvider>{ui}</ToastProvider> : ui);
  return hooks;
}

// 2 fuentes pendientes (20€ + 10€) para que el total de la cabecera (30€)
// nunca coincida por casualidad con el importe de una sola fila.
function mixedDataset() {
  return {
    worklog: [
      { id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }, // 20€
      { id: "w2", date: "2026-08-05", school: "PADI Cozumel", activity: "Open Water", people: 3, status: "Paid" }, // 60€
    ],
    comisiones: [
      { id: "c1", date: "2026-08-11", school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Pending" }, // 10€
    ],
  };
}

describe("PaymentsTab — filtro de estado (Pendientes/Cobrados)", () => {
  it("por defecto muestra solo Pendientes, con el contador en la pestaña", () => {
    renderPayments(mixedDataset());

    expect(screen.getByRole("button", { name: "Pendientes · 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(money("30,00 €"))).toBeInTheDocument(); // total cabecera: 20+10
    expect(screen.getByText(money("20,00 €"))).toBeInTheDocument();
    expect(screen.getByText(money("10,00 €"))).toBeInTheDocument();
    expect(screen.queryByText(money("60,00 €"))).not.toBeInTheDocument();
  });

  it("la pestaña Cobrados muestra solo los cobrados", async () => {
    const user = userEvent.setup();
    renderPayments(mixedDataset());

    await user.click(screen.getByRole("button", { name: "Cobrados" }));

    expect(screen.getByText(money("60,00 €"))).toBeInTheDocument();
    expect(screen.queryByText(money("20,00 €"))).not.toBeInTheDocument();
    expect(screen.queryByText(money("10,00 €"))).not.toBeInTheDocument();
    // La cabecera sigue mostrando el total pendiente, sea cual sea la pestaña activa.
    expect(screen.getByText(money("30,00 €"))).toBeInTheDocument();
  });

  it("Cobrados se limita a los últimos 10 y avisa si hay más", async () => {
    const user = userEvent.setup();
    const paidEntries = Array.from({ length: 12 }, (_, i) => ({
      id: `w${i}`, date: `2026-08-${String(i + 1).padStart(2, "0")}`, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid",
    }));
    renderPayments({ worklog: paidEntries });

    await user.click(screen.getByRole("button", { name: "Cobrados" }));

    expect(screen.getAllByText("Marcar pendiente")).toHaveLength(10);
    expect(screen.getByText(/Mostrando los 10 cobrados más recientes de 12/)).toBeInTheDocument();
  });
});

describe("PaymentsTab — acciones de cobro", () => {
  it("Confirmar cobro actualiza la tabla correcta con el estado opuesto", async () => {
    const user = userEvent.setup();
    const { worklog } = renderPayments({
      worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }],
    });

    await user.click(screen.getByRole("button", { name: /^Confirmar cobro$/ }));

    expect(worklog.updateRow).toHaveBeenCalledWith("w1", { status: "Paid" });
  });

  it("avisa por toast cómo encontrar el pago cuando desaparece del filtro activo (Pendientes)", async () => {
    const user = userEvent.setup();
    renderPayments({
      withToast: true,
      worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }],
    });

    await user.click(screen.getByRole("button", { name: /^Confirmar cobro$/ }));

    expect(await screen.findByText(/cámbialo a "Cobrados" para verlo/)).toBeInTheDocument();
  });

  it("Confirmar todos actualiza en bloque cada tabla implicada", async () => {
    const user = userEvent.setup();
    const { worklog, comisiones } = renderPayments({
      worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }],
      comisiones: [{ id: "c1", date: "2026-08-12", school: "PADI Cozumel", activity: "Open Water", people: 3, status: "Pending" }],
    });

    await user.click(screen.getByRole("button", { name: "Confirmar todos" }));

    expect(worklog.bulkUpdateWhere).toHaveBeenCalled();
    expect(comisiones.bulkUpdateWhere).toHaveBeenCalled();
  });
});

describe("PaymentsTab — estado visual", () => {
  it("el botón Filtrar comunica visualmente si el panel está abierto o cerrado", async () => {
    const user = userEvent.setup();
    renderPayments({});

    const filterButton = screen.getByRole("button", { name: "Filtrar" });
    expect(filterButton).toHaveAttribute("aria-expanded", "false");
    expect(filterButton.className).not.toContain("text-white");

    await user.click(filterButton);

    expect(filterButton).toHaveAttribute("aria-expanded", "true");
    expect(filterButton.className).toContain("text-white");
  });

  it("las pestañas Pendientes/Cobrados reflejan cuál está activa (aria-pressed)", async () => {
    const user = userEvent.setup();
    renderPayments({});

    expect(screen.getByRole("button", { name: /^Pendientes/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Cobrados" })).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "Cobrados" }));

    expect(screen.getByRole("button", { name: /^Pendientes/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Cobrados" })).toHaveAttribute("aria-pressed", "true");
  });
});
