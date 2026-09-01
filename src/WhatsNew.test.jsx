import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WhatsNew from "./WhatsNew";

// Ver docs/ADR/0010-proceso-de-release.md — cubre el contrato de
// navegación (Siguiente/Atrás/puntos/Empezar), no el contenido exacto de
// cada diapositiva (eso cambia en cada release).
describe("WhatsNew", () => {
  it("empieza en la primera diapositiva y avanza con 'Siguiente'", async () => {
    const user = userEvent.setup();
    render(<WhatsNew onClose={vi.fn()} />);

    const firstTitle = screen.getByRole("heading").textContent;
    expect(screen.queryByRole("button", { name: "Atrás" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("button", { name: "Atrás" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading").textContent).not.toBe(firstTitle));
  });

  it("'Atrás' vuelve a la diapositiva anterior", async () => {
    const user = userEvent.setup();
    render(<WhatsNew onClose={vi.fn()} />);

    const firstTitle = screen.getByRole("heading").textContent;
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(screen.getByRole("heading").textContent).not.toBe(firstTitle));
    await user.click(screen.getByRole("button", { name: "Atrás" }));

    await waitFor(() => expect(screen.getByRole("heading").textContent).toBe(firstTitle));
  });

  it("la última diapositiva muestra 'Empezar', y pulsarlo cierra", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<WhatsNew onClose={onClose} />);

    // Avanza hasta el final sin asumir cuántas diapositivas hay.
    let guard = 0;
    while (screen.queryByRole("button", { name: "Siguiente" }) && guard < 20) {
      await user.click(screen.getByRole("button", { name: "Siguiente" }));
      guard += 1;
    }

    const finishBtn = screen.getByRole("button", { name: "Empezar" });
    await user.click(finishBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("el botón 'Cerrar' cierra en cualquier diapositiva", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<WhatsNew onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
