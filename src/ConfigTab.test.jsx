import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfigTab from "./ConfigTab";

vi.mock("./supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  },
}));
import { supabase } from "./supabaseClient";

// Rediseño 2026-08-29 (ver docs/ADR/0008-rediseno-configuracion.md): menú
// agrupado con drill-down en vez de pestañas horizontales, y creación en
// CrudTable vía FAB + hoja inferior en vez de un formulario fijo. Estas
// pruebas cubren el contrato nuevo, no cada catálogo uno a uno — el mismo
// CrudTable sirve a Escuelas/Cursos/Tipos de pago/Estados de pago/Monedas,
// así que basta con probarlo una vez (aquí, vía Escuelas).
const rowsHook = (rows) => ({
  rows, loaded: true,
  insertRow: vi.fn().mockResolvedValue(rows[0]),
  updateRow: vi.fn(), deleteRow: vi.fn(), bulkUpdateWhere: vi.fn(), setDefault: vi.fn(),
});
const emptyHook = rowsHook([]);

function baseProps(overrides = {}) {
  return {
    schools: rowsHook([{ id: "s1", name: "PADI Cozumel" }]),
    activities: emptyHook,
    currencies: rowsHook([{ code: "EUR", symbol: "€", name: "Euro", is_default: true }]),
    paymentTypes: emptyHook,
    paymentStatuses: emptyHook,
    rates: emptyHook,
    commissionRates: emptyHook,
    worklog: emptyHook,
    comisiones: emptyHook,
    navSections: rowsHook([]),
    appConfig: rowsHook([{ logo_icon: "Waves" }]),
    profile: { user_id: "u1", is_admin: false, is_superadmin: false },
    ...overrides,
  };
}

