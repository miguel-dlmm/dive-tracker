import { sendViaResend } from "./providers/resendProvider.js";
import { renderActivationEmailHtml, renderActivationEmailText, ACTIVATION_EMAIL_COPY } from "./templates/activationEmailTemplate.js";
import { renderDeploymentNoticeEmailHtml, renderDeploymentNoticeEmailText } from "./templates/deploymentNoticeEmailTemplate.js";

// Única puerta de entrada al envío de emails — createUser.js,
// regenerateActivationLink.js y regeneratePassword.js dependen solo de
// sendActivationEmail(), nunca de Resend directamente. Cambiar de proveedor
// en el futuro es sustituir este import por otro archivo con la misma firma
// { to, subject, html, text } → { sent, error } en providers/ — sin tocar
// ningún flujo de negocio ni sus tests (que mockean este módulo, no Resend).
const sendEmail = sendViaResend;

// Nunca lanza — envío best-effort a propósito: si falla, la cuenta ya existe
// y el llamador puede seguir compartiendo el enlace a mano (ver action_link
// en cada uno de los tres flujos).
export async function sendActivationEmail({ email, firstName, nickname, actionLink, reason = "signup" }) {
  if (!actionLink) {
    return { sent: false, error: "Falta el enlace de acceso." };
  }

  const copy = ACTIVATION_EMAIL_COPY[reason] || ACTIVATION_EMAIL_COPY.signup;
  const displayName = firstName || nickname;

  try {
    return await sendEmail({
      to: email,
      subject: copy.subject,
      html: renderActivationEmailHtml({ firstName: displayName, actionLink, copy }),
      text: renderActivationEmailText({ firstName: displayName, actionLink, copy }),
    });
  } catch (err) {
    console.error("sendActivationEmail: excepción inesperada", err);
    return { sent: false, error: "No se pudo enviar el email." };
  }
}

// Nunca lanza — mismo contrato best-effort que sendActivationEmail(): si
// falla, notifyDeployment.js ya ha registrado el aviso en la tabla, así
// que el slide in-app lo mostrará igual aunque el email no llegue.
export async function sendDeploymentNoticeEmail({ email, notice }) {
  try {
    return await sendEmail({
      to: email,
      subject: `Ocean Flow — nuevo despliegue: ${notice.summary}`,
      html: renderDeploymentNoticeEmailHtml({ notice }),
      text: renderDeploymentNoticeEmailText({ notice }),
    });
  } catch (err) {
    console.error("sendDeploymentNoticeEmail: excepción inesperada", err);
    return { sent: false, error: "No se pudo enviar el email." };
  }
}
