import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./shared";
import RegisterScreen from "./RegisterScreen";

function renderWithToast(ui) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ email_sent: true }) });
});

it("pulsar 'Volver a entrar' antes de enviar llama a onBack sin llamar a fetch", async () => {
  const onBack = vi.fn();
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={onBack} />);

  await user.click(screen.getByRole("button", { name: /Volver a entrar/ }));

  expect(onBack).toHaveBeenCalledTimes(1);
  expect(global.fetch).not.toHaveBeenCalled();
});

it("enviar el formulario llama a /api/external-register con los datos y muestra la confirmación", async () => {
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={vi.fn()} />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.type(screen.getByLabelText("Nombre"), "Ada");
  await user.type(screen.getByLabelText("Apellidos"), "Lovelace");
  await user.type(screen.getByLabelText("Nickname"), "ada");
  await user.click(screen.getByRole("button", { name: "Registrarme" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/external-register", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ email: "diver@example.com", first_name: "Ada", last_name: "Lovelace", nickname: "ada" }),
  })));
  expect(await screen.findByText(/Te hemos enviado un email para confirmar tu cuenta/)).toBeInTheDocument();
});

it("si el servidor responde con error (p. ej. registro externo desactivado), lo muestra y no pasa a la confirmación", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "El registro externo no está habilitado." }) });
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={vi.fn()} />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.type(screen.getByLabelText("Nickname"), "ada");
  await user.click(screen.getByRole("button", { name: "Registrarme" }));

  expect(await screen.findByText("El registro externo no está habilitado.")).toBeInTheDocument();
  expect(screen.queryByText(/Te hemos enviado un email/)).not.toBeInTheDocument();
});

it("un nickname con '@' muestra el aviso, deshabilita el envío y no llama a fetch", async () => {
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={vi.fn()} />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.type(screen.getByLabelText("Nickname"), "diver@example.com");

  expect(screen.getByText('El nickname no puede contener "@".')).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Registrarme" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Registrarme" }));
  expect(global.fetch).not.toHaveBeenCalled();
});

it("si el email no se pudo enviar (email_sent:false), avisa por toast y no pasa a la confirmación", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ email_sent: false }) });
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={vi.fn()} />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.type(screen.getByLabelText("Nickname"), "ada");
  await user.click(screen.getByRole("button", { name: "Registrarme" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  expect(screen.queryByText(/Te hemos enviado un email/)).not.toBeInTheDocument();
});
