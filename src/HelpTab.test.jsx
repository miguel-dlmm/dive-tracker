import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HelpTab from "./HelpTab";

// Rediseño 2026-08-30 ("de índice a guía viva", ver docs/ADR/0011,
// addendum): Ayuda deja de navegar por pantallas (categorías → artículos
// → detalle) — cada categoría es ahora una ExpandableCard que despliega
// su artículo en el sitio. Se prueba el contrato de despliegue, no el
// contenido exacto de cada artículo (es texto, no lógica). El filtrado
// adminOnly (ver content.js) no tiene hoy ningún artículo real que lo
// ejercite — el manual quedó orientado solo a usuario final tras revisar
// el contenido.
const navSections = { rows: [] };

describe("HelpTab", () => {
  it("agrupa las categorías en 'Quiero...' y 'Funcionalidades', todas plegadas de entrada", () => {
    render(<HelpTab navSections={navSections} profile={null} />);

    expect(screen.getByText("Quiero...")).toBeInTheDocument();
    expect(screen.getByText("Funcionalidades")).toBeInTheDocument();
    const miTrabajo = screen.getByRole("button", { name: /Mi trabajo/ });
    expect(miTrabajo).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Pasos")).not.toBeInTheDocument();
  });

  it("tocar una categoría despliega su artículo en el sitio, sin cambiar de pantalla", async () => {
    const user = userEvent.setup();
    render(<HelpTab navSections={navSections} profile={null} />);

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
    render(<HelpTab navSections={navSections} profile={null} />);

    const miTrabajo = screen.getByRole("button", { name: /Mi trabajo/ });
    await user.click(miTrabajo);
    expect(screen.getByText("Pasos")).toBeInTheDocument();

    await user.click(miTrabajo);
    await waitFor(() => expect(screen.queryByText("Pasos")).not.toBeInTheDocument());
  });

  it("cada categoría se pliega/despliega de forma independiente", async () => {
    const user = userEvent.setup();
    render(<HelpTab navSections={navSections} profile={null} />);

    await user.click(screen.getByRole("button", { name: /Mi trabajo/ }));
    await user.click(screen.getByRole("button", { name: /^Resumen/ }));

    expect(screen.getByRole("button", { name: /Mi trabajo/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /^Resumen/ })).toHaveAttribute("aria-expanded", "true");
  });
});
