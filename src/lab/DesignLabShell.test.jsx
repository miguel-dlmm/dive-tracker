import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DesignLabShell from "./DesignLabShell";

// Cubre el laboratorio visual aislado: cambio de diseño, y que el Diseño 4
// (único con arquitectura de navegación distinta, 4 destinos con "Dinero"
// agrupando Comisiones+Pagos) se navega correctamente. No hay Supabase ni
// hooks de datos que mockear — src/lab/ no depende de ninguno.

describe("DesignLabShell", () => {
  it("arranca en Diseño actual con navegación de 5 destinos", () => {
    render(<DesignLabShell onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Diseño actual", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comisiones" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagos" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dinero" })).not.toBeInTheDocument();
  });

  it("al elegir el Diseño 4, la barra inferior pasa a 4 destinos y agrupa Dinero", async () => {
    const user = userEvent.setup();
    render(<DesignLabShell onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Diseño 4 — Ocean Pulse Next" }));

    expect(screen.queryByRole("button", { name: "Comisiones" })).not.toBeInTheDocument();
    const dineroButton = screen.getByRole("button", { name: "Dinero" });
    expect(dineroButton).toBeInTheDocument();

    await user.click(dineroButton);

    // Sub-selector interno de Dinero: Comisiones / Pagos.
    expect(screen.getByRole("heading", { name: "Comisiones" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pagos" }));
    expect(screen.getByRole("heading", { name: "Pagos" })).toBeInTheDocument();
  });

  it("cambiar de pantalla dentro del laboratorio no llama a onClose ni desmonta el overlay", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<DesignLabShell onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Registro" }));
    expect(screen.getByText("Registro de trabajo")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("el botón de cerrar invoca onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<DesignLabShell onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Cerrar laboratorio" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
