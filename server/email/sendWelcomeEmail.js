import { renderWelcomeEmailHtml, renderWelcomeEmailText, WELCOME_EMAIL_COPY } from "./welcomeEmailTemplate.js";

// Envío vía la API REST de Resend — sin SDK, una única llamada fetch (el
// paquete completo del SDK para un solo endpoint no compensa en un MVP).
// RESEND_API_KEY y EMAIL_FROM viven solo en el entorno de servidor, igual
// que SUPABASE_SERVICE_ROLE_KEY — nunca con prefijo VITE_.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function hasEmailConfig() {
  return Boolean(RESEND_API_KEY && EMAIL_FROM);
}

// Nunca lanza — es un envío best-effort a propósito: si falla, la cuenta
// ya se ha creado y el admin puede seguir compartiendo la contraseña
// inicial a mano (respaldo temporal mientras se valida este flujo, ver
// createUser.js).
export async function sendWelcomeEmail({ email, firstName, nickname, actionLink }) {
  if (!actionLink) {
    return { sent: false, error: "Falta el enlace de acceso." };
  }
  if (!hasEmailConfig()) {
    console.error("sendWelcomeEmail: falta RESEND_API_KEY o EMAIL_FROM en el entorno del servidor");
    return { sent: false, error: "Configuración de email incompleta." };
  }

  const displayName = firstName || nickname;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: email,
        subject: WELCOME_EMAIL_COPY.subject,
        html: renderWelcomeEmailHtml({ firstName: displayName, actionLink }),
        text: renderWelcomeEmailText({ firstName: displayName, actionLink }),
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      console.error("sendWelcomeEmail: Resend devolvió un error", res.status, payload);
      return { sent: false, error: "No se pudo enviar el email de bienvenida." };
    }

    return { sent: true };
  } catch (err) {
    console.error("sendWelcomeEmail: fallo de red al llamar a Resend", err);
    return { sent: false, error: "No se pudo enviar el email de bienvenida." };
  }
}
