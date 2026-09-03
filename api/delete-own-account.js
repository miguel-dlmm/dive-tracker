import { handleDeleteOwnAccount } from "../server/users/deleteOwnAccount.js";

// Adaptador Vercel — solo traduce req/res de Vercel hacia/desde la firma
// normalizada de handleDeleteOwnAccount. Sin lógica de negocio aquí.
export default async function handler(req, res) {
  const { status, payload } = await handleDeleteOwnAccount({
    method: req.method,
    headers: req.headers,
  });
  res.status(status).json(payload);
}
