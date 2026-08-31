import { handleRequestPasswordReset } from "../server/users/requestPasswordReset.js";

// Adaptador Vercel — solo traduce req/res de Vercel hacia/desde la firma
// normalizada de handleRequestPasswordReset. Sin lógica de negocio aquí.
export default async function handler(req, res) {
  const { status, payload } = await handleRequestPasswordReset({
    method: req.method,
    body: req.body,
  });
  res.status(status).json(payload);
}
