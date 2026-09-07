import { handleRequestPasswordReset } from "../server/users/requestPasswordReset.js";

// Adaptador Vercel — solo traduce req/res de Vercel hacia/desde la firma
// normalizada de handleRequestPasswordReset. Sin lógica de negocio aquí.
//
// baseUrl se calcula del host REAL de la petición entrante (bug real
// reportado 2026-09-07: el email de recuperación llevaba siempre a la
// URL fija de TEST, nunca a la del Preview Deployment concreto desde el
// que se pidió) — `req.headers.host` refleja el dominio exacto que el
// navegador está usando ahora mismo (producción, TEST o cualquier
// Preview de rama), a diferencia de la variable de entorno APP_URL, que
// es una única URL fija por proyecto Vercel. `x-forwarded-proto` porque
// Vercel siempre habla HTTP con la función por dentro; el protocolo real
// de cara al usuario va en esa cabecera, no en la petición interna.
export default async function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = req.headers.host ? `${proto}://${req.headers.host}` : undefined;
  const { status, payload } = await handleRequestPasswordReset({
    method: req.method,
    body: req.body,
    baseUrl,
  });
  res.status(status).json(payload);
}
