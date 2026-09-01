import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PendingCollectionCard from "./PendingCollectionCard";

// onQuickAdd es opcional (solo lo pasa Home, ver ADR-0005 addendum): estas
// pruebas cubren que Mi trabajo (que no lo pasa) mantiene exactamente su
// comportamiento actual, y que en Home el botón "+" no dispara además
// onPress (evita navegar dos veces / a Pagos por accidente al añadir).
const BASE_PROPS = { totals: { EUR: 20 }, count: 1, currencyRows: [{ code: "EUR", symbol: "€" }], color: "#000" };

describe("PendingCollectionCard — onQuickAdd", () => {
  it("no renderiza el botón «+» cuando no se pasa onQuickAdd (uso actual de Mi trabajo)", () => {
    render(<PendingCollectionCard {...BASE_PROPS} />);
    expect(screen.queryByLabelText("Añadir movimiento")).not.toBeInTheDocument();
  });

  it("renderiza el botón «+» y lo invoca al pulsarlo, sin disparar onPress", async () => {
    const onQuickAdd = vi.fn();
    const onPress = vi.fn();
    render(<PendingCollectionCard {...BASE_PROPS} onPress={onPress} onQuickAdd={onQuickAdd} />);

    await userEvent.click(screen.getByLabelText("Añadir movimiento"));

    expect(onQuickAdd).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("pulsar el resto de la tarjeta sigue disparando onPress con onQuickAdd presente", async () => {
    const onQuickAdd = vi.fn();
    const onPress = vi.fn();
    render(<PendingCollectionCard {...BASE_PROPS} onPress={onPress} onQuickAdd={onQuickAdd} />);

    await userEvent.click(screen.getByText("Pendiente de cobrar"));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onQuickAdd).not.toHaveBeenCalled();
  });
});
