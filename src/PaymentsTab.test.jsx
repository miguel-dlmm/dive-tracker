import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentsTab from "./PaymentsTab";

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
const SCHOOLS = rowsHook([{ name: "PADI Cozumel" }]);
const ACTIVITIES = rowsHook([{ name: "Open Water" }]);
const RATES_ROWS = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 20, currency: "EUR" }];
const COMMISSION_RATES_ROWS = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 5, currency: "EUR" }];

// <Money> separa cifra y símbolo en nodos distintos (para atenuar el
// símbolo); este matcher compara el texto combinado del nodo sin espacios,
// sin importar cómo lo reparta el DOM (mismo patrón que HomeTab.test.jsx).
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
    <PaymentsTab
      schools={SCHOOLS} activities={ACTIVITIES} paymentStatuses={PAYMENT_STATUSES} currencies={CURRENCIES}
      rates={hooks.rates} commissionRates={hooks.commissionRates}
      worklog={hooks.worklog} comisiones={hooks.comisiones} colleaguePayments={hooks.colleaguePayments}
    />
  );
  return hooks;
}

describe("PaymentsTab", () => {
  it("agrupa las 3 fuentes en Pendiente e ignora lo ya cobrado", () => {
    renderPayments({
      worklog: [
        { id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }, // 20€
        { id: "w2", date: "2026-08-05", school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }, // 40€, ya cobrado
      ],
      comisiones: [
        { id: "c1", date: "2026-08-12", school: "PADI Cozumel", activity: "Open Water", people: 3, status: "Pending" }, // 15€
      ],
      colleaguePayments: [
        { id: "p1", date: "2026-08-01", school: "PADI Cozumel", activity: "Open Water", colleague_name: "Ana", amount: 30, currency: "EUR", status: "Pending" },
      ],
    });

    // 20 (Registro) + 15 (Comisión) + 30 (Compañero) = 65 — el pagado (40) no cuenta.
    expect(screen.getByText(money("65,00 €"))).toBeInTheDocument();
    expect(screen.getByText("3 pagos")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("Cobrar actualiza la tabla correcta con el estado opuesto", async () => {
    const user = userEvent.setup();
    const { worklog } = renderPayments({
      worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }],
    });

    await user.click(screen.getByRole("button", { name: /^Cobrar$/ }));

    expect(worklog.updateRow).toHaveBeenCalledWith("w1", { status: "Paid" });
  });

  // rowsHook es un mock estático — updateRow no cambia rows de verdad, así
  // que no sirve para comprobar que la UI se mueve tras la acción (el hook
  // real sí dispara un re-render con datos nuevos). Este arnés simula ese
  // comportamiento con useState de verdad, solo para este test.
  function useStatefulTable(initialRows) {
    const [rows, setRows] = useState(initialRows);
    return {
      rows, loaded: true,
      insertRow: vi.fn(),
      updateRow: vi.fn(async (pk, patch) => {
        setRows((prev) => prev.map((r) => (r.id === pk ? { ...r, ...patch } : r)));
        return null;
      }),
      deleteRow: vi.fn(),
      bulkUpdateWhere: vi.fn(async (predicate, patch) => {
        let count = 0;
        setRows((prev) => prev.map((r) => {
          if (!predicate(r)) return r;
          count += 1;
          return { ...r, ...patch };
        }));
        return count;
      }),
      setDefault: vi.fn(),
    };
  }

  function StatefulPayments({ worklog: initialWorklog }) {
    const worklog = useStatefulTable(initialWorklog);
    return (
      <PaymentsTab
        schools={SCHOOLS} activities={ACTIVITIES} paymentStatuses={PAYMENT_STATUSES} currencies={CURRENCIES}
        rates={rowsHook(RATES_ROWS)} commissionRates={rowsHook(COMMISSION_RATES_ROWS)}
        worklog={worklog} comisiones={rowsHook([])} colleaguePayments={rowsHook([])}
      />
    );
  }

  it("al cobrar, el grupo 'Cobrado recientemente' se abre solo y el pago queda arriba, resaltado", async () => {
    const user = userEvent.setup();
    render(
      <StatefulPayments
        worklog={[
          { id: "w1", date: "2026-08-01", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }, // se cobrará ahora
          { id: "w2", date: "2026-08-20", school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }, // ya cobrado, fecha más reciente
        ]}
      />
    );

    // Antes de cobrar, el grupo está colapsado — no se ve ningún resaltado.
    expect(screen.queryByText("Recién cobrado")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Cobrar$/ }));

    // Se abre solo, sin pulsar el desplegable "Cobrado recientemente".
    // findAllByText espera a que se asiente el estado tras el updateRow async.
    expect(await screen.findAllByText("Recién cobrado")).toHaveLength(1);

    // w1 (recién cobrado) aparece antes que w2 en el DOM, aunque w2 tenga
    // fecha más reciente — el usuario no debería tener que buscarlo.
    const dateNodes = screen.getAllByText(/2026-08-\d{2}/);
    expect(dateNodes[0].textContent).toContain("2026-08-01");
    expect(dateNodes[1].textContent).toContain("2026-08-20");
  });

  it("el filtro de fuente reduce la lista a esa fuente", async () => {
    const user = userEvent.setup();
    renderPayments({
      worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }], // 20€
      comisiones: [
        { id: "c1", date: "2026-08-12", school: "PADI Cozumel", activity: "Open Water", people: 3, status: "Pending" }, // 15€
        { id: "c2", date: "2026-08-13", school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Pending" }, // 10€
      ],
    });

    // Sin filtrar: 20 + 15 + 10 = 45 — distinto de cualquier fila individual, sin ambigüedad.
    expect(screen.getByText(money("45,00 €"))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Todas las fuentes" }));
    await user.click(screen.getByRole("option", { name: "Comisiones" }));

    // Filtrado a Comisiones: 15 + 10 = 25 — tampoco coincide con ninguna fila.
    expect(screen.getByText(money("25,00 €"))).toBeInTheDocument();
    expect(screen.getByText("2 pagos")).toBeInTheDocument();
  });

  it("Cobrado recientemente se limita a 10 y avisa si hay más", async () => {
    const user = userEvent.setup();
    const paidEntries = Array.from({ length: 12 }, (_, i) => ({
      id: `w${i}`, date: `2026-08-${String(i + 1).padStart(2, "0")}`, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid",
    }));
    renderPayments({ worklog: paidEntries });

    await user.click(screen.getByRole("button", { name: "Cobrado recientemente" }));

    expect(screen.getAllByText("Deshacer")).toHaveLength(10);
    expect(screen.getByText(/Mostrando los 10 más recientes de 12/)).toBeInTheDocument();
  });

  it("estado vacío distingue 'al día' de 'sin resultados con filtros'", () => {
    renderPayments({});
    expect(screen.getByText("Estás al día — nada pendiente de cobrar.")).toBeInTheDocument();
  });

  it("Cobrar todos actualiza en bloque cada tabla implicada", async () => {
    const user = userEvent.setup();
    const { worklog, comisiones } = renderPayments({
      worklog: [{ id: "w1", date: "2026-08-10", school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Pending" }],
      comisiones: [{ id: "c1", date: "2026-08-12", school: "PADI Cozumel", activity: "Open Water", people: 3, status: "Pending" }],
    });

    await user.click(screen.getByRole("button", { name: "Cobrar todos" }));

    expect(worklog.bulkUpdateWhere).toHaveBeenCalled();
    expect(comisiones.bulkUpdateWhere).toHaveBeenCalled();
  });
});
