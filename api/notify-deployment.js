import { handleNotifyDeployment } from "../server/notifications/notifyDeployment.js";

// Adaptador Vercel — solo traduce req/res de Vercel hacia/desde la firma
// normalizada de handleNotifyDeployment. Sin lógica de negocio aquí.
export default async function handler(req, res) {
  const { status, payload } = await handleNotifyDeployment({
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
  res.status(status).json(payload);
}
