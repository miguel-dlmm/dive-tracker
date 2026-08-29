import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginScreen from "./LoginScreen";
import { ACCOUNT_DEACTIVATED_MESSAGE } from "./useSession";

// signIn se pasa como prop (viene de useSession en AuthGate) — aquí se
// mockea directamente, sin pasar por Supabase. Ver useSession.test.js para
// la detección de "user_banned" en sí.
async function fillAndSubmit(user) {
  await user.type(screen.getByLabelText("Email o nickname"), "cuenta@example.com");
  await user.type(screen.getByLabelText("Contraseña"), "algo");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginScreen", () => {
  it("credenciales incorrectas: muestra el mensaje genérico", async () => {
    const signIn = vi.fn().mockRejectedValue({ message: "Invalid login credentials", code: "invalid_credentials" });
    const user = userEvent.setup();
    render(<LoginScreen signIn={signIn} />);

    await fillAndSubmit(user);

    expect(await screen.findByText("Email/nickname o contraseña incorrectos.")).toBeInTheDocument();
  });

  it("signIn lanza user_banned: NO muestra el mensaje genérico de credenciales", async () => {
    const signIn = vi.fn().mockRejectedValue({ message: "User is banned", code: "user_banned" });
    const user = userEvent.setup();
    render(<LoginScreen signIn={signIn} />);

    await fillAndSubmit(user);

    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(screen.queryByText("Email/nickname o contraseña incorrectos.")).not.toBeInTheDocument();
  });

  it("accountBanned=true: muestra el aviso de cuenta desactivada desde el primer render, sin necesidad de intentar iniciar sesión", () => {
    render(<LoginScreen signIn={vi.fn()} accountBanned />);

    expect(screen.getByText(ACCOUNT_DEACTIVATED_MESSAGE)).toBeInTheDocument();
  });

  it("accountBanned=false (o ausente): no muestra ningún aviso al montar", () => {
    render(<LoginScreen signIn={vi.fn()} />);

    expect(screen.queryByText(ACCOUNT_DEACTIVATED_MESSAGE)).not.toBeInTheDocument();
  });
});
