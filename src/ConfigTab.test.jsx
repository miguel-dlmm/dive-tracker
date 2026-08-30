import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
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

// ConfigTab persiste la sub-sección abierta en sessionStorage
// (oceanpulse:configSection, feedback 2026-08-30) — sin limpiarlo entre
// pruebas, un test que entra en una sección deja el siguiente `render()`
// arrancando ya dentro de ella en vez del menú principal (jsdom comparte
// un único sessionStorage para todo el archivo).
beforeEach(() => {
  sessionStorage.clear();
});

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

// Feedback explícito 2026-08-30: recargar la página dentro de una sección
// de Configuración (p. ej. Tarifas) devolvía al menú principal, perdiendo
// el contexto — sessionStorage (oceanpulse:configSection), misma vida que
// el resto de la navegación (tab/returnTab en App.jsx). Un unmount+render
// nuevo simula la recarga: ConfigTab arranca de cero, como en un refresh
// real de página.
describe("ConfigTab — la sub-sección abierta sobrevive a una recarga", () => {
  it("recargar dentro de Tarifas reabre directamente en Tarifas, no en el menú", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ConfigTab {...baseProps()} />);
    await user.click(screen.getByText("Tarifas"));
    expect(screen.getByRole("heading", { name: "Tarifas" })).toBeInTheDocument();

    unmount();
    render(<ConfigTab {...baseProps()} />);

    expect(screen.getByRole("heading", { name: "Tarifas" })).toBeInTheDocument();
    expect(screen.queryByText("Escuelas")).not.toBeInTheDocument();
  });

  it("una sección de administración persistida no se restaura para un usuario que ya no es admin", async () => {
    const user = userEvent.setup();
    supabase.rpc.mockResolvedValue({ data: [], error: null });
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    supabase.from.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: null }) });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ active: {}, lastSignInAt: {} }) });

    const adminProfile = { user_id: "u1", is_admin: true, is_superadmin: false };
    const { unmount } = render(<ConfigTab {...baseProps({ profile: adminProfile })} />);
    await user.click(screen.getByText("Usuarios"));
    expect(screen.getByRole("heading", { name: "Usuarios" })).toBeInTheDocument();

    unmount();
    render(<ConfigTab {...baseProps({ profile: { user_id: "u1", is_admin: false, is_superadmin: false } })} />);

    expect(screen.getByText("Escuelas")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Usuarios" })).not.toBeInTheDocument();
  });
});

