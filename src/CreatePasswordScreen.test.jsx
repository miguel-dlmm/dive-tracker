import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatePasswordScreen from "./CreatePasswordScreen";

async function fillAndSubmit(user, { password, confirm }) {
  await user.type(screen.getByLabelText("Nueva contraseña"), password);
  await user.type(screen.getByLabelText("Confirmar contraseña"), confirm);
  await user.click(screen.getByRole("button", { name: /crear contraseña/i }));
}

describe("CreatePasswordScreen", () => {
  it("no llama a onSubmit si la contraseña es demasiado corta", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "1234567", confirm: "1234567" });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("al menos 8 caracteres");
  });

  it("no llama a onSubmit si las contraseñas no coinciden", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePasswordScreen onSubmit={onSubmit} />);

    await fillAndSubmit(user, { password: "password123", confirm: "password124" });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("no coinciden");
  });

  it("llama a onSubmit con la contraseña cuando pasa las validaciones", async () => {
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
});
