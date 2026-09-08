vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  verifyCaller: vi.fn(),
  requireAdmin: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

import { handleListUserStatus } from "./listUserStatus.js";
import { getServiceRoleClient, verifyCaller, requireAdmin, hasServerConfig } from "../supabaseAdmin.js";

const CALLER_ID = "caller-1";

function request(overrides = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: "{}",
    ...overrides,
  };
}

function makeClient(listUsersResult) {
  const listUsers = vi.fn().mockResolvedValue(listUsersResult);
  return { auth: { admin: { listUsers } } };
}

beforeEach(() => {
  // .mockClear() además de fijar el valor de vuelta: sin esto, un test
  // que comprueba "verifyCaller no se llamó" (p.ej. método distinto de
  // POST) solo pasaba si era el primero del archivo — los tests
  // anteriores ya habían acumulado llamadas sobre el mismo mock
  // compartido a nivel de módulo. Encontrado al fusionar aquí los tests
  // del resumen de actividad por usuario (2026-09-07, antes en su propio
  // archivo con mocks propios sin este problema).
  hasServerConfig.mockClear().mockReturnValue(true);
  verifyCaller.mockClear().mockResolvedValue({ id: CALLER_ID });
  requireAdmin.mockClear().mockResolvedValue(null);
  getServiceRoleClient.mockReset();
});

it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
  const result = await handleListUserStatus(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 401 si no hay token de sesión", async () => {
  const result = await handleListUserStatus(request({ headers: {} }));

  expect(result).toEqual({ status: 401, payload: { error: "Falta el token de sesión." } });
});

it("devuelve 401 si el token no corresponde a una sesión válida", async () => {
  verifyCaller.mockResolvedValue(null);

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 401, payload: { error: "Sesión inválida o caducada." } });
});

it("devuelve 403 si quien llama no es admin ni superadmin", async () => {
  requireAdmin.mockResolvedValue({ status: 403, payload: { error: "Solo un admin puede consultar el estado de las cuentas." } });

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 403, payload: { error: "Solo un admin puede consultar el estado de las cuentas." } });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

it("propaga tal cual el resultado de requireAdmin si no puede verificarse el permiso (500, no 403)", async () => {
  requireAdmin.mockResolvedValue({ status: 500, payload: { error: "No se pudo comprobar tus permisos. Inténtalo de nuevo en unos segundos." } });

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo comprobar tus permisos. Inténtalo de nuevo en unos segundos." } });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

it("devuelve 500 si falla la consulta a Supabase", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({ data: null, error: { message: "boom" } }));

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo consultar el estado de las cuentas." } });
});

it("marca como activo (true) a quien no tiene banned_until", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    data: { users: [{ id: "u1", banned_until: null, last_sign_in_at: null }] },
    error: null,
  }));

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 200, payload: { active: { u1: true }, lastSignInAt: { u1: null } } });
});

it("marca como inactivo (false) a quien tiene banned_until en el futuro", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    data: { users: [{ id: "u1", banned_until: "2126-08-05T00:00:00.000Z", last_sign_in_at: null }] },
    error: null,
  }));

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 200, payload: { active: { u1: false }, lastSignInAt: { u1: null } } });
});

it("marca como activo (true) a quien tiene banned_until ya expirado en el pasado", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    data: { users: [{ id: "u1", banned_until: "2000-01-01T00:00:00.000Z", last_sign_in_at: null }] },
    error: null,
  }));

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 200, payload: { active: { u1: true }, lastSignInAt: { u1: null } } });
});

// last_sign_in_at es la fuente correcta de "último login real" (auth.users,
// ya presente en la misma respuesta de listUsers() — sin columna ni
// consulta extra). Ver docs — nunca se deriva de otra actividad de la app.
it("expone last_sign_in_at de auth.users tal cual, sin transformarlo", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    data: { users: [{ id: "u1", banned_until: null, last_sign_in_at: "2026-08-20T10:15:00.000Z" }] },
    error: null,
  }));

  const result = await handleListUserStatus(request());

  expect(result.payload.lastSignInAt).toEqual({ u1: "2026-08-20T10:15:00.000Z" });
});

it("devuelve null en lastSignInAt para quien nunca ha iniciado sesión", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    data: { users: [{ id: "u1", banned_until: null, last_sign_in_at: undefined }] },
    error: null,
  }));

  const result = await handleListUserStatus(request());

  expect(result.payload.lastSignInAt).toEqual({ u1: null });
});

