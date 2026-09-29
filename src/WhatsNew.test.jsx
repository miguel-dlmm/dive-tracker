import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WhatsNew from "./WhatsNew";

// La mecánica genérica del carrusel (Siguiente/Atrás/puntos/swipe/Empezar)
// vive en SlideDeck.test.jsx, contra datos de prueba propios — no aquí.
// Estos tests cubren solo lo específico de WhatsNew: que renderiza el
// contenido real (notices.json→whatsNew.slides) sin reventar, y que
// "Empezar"/"Cerrar" funcionan sea cual sea el número real de
// diapositivas de la release vigente (2026-09-28: pasó de 5 a 1 sola).
describe("WhatsNew", () => {
  // Regresión real (2026-09-28): SLIDE_ICONS (WhatsNew.jsx) se quedó con
  // 5 entradas de una release anterior mientras notices.json ya solo
  // tenía 1 diapositiva real — el carrusel mostraba 5 puntos y diapositivas
  // 2-5 sin título ni cuerpo. Blindaje: el número de encabezados/puntos
  // visibles en total (avanzando hasta el final) debe coincidir con el
  // número de diapositivas reales del contenido i18n.
  it("todas las diapositivas tienen título y cuerpo reales (ninguna queda vacía por desajuste con SLIDE_ICONS)", async () => {
    const user = userEvent.setup();
    render(<WhatsNew onClose={vi.fn()} />);

    let guard = 0;
    while (true) {
      const heading = screen.getByRole("heading");
      expect(heading.textContent).toBeTruthy();
      expect(heading.textContent).not.toMatch(/undefined/);
      const nextBtn = screen.queryByRole("button", { name: "Siguiente" });
      if (!nextBtn || guard >= 20) break;
      await user.click(nextBtn);
      guard += 1;
    }
    expect(screen.getByRole("button", { name: "Empezar" })).toBeInTheDocument();
  });

  it("la última diapositiva muestra 'Empezar', y pulsarlo cierra", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<WhatsNew onClose={onClose} />);

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
