import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatePasswordScreen from "./CreatePasswordScreen";

// El título de cada documento ya no es una constante importable (Release
// V1, Fase 2 — multidioma): vive en i18n/locales/*/auth.json. El idioma
// por defecto en tests es "es" (ver vitest.setup.js), así que se hardcodea
// aquí igual que el resto de textos en español de este archivo.
const PRIVACY_TITLE = "Política de Privacidad";
const TERMS_TITLE = "Términos de Uso";

async function fillPasswords(user, { password, confirm }) {
  await user.type(screen.getByLabelText("Nueva contraseña"), password);
  await user.type(screen.getByLabelText("Confirmar contraseña"), confirm);
}

async function fillAndSubmit(user, { password, confirm }) {
  await fillPasswords(user, { password, confirm });
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: /crear contraseña/i }));
}

describe("CreatePasswordScreen", () => {
  it("mantiene el botón deshabilitado si la contraseña es demasiado corta", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "1234567", confirm: "1234567" });
    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: /crear contraseña/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mantiene el botón deshabilitado si la contraseña no tiene ninguna mayúscula", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "password123!", confirm: "password123!" });
    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: /crear contraseña/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mantiene el botón deshabilitado si la contraseña no tiene ningún símbolo", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "Password123", confirm: "Password123" });
    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: /crear contraseña/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mantiene el botón deshabilitado si las contraseñas no coinciden", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "Password123!", confirm: "Password124!" });
    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: /crear contraseña/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mantiene el botón deshabilitado si no se acepta el consentimiento legal", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "Password123!", confirm: "Password123!" });

    expect(screen.getByRole("button", { name: /crear contraseña/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit con la contraseña cuando pasa las validaciones y se acepta el consentimiento", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "Password123!", confirm: "Password123!" });

    expect(onSubmit).toHaveBeenCalledWith("Password123!");
  });

  it("muestra el mensaje de onSubmit tal cual cuando lanza (contrato de activateAccount)", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Este enlace ya no es válido."));
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "Password123!", confirm: "Password123!" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Este enlace ya no es válido.");
  });

  it("usa un mensaje genérico de respaldo si onSubmit lanza un error sin mensaje", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error());
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "Password123!", confirm: "Password123!" });

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
  });

  it("deshabilita el botón mientras onSubmit está en curso, evitando doble envío", async () => {
    let resolveSubmit;
    const onSubmit = vi.fn(() => new Promise((resolve) => { resolveSubmit = resolve; }));
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "Password123!", confirm: "Password123!" });

    const button = screen.getByRole("button", { name: /crear contraseña/i });
    expect(button).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolveSubmit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("abre el visor de la Política de Privacidad al pulsar su enlace", async () => {
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: PRIVACY_TITLE }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("abre el visor de los Términos de Uso al pulsar su enlace", async () => {
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: TERMS_TITLE }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
