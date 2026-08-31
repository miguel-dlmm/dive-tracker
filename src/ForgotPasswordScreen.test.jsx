import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPasswordScreen from "./ForgotPasswordScreen";

const CONFIRMATION_TEXT = /Si ese email tiene una cuenta en Ocean Flow/;

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
});

it("pulsar 'Volver a entrar' antes de enviar llama a onBack sin llamar a fetch", async () => {
  const onBack = vi.fn();
  const user = userEvent.setup();
  render(<ForgotPasswordScreen onBack={onBack} />);

  await user.click(screen.getByRole("button", { name: /Volver a entrar/ }));

  expect(onBack).toHaveBeenCalledTimes(1);
  expect(global.fetch).not.toHaveBeenCalled();
});

it("enviar el formulario llama a /api/request-password-reset con el email y muestra el mensaje de confirmación genérico", async () => {
  const user = userEvent.setup();
  render(<ForgotPasswordScreen onBack={vi.fn()} />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/request-password-reset", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ email: "diver@example.com" }),
  })));
  expect(await screen.findByText(CONFIRMATION_TEXT)).toBeInTheDocument();
});

it("muestra el MISMO mensaje de confirmación aunque la petición de red falle (nunca revela si el email existe)", async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
  const user = userEvent.setup();
  render(<ForgotPasswordScreen onBack={vi.fn()} />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

  expect(await screen.findByText(CONFIRMATION_TEXT)).toBeInTheDocument();
});

it("desde la pantalla de confirmación, 'Volver a entrar' llama a onBack", async () => {
  const onBack = vi.fn();
  const user = userEvent.setup();
  render(<ForgotPasswordScreen onBack={onBack} />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.click(screen.getByRole("button", { name: "Enviar enlace" }));
  await screen.findByText(CONFIRMATION_TEXT);

  await user.click(screen.getByRole("button", { name: "Volver a entrar" }));

  expect(onBack).toHaveBeenCalledTimes(1);
});
