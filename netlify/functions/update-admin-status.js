import { handleUpdateAdminStatus } from "../../server/users/updateAdminStatus.js";

// Adaptador Netlify — solo traduce el formato de evento de Netlify hacia/desde
// la firma normalizada de handleUpdateAdminStatus. Sin lógica de negocio aquí.
export const handler = async (event) => {
  const { status, payload } = await handleUpdateAdminStatus({
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
  });
  return { statusCode: status, body: JSON.stringify(payload) };
};
