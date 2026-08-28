import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MiTrabajoTab from "./MiTrabajoTab";
import { ToastProvider } from "./shared";

const rowsHook = (rows) => ({
  rows, loaded: true,
  insertRow: vi.fn().mockResolvedValue(rows[0]),
  updateRow: vi.fn().mockResolvedValue(rows[0]),
  deleteRow: vi.fn().mockResolvedValue(),
  bulkUpdateWhere: vi.fn().mockImplementation(async (predicate) => rows.filter(predicate).length),
  setDefault: vi.fn(),
});

const SCHOOLS = rowsHook([{ name: "PADI Cozumel", is_default: true }]);
const ACTIVITIES = rowsHook([{ name: "Open Water", is_default: true }]);
const PAYMENT_TYPES = rowsHook([{ name: "Per Person", is_default: true }]);
const PAYMENT_STATUSES = rowsHook([{ name: "Pending", is_default: true }, { name: "Paid", is_default: false }]);
const CURRENCIES = rowsHook([{ code: "EUR", symbol: "€", name: "Euro", is_default: true }]);
const RATES_ROWS = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 20, currency: "EUR" }];
const COMMISSION_RATES_ROWS = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 5, currency: "EUR" }];

// <Money> separa cifra y símbolo en nodos distintos; este matcher compara
// el texto combinado del nodo sin espacios (ver PaymentsTab.test.jsx).
function money(expected) {
  const target = expected.replace(/\s+/g, "");
  return (_content, node) => {
    if (!node) return false;
    const text = (el) => el.textContent.replace(/\s+/g, "");
    return text(node) === target && Array.from(node.children).every((child) => text(child) !== target);
  };
}

function renderMiTrabajo({ worklog = [], comisiones = [], colleaguePayments = [] } = {}) {
  const hooks = {
    worklog: rowsHook(worklog),
    comisiones: rowsHook(comisiones),
    colleaguePayments: rowsHook(colleaguePayments),
    rates: rowsHook(RATES_ROWS),
    commissionRates: rowsHook(COMMISSION_RATES_ROWS),
  };
  render(
    <ToastProvider>
      <MiTrabajoTab
        schools={SCHOOLS} activities={ACTIVITIES} paymentTypes={PAYMENT_TYPES} paymentStatuses={PAYMENT_STATUSES} currencies={CURRENCIES}
        rates={hooks.rates} commissionRates={hooks.commissionRates}
        worklog={hooks.worklog} comisiones={hooks.comisiones} colleaguePayments={hooks.colleaguePayments}
      />
    </ToastProvider>
  );
  return hooks;
}

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
  it("por defecto muestra los pendientes de los 3 tipos, con la cabecera limitada a lo que te deben (sin el ajuste negativo)", () => {
    renderMiTrabajo(mixedDataset());

    expect(screen.getByRole("button", { name: "Pendientes · 3" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(money("30,00 €"))).toBeInTheDocument(); // cabecera: 20 (curso) + 10 (comisión), sin el ajuste
    expect(screen.getByText(money("20,00 €"))).toBeInTheDocument();
    expect(screen.getByText(money("10,00 €"))).toBeInTheDocument();
    expect(screen.getByText(money("15,00 €"))).toBeInTheDocument(); // el ajuste sí aparece en la lista
    expect(screen.getByText("con Ana", { exact: false })).toBeInTheDocument();
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

  it("Confirmar cobro actualiza la tabla correspondiente al tipo de la fila", async () => {
    const user = userEvent.setup();
    const { worklog, comisiones } = renderMiTrabajo(mixedDataset());

    const [cursoBtn] = screen.getAllByRole("button", { name: /^Confirmar cobro$/ });
    await user.click(cursoBtn);

    expect(worklog.updateRow).toHaveBeenCalledWith("w1", { status: "Paid" });
    expect(comisiones.updateRow).not.toHaveBeenCalled();
  });

  it("elimina la fila correcta desde el menú '⋯'", async () => {
    // Pendientes se ordena de más antiguo a más reciente: curso, comisión, ajuste.
    const user = userEvent.setup();
    const { colleaguePayments } = renderMiTrabajo(mixedDataset());

    await user.click(screen.getAllByLabelText("Más acciones")[2]);
    await user.click(screen.getByRole("menuitem", { name: /Eliminar/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

    expect(colleaguePayments.deleteRow).toHaveBeenCalledWith("p1");
  });

  it("edición en línea guarda los cambios en la tabla del curso, desde el menú '⋯'", async () => {
    const user = userEvent.setup();
    const { worklog } = renderMiTrabajo(mixedDataset());

    await user.click(screen.getAllByLabelText("Más acciones")[0]);
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));
    const notesInput = screen.getByPlaceholderText("Notas");
    await user.type(notesInput, "Grupo grande");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(worklog.updateRow).toHaveBeenCalledWith("w1", expect.objectContaining({ notes: "Grupo grande" }));
  });

  it("el FAB crea una comisión nueva a través del selector de tipo", async () => {
    const user = userEvent.setup();
    const { comisiones } = renderMiTrabajo({});

    await user.click(screen.getByRole("button", { name: "Añadir" }));
    await user.click(screen.getByRole("button", { name: /Comisión/ }));
    const peopleInput = screen.getByRole("spinbutton");
    await user.clear(peopleInput);
    await user.type(peopleInput, "2");
    await user.click(screen.getByRole("button", { name: /^Guardar$/ }));

    expect(comisiones.insertRow).toHaveBeenCalledWith(expect.objectContaining({
      school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Pending",
    }));
  });
});
