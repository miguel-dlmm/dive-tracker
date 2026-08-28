import { handleDeleteUser } from "../../server/users/deleteUser.js";

// Adaptador Netlify — solo traduce el formato de evento de Netlify hacia/desde
// la firma normalizada de handleDeleteUser. Sin lógica de negocio aquí.
export const handler = async (event) => {
  const { status, payload } = await handleDeleteUser({
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
  });
  return { statusCode: status, body: JSON.stringify(payload) };
};
