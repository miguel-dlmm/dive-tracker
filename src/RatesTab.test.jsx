import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RatesTab from "./RatesTab";

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

function renderRatesTab({ rates = rowsHook([]) } = {}) {
  render(
    <RatesTab
      schools={rowsHook([{ name: "PADI Cozumel" }])}
      activities={rowsHook([{ name: "Open Water" }])}
      paymentTypes={emptyHook}
      currencies={rowsHook([{ code: "EUR", symbol: "€", is_default: true }])}
      rates={rates}
      commissionRates={emptyHook}
      worklog={emptyHook}
      comisiones={emptyHook}
    />
  );
  return { rates };
}

describe("RatesTab — alta de tarifa con catálogo de tipos de pago vacío (cuenta nueva)", () => {
  it("permite crear una tarifa aunque payment_types no tenga ninguna fila", async () => {
    const user = userEvent.setup();
    const { rates } = renderRatesTab();

    await user.click(screen.getByRole("button", { name: "Nueva tarifa" }));

    // "Escuela"/"Actividad" también existen como filtro de la lista, fuera
    // de la hoja — con la hoja abierta hay dos: el segundo es el del
    // formulario de alta.
    const [, schoolField] = screen.getAllByRole("button", { name: "Escuela" });
    await user.click(schoolField);
    await user.click(screen.getByRole("option", { name: "PADI Cozumel" }));
    const [, activityField] = screen.getAllByRole("button", { name: "Actividad" });
    await user.click(activityField);
    await user.click(screen.getByRole("option", { name: "Open Water" }));
    await user.type(screen.getByRole("textbox", { name: "Tarifa" }), "25");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(rates.insertRow).toHaveBeenCalledWith(
      expect.objectContaining({ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 25 })
    );
  });
});
