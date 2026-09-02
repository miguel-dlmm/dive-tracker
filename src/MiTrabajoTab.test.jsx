import { render, screen, within, waitFor } from "@testing-library/react";
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
function money(expected) {
  const target = expected.replace(/\s+/g, "");
  return (_content, node) => {
    if (!node) return false;
    const text = (el) => el.textContent.replace(/\s+/g, "");
    return text(node) === target && Array.from(node.children).every((child) => text(child) !== target);
  };
}

function renderMiTrabajo({ worklog = [], comisiones = [], colleaguePayments = [], schools = SCHOOLS } = {}) {
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
