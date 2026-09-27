import { render, screen, within } from "@testing-library/react";
import InstallAppTab from "./InstallAppTab";

// Pantalla puramente instructiva, sin estado ni ramas condicionales (no hay
// ningún prompt nativo de instalación que disparar — ver comentario en
// InstallAppTab.jsx: iOS Safari no expone beforeinstallprompt). El único
// comportamiento real que puede romperse es que las instrucciones de cada
// plataforma aparezcan completas y en su propia sección, no mezcladas.
describe("InstallAppTab", () => {
  it("muestra las instrucciones de iOS y Android, cada una con sus 4 pasos completos", () => {
    render(<InstallAppTab />);

    const [iosSection, androidSection] = screen.getAllByRole("list");

    expect(within(iosSection).getByText(/Safari/)).toBeInTheDocument();
    expect(within(iosSection).getAllByRole("listitem")).toHaveLength(4);
    expect(within(iosSection).getByText(/Añadir a pantalla de inicio/)).toBeInTheDocument();

    expect(within(androidSection).getByText(/Chrome/)).toBeInTheDocument();
    expect(within(androidSection).getAllByRole("listitem")).toHaveLength(4);
    expect(within(androidSection).getByText(/Instalar app/)).toBeInTheDocument();
  });

  it("muestra la introducción y la nota final sobre el icono", () => {
    render(<InstallAppTab />);

    expect(screen.getByText(/Añade Ocean Flow a la pantalla de inicio/)).toBeInTheDocument();
    expect(screen.getByText(/El icono aparecerá junto al resto de tus apps/)).toBeInTheDocument();
  });
});
