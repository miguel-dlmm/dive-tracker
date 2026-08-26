vi.mock("./useSession", () => ({ useSession: vi.fn() }));
vi.mock("./useSupabaseTable", () => ({ useSupabaseTable: vi.fn() }));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { useSession } from "./useSession";
import { useSupabaseTable } from "./useSupabaseTable";

const SESSION = { user: { id: "u1", email: "diver@example.com" } };

function mockUseSession(overrides) {
  useSession.mockReturnValue({
    session: null,
    profile: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    activateAccount: vi.fn(),
    pendingLegalConsents: [],
    acceptLegalConsents: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  useSession.mockReset();
  useSupabaseTable.mockReset().mockReturnValue({
    rows: [],
    loaded: true,
    insertRow: vi.fn(),
    updateRow: vi.fn(),
    deleteRow: vi.fn(),
    bulkUpdateWhere: vi.fn(),
    setDefault: vi.fn(),
  });
  window.history.pushState({}, "", "/");
});

// AuthGate (App.jsx) — integración del flujo de activación. Ver
// useSession.test.js para la lógica de activateAccount() en sí; aquí solo
// se comprueba qué pantalla muestra AuthGate en cada caso y que el envío de
// CreatePasswordScreen llega a activateAccount con los parámetros
// correctos. El Caso C ("sesión ajena") no tiene test porque no está
// implementado en esta fase — ver el comentario en AuthGate (App.jsx).
describe("AuthGate", () => {
  it("Caso A — sin sesión y con enlace de activación en la URL, muestra la pantalla de activación", () => {
    window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery");
    mockUseSession({ session: null, profile: null });

    render(<App />);

    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
  });

  it("sin sesión y sin enlace de activación, muestra el login", () => {
    mockUseSession({ session: null, profile: null });

    render(<App />);

    expect(screen.getByLabelText("Email o nickname")).toBeInTheDocument();
  });

  it("Caso B — sesión existente con activated_at sin fijar, reanuda mostrando la pantalla de activación sin pedir login", () => {
    window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery");
    mockUseSession({ session: SESSION, profile: { user_id: "u1", activated_at: null } });

    render(<App />);

    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
  });

  it("Caso D — activated_at ya fijado y sin consentimientos pendientes, entra directo a la app sin mostrar activación", async () => {
    mockUseSession({
      session: SESSION,
      profile: { user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z" },
      pendingLegalConsents: [],
    });

    render(<App />);

    expect(await screen.findByText("Ocean Pulse")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
  });

  it("activated_at fijado pero con consentimiento legal pendiente, muestra la pantalla de aceptación legal en vez de la app", () => {
    mockUseSession({
      session: SESSION,
      profile: { user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z" },
      pendingLegalConsents: [{ document_type: "privacy_policy", document_version: "v1" }],
    });

    render(<App />);

    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
  });

  it("al enviar la contraseña, llama a activateAccount con token_hash, type y el email de la sesión", async () => {
    window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery");
    const activateAccount = vi.fn().mockResolvedValue({ userId: "u1" });
    mockUseSession({ session: SESSION, profile: { user_id: "u1", activated_at: null }, activateAccount });
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("Nueva contraseña"), "password123");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "password123");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /crear contraseña/i }));

    await waitFor(() =>
      expect(activateAccount).toHaveBeenCalledWith({
        tokenHash: "hash-1",
        type: "recovery",
        expectedEmail: "diver@example.com",
        password: "password123",
      })
    );
  });
});
