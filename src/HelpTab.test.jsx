import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HelpTab from "./HelpTab";

// Navegación categorías → artículos → detalle → volver. No se prueba el
// contenido exacto de cada artículo (es texto, no lógica) — solo el
// comportamiento de navegación. El filtrado adminOnly (ver content.js)
// no tiene hoy ningún artículo real que lo ejercite — el manual quedó
// orientado solo a usuario final tras revisar el contenido.
const navSections = { rows: [] };

describe("HelpTab", () => {
  it("navega de categorías a la lista de artículos y de vuelta", async () => {
    const user = userEvent.setup();
    render(<HelpTab navSections={navSections} profile={null} />);

    expect(screen.getByText("Registro")).toBeInTheDocument();
    await user.click(screen.getByText("Registro"));

    expect(screen.getByText("Registrar una nueva actividad")).toBeInTheDocument();

    await user.click(screen.getByText("Categorías"));
    expect(screen.getByText("Registro")).toBeInTheDocument();
  });

  it("abre un artículo y muestra sus pasos y resultado esperado", async () => {
    const user = userEvent.setup();
    render(<HelpTab navSections={navSections} profile={null} />);

    await user.click(screen.getByText("Registro"));
    await user.click(screen.getByText("Registrar una nueva actividad"));

    expect(screen.getByText("Pasos")).toBeInTheDocument();
    expect(screen.getByText("Resultado esperado")).toBeInTheDocument();
  });
});
