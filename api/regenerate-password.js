import { handleRegeneratePassword } from "../server/users/regeneratePassword.js";

// Adaptador Vercel — solo traduce req/res de Vercel hacia/desde la firma
// normalizada de handleRegeneratePassword. Sin lógica de negocio aquí.
export default async function handler(req, res) {
  const { status, payload } = await handleRegeneratePassword({
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
  res.status(status).json(payload);
}
