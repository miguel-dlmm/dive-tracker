vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  verifyCaller: vi.fn(),
  requireSuperadmin: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

import { handleGenerateInvitationLink } from "./generateInvitationLink.js";
import { getServiceRoleClient, verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";

const APP_URL = "https://app.oceanpulse.example";

function request(overrides = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    ...overrides,
  };
}

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  verifyCaller.mockResolvedValue({ id: "caller-1" });
  requireSuperadmin.mockResolvedValue(null);
  getServiceRoleClient.mockReset();
  process.env.APP_URL = APP_URL;
  vi.useRealTimers();
});

afterEach(() => {
  delete process.env.APP_URL;
});

it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
  const result = await handleGenerateInvitationLink(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleGenerateInvitationLink(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 500 si falta APP_URL", async () => {
  delete process.env.APP_URL;

  const result = await handleGenerateInvitationLink(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 401 si no hay token de sesión", async () => {
  const result = await handleGenerateInvitationLink(request({ headers: {} }));

  expect(result).toEqual({ status: 401, payload: { error: "Falta el token de sesión." } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 401 si el token no corresponde a una sesión válida", async () => {
  verifyCaller.mockResolvedValue(null);

  const result = await handleGenerateInvitationLink(request());

  expect(result).toEqual({ status: 401, payload: { error: "Sesión inválida o caducada." } });
});

it("devuelve 403 si quien llama no es superadmin, sin tocar Supabase", async () => {
  requireSuperadmin.mockResolvedValue({ status: 403, payload: { error: "Solo un superadmin puede generar enlaces de invitación." } });

  const result = await handleGenerateInvitationLink(request());

  expect(result).toEqual({ status: 403, payload: { error: "Solo un superadmin puede generar enlaces de invitación." } });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

describe("con permisos válidos", () => {
  let insert, select, single, from;

  beforeEach(() => {
    single = vi.fn().mockResolvedValue({ data: { token: "11111111-1111-1111-1111-111111111111" }, error: null });
    select = vi.fn(() => ({ single }));
    insert = vi.fn(() => ({ select }));
    from = vi.fn(() => ({ insert }));
    getServiceRoleClient.mockReturnValue({ from });
  });

  it("inserta una fila en invitation_links con el creador y una caducidad de 24h", async () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-09-02T00:00:00.000Z"));

    await handleGenerateInvitationLink(request());

    expect(from).toHaveBeenCalledWith("invitation_links");
    expect(insert).toHaveBeenCalledWith({ created_by: "caller-1", expires_at: "2026-09-03T00:00:00.000Z" });
  });

  it("devuelve la URL de invitación construida con el token real y APP_URL", async () => {
    const result = await handleGenerateInvitationLink(request());

    expect(result.status).toBe(200);
    const url = new URL(result.payload.invitation_link);
    expect(url.origin).toBe(new URL(APP_URL).origin);
    expect(url.searchParams.get("invite")).toBe("11111111-1111-1111-1111-111111111111");
    expect(result.payload.expires_at).toBeTruthy();
  });

  it("devuelve 500 si Supabase falla al insertar la fila", async () => {
    single.mockResolvedValue({ data: null, error: { message: "boom" } });

    const result = await handleGenerateInvitationLink(request());

    expect(result).toEqual({ status: 500, payload: { error: "No se pudo generar el enlace de invitación." } });
  });
});
