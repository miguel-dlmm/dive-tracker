import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatePasswordScreen from "./CreatePasswordScreen";
import { TITLE as PRIVACY_TITLE } from "./legal/privacyPolicy";
import { TITLE as TERMS_TITLE } from "./legal/termsOfUse";

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

  it("mantiene el botón deshabilitado si las contraseñas no coinciden", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "password123", confirm: "password124" });
    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: /crear contraseña/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mantiene el botón deshabilitado si no se acepta el consentimiento legal", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "password123", confirm: "password123" });

    expect(screen.getByRole("button", { name: /crear contraseña/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit con la contraseña cuando pasa las validaciones y se acepta el consentimiento", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "password123", confirm: "password123" });

    expect(onSubmit).toHaveBeenCalledWith("password123");
  });

  it("muestra un mensaje amigable si onSubmit lanza", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "password123", confirm: "password123" });

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
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
