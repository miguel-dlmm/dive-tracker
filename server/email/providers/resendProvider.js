// Envío vía la API REST de Resend — sin SDK, una única llamada fetch (el
// paquete completo del SDK para un solo endpoint no compensa en un MVP).
// RESEND_API_KEY y EMAIL_FROM viven solo en el entorno de servidor, igual
// que SUPABASE_SERVICE_ROLE_KEY — nunca con prefijo VITE_.
//
// Firma genérica a propósito ({ to, subject, html, text } → { sent, error }):
// es el único archivo del proyecto que sabe que el proveedor es Resend.
// EmailService (../EmailService.js) es el único que lo importa — cambiar de
// proveedor en el futuro es escribir un archivo hermano con esta misma firma
// y sustituir ese import, sin tocar ningún flujo de negocio.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function hasConfig() {
  return Boolean(RESEND_API_KEY && EMAIL_FROM);
}

// Nunca lanza — devuelve { sent: false, error } en cualquier fallo para que
// el llamador decida cómo reaccionar sin necesitar try/catch propio.
export async function sendViaResend({ to, subject, html, text }) {
  if (!hasConfig()) {
    console.error("resendProvider: falta RESEND_API_KEY o EMAIL_FROM en el entorno del servidor");
    return { sent: false, error: "Configuración de email incompleta." };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html, text }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      console.error("resendProvider: Resend devolvió un error", res.status, payload);
      return { sent: false, error: "No se pudo enviar el email." };
    }

    return { sent: true };
  } catch (err) {
    console.error("resendProvider: fallo de red al llamar a Resend", err);
    return { sent: false, error: "No se pudo enviar el email." };
  }
}
