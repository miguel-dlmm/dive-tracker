import { handleRegeneratePassword } from "../../server/users/regeneratePassword.js";

// Adaptador Netlify — solo traduce el formato de evento de Netlify hacia/desde
// la firma normalizada de handleRegeneratePassword. Sin lógica de negocio aquí.
export const handler = async (event) => {
  const { status, payload } = await handleRegeneratePassword({
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
  });
  return { statusCode: status, body: JSON.stringify(payload) };
};
