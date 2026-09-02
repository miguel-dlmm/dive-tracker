import { handleGenerateInvitationLink } from "../server/users/generateInvitationLink.js";

// Adaptador Vercel — solo traduce req/res de Vercel hacia/desde la firma
// normalizada de handleGenerateInvitationLink. Sin lógica de negocio aquí.
export default async function handler(req, res) {
  const { status, payload } = await handleGenerateInvitationLink({
    method: req.method,
    headers: req.headers,
  });
  res.status(status).json(payload);
}
