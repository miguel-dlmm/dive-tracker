import { handleExternalRegister } from "../../server/users/externalRegister.js";

// Adaptador Netlify — solo traduce el formato de evento de Netlify hacia/desde
// la firma normalizada de handleExternalRegister. Sin lógica de negocio aquí.
export const handler = async (event) => {
  const { status, payload } = await handleExternalRegister({
    method: event.httpMethod,
    body: event.body,
  });
  return { statusCode: status, body: JSON.stringify(payload) };
};
