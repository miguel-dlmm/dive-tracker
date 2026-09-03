import { handleExternalRegister } from "../server/users/externalRegister.js";

// Adaptador Vercel — solo traduce req/res de Vercel hacia/desde la firma
// normalizada de handleExternalRegister. Sin lógica de negocio aquí.
export default async function handler(req, res) {
  const { status, payload } = await handleExternalRegister({
    method: req.method,
    body: req.body,
  });
  res.status(status).json(payload);
}
