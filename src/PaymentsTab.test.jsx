import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentsTab from "./PaymentsTab";
import { ToastProvider } from "./shared";

const rowsHook = (rows) => ({
  rows, loaded: true,
  insertRow: vi.fn(),
  updateRow: vi.fn(),
  deleteRow: vi.fn(),
  bulkUpdateWhere: vi.fn().mockImplementation(async (predicate) => rows.filter(predicate).length),
  setDefault: vi.fn(),
});

const PAYMENT_STATUSES = rowsHook([{ name: "Pending", is_default: true }, { name: "Paid", is_default: false }]);
const CURRENCIES = rowsHook([{ code: "EUR", symbol: "€", is_default: true }]);
const ACTIVITIES = rowsHook([{ name: "Open Water" }]);
const SCHOOLS = rowsHook([{ name: "PADI Cozumel" }, { name: "Aquatic Adventures" }]);
const RATES_ROWS = [
  { school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 20, currency: "EUR" },
  { school: "Aquatic Adventures", activity: "Open Water", payment_type: "Per Person", rate: 25, currency: "EUR" },
];
const COMMISSION_RATES_ROWS = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 5, currency: "EUR" }];

// <Money> separa cifra y símbolo en nodos distintos; este matcher compara
// el texto combinado del nodo sin espacios (ver otros *.test.jsx).
function money(expected) {
  const target = expected.replace(/\s+/g, "");
  return (_content, node) => {
    if (!node) return false;
    const text = (el) => el.textContent.replace(/\s+/g, "");
    return text(node) === target && Array.from(node.children).every((child) => text(child) !== target);
  };
}

function renderPayments({ worklog = [], comisiones = [], colleaguePayments = [] } = {}) {
  const hooks = {
    worklog: rowsHook(worklog),
    comisiones: rowsHook(comisiones),
    colleaguePayments: rowsHook(colleaguePayments),
    rates: rowsHook(RATES_ROWS),
    commissionRates: rowsHook(COMMISSION_RATES_ROWS),
  };
  render(
    <ToastProvider>
      <PaymentsTab
        activities={ACTIVITIES} schools={SCHOOLS} paymentStatuses={PAYMENT_STATUSES} currencies={CURRENCIES}
        rates={hooks.rates} commissionRates={hooks.commissionRates}
        worklog={hooks.worklog} comisiones={hooks.comisiones} colleaguePayments={hooks.colleaguePayments}
      />
    </ToastProvider>
  );
  return hooks;
}

// 2 escuelas con pendientes (20€ en PADI, 25€ en Aquatic) — el total de la
// cabecera (45€) nunca coincide por casualidad con el de un solo grupo.
function twoSchoolDataset() {
  return {
    worklog: [
      { id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }, // 20€
      { id: "w2", date: "2026-08-05", school: "Aquatic Adventures", activity: "Open Water", people: 1, status: "Pending" }, // 25€
    ],
  };
}

describe("PaymentsTab — liquidación agrupada por escuela", () => {
  it("agrupa los pendientes por escuela con su total y la cabecera suma todas las escuelas", () => {
    renderPayments(twoSchoolDataset());

    expect(screen.getByText(money("45,00 €"))).toBeInTheDocument(); // cabecera
    expect(screen.getByText("PADI Cozumel")).toBeInTheDocument();
    expect(screen.getByText("Aquatic Adventures")).toBeInTheDocument();
    expect(screen.getByText(money("20,00 €"))).toBeInTheDocument();
    expect(screen.getByText(money("25,00 €"))).toBeInTheDocument();
    expect(screen.getByText("2 pagos pendientes")).toBeInTheDocument();
    expect(screen.getByText(/Repartido en 2 escuelas/)).toBeInTheDocument();
  });

  it("un ajuste negativo de compañero no cuenta como pendiente de cobrar", () => {
    renderPayments({
      worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }], // 20€
      colleaguePayments: [{ id: "p1", date: "2026-08-11", school: "PADI Cozumel", activity: "Open Water", colleague_name: "Ana", amount: -15, currency: "EUR", status: "Pending" }],
    });

    expect(screen.getByText("1 pago pendiente")).toBeInTheDocument(); // el ajuste no cuenta como un 2º elemento
    expect(screen.getByText(/Repartido en 1 escuela/)).toBeInTheDocument();
    expect(screen.queryByText(money("15,00 €"))).not.toBeInTheDocument();
  });

  it("expandir una escuela muestra el detalle de sus elementos", async () => {
    const user = userEvent.setup();
    renderPayments(twoSchoolDataset());

    await user.click(screen.getByRole("button", { name: /^PADI Cozumel/ }));

    expect(screen.getByText("2026-08-10", { exact: false })).toBeInTheDocument();
  });

  it("'Cobrar todo' de una escuela solo actualiza los elementos de esa escuela", async () => {
    // Los grupos se ordenan alfabéticamente: Aquatic Adventures (w2) va antes que PADI Cozumel (w1).
    const user = userEvent.setup();
    const { worklog } = renderPayments(twoSchoolDataset());

    await user.click(screen.getAllByRole("button", { name: "Cobrar todo" })[0]);

    expect(worklog.bulkUpdateWhere).toHaveBeenCalled();
    const predicate = worklog.bulkUpdateWhere.mock.calls[0][0];
    expect(predicate({ id: "w2" })).toBe(true); // Aquatic Adventures sí se cobra
    expect(predicate({ id: "w1" })).toBe(false); // PADI Cozumel no debe tocarse
    expect(worklog.bulkUpdateWhere.mock.calls[0][1]).toEqual({ status: "Paid" });
  });

  it("seleccionar 2 escuelas y 'Cobrar seleccionadas' solo actualiza esas 2", async () => {
    const user = userEvent.setup();
    const { worklog } = renderPayments(twoSchoolDataset());

    await user.click(screen.getByLabelText("Seleccionar PADI Cozumel"));
    await user.click(screen.getByLabelText("Seleccionar Aquatic Adventures"));
    expect(screen.getByText("2 escuelas")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cobrar seleccionadas" }));

    const predicate = worklog.bulkUpdateWhere.mock.calls[0][0];
    expect(predicate({ id: "w1" })).toBe(true);
    expect(predicate({ id: "w2" })).toBe(true);
  });

  it("'Seleccionar todas' selecciona cada escuela y la barra muestra el total conjunto", async () => {
    const user = userEvent.setup();
    renderPayments(twoSchoolDataset());

    await user.click(screen.getByRole("button", { name: "Seleccionar todas" }));

    expect(screen.getByText("2 escuelas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ninguna" })).toBeInTheDocument();
  });

  it("el filtro de periodo reduce qué escuelas aparecen", async () => {
    const user = userEvent.setup();
    renderPayments(twoSchoolDataset());

    const [desde] = screen.getAllByLabelText("Sin límite");
    await user.click(desde);
    await user.click(screen.getByRole("button", { name: "10 de Agosto" }));

    expect(screen.getByText("PADI Cozumel")).toBeInTheDocument();
    expect(screen.queryByText("Aquatic Adventures")).not.toBeInTheDocument();
  });

  it("sin nada pendiente, muestra el estado vacío", () => {
    renderPayments({});
    expect(screen.getByText("Estás al día — nada pendiente de cobrar.")).toBeInTheDocument();
  });
});
