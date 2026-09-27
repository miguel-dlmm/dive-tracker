import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingTour from "./OnboardingTour";

// La mecánica del carrusel (swipe, puntos, Atrás/Siguiente, regresión de
// diapositiva duplicada) ya tiene cobertura exhaustiva en
// WhatsNew.test.jsx contra SlideDeck.jsx, compartido por los dos — aquí
// solo se comprueba el contenido y el contrato propios de este tour
// (6 diapositivas reales, empieza en Home y termina en "Empezar por
// aquí").
describe("OnboardingTour", () => {
  it("empieza en la diapositiva de Home y tiene 6 diapositivas en total, terminando en la de 'Empezar por aquí'", async () => {
    const user = userEvent.setup();
    render(<OnboardingTour onClose={vi.fn()} />);

    expect(screen.getByRole("heading")).toHaveTextContent("Tu Home, de un vistazo");

    let guard = 0;
    let count = 1;
    while (screen.queryByRole("button", { name: "Siguiente" }) && guard < 20) {
      await user.click(screen.getByRole("button", { name: "Siguiente" }));
      await waitFor(() => expect(screen.getAllByRole("heading")).toHaveLength(1));
      count += 1;
      guard += 1;
    }

    expect(count).toBe(6);
    expect(screen.getByRole("heading")).toHaveTextContent("Empieza por aquí");
    expect(screen.getByRole("button", { name: "Empezar" })).toBeInTheDocument();
  });

  it("pulsar 'Empezar' en la última diapositiva llama a onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<OnboardingTour onClose={onClose} />);

    let guard = 0;
    while (screen.queryByRole("button", { name: "Siguiente" }) && guard < 20) {
      await user.click(screen.getByRole("button", { name: "Siguiente" }));
      guard += 1;
    }
    await user.click(screen.getByRole("button", { name: "Empezar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
