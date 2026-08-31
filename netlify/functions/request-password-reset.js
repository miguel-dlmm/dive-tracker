import { handleRequestPasswordReset } from "../../server/users/requestPasswordReset.js";

// Adaptador Netlify — solo traduce el formato de evento de Netlify hacia/desde
// la firma normalizada de handleRequestPasswordReset. Sin lógica de negocio aquí.
export const handler = async (event) => {
  const { status, payload } = await handleRequestPasswordReset({
    method: event.httpMethod,
    body: event.body,
  });
  return { statusCode: status, body: JSON.stringify(payload) };
};
