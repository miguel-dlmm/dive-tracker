import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HelpTab from "./HelpTab";

// Navegación categorías → artículos → detalle → volver, y el filtrado de
// contenido adminOnly (ver "Gestionar quién tiene acceso a la app" en
// help/content.js). No se prueba el contenido exacto de cada artículo
// (es texto, no lógica) — solo el comportamiento de navegación y permisos.
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

  it("oculta el contenido adminOnly a un perfil sin permisos de admin", async () => {
    const user = userEvent.setup();
    render(<HelpTab navSections={navSections} profile={{ is_admin: false, is_superadmin: false }} />);

    await user.click(screen.getByText("Configuración"));
    expect(screen.queryByText("Gestionar quién tiene acceso a la app")).not.toBeInTheDocument();
  });

  it("muestra el contenido adminOnly a un perfil admin", async () => {
    const user = userEvent.setup();
    render(<HelpTab navSections={navSections} profile={{ is_admin: true, is_superadmin: false }} />);

    await user.click(screen.getByText("Configuración"));
    expect(screen.getByText("Gestionar quién tiene acceso a la app")).toBeInTheDocument();
  });
});
