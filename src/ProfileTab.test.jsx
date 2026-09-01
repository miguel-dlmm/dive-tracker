vi.mock("./supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    auth: { updateUser: vi.fn(), getSession: vi.fn() },
  },
}));

import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileTab from "./ProfileTab";
import { ToastProvider } from "./shared";
import { supabase } from "./supabaseClient";

const PROFILE = { user_id: "u1", first_name: "Ada", last_name: "Lovelace", nickname: "ada", avatar_icon: "Fish", avatar_color: "#0F766E" };
const CURRENCIES = { rows: [{ code: "EUR", name: "Euro", symbol: "€", is_default: true }, { code: "USD", name: "Dólar", symbol: "$" }], loaded: true };

function mockUpdate(result = { error: null }) {
  const eq = vi.fn().mockResolvedValue(result);
  const update = vi.fn(() => ({ eq }));
  supabase.from.mockReturnValue({ update });
  return { update, eq };
}

function renderProfile(overrides = {}) {
  const onProfileUpdated = vi.fn();
  const onAccountDeleted = vi.fn();
  render(
    <ToastProvider>
      <ProfileTab profile={PROFILE} currencies={CURRENCIES} onProfileUpdated={onProfileUpdated} onAccountDeleted={onAccountDeleted} {...overrides} />
    </ToastProvider>
  );
  return { onProfileUpdated, onAccountDeleted };
}

beforeEach(() => {
  supabase.from.mockReset();
  supabase.auth.updateUser.mockReset();
  supabase.auth.getSession.mockReset().mockResolvedValue({ data: { session: { access_token: "tok-1" } } });
  global.fetch = vi.fn();
  try { localStorage.clear(); } catch { /* noop */ }
});

it("nada si no hay perfil todavía", () => {
  render(<ToastProvider><ProfileTab profile={null} currencies={CURRENCIES} /></ToastProvider>);
  expect(screen.queryByText("Datos personales")).not.toBeInTheDocument();
});

describe("avatar", () => {
  it("abre el selector y guarda el icono/color elegido", async () => {
    const user = userEvent.setup();
    const { update, eq } = mockUpdate();
    const { onProfileUpdated } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Cambiar avatar" }));
    await user.click(screen.getByRole("button", { name: "Icono Anchor" }));

    expect(update).toHaveBeenCalledWith({ avatar_icon: "Anchor", avatar_color: "#0F766E" });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(onProfileUpdated).toHaveBeenCalledWith({ avatar_icon: "Anchor", avatar_color: "#0F766E" });
  });
});

describe("datos personales", () => {
  it("edita nombre/apellidos/nickname y guarda", async () => {
    const user = userEvent.setup();
    const { update, eq } = mockUpdate();
    const { onProfileUpdated } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const nickname = screen.getByDisplayValue("ada");
    await user.clear(nickname);
    await user.type(nickname, "adalovelace");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ first_name: "Ada", last_name: "Lovelace", nickname: "adalovelace" }));
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(onProfileUpdated).toHaveBeenCalled();
  });

  it("no deja guardar un nickname con \"@\"", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const nickname = screen.getByDisplayValue("ada");
    await user.clear(nickname);
    await user.type(nickname, "ada@x.com");

    expect(screen.getByText('No puede contener "@".')).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("muestra un mensaje legible si el nickname ya está en uso", async () => {
    const user = userEvent.setup();
    mockUpdate({ error: { code: "23505", message: "duplicate key value violates unique constraint \"profiles_nickname_lower_key\"" } });
    renderProfile();

    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Ese nickname ya está en uso.")).toBeInTheDocument();
  });
});

describe("moneda favorita", () => {
  it("sin nada elegido todavía, muestra el placeholder", () => {
    renderProfile();
    expect(screen.getByText("Sin elegir — usa la moneda por defecto de la app")).toBeInTheDocument();
  });

  it("elegir una moneda la guarda en localStorage con la clave por usuario", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByText("Sin elegir — usa la moneda por defecto de la app"));
    await user.click(screen.getByText("USD — Dólar ($)"));

    expect(localStorage.getItem("oceanpulse:favoriteCurrency:u1")).toBe("USD");
  });
});

describe("contraseña", () => {
  it("el botón sigue deshabilitado hasta que la contraseña tiene 8+ caracteres y coincide con la confirmación", async () => {
    const user = userEvent.setup();
    renderProfile();
    const password = screen.getByLabelText("Nueva contraseña");
    const confirm = screen.getByLabelText("Confirmar contraseña");

    await user.type(password, "corta");
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeDisabled();

    await user.type(confirm, "corta");
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeDisabled();

    await user.clear(password);
    await user.clear(confirm);
    await user.type(password, "contraseñaLarga1");
    await user.type(confirm, "contraseñaLarga1");
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).not.toBeDisabled();
  });

  it("guarda la contraseña nueva vía supabase.auth.updateUser", async () => {
    const user = userEvent.setup();
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    renderProfile();

    await user.type(screen.getByLabelText("Nueva contraseña"), "contraseñaLarga1");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "contraseñaLarga1");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    await waitFor(() => expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "contraseñaLarga1" }));
  });
});

describe("privacidad — eliminar cuenta", () => {
  it("pide confirmación antes de llamar al endpoint", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole("button", { name: /Eliminar mi cuenta/ }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("al confirmar, llama a /api/delete-own-account con el token de sesión y avisa al padre", async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ deleted: true }) });
    const { onAccountDeleted } = renderProfile();

    await user.click(screen.getByRole("button", { name: /Eliminar mi cuenta/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByText("Eliminar cuenta"));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/delete-own-account", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer tok-1" }),
    })));
    expect(onAccountDeleted).toHaveBeenCalled();
  });

  it("si el servidor rechaza el borrado (p.ej. cuenta superadmin), muestra el error y no cierra sesión", async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: "Una cuenta superadmin no puede eliminarse a sí misma desde aquí." }) });
    const { onAccountDeleted } = renderProfile();

    await user.click(screen.getByRole("button", { name: /Eliminar mi cuenta/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByText("Eliminar cuenta"));

    expect(await screen.findByText("Una cuenta superadmin no puede eliminarse a sí misma desde aquí.")).toBeInTheDocument();
    expect(onAccountDeleted).not.toHaveBeenCalled();
  });
});
