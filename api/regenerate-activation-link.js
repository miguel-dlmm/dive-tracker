import { handleRegenerateActivationLink } from "../server/users/regenerateActivationLink.js";

// Adaptador Vercel — solo traduce req/res de Vercel hacia/desde la firma
// normalizada de handleRegenerateActivationLink. Sin lógica de negocio aquí.
export default async function handler(req, res) {
  const { status, payload } = await handleRegenerateActivationLink({
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
  res.status(status).json(payload);
}