// Feedback explícito 2026-08-30, segunda vuelta: cerrar Configuración con
// la "X" y reabrirla debe volver siempre al menú (a diferencia de recargar
// dentro de una sección, que sí la conserva — ver el describe de arriba).
// La limpieza de oceanpulse:configSection vive en App.jsx (closeSecondary),
// no aquí — ConfigTab en sí no sabe nada de "X"/returnTab, solo expone
// `onClose` para que quien lo use decida cuándo llamarlo (el botón "X" de
// la cabecera, y el propio gesto de swipe de más abajo).
//
// Gesto de "atrás" recursivo (feedback explícito: "no como una excepción,
// no como un truco, no como una interacción aislada"): deslizar hacia la
// derecha dentro de una sección vuelve al menú (igual que el botón
// "‹ Configuración"); ya en el menú, el mismo gesto cierra Configuración
// entera (onClose) — un único vocabulario de gesto en cualquier nivel.
describe("ConfigTab — gesto de deslizar hacia la derecha = atrás, recursivo", () => {
  function swipeRight(el) {
    fireEvent.touchStart(el, { touches: [{ clientX: 10, clientY: 100 }] });
    fireEvent.touchEnd(el, { changedTouches: [{ clientX: 120, clientY: 104 }] });
  }

  it("deslizar en el menú principal llama a onClose", () => {
    const onClose = vi.fn();
    const { container } = render(<ConfigTab {...baseProps()} onClose={onClose} />);

    swipeRight(container.firstChild);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("deslizar dentro de una sección vuelve al menú, sin llamar a onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<ConfigTab {...baseProps()} onClose={onClose} />);
    await user.click(screen.getByText("Escuelas"));
    expect(screen.getByRole("heading", { name: "Escuelas" })).toBeInTheDocument();

    swipeRight(container.firstChild);

    expect(screen.getByText("Cursos")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
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
    // La hoja ahora anima la salida (Sheet, shared.jsx — ver bloque de
    // gestos 2026-08-30): el heading deja de estar en el DOM al terminar
    // la animación, no en el mismo tick que cerrarla.
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Nueva escuela" })).not.toBeInTheDocument());
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
  const SUPERADMIN_PROFILE_ROW = {
    user_id: "admin-1", first_name: "Yo", last_name: "Admin", nickname: "yo-admin",
    email: "admin@example.com", is_admin: true, is_superadmin: true, created_at: "2026-08-01T00:00:00Z",
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
    await user.click(screen.getByRole("button", { name: /ana/ })); // abre la hoja de detalle

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
    await user.click(screen.getByRole("button", { name: /ana/ })); // abre la hoja de detalle

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
    await user.click(screen.getByRole("button", { name: /ana/ })); // abre la hoja de detalle

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
    await user.click(screen.getByRole("button", { name: /ana/ })); // abre la hoja de detalle

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
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user_id: "target-1", deleted: true }) }); // delete-user

    await openUsuarios(user);
    await user.click(screen.getByRole("button", { name: /ana/ }));
    await user.click(screen.getByRole("button", { name: "Eliminar usuario" }));
    await user.click(screen.getByRole("button", { name: "Eliminar", exact: true }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Eliminar usuario" })).not.toBeInTheDocument());
  });

  // Antes admin_list_profiles() devolvía las filas en orden de alta, sin
  // ordenar — con varios usuarios, encontrar uno concreto obligaba a leer
  // toda la lista.
  it("ordena el listado alfabéticamente por nickname, no por orden de alta", async () => {
    const user = userEvent.setup();
    supabase.rpc.mockResolvedValue({
      data: [
        { ...TARGET_PROFILE_ROW, user_id: "z-1", nickname: "zoe", created_at: "2026-08-01T00:00:00Z" },
        { ...TARGET_PROFILE_ROW, user_id: "a-1", nickname: "ana", created_at: "2026-08-02T00:00:00Z" },
      ],
      error: null,
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ active: {}, lastSignInAt: {} }) });

    render(<ConfigTab {...baseProps({ profile: SUPERADMIN_PROFILE })} />);
    await user.click(screen.getByText("Usuarios"));
    await waitFor(() => expect(screen.getByText("zoe")).toBeInTheDocument());

    const names = screen.getAllByText(/^(ana|zoe)$/).map((el) => el.textContent);
    expect(names).toEqual(["ana", "zoe"]);
  });

  // La causa raíz del salto de scroll al eliminar era reload() — sustituía
  // toda la lista por "Cargando usuarios…" mientras llegaba la respuesta de
  // admin_list_profiles(). Ahora la fila se quita del estado local: la RPC
  // de listado solo debe haberse llamado una vez (la carga inicial).
  it("eliminar un usuario actualiza el listado en el sitio, sin volver a pedir admin_list_profiles()", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ active: { "target-1": true }, lastSignInAt: {} }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user_id: "target-1", deleted: true }) });

    await openUsuarios(user);
    const rpcCallsBefore = supabase.rpc.mock.calls.length;

    await user.click(screen.getByRole("button", { name: /ana/ }));
    await user.click(screen.getByRole("button", { name: "Eliminar usuario" }));
    await user.click(screen.getByRole("button", { name: "Eliminar", exact: true }));

    await waitFor(() => expect(screen.queryByText("ana")).not.toBeInTheDocument());
    expect(supabase.rpc.mock.calls.length).toBe(rpcCallsBefore);
  });

  // Arrastrar para eliminar (bloque de usuarios, feedback explícito) es un
  // atajo adicional al camino existente (fila → hoja de detalle →
  // "Eliminar usuario"), con la misma restricción de a quién se puede
  // eliminar (nunca uno mismo, nunca a otro superadmin).
  describe("arrastrar para eliminar (atajo adicional a la hoja de detalle)", () => {
    it("expone la acción de eliminar de la fila para un usuario normal", async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ active: {}, lastSignInAt: {} }) });
      await openUsuarios(user);
      // El botón revelado lleva aria-hidden mientras la fila no está
      // arrastrada (no debe aparecer en el árbol de accesibilidad hasta
      // que se revela, ni robarle el foco a un lector de pantalla) — se
      // comprueba en el DOM directamente, no vía getByRole (que respeta
      // aria-hidden al calcular el nombre accesible incluso con hidden:true).
      expect(document.querySelector('[aria-label="Eliminar a ana"]')).not.toBeNull();
    });

    it("no expone la acción de eliminar sobre la propia cuenta del superadmin", async () => {
      const user = userEvent.setup();
      supabase.rpc.mockResolvedValue({ data: [SUPERADMIN_PROFILE_ROW], error: null });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ active: {}, lastSignInAt: {} }) });

      render(<ConfigTab {...baseProps({ profile: SUPERADMIN_PROFILE })} />);
      await user.click(screen.getByText("Usuarios"));
      await waitFor(() => expect(screen.getByText("yo-admin")).toBeInTheDocument());

      expect(document.querySelector('[aria-label="Eliminar a yo-admin"]')).toBeNull();
    });

    it("no expone la acción de eliminar sobre otro superadmin", async () => {
      const user = userEvent.setup();
      supabase.rpc.mockResolvedValue({
        data: [{ ...TARGET_PROFILE_ROW, is_superadmin: true, nickname: "otro-admin" }],
        error: null,
      });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ active: {}, lastSignInAt: {} }) });

      render(<ConfigTab {...baseProps({ profile: SUPERADMIN_PROFILE })} />);
      await user.click(screen.getByText("Usuarios"));
      await waitFor(() => expect(screen.getByText("otro-admin")).toBeInTheDocument());

      expect(document.querySelector('[aria-label="Eliminar a otro-admin"]')).toBeNull();
    });
  });

  // Feedback explícito 2026-08-30: estado con punto de color (no solo
  // texto) y rol visible junto al nickname, ambos "de un vistazo".
  describe("estado con punto de color y rol junto al nickname", () => {
    // Feedback explícito 2026-08-30, tercera vuelta: "quiero que el
    // usuario vea primero si está activo/pendiente/... antes que el
    // nombre" — el estado va delante del nickname en el orden de lectura
    // de la fila, no al final.
    it("el estado aparece antes que el nickname en la fila", async () => {
      const user = userEvent.setup();
      await openUsuarios(user);

      const row = screen.getByText("ana").closest("button");
      const statusIndex = row.textContent.indexOf("Activo");
      const nameIndex = row.textContent.indexOf("ana");
      expect(statusIndex).toBeGreaterThanOrEqual(0);
      expect(statusIndex).toBeLessThan(nameIndex);
    });

    it("un usuario normal activo no lleva icono de rol", async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ active: { "target-1": true }, lastSignInAt: {} }) });
      await openUsuarios(user);
      expect(screen.queryByLabelText("Administrador")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Superadmin")).not.toBeInTheDocument();
    });

    it("un admin lleva el icono 'Administrador' junto al nickname", async () => {
      const user = userEvent.setup();
      supabase.rpc.mockResolvedValue({ data: [{ ...TARGET_PROFILE_ROW, is_admin: true }], error: null });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ active: {}, lastSignInAt: {} }) });

      render(<ConfigTab {...baseProps({ profile: SUPERADMIN_PROFILE })} />);
      await user.click(screen.getByText("Usuarios"));
      await waitFor(() => expect(screen.getByText("ana")).toBeInTheDocument());

      expect(screen.getByLabelText("Administrador")).toBeInTheDocument();
    });

    it("un superadmin lleva el icono 'Superadmin', no el de 'Administrador'", async () => {
      const user = userEvent.setup();
      supabase.rpc.mockResolvedValue({ data: [SUPERADMIN_PROFILE_ROW], error: null });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ active: {}, lastSignInAt: {} }) });

      render(<ConfigTab {...baseProps({ profile: SUPERADMIN_PROFILE })} />);
      await user.click(screen.getByText("Usuarios"));
      await waitFor(() => expect(screen.getByText("yo-admin")).toBeInTheDocument());

      expect(screen.getByLabelText("Superadmin")).toBeInTheDocument();
      expect(screen.queryByLabelText("Administrador")).not.toBeInTheDocument();
    });
  });
});
