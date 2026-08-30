import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RatesTab from "./RatesTab";
import { TEAL, SUN } from "./colors";

// Regresión del incidente: una cuenta recién creada nace con payment_types
// vacío (clone_setup_dataset no lo siembra — ver docs/ADR/0003) y hasta el
// workaround de RatesTab.jsx/WorkLogTab.jsx/ComisionesTab.jsx, eso dejaba
// form.payment_type en "" y bloqueaba el guardado de cualquier tarifa nueva,
// aunque ningún formulario expone (ni expondrá) un selector para ese campo.
const rowsHook = (rows) => ({
  rows, loaded: true,
  insertRow: vi.fn().mockResolvedValue(rows[0]),
  updateRow: vi.fn(), deleteRow: vi.fn(), bulkUpdateWhere: vi.fn(), setDefault: vi.fn(),
});
const emptyHook = rowsHook([]);

function renderRatesTab({ rates = rowsHook([]), commissionRates = emptyHook, activities, schools } = {}) {
  render(
    <RatesTab
      schools={schools || rowsHook([{ name: "PADI Cozumel" }])}
      activities={activities || rowsHook([{ name: "Open Water" }])}
      paymentTypes={emptyHook}
      currencies={rowsHook([{ code: "EUR", symbol: "€", is_default: true }])}
      rates={rates}
      commissionRates={commissionRates}
      worklog={emptyHook}
      comisiones={emptyHook}
    />
  );
  return { rates, commissionRates };
}

describe("RatesTab — alta de tarifa con catálogo de tipos de pago vacío (cuenta nueva)", () => {
  it("permite crear una tarifa aunque payment_types no tenga ninguna fila", async () => {
    const user = userEvent.setup();
    const { rates } = renderRatesTab();

    await user.click(screen.getByRole("button", { name: "Nueva tarifa" }));

    // El filtro "Escuela"/"Curso" de la lista vive detrás de "Filtrar",
    // colapsado por defecto (ver filtersOpen) — con la hoja abierta y los
    // filtros cerrados, solo existe un "Escuela"/"Curso": el del formulario.
    await user.click(screen.getByRole("button", { name: "Escuela" }));
    await user.click(screen.getByRole("option", { name: "PADI Cozumel" }));
    await user.click(screen.getByRole("button", { name: "Curso" }));
    await user.click(screen.getByRole("option", { name: "Open Water" }));
    await user.type(screen.getByRole("textbox", { name: "Tarifa" }), "25");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(rates.insertRow).toHaveBeenCalledWith(
      expect.objectContaining({ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 25 })
    );
  });
});

