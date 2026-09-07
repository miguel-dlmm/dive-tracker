vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  verifyCaller: vi.fn(),
  requireAdmin: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

import { handleGetUserActivitySummary } from "./getUserActivitySummary.js";
import { getServiceRoleClient, verifyCaller, requireAdmin, hasServerConfig } from "../supabaseAdmin.js";

const CALLER_ID = "caller-1";
const TARGET_ID = "target-1";

function request(overrides = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: JSON.stringify({ user_id: TARGET_ID }),
    ...overrides,
  };
}

// tables: { worklog: { count, countError, latest: { updated_at } | null, latestError }, ... }
function makeClient(tables) {
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

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  verifyCaller.mockResolvedValue({ id: CALLER_ID });
  requireAdmin.mockResolvedValue(null);
  getServiceRoleClient.mockReset();
});

it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
  const result = await handleGetUserActivitySummary(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleGetUserActivitySummary(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 401 si no hay token de sesión", async () => {
  const result = await handleGetUserActivitySummary(request({ headers: {} }));

  expect(result).toEqual({ status: 401, payload: { error: "Falta el token de sesión." } });
});

it("devuelve 400 si falta user_id en el cuerpo", async () => {
  const result = await handleGetUserActivitySummary(request({ body: "{}" }));

  expect(result).toEqual({ status: 400, payload: { error: "Falta user_id." } });
});

it("devuelve 401 si el token no corresponde a una sesión válida", async () => {
  verifyCaller.mockResolvedValue(null);

  const result = await handleGetUserActivitySummary(request());

  expect(result).toEqual({ status: 401, payload: { error: "Sesión inválida o caducada." } });
});

it("devuelve 403 si quien llama no es admin", async () => {
  requireAdmin.mockResolvedValue({ status: 403, payload: { error: "Solo un admin puede consultar la actividad de otra cuenta." } });

  const result = await handleGetUserActivitySummary(request());

  expect(result).toEqual({ status: 403, payload: { error: "Solo un admin puede consultar la actividad de otra cuenta." } });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

it("suma el recuento de las 3 tablas y toma la fecha más reciente entre ellas", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    worklog: { count: 3, latest: { updated_at: "2026-09-01T10:00:00.000Z" } },
    comisiones: { count: 2, latest: { updated_at: "2026-09-05T08:00:00.000Z" } },
    colleague_payments: { count: 1, latest: { updated_at: "2026-08-20T12:00:00.000Z" } },
  }));

  const result = await handleGetUserActivitySummary(request());

  expect(result).toEqual({ status: 200, payload: { count: 6, lastActivityAt: "2026-09-05T08:00:00.000Z" } });
});

it("cuenta también una baja lógica reciente (deleted_at) como la actividad más reciente, aunque el recuento activo no la incluya", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    worklog: { count: 0, latest: { updated_at: "2026-09-07T09:00:00.000Z" } }, // fila borrada lógicamente, no cuenta pero sí actualiza la fecha
    comisiones: { count: 0, latest: null },
    colleague_payments: { count: 0, latest: null },
  }));

  const result = await handleGetUserActivitySummary(request());

  expect(result).toEqual({ status: 200, payload: { count: 0, lastActivityAt: "2026-09-07T09:00:00.000Z" } });
});

it("devuelve lastActivityAt null si el usuario no tiene ningún movimiento", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    worklog: { count: 0, latest: null },
    comisiones: { count: 0, latest: null },
    colleague_payments: { count: 0, latest: null },
  }));

  const result = await handleGetUserActivitySummary(request());

  expect(result).toEqual({ status: 200, payload: { count: 0, lastActivityAt: null } });
});

it("devuelve 500 si falla la consulta de recuento", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    worklog: { countError: { message: "boom" } },
  }));

  const result = await handleGetUserActivitySummary(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo consultar la actividad de la cuenta." } });
});
