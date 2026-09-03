import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AcceptLegalScreen from "./AcceptLegalScreen";

// El título de cada documento ya no es una constante importable (Release
// V1, Fase 2 — multidioma): vive en i18n/locales/*/auth.json. El idioma
// por defecto en tests es "es" (ver vitest.setup.js), así que se hardcodea
// aquí igual que el resto de textos en español de este archivo.
const PRIVACY_TITLE = "Política de Privacidad";
const TERMS_TITLE = "Términos de Uso";

describe("AcceptLegalScreen", () => {
  it("mantiene el botón deshabilitado hasta marcar la casilla", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AcceptLegalScreen onSubmit={onSubmit} />);

    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: /continuar/i })).toBeEnabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit al aceptar y enviar", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    render(<AcceptLegalScreen onSubmit={onSubmit} />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(onSubmit).toHaveBeenCalled();
  });

  it("muestra un mensaje amigable si onSubmit lanza", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    render(<AcceptLegalScreen onSubmit={onSubmit} />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
  });

  it("abre el visor de la Política de Privacidad al pulsar su enlace", async () => {
    const user = userEvent.setup();
    render(<AcceptLegalScreen onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: PRIVACY_TITLE }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("abre el visor de los Términos de Uso al pulsar su enlace", async () => {
    const user = userEvent.setup();
    render(<AcceptLegalScreen onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: TERMS_TITLE }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
