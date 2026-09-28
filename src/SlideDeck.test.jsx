import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileDown } from "lucide-react";
import SlideDeck from "./SlideDeck";

// Mecánica genérica del carrusel (Siguiente/Atrás/puntos/swipe/Empezar),
// con slides de prueba fijas — no el contenido real de ningún consumidor
// (WhatsNew.jsx, OnboardingTour.jsx). Extraído de WhatsNew.test.jsx
// (2026-09-28, bug real: esos tests asumían silenciosamente que el
// WhatsNew real de producción siempre tendría 2+ diapositivas para poder
// pulsar "Siguiente"; dejaron de pasar en cuanto una release trajo una
// única diapositiva real — el propio contrato de "una única slide" es
// válido y ya se había usado antes). Aislar la mecánica aquí, contra
// datos de prueba propios, hace que esta cobertura no dependa nunca más
// de cuántas diapositivas tenga el contenido real vigente.
const LABELS = { eyebrow: "Eyebrow", close: "Cerrar", back: "Atrás", next: "Siguiente", start: "Empezar", slideTablist: "Diapositiva" };
const SLIDES = [
  { icon: FileDown, color: "#146A96", title: "Diapositiva uno", body: "Cuerpo uno" },
  { icon: FileDown, color: "#146A96", title: "Diapositiva dos", body: "Cuerpo dos" },
  { icon: FileDown, color: "#146A96", title: "Diapositiva tres", body: "Cuerpo tres" },
];

function swipe(dx) {
  const el = screen.getByTestId("test-slide");
  fireEvent.touchStart(el, { touches: [{ clientX: 200, clientY: 100 }] });
  fireEvent.touchEnd(el, { changedTouches: [{ clientX: 200 + dx, clientY: 100 }] });
}

describe("SlideDeck", () => {
  it("empieza en la primera diapositiva y avanza con 'Siguiente'", async () => {
    const user = userEvent.setup();
    render(<SlideDeck slides={SLIDES} onClose={vi.fn()} labels={LABELS} testId="test-slide" />);

    expect(screen.getByText("Diapositiva uno")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Atrás" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("button", { name: "Atrás" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Diapositiva dos")).toBeInTheDocument());
  });

  it("deslizar hacia la izquierda avanza a la siguiente diapositiva (gesto táctil real)", async () => {
    render(<SlideDeck slides={SLIDES} onClose={vi.fn()} labels={LABELS} testId="test-slide" />);
    swipe(-150);
    await waitFor(() => expect(screen.getByText("Diapositiva dos")).toBeInTheDocument());
  });

  it("deslizar hacia la derecha vuelve a la diapositiva anterior (gesto táctil real)", async () => {
    render(<SlideDeck slides={SLIDES} onClose={vi.fn()} labels={LABELS} testId="test-slide" />);
    swipe(-150);
    await waitFor(() => expect(screen.getByText("Diapositiva dos")).toBeInTheDocument());
    swipe(150);
    await waitFor(() => expect(screen.getByText("Diapositiva uno")).toBeInTheDocument());
  });

  it("tras avanzar dos veces, no quedan dos headings permanentemente en el DOM (no reaparece el bug de la diapositiva duplicada)", async () => {
    const user = userEvent.setup();
    render(<SlideDeck slides={SLIDES} onClose={vi.fn()} labels={LABELS} testId="test-slide" />);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(screen.getAllByRole("heading")).toHaveLength(1));

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(screen.getAllByRole("heading")).toHaveLength(1));
  });

  it("'Atrás' vuelve a la diapositiva anterior", async () => {
    const user = userEvent.setup();
    render(<SlideDeck slides={SLIDES} onClose={vi.fn()} labels={LABELS} testId="test-slide" />);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(screen.getByText("Diapositiva dos")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Atrás" }));

    await waitFor(() => expect(screen.getByText("Diapositiva uno")).toBeInTheDocument());
  });

  it("la última diapositiva muestra 'Empezar', y pulsarlo cierra", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SlideDeck slides={SLIDES} onClose={onClose} labels={LABELS} testId="test-slide" />);

    let guard = 0;
    while (screen.queryByRole("button", { name: "Siguiente" }) && guard < 20) {
      await user.click(screen.getByRole("button", { name: "Siguiente" }));
      guard += 1;
    }

    await user.click(screen.getByRole("button", { name: "Empezar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("con una única diapositiva, no hay 'Atrás' ni 'Siguiente' — el botón único ya dice 'Empezar'", () => {
    render(<SlideDeck slides={[SLIDES[0]]} onClose={vi.fn()} labels={LABELS} testId="test-slide" />);

    expect(screen.queryByRole("button", { name: "Atrás" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Siguiente" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Empezar" })).toBeInTheDocument();
  });

  it("el botón 'Cerrar' cierra en cualquier diapositiva", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SlideDeck slides={SLIDES} onClose={onClose} labels={LABELS} testId="test-slide" />);

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