// Resumen de actividad de UN usuario (rama activada por user_id en el
// cuerpo) — fusionado aquí 2026-09-07 desde un fichero propio
// (getUserActivitySummary.js) que era la 13ª Serverless Function del
// proyecto y tumbaba todos los deployments del plan Hobby de Vercel
// (límite de 12, confirmado con `vercel deploy --prebuilt` en local: "No
// more than 12 Serverless Functions can be added..."). Mismos casos que
// tenía aquel fichero, ahora contra handleListUserStatus con user_id.
describe("resumen de actividad de un usuario (user_id en el cuerpo)", () => {
  const TARGET_ID = "target-1";

  function summaryRequest(overrides = {}) {
    return request({ body: JSON.stringify({ user_id: TARGET_ID }), ...overrides });
  }

  // tables: { worklog: { count, countError, latest: { updated_at } | null, latestError }, ... }
  function makeActivityClient(tables) {
    const from = vi.fn((table) => {
      const cfg = tables[table] || {};
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: cfg.latest ?? null, error: cfg.latestError ?? null }),
        then: (resolve) => Promise.resolve({ count: cfg.count ?? 0, error: cfg.countError ?? null }).then(resolve),
      };
      return chain;
    });
    return { from };
  }

  it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
    const result = await handleListUserStatus(summaryRequest({ method: "GET" }));

    expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
    expect(verifyCaller).not.toHaveBeenCalled();
  });

  it("devuelve 400 si user_id no es una cadena", async () => {
    const result = await handleListUserStatus(summaryRequest({ body: JSON.stringify({ user_id: 123 }) }));

    expect(result).toEqual({ status: 400, payload: { error: "user_id inválido." } });
  });

  it("devuelve 403 si quien llama no es admin", async () => {
    requireAdmin.mockResolvedValue({ status: 403, payload: { error: "Solo un admin puede consultar el estado de las cuentas." } });

    const result = await handleListUserStatus(summaryRequest());

    expect(result).toEqual({ status: 403, payload: { error: "Solo un admin puede consultar el estado de las cuentas." } });
    expect(getServiceRoleClient).not.toHaveBeenCalled();
  });

  it("suma el recuento de las 3 tablas y toma la fecha más reciente entre ellas", async () => {
    getServiceRoleClient.mockReturnValue(makeActivityClient({
      worklog: { count: 3, latest: { updated_at: "2026-09-01T10:00:00.000Z" } },
      comisiones: { count: 2, latest: { updated_at: "2026-09-05T08:00:00.000Z" } },
      colleague_payments: { count: 1, latest: { updated_at: "2026-08-20T12:00:00.000Z" } },
    }));

    const result = await handleListUserStatus(summaryRequest());

    expect(result).toEqual({ status: 200, payload: { count: 6, lastActivityAt: "2026-09-05T08:00:00.000Z" } });
  });

  it("cuenta también una baja lógica reciente (deleted_at) como la actividad más reciente, aunque el recuento activo no la incluya", async () => {
    getServiceRoleClient.mockReturnValue(makeActivityClient({
      worklog: { count: 0, latest: { updated_at: "2026-09-07T09:00:00.000Z" } }, // fila borrada lógicamente, no cuenta pero sí actualiza la fecha
      comisiones: { count: 0, latest: null },
      colleague_payments: { count: 0, latest: null },
    }));

    const result = await handleListUserStatus(summaryRequest());

    expect(result).toEqual({ status: 200, payload: { count: 0, lastActivityAt: "2026-09-07T09:00:00.000Z" } });
  });

  it("devuelve lastActivityAt null si el usuario no tiene ningún movimiento", async () => {
    getServiceRoleClient.mockReturnValue(makeActivityClient({
      worklog: { count: 0, latest: null },
      comisiones: { count: 0, latest: null },
      colleague_payments: { count: 0, latest: null },
    }));

    const result = await handleListUserStatus(summaryRequest());

    expect(result).toEqual({ status: 200, payload: { count: 0, lastActivityAt: null } });
  });

  it("devuelve 500 si falla la consulta de recuento", async () => {
    getServiceRoleClient.mockReturnValue(makeActivityClient({
      worklog: { countError: { message: "boom" } },
    }));

    const result = await handleListUserStatus(summaryRequest());

    expect(result).toEqual({ status: 500, payload: { error: "No se pudo consultar la actividad de la cuenta." } });
  });
});
