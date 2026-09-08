vi.mock("../supabaseAdmin.js", () => ({
  getServiceRoleClient: vi.fn(),
}));

import { generateActivationLink } from "./activationLink.js";
import { getServiceRoleClient } from "../supabaseAdmin.js";

const APP_URL = "https://app.oceanpulse.example";
const EMAIL = "diver@example.com";

function makeClient(generateLinkResult = { data: { properties: { hashed_token: "hashed-token-abc" } }, error: null }) {
  return { auth: { admin: { generateLink: vi.fn().mockResolvedValue(generateLinkResult) } } };
}

beforeEach(() => {
  process.env.APP_URL = APP_URL;
  getServiceRoleClient.mockReset();
  getServiceRoleClient.mockReturnValue(makeClient());
});

afterEach(() => {
  delete process.env.APP_URL;
});

it("sin flow: el enlace no incluye el parámetro flow", async () => {
  const { activationLink, error } = await generateActivationLink(EMAIL);

  expect(error).toBeNull();
  const url = new URL(activationLink);
  expect(url.searchParams.has("flow")).toBe(false);
  expect(url.searchParams.get("token_hash")).toBe("hashed-token-abc");
  expect(url.searchParams.get("type")).toBe("recovery");
  expect(url.searchParams.get("email")).toBe(EMAIL);
});

it("con flow: 'recovery' (recuperación autoservicio), el enlace lo incluye — así AuthGate sabe mostrar ResetPasswordScreen", async () => {
  const { activationLink, error } = await generateActivationLink(EMAIL, { flow: "recovery" });

  expect(error).toBeNull();
  const url = new URL(activationLink);
  expect(url.searchParams.get("flow")).toBe("recovery");
});

it("baseUrl gana sobre APP_URL cuando se pasa (bug real: Preview Deployments distintos de APP_URL generaban enlaces al dominio equivocado)", async () => {
  const previewUrl = "https://dive-tracker-git-feature-x-ocean-pulse1.vercel.app";

  const { activationLink, error } = await generateActivationLink(EMAIL, { flow: "recovery", baseUrl: previewUrl });

  expect(error).toBeNull();
  expect(activationLink.startsWith(previewUrl)).toBe(true);
});

it("sin baseUrl, sigue usando APP_URL como antes (compatibilidad de los demás llamadores)", async () => {
  const { activationLink, error } = await generateActivationLink(EMAIL, { flow: "recovery" });

  expect(error).toBeNull();
  expect(activationLink.startsWith(APP_URL)).toBe(true);
});

it("sin baseUrl ni APP_URL: error controlado, no lanza", async () => {
  delete process.env.APP_URL;

  const result = await generateActivationLink(EMAIL, { flow: "recovery" });

  expect(result).toEqual({ activationLink: null, error: "No se pudo generar el enlace de activación." });
});

it("devuelve error sin lanzar si falla generateLink, con o sin flow", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({ data: null, error: { message: "rate limit" } }));

  const result = await generateActivationLink(EMAIL, { flow: "recovery" });

  expect(result).toEqual({ activationLink: null, error: "No se pudo generar el enlace de activación." });
});
