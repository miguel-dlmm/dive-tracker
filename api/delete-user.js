import { handleDeleteUser } from "../server/users/deleteUser.js";

// Adaptador Vercel — solo traduce req/res de Vercel hacia/desde la firma
// normalizada de handleDeleteUser. Sin lógica de negocio aquí.
export default async function handler(req, res) {
  const { status, payload } = await handleDeleteUser({
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
  res.status(status).json(payload);
}