// "Editar" (menú "⋯") abre la MISMA hoja que "Nueva tarifa", ya
// precargada — coherencia con Mi trabajo (MovementSheet), no un
// formulario en línea aparte. Ver docs/ADR/0012, addendum 2026-08-29.
describe("RatesTab — editar abre la hoja de creación, precargada", () => {
  it("pulsar Editar abre la hoja con los valores de la tarifa, y Guardar llama a updateRow", async () => {
    const user = userEvent.setup();
    const { rates } = renderRatesTab({
      rates: rowsHook([{ id: "r1", school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", currency: "EUR", rate: 20 }]),
    });

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));

    expect(screen.getByText("Editar tarifa de PADI Cozumel - Open Water")).toBeInTheDocument();
    const rateInput = screen.getByRole("textbox", { name: "Tarifa" });
    expect(rateInput).toHaveValue("20,00");

    await user.clear(rateInput);
    await user.type(rateInput, "30");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(rates.updateRow).toHaveBeenCalledWith("r1", expect.objectContaining({ rate: 30 }));
  });
});

// Rediseño 2026-08-30: rates y commission_rates (dos tablas reales, sin
// cambios de modelo) se combinan en UNA sola lista de presentación, con el
// mismo lenguaje visual que Mi trabajo (acento de color por tipo a la
// izquierda) en vez de dos pestañas de página separadas.
describe("RatesTab — lista combinada de Curso y Comisión", () => {
  it("muestra tarifas de ambos tipos a la vez, con acento de color distinto por tipo", () => {
    renderRatesTab({
      activities: rowsHook([{ name: "Open Water" }, { name: "Advanced" }]),
      rates: rowsHook([{ id: "r1", school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", currency: "EUR", rate: 20 }]),
      commissionRates: rowsHook([{ id: "c1", school: "PADI Cozumel", activity: "Advanced", payment_type: "Per Person", currency: "EUR", rate: 15 }]),
    });

    expect(screen.getByText("Open Water")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();

    const cursoRow = screen.getByText("Open Water").closest("div.border-l-4");
    const comisionRow = screen.getByText("Advanced").closest("div.border-l-4");
    expect(cursoRow).toHaveStyle({ borderColor: TEAL });
    expect(comisionRow).toHaveStyle({ borderColor: SUN });
  });

  it("el filtro 'Tipo' (dentro de Filtrar) acota la lista combinada a un solo tipo", async () => {
    const user = userEvent.setup();
    renderRatesTab({
      activities: rowsHook([{ name: "Open Water" }, { name: "Advanced" }]),
      rates: rowsHook([{ id: "r1", school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", currency: "EUR", rate: 20 }]),
      commissionRates: rowsHook([{ id: "c1", school: "PADI Cozumel", activity: "Advanced", payment_type: "Per Person", currency: "EUR", rate: 15 }]),
    });

    await user.click(screen.getByRole("button", { name: "Filtrar" }));
    await user.click(screen.getByRole("button", { name: "Tipo" }));
    await user.click(screen.getByRole("option", { name: "Comisión" }));

    expect(screen.queryByText("Open Water")).not.toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
  });

  it("cambiar de tipo en la propia hoja de creación guarda en la tabla correcta (Comisión -> commissionRates)", async () => {
    const user = userEvent.setup();
    const { commissionRates } = renderRatesTab({
      activities: rowsHook([{ name: "Open Water" }]),
    });

    await user.click(screen.getByRole("button", { name: "Nueva tarifa" }));
    await user.click(screen.getByRole("tab", { name: /Comisión/ }));
    await user.click(screen.getByRole("button", { name: "Escuela" }));
    await user.click(screen.getByRole("option", { name: "PADI Cozumel" }));
    await user.click(screen.getByRole("button", { name: "Curso" }));
    await user.click(screen.getByRole("option", { name: "Open Water" }));
    await user.type(screen.getByRole("textbox", { name: "Tarifa" }), "10");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(commissionRates.insertRow).toHaveBeenCalledWith(
      expect.objectContaining({ school: "PADI Cozumel", activity: "Open Water", rate: 10 })
    );
  });
});

// Reducción de complejidad (2026-08-30): filtrar por escuela cuando solo
// existe una no filtra nada — el control desaparece hasta que exista una
// segunda escuela configurada.
describe("RatesTab — filtro de Escuela, solo con más de una escuela", () => {
  it("no muestra el filtro 'Escuela' con una sola escuela configurada", async () => {
    const user = userEvent.setup();
    renderRatesTab({});
    await user.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(screen.queryByText("Escuela")).not.toBeInTheDocument();
  });

  it("muestra el filtro 'Escuela' en cuanto hay una segunda escuela", async () => {
    const user = userEvent.setup();
    renderRatesTab({ schools: rowsHook([{ name: "PADI Cozumel" }, { name: "Ihasia" }]) });
    await user.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(screen.getByText("Escuela")).toBeInTheDocument();
  });
});

// Feedback explícito 2026-08-30: fecha de creación visible ("Alta: fecha",
// mismo criterio que Usuarios), listado ordenado por más reciente primero,
// subcabecera de Comisión simplificada, y "per person" fuera del frontal
// (ni en la línea de la card ni como filtro — payment_type vale siempre
// "Per Person" en la práctica, ver ADR-0003, así que filtrar por él nunca
// tuvo ningún efecto real).
describe("RatesTab — fecha de alta, orden por más reciente, y sin 'per person' en el frontal", () => {
  it("muestra 'Alta: <fecha>' en vez de 'Curso · Per Person', y ordena por creación descendente", () => {
    renderRatesTab({
      rates: rowsHook([
        { id: "r1", school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", currency: "EUR", rate: 20, created_at: "2026-08-01T00:00:00Z" },
        { id: "r2", school: "PADI Cozumel", activity: "Advanced", payment_type: "Per Person", currency: "EUR", rate: 30, created_at: "2026-08-15T00:00:00Z" },
      ]),
      activities: rowsHook([{ name: "Open Water" }, { name: "Advanced" }]),
    });

    expect(screen.queryByText(/Per Person/)).not.toBeInTheDocument();
    const dates = screen.getAllByText(/^Alta: /).map((el) => el.textContent);
    expect(dates).toEqual(["Alta: 15/8/2026", "Alta: 1/8/2026"]); // más reciente (r2) primero
  });

  it("la subcabecera de Comisión, al crear, dice solo 'Lo que cobras por traer a un cliente.'", async () => {
    const user = userEvent.setup();
    renderRatesTab({});
    await user.click(screen.getByRole("button", { name: "Nueva tarifa" }));
    await user.click(screen.getByRole("tab", { name: /Comisión/ }));
    expect(screen.getByText("Lo que cobras por traer a un cliente.")).toBeInTheDocument();
  });

  it("no existe ningún filtro 'Pago' (payment_type no tiene ningún efecto real de filtrado)", async () => {
    const user = userEvent.setup();
    renderRatesTab({});
    await user.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(screen.queryByText("Pago")).not.toBeInTheDocument();
  });
});
