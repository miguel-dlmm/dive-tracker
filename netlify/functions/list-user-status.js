import { handleListUserStatus } from "../../server/users/listUserStatus.js";

// Adaptador Netlify — solo traduce el formato de evento de Netlify hacia/desde
// la firma normalizada de handleListUserStatus. Sin lógica de negocio aquí.
export const handler = async (event) => {
  const { status, payload } = await handleListUserStatus({
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
  });
  return { statusCode: status, body: JSON.stringify(payload) };
};
