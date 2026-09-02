import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForcedPasswordUpdateScreen from "./ForcedPasswordUpdateScreen";

async function fillPasswords(user, { password, confirm }) {
  await user.type(screen.getByLabelText("Nueva contraseña"), password);
  await user.type(screen.getByLabelText("Confirmar contraseña"), confirm);
}

async function fillAndSubmit(user, { password, confirm }) {
  await fillPasswords(user, { password, confirm });
  await user.click(screen.getByRole("button", { name: /guardar y continuar/i }));
}

describe("ForcedPasswordUpdateScreen", () => {
  it("explica que la contraseña actual no cumple la seguridad reforzada, sin pedir ningún consentimiento legal", async () => {
    render(<ForcedPasswordUpdateScreen onSubmit={vi.fn()} />);

    expect(screen.getByText(/reforzado la seguridad de ocean flow/i)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/pol[ií]tica de privacidad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/t[ée]rminos de uso/i)).not.toBeInTheDocument();
  });

  it("mantiene el botón deshabilitado si la contraseña no tiene mayúscula ni símbolo", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ForcedPasswordUpdateScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "password123", confirm: "password123" });

    expect(screen.getByRole("button", { name: /guardar y continuar/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mantiene el botón deshabilitado si las contraseñas no coinciden", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ForcedPasswordUpdateScreen onSubmit={onSubmit} />);

    await fillPasswords(user, { password: "Password123!", confirm: "Password124!" });

    expect(screen.getByRole("button", { name: /guardar y continuar/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit con la contraseña en cuanto cumple mayúscula, símbolo y longitud mínima", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    render(<ForcedPasswordUpdateScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "Password123!", confirm: "Password123!" });

    expect(onSubmit).toHaveBeenCalledWith("Password123!");
  });

  it("muestra el mensaje de onSubmit tal cual cuando lanza", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("No se pudo actualizar la sesión."));
    const user = userEvent.setup();
    render(<ForcedPasswordUpdateScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "Password123!", confirm: "Password123!" });

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo actualizar la sesión.");
  });

  it("deshabilita el botón mientras onSubmit está en curso, evitando doble envío", async () => {
    let resolveSubmit;
    const onSubmit = vi.fn(() => new Promise((resolve) => { resolveSubmit = resolve; }));
    const user = userEvent.setup();
    render(<ForcedPasswordUpdateScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "Password123!", confirm: "Password123!" });

    const button = screen.getByRole("button", { name: /guardar y continuar/i });
    expect(button).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolveSubmit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