describe("ConfigTab — menú agrupado", () => {
  it("muestra el grupo de negocio para cualquier usuario, sin el grupo de administración", () => {
    render(<ConfigTab {...baseProps()} />);

    expect(screen.getByText("Escuelas")).toBeInTheDocument();
    expect(screen.getByText("Cursos")).toBeInTheDocument();
    expect(screen.getByText("Tarifas")).toBeInTheDocument();
    expect(screen.queryByText("Administración")).not.toBeInTheDocument();
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
  });

  it("muestra también el grupo de administración a un admin", () => {
    render(<ConfigTab {...baseProps({ profile: { user_id: "u1", is_admin: true, is_superadmin: false } })} />);

    expect(screen.getByText("Administración")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Monedas")).toBeInTheDocument();
  });

  it("entrar en una sección muestra 'Configuración' para volver, y volver restaura el menú", async () => {
    const user = userEvent.setup();
    render(<ConfigTab {...baseProps()} />);

    await user.click(screen.getByText("Escuelas"));
    expect(screen.getByRole("heading", { name: "Escuelas" })).toBeInTheDocument();
    expect(screen.queryByText("Cursos")).not.toBeInTheDocument();

    await user.click(screen.getByText("Configuración"));
    expect(screen.getByText("Cursos")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Escuelas" })).not.toBeInTheDocument();
  });
});

describe("ConfigTab — CrudTable crea vía FAB + hoja (ver Escuelas)", () => {
  it("el formulario de alta no es visible hasta pulsar el FAB, y crear cierra la hoja", async () => {
    const user = userEvent.setup();
    const schools = rowsHook([{ id: "s1", name: "PADI Cozumel" }]);
    render(<ConfigTab {...baseProps({ schools })} />);
    await user.click(screen.getByText("Escuelas"));

    expect(screen.queryByRole("textbox", { name: "Nombre" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nueva escuela" }));
    expect(screen.getByRole("heading", { name: "Nueva escuela" })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ihasia");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(schools.insertRow).toHaveBeenCalledWith(expect.objectContaining({ name: "Ihasia" }));
    expect(screen.queryByRole("heading", { name: "Nueva escuela" })).not.toBeInTheDocument();
  });

  it("'Editar' (menú '⋯') abre la misma hoja precargada, y Guardar llama a updateRow", async () => {
    const user = userEvent.setup();
    const schools = rowsHook([{ id: "s1", name: "PADI Cozumel", color: "#0E7C7B" }]);
    render(<ConfigTab {...baseProps({ schools })} />);
    await user.click(screen.getByText("Escuelas"));

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));

    expect(screen.getByRole("heading", { name: "Editar escuela" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue("PADI Cozumel");

    await user.clear(screen.getByRole("textbox", { name: "Nombre" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ihasia Dive");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(schools.updateRow).toHaveBeenCalledWith("s1", expect.objectContaining({ name: "Ihasia Dive" }));
  });

  it("el estado de pago predeterminado no se puede eliminar (protectDefaultFromDelete)", async () => {
    const user = userEvent.setup();
    const paymentStatuses = rowsHook([{ id: "ps1", name: "Pendiente", color: "#0E7C7B", is_default: true }]);
    render(<ConfigTab {...baseProps({ paymentStatuses, profile: { user_id: "u1", is_admin: true, is_superadmin: false } })} />);
    await user.click(screen.getByText("Estados de pago"));

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    const deleteItem = screen.getByText("Eliminar").closest('[role="menuitem"]');
    expect(deleteItem).toHaveAttribute("aria-disabled", "true");
    expect(deleteItem).toHaveAttribute("title", expect.stringContaining("predeterminado"));
  });
});

// Usuarios: tri-estado (Activo/Pendiente/Desactivado — ver ADR de esta
// sesión sobre el modelo de activación), "Desactivar" (revoca el acceso,
// conserva los datos), "Regenerar enlace"/"Regenerar contraseña" (nunca
// conceden acceso al instante) y "Eliminar" (irreversible). UsersDirectory
// llama a supabase.rpc/from/auth.getSession y a fetch("/api/...")
// directamente, así que aquí sí hace falta mockear todo eso (a diferencia
// del resto de ConfigTab, que solo depende de los hooks de
// useSupabaseTable ya pasados por props).
describe("ConfigTab — Usuarios: estado, activar/desactivar, regenerar y eliminar", () => {
  const SUPERADMIN_PROFILE = { user_id: "admin-1", is_admin: true, is_superadmin: true };
  const TARGET_PROFILE_ROW = {
    user_id: "target-1", first_name: "Ana", last_name: "López", nickname: "ana",
    email: "ana@example.com", is_admin: false, is_superadmin: false, created_at: "2026-08-01T00:00:00Z",
  };

  // activated_at vive en profiles, no en admin_list_profiles() — se lee
  // aparte (loadActivatedAt) y se cruza por user_id. `activatedAt: null`
  // reproduce una cuenta nunca activada ("Pendiente" aunque no esté baneada).
  function mockProfilesFrom(activatedAt) {
    supabase.from.mockImplementation((table) => {
      if (table !== "profiles") throw new Error(`tabla inesperada en el mock: ${table}`);
      return {
        select: vi.fn().mockResolvedValue({ data: [{ user_id: "target-1", activated_at: activatedAt }], error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
    });
  }

  beforeEach(() => {
    supabase.rpc.mockResolvedValue({ data: [TARGET_PROFILE_ROW], error: null });
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    mockProfilesFrom("2026-08-02T00:00:00Z");
  });

  async function openUsuarios(user) {
    render(<ConfigTab {...baseProps({ profile: SUPERADMIN_PROFILE })} />);
    await user.click(screen.getByText("Usuarios"));
    await waitFor(() => expect(screen.getByText("ana")).toBeInTheDocument());
  }

  it("muestra 'Activo' en la fila para una cuenta sin banned_until y ya activada (activated_at presente)", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ active: { "target-1": true }, lastSignInAt: { "target-1": null } }) });

    await openUsuarios(user);

    await waitFor(() => expect(screen.getByText("Activo")).toBeInTheDocument());
  });

  it("muestra 'Pendiente' para una cuenta sin banned_until pero nunca activada (activated_at null)", async () => {
    const user = userEvent.setup();
    mockProfilesFrom(null);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ active: { "target-1": true }, lastSignInAt: { "target-1": null } }) });

    await openUsuarios(user);

    await waitFor(() => expect(screen.getByText("Pendiente")).toBeInTheDocument());
  });

  it("desactivar (desde el switch de la hoja de detalle) pide confirmación y llama a /api/set-user-active con active:false", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ active: { "target-1": true }, lastSignInAt: {} }) }) // list-user-status inicial
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user_id: "target-1", active: false }) }) // set-user-active
      .mockResolvedValueOnce({ ok: true, json: async () => ({ active: { "target-1": false }, lastSignInAt: {} }) }); // list-user-status tras reload

    await openUsuarios(user);
    await waitFor(() => expect(screen.getByText("Activo")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^ana/ })); // abre la hoja de detalle

    await waitFor(() => expect(screen.getByRole("switch", { name: "Desactivar usuario" })).toBeInTheDocument());
    await user.click(screen.getByRole("switch", { name: "Desactivar usuario" }));
    expect(screen.getByText("Desactivar usuario", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByText(/dejará de poder iniciar sesión/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Desactivar", exact: true }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/set-user-active", expect.objectContaining({
      body: JSON.stringify({ target_user_id: "target-1", active: false }),
    })));
  });

  it("regenerar enlace (cuenta pendiente) pide confirmación, llama a /api/regenerate-activation-link y muestra el enlace devuelto", async () => {
    const user = userEvent.setup();
    mockProfilesFrom(null);
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ active: { "target-1": true }, lastSignInAt: {} }) }) // list-user-status inicial
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user_id: "target-1", action_link: "https://app.example/activate?token_hash=abc" }) }) // regenerate-activation-link
      .mockResolvedValueOnce({ ok: true, json: async () => ({ active: { "target-1": true }, lastSignInAt: {} }) }); // list-user-status tras reload

    await openUsuarios(user);
    await waitFor(() => expect(screen.getByText("Pendiente")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^ana/ })); // abre la hoja de detalle

    await waitFor(() => expect(screen.getByRole("button", { name: "Regenerar enlace" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Regenerar enlace" }));
    await user.click(screen.getByRole("button", { name: "Generar enlace" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/regenerate-activation-link", expect.objectContaining({
      body: JSON.stringify({ target_user_id: "target-1" }),
    })));
    expect(await screen.findByText(/https:\/\/app\.example\/activate/)).toBeInTheDocument();
  });

  it("regenerar contraseña pide confirmación, llama a /api/regenerate-password y muestra el enlace devuelto", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ active: { "target-1": true }, lastSignInAt: {} }) }) // list-user-status inicial
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user_id: "target-1", action_link: "https://app.example/activate?token_hash=xyz" }) }) // regenerate-password
      .mockResolvedValueOnce({ ok: true, json: async () => ({ active: { "target-1": true }, lastSignInAt: {} }) }); // list-user-status tras reload

    await openUsuarios(user);
    await waitFor(() => expect(screen.getByText("Activo")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^ana/ })); // abre la hoja de detalle

    await waitFor(() => expect(screen.getByRole("button", { name: "Regenerar contraseña" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Regenerar contraseña" }));
    await user.click(screen.getByRole("button", { name: "Regenerar", exact: true }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/regenerate-password", expect.objectContaining({
      body: JSON.stringify({ target_user_id: "target-1" }),
    })));
    expect(await screen.findByText(/https:\/\/app\.example\/activate/)).toBeInTheDocument();
  });

  it("eliminar (desde la hoja de detalle) pide confirmación danger y llama a /api/delete-user", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ active: { "target-1": true }, lastSignInAt: {} }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user_id: "target-1", deleted: true }) });

    await openUsuarios(user);
    await waitFor(() => expect(screen.getByText("Activo")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^ana/ })); // abre la hoja de detalle

    await waitFor(() => expect(screen.getByRole("button", { name: "Eliminar usuario" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Eliminar usuario" }));
    expect(screen.getByText(/Si solo quieres revocarle el acceso/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar", exact: true }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/delete-user", expect.objectContaining({
      body: JSON.stringify({ target_user_id: "target-1" }),
    })));
  });

  it("la hoja de detalle se cierra sola tras eliminar correctamente (la cuenta ya no existe)", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ active: { "target-1": true }, lastSignInAt: {} }) }) // list-user-status inicial
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user_id: "target-1", deleted: true }) }) // delete-user
      .mockResolvedValueOnce({ ok: true, json: async () => ({ active: {}, lastSignInAt: {} }) }); // list-user-status tras reload
    // admin_list_profiles(): la carga inicial trae a "ana"; tras eliminarla,
    // el reload ya no la incluye — orden explícito, no depende del
    // mockResolvedValue persistente de beforeEach.
    supabase.rpc
      .mockResolvedValueOnce({ data: [TARGET_PROFILE_ROW], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await openUsuarios(user);
    await user.click(screen.getByRole("button", { name: /^ana/ }));
    await user.click(screen.getByRole("button", { name: "Eliminar usuario" }));
    await user.click(screen.getByRole("button", { name: "Eliminar", exact: true }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Eliminar usuario" })).not.toBeInTheDocument());
  });
});
