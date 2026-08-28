import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SummaryTab from "./SummaryTab";

// Rediseño 2026-08-29 (ver docs/ADR/0009-rediseno-resumen.md): la tarjeta
// principal (HeroTotal, con comparación al periodo anterior) y las
// tarjetas plegables (Por escuela con drill-down inline, Por curso,
// Calendario, Comisiones, Pagos de compañeros) son el contrato nuevo de
// esta pantalla — estas pruebas cubren ese contrato de comportamiento, no
// cada combinación de granularidad/fuente.
const rowsHook = (rows) => ({ rows, loaded: true, insertRow: vi.fn(), updateRow: vi.fn(), deleteRow: vi.fn(), bulkUpdateWhere: vi.fn(), setDefault: vi.fn() });

const NOW = new Date();
const THIS_MONTH = new Date(NOW.getFullYear(), NOW.getMonth(), 10).toISOString().slice(0, 10);
const LAST_MONTH = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 10).toISOString().slice(0, 10);

const CURRENCIES = rowsHook([{ code: "EUR", symbol: "€", is_default: true }]);
const RATES = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 50, currency: "EUR" }];

function renderSummary({ worklog = [], comisiones = [], colleaguePayments = [] } = {}) {
  render(
    <SummaryTab
      worklog={rowsHook(worklog)}
      comisiones={rowsHook(comisiones)}
      commissionRates={rowsHook(RATES)}
      rates={rowsHook(RATES)}
      activities={rowsHook([{ name: "Open Water" }])}
      schools={rowsHook([{ name: "PADI Cozumel" }, { name: "Ihasia" }])}
      currencies={CURRENCIES}
      colleaguePayments={rowsHook(colleaguePayments)}
    />
  );
}

describe("SummaryTab — tarjeta principal", () => {
  it("muestra el total del periodo y la comparación con el periodo anterior", () => {
    renderSummary({
      worklog: [
        { id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }, // 100€ este mes
        { id: "w2", date: LAST_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }, // 50€ mes anterior
      ],
    });

    const hero = within(screen.getByText(/Total combinado/).closest("div").parentElement);
    expect(hero.getByText(/100,00\s*€/)).toBeInTheDocument();
    expect(hero.getByText(/vs periodo anterior/)).toBeInTheDocument();
  });

  it("sin datos en el periodo anterior, no fuerza una comparación (delta indefinido, división por 0 evitada)", () => {
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });
    // Sin periodo anterior con datos, previousTotal es {} (0 monedas) — no
    // es comparable (singleCurrencyAmount devuelve null), así que no debe
    // haber línea de comparación.
    expect(screen.queryByText(/vs periodo anterior/)).not.toBeInTheDocument();
  });
});

describe("SummaryTab — tarjetas plegables", () => {
  it("Por escuela empieza abierta; Comisiones/Calendario/Pagos de compañeros empiezan cerradas", () => {
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    // "Por escuela" abierta de entrada: la fila "PADI Cozumel" ya es visible.
    expect(screen.getByText("PADI Cozumel")).toBeInTheDocument();

    // El resto empieza colapsado: su botón de cabecera existe (aria-expanded=false).
    expect(screen.getByRole("button", { name: /Comisiones/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /Calendario/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /Pagos de compañeros/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("tocar una escuela en 'Por escuela' expande su desglose por curso en el sitio", async () => {
    const user = userEvent.setup();
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    expect(screen.queryByText("Sin cursos en este periodo.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /PADI Cozumel/ }));

    // Al expandir PADI Cozumel aparece su desglose por curso — "Open Water"
    // pasa a aparecer dos veces: como fila de "Por curso" (tarjeta aparte,
    // sigue colapsada) no debería estar, pero si estuviera abierta contaría
    // igual — aquí solo comprobamos que el desglose expandido aporta el
    // texto esperado dentro de la lista de escuelas.
    expect(screen.getAllByText("Open Water").length).toBeGreaterThan(0);
  });

  it("tocar 'Comisiones' la despliega y muestra su desglose", async () => {
    const user = userEvent.setup();
    renderSummary({
      comisiones: [{ id: "c1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    const comisionesBtn = screen.getByRole("button", { name: /Comisiones/ });
    await user.click(comisionesBtn);

    expect(comisionesBtn).toHaveAttribute("aria-expanded", "true");
    expect(within(comisionesBtn.closest("div").parentElement).getAllByText("PADI Cozumel").length).toBeGreaterThan(0);
  });
});
