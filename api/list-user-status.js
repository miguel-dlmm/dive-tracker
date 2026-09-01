import { handleListUserStatus } from "../server/users/listUserStatus.js";

// Adaptador Vercel — solo traduce req/res de Vercel hacia/desde la firma
// normalizada de handleListUserStatus. Sin lógica de negocio aquí.
export default async function handler(req, res) {
  const { status, payload } = await handleListUserStatus({
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
  res.status(status).json(payload);
}
