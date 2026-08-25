// Copy del email de bienvenida — primera versión, deliberadamente editable
// sin tocar la lógica de envío (ver sendWelcomeEmail.js) ni de renderizado.
// Tono cercano-profesional, coherente con el resto de la app. No es texto
// definitivo — iterar aquí libremente.
export const WELCOME_EMAIL_COPY = {
  subject: "Tu acceso a Ocean Pulse ya está listo",
  preheader: "Entra y crea tu contraseña para empezar.",
  title: "Bienvenido/a a Ocean Pulse",
  greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
  intro: "Se te ha dado de alta en Ocean Pulse, la herramienta que usamos para llevar el control de clases, comisiones y pagos.",
  ctaLabel: "Entrar en Ocean Pulse",
  securityNote: "Al pulsar el botón entrarás directamente. Como primer paso, te pediremos que crees tu propia contraseña.",
  expiryNote: "Este enlace es de un solo uso y caduca pronto — si ha caducado, pide a un administrador que te lo reenvíe.",
  footer: "Ocean Pulse — by Ocean Flow",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// HTML con tabla + CSS inline a propósito: los clientes de email (Outlook
// sobre todo) no soportan Flexbox/Grid ni <style> externo, así que este
// template no puede reutilizar las clases Tailwind del resto de la app —
// es su propio sistema reducido, coherente en color/tipografía pero
// técnicamente independiente. Una sola columna, mobile-first.
export function renderWelcomeEmailHtml({ firstName, actionLink, copy = WELCOME_EMAIL_COPY }) {
  const safeName = escapeHtml(firstName);
  const safeLink = escapeHtml(actionLink);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#F7F8F8;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#F7F8F8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(copy.preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F8F8;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px 28px 8px 28px;text-align:center;">
                <div style="font-size:15px;font-weight:700;color:#0F172A;">Ocean Pulse</div>
                <div style="font-size:11px;color:#9CA3AF;margin-top:2px;">by Ocean Flow</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 0 28px;">
                <h1 style="margin:0 0 16px 0;font-size:20px;color:#0F172A;">${escapeHtml(copy.title)}</h1>
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#374151;">${copy.greeting(safeName)}</p>
                <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#374151;">${escapeHtml(copy.intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px;text-align:center;">
                <a href="${safeLink}" style="display:inline-block;width:100%;max-width:320px;box-sizing:border-box;background-color:#0F766E;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:8px;">${escapeHtml(copy.ctaLabel)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 0 28px;">
                <p style="margin:0;font-size:12.5px;line-height:1.6;color:#6B7280;text-align:center;">${escapeHtml(copy.securityNote)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 32px 28px;">
                <p style="margin:0;font-size:11.5px;line-height:1.5;color:#9CA3AF;text-align:center;">${escapeHtml(copy.expiryNote)}</p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0 0;font-size:11px;color:#9CA3AF;">${escapeHtml(copy.footer)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Parte de texto plano — mejora la entregabilidad en clientes/filtros que
// la valoran, coste mínimo al reutilizar el mismo copy.
export function renderWelcomeEmailText({ firstName, actionLink, copy = WELCOME_EMAIL_COPY }) {
  return [
    copy.greeting(firstName),
    "",
    copy.intro,
    "",
    `${copy.ctaLabel}: ${actionLink}`,
    "",
    copy.securityNote,
    copy.expiryNote,
    "",
    copy.footer,
  ].join("\n");
}
