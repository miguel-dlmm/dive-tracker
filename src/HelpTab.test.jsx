import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HelpTab from "./HelpTab";

// Rediseño 2026-08-30 ("de índice a guía viva", ver docs/ADR/0011,
// addendum): Ayuda deja de navegar por pantallas (categorías → artículos
// → detalle) — cada categoría es ahora una ExpandableCard que despliega
// su artículo en el sitio. Se prueba el contrato de despliegue, no el
// contenido exacto de cada artículo (es texto, no lógica).
const navSections = { rows: [] };

// Ayuda persiste la categoría desplegada en sessionStorage
// (oceanpulse:helpOpen, feedback 2026-08-30, segunda vuelta) — sin
// limpiarlo entre pruebas, un test que despliega una categoría deja el
// siguiente `render()` arrancando ya con ella abierta (jsdom comparte un
// único sessionStorage para todo el archivo), igual que en ConfigTab.test.jsx.
beforeEach(() => {
  sessionStorage.clear();
});

describe("HelpTab", () => {
  it("agrupa las categorías en 'Quiero...' y 'Funcionalidades', todas plegadas de entrada", () => {
    render(<HelpTab navSections={navSections} />);

    expect(screen.getByText("Quiero...")).toBeInTheDocument();
    expect(screen.getByText("Funcionalidades")).toBeInTheDocument();
    const miTrabajo = screen.getByRole("button", { name: /Mi trabajo/ });
    expect(miTrabajo).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Pasos")).not.toBeInTheDocument();
  });

  it("tocar una categoría despliega su artículo en el sitio, sin cambiar de pantalla", async () => {
    const user = userEvent.setup();
    render(<HelpTab navSections={navSections} />);

    const miTrabajo = screen.getByRole("button", { name: /Mi trabajo/ });
    await user.click(miTrabajo);

    expect(miTrabajo).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Pasos")).toBeInTheDocument();
    expect(screen.getByText("Resultado esperado")).toBeInTheDocument();
    // Sigue siendo la misma categoría en el mismo sitio — no hay "volver".
    expect(screen.getByText("Quiero...")).toBeInTheDocument();
  });

  it("tocar de nuevo la misma categoría la vuelve a plegar", async () => {
    const user = userEvent.setup();
    render(<HelpTab navSections={navSections} />);

    const miTrabajo = screen.getByRole("button", { name: /Mi trabajo/ });
    await user.click(miTrabajo);
    expect(screen.getByText("Pasos")).toBeInTheDocument();

    await user.click(miTrabajo);
    await waitFor(() => expect(screen.queryByText("Pasos")).not.toBeInTheDocument());
  });

  // Acordeón, no independientes (2026-08-30, segunda vuelta): con varias
  // categorías abiertas a la vez no habría una única "pantalla actual" que
  // persistir en sessionStorage ni un gesto de "atrás" con significado
  // claro (¿cuál de las abiertas colapsaría?) — como mucho una a la vez,
  // igual que el menú con drill-down de Configuración.
  it("desplegar una categoría pliega la que estuviera abierta antes (acordeón)", async () => {
    const user = userEvent.setup();
    render(<HelpTab navSections={navSections} />);

    await user.click(screen.getByRole("button", { name: /Mi trabajo/ }));
    await user.click(screen.getByRole("button", { name: /^Resumen/ }));

    expect(screen.getByRole("button", { name: /Mi trabajo/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /^Resumen/ })).toHaveAttribute("aria-expanded", "true");
  });
});

// Feedback explícito 2026-08-30, segunda vuelta: "recargar → mantener la
// pantalla actual; cerrar con X y reabrir → volver al inicio" — mismo
// criterio que ya tiene Configuración (oceanpulse:configSection). La
// limpieza al cerrar vive en App.jsx (closeSecondary), no aquí — HelpTab
// solo expone `onClose` para que quien lo use decida cuándo llamarlo (el
// botón "X" de la cabecera, y el propio gesto de swipe de más abajo).
describe("HelpTab — la categoría desplegada sobrevive a una recarga", () => {
  it("recargar (unmount+render) mantiene la categoría desplegada", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<HelpTab navSections={navSections} />);
    await user.click(screen.getByRole("button", { name: /Mi trabajo/ }));
    unmount();

    render(<HelpTab navSections={navSections} />);

    expect(screen.getByRole("button", { name: /Mi trabajo/ })).toHaveAttribute("aria-expanded", "true");
  });
});

// Gesto de "atrás" recursivo (mismo criterio que ConfigTab.test.jsx): con
// una categoría desplegada, la colapsa (un nivel atrás, sin cerrar Ayuda);
// sin ninguna desplegada, el mismo gesto cierra Ayuda entera (onClose).
describe("HelpTab — gesto de deslizar hacia la derecha = atrás, recursivo", () => {
  function swipeRight(el) {
    fireEvent.touchStart(el, { touches: [{ clientX: 10, clientY: 100 }] });
    fireEvent.touchEnd(el, { changedTouches: [{ clientX: 120, clientY: 104 }] });
  }

  it("deslizar sin ninguna categoría abierta llama a onClose", () => {
    const onClose = vi.fn();
    const { container } = render(<HelpTab navSections={navSections} onClose={onClose} />);

    swipeRight(container.firstChild);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("deslizar con una categoría abierta la colapsa, sin llamar a onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<HelpTab navSections={navSections} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /Mi trabajo/ }));

    swipeRight(container.firstChild);

    expect(screen.getByRole("button", { name: /Mi trabajo/ })).toHaveAttribute("aria-expanded", "false");
    expect(onClose).not.toHaveBeenCalled();
  });
});
