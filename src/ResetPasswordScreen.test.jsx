import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordScreen from "./ResetPasswordScreen";

async function fillPasswords(user, { password, confirm }) {
  await user.type(screen.getByLabelText("Nueva contraseña"), password);
  await user.type(screen.getByLabelText("Confirmar contraseña"), confirm);
}

async function fillAndSubmit(user, { password, confirm }) {
  await fillPasswords(user, { password, confirm });
  await user.click(screen.getByRole("button", { name: /guardar nueva contraseña/i }));
}

describe("ResetPasswordScreen", () => {
  it("no pide ningún consentimiento legal — ni checkbox ni enlaces a Política de Privacidad/Términos", async () => {
    render(<ResetPasswordScreen onSubmit={vi.fn()} />);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/pol[ií]tica de privacidad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/t[ée]rminos de uso/i)).not.toBeInTheDocument();
  });

  it("mantiene el botón deshabilitado si la contraseña es demasiado corta", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ResetPasswordScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "1234567", confirm: "1234567" });

    expect(screen.getByRole("button", { name: /guardar nueva contraseña/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mantiene el botón deshabilitado si la contraseña no tiene ninguna mayúscula", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ResetPasswordScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "password123!", confirm: "password123!" });

    expect(screen.getByRole("button", { name: /guardar nueva contraseña/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mantiene el botón deshabilitado si la contraseña no tiene ningún símbolo", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ResetPasswordScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "Password123", confirm: "Password123" });

    expect(screen.getByRole("button", { name: /guardar nueva contraseña/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mantiene el botón deshabilitado si las contraseñas no coinciden", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ResetPasswordScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "Password123!", confirm: "Password124!" });

    expect(screen.getByRole("button", { name: /guardar nueva contraseña/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit con la contraseña en cuanto pasa las validaciones — sin exigir ningún consentimiento", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    render(<ResetPasswordScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "Password123!", confirm: "Password123!" });

    expect(onSubmit).toHaveBeenCalledWith("Password123!");
  });

  it("muestra el mensaje de onSubmit tal cual cuando lanza (contrato de resetPassword)", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Este enlace ya no es válido."));
    const user = userEvent.setup();
    render(<ResetPasswordScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "Password123!", confirm: "Password123!" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Este enlace ya no es válido.");
  });

  it("usa un mensaje genérico de respaldo si onSubmit lanza un error sin mensaje", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error());
    const user = userEvent.setup();
    render(<ResetPasswordScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "Password123!", confirm: "Password123!" });

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
  });

  it("deshabilita el botón mientras onSubmit está en curso, evitando doble envío", async () => {
    let resolveSubmit;
    const onSubmit = vi.fn(() => new Promise((resolve) => { resolveSubmit = resolve; }));
    const user = userEvent.setup();
    render(<ResetPasswordScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "Password123!", confirm: "Password123!" });

    const button = screen.getByRole("button", { name: /guardar nueva contraseña/i });
    expect(button).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolveSubmit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
