import { renderEmailShell, escapeHtml, BRAND_NAVY } from "./emailLayout.js";

// Generalización de la plantilla de bienvenida (antes welcomeEmailTemplate.js)
// para que un único template sirva a los tres flujos que envían "aquí tienes
// un enlace para entrar y fijar tu contraseña": alta, reactivación y
// regenerar contraseña. Solo cambia el copy (motivo), nunca el layout —
// evita triplicar HTML/texto para el mismo email con distinto contexto.
export const ACTIVATION_EMAIL_COPY = {
  signup: {
    subject: "Tu acceso a Ocean Flow ya está listo",
    preheader: "Entra y crea tu contraseña para empezar.",
    title: "Bienvenido/a a Ocean Flow",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Ya tienes cuenta en Ocean Flow, la herramienta que usamos para llevar el control de clases, comisiones y pagos.",
    ctaLabel: "Entrar en Ocean Flow",
    securityNote: "Al pulsar el botón entrarás directamente. Como primer paso, te pediremos que crees tu propia contraseña.",
    expiryNote: "Este enlace es de un solo uso y caduca pronto — si ha caducado, pide a un administrador que te lo reenvíe.",
    footer: "Ocean Flow",
  },
  // Registro externo (ADR-0023) — a diferencia de "signup" (alta manual
  // por un admin), aquí la propia persona se ha registrado, así que el
  // tono confirma su propia acción ("gracias por registrarte") en vez de
  // avisar de un alta hecha por otra persona.
  external_signup: {
    subject: "Confirma tu cuenta en Ocean Flow",
    preheader: "Entra y crea tu contraseña para empezar.",
    title: "¡Gracias por registrarte en Ocean Flow!",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Ya casi está — confirma tu cuenta para empezar a llevar el control de tus clases, comisiones y pagos.",
    ctaLabel: "Confirmar cuenta",
    securityNote: "Al pulsar el botón entrarás directamente. Como primer paso, te pediremos que crees tu propia contraseña.",
    expiryNote: "Este enlace es de un solo uso y caduca pronto — si ha caducado, vuelve a registrarte desde la pantalla de acceso.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Tu acceso a Ocean Flow ha sido reactivado",
    preheader: "Entra y crea tu contraseña para volver a acceder.",
    title: "Bienvenido/a de nuevo a Ocean Flow",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "¡Buenas noticias! Tu cuenta en Ocean Flow ya está activa de nuevo.",
    ctaLabel: "Entrar en Ocean Flow",
    securityNote: "Al pulsar el botón entrarás directamente. Como primer paso, te pediremos que crees tu propia contraseña.",
    expiryNote: "Este enlace es de un solo uso y caduca pronto — si ha caducado, pide a un administrador que te lo reenvíe.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Se ha restablecido tu contraseña en Ocean Flow",
    preheader: "Crea tu nueva contraseña para volver a acceder.",
    title: "Restablece tu contraseña",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Hemos restablecido tu contraseña en Ocean Flow — crea una nueva con el siguiente enlace.",
    ctaLabel: "Crear nueva contraseña",
    securityNote: "Al pulsar el botón entrarás directamente. Como primer paso, te pediremos que crees tu nueva contraseña.",
    expiryNote: "Este enlace es de un solo uso y caduca pronto — si ha caducado, pide a un administrador que te lo reenvíe.",
    footer: "Ocean Flow",
  },
  // Distinto de "password_reset" (ese es cuando UN ADMIN invalida la
  // contraseña de otra cuenta). Este es autoservicio — la propia persona
  // lo ha pedido desde "¿Olvidaste tu contraseña?" en el login — así que el
  // tono es "lo pediste tú" en vez de "un admin te la ha invalidado", y
  // añade la nota de seguridad estándar de "si no has sido tú, ignóralo".
  password_reset_request: {
    subject: "Restablece tu contraseña en Ocean Flow",
    preheader: "Crea una nueva contraseña para volver a acceder.",
    title: "Restablece tu contraseña",
    greeting: (firstName) => `Hola${firstName ? ` ${firstName}` : ""},`,
    intro: "Has solicitado restablecer tu contraseña en Ocean Flow. Si no has sido tú, puedes ignorar este email — tu contraseña actual seguirá funcionando.",
    ctaLabel: "Crear nueva contraseña",
    securityNote: "Al pulsar el botón entrarás directamente. Como primer paso, te pediremos que crees tu nueva contraseña.",
    expiryNote: "Este enlace es de un solo uso y caduca pronto — si ha caducado, vuelve a solicitar la recuperación desde la pantalla de acceso.",
    footer: "Ocean Flow",
  },
};

// Copy en inglés (2026-09-29, primer corte de idiomas para el email de
// bienvenida — pedido explícito: "el email de bienvenida se enviará en el
// idioma elegido por supuesto"). De los 15 idiomas que soporta la app,
// solo español (arriba) e inglés (aquí) tienen plantilla propia por ahora;
// el resto cae a español vía resolveActivationEmailCopy() más abajo hasta
// un pase de traducción aparte — decisión explícita del usuario para no
// bloquear el resto del cableado (selector de idioma + enlaces con
// ?lang=) a tener las 15 traducciones listas de golpe.
export const ACTIVATION_EMAIL_COPY_EN = {
  signup: {
    subject: "Your Ocean Flow access is ready",
    preheader: "Sign in and create your password to get started.",
    title: "Welcome to Ocean Flow",
    greeting: (firstName) => `Hi${firstName ? ` ${firstName}` : ""},`,
    intro: "You now have an Ocean Flow account, the tool we use to track classes, commissions and payments.",
    ctaLabel: "Sign in to Ocean Flow",
    securityNote: "Clicking the button will sign you in directly. As a first step, we'll ask you to create your own password.",
    expiryNote: "This link is single-use and expires soon — if it has expired, ask an administrator to resend it.",
    footer: "Ocean Flow",
  },
  external_signup: {
    subject: "Confirm your Ocean Flow account",
    preheader: "Sign in and create your password to get started.",
    title: "Thanks for signing up to Ocean Flow!",
    greeting: (firstName) => `Hi${firstName ? ` ${firstName}` : ""},`,
    intro: "Almost there — confirm your account to start tracking your classes, commissions and payments.",
    ctaLabel: "Confirm account",
    securityNote: "Clicking the button will sign you in directly. As a first step, we'll ask you to create your own password.",
    expiryNote: "This link is single-use and expires soon — if it has expired, sign up again from the login screen.",
    footer: "Ocean Flow",
  },
  reactivation: {
    subject: "Your Ocean Flow access has been reactivated",
    preheader: "Sign in and create your password to access again.",
    title: "Welcome back to Ocean Flow",
    greeting: (firstName) => `Hi${firstName ? ` ${firstName}` : ""},`,
    intro: "Good news! Your Ocean Flow account is active again.",
    ctaLabel: "Sign in to Ocean Flow",
    securityNote: "Clicking the button will sign you in directly. As a first step, we'll ask you to create your own password.",
    expiryNote: "This link is single-use and expires soon — if it has expired, ask an administrator to resend it.",
    footer: "Ocean Flow",
  },
  password_reset: {
    subject: "Your Ocean Flow password has been reset",
    preheader: "Create your new password to access again.",
    title: "Reset your password",
    greeting: (firstName) => `Hi${firstName ? ` ${firstName}` : ""},`,
    intro: "We've reset your password on Ocean Flow — create a new one with the link below.",
    ctaLabel: "Create new password",
    securityNote: "Clicking the button will sign you in directly. As a first step, we'll ask you to create your new password.",
    expiryNote: "This link is single-use and expires soon — if it has expired, ask an administrator to resend it.",
    footer: "Ocean Flow",
  },
  password_reset_request: {
    subject: "Reset your Ocean Flow password",
    preheader: "Create a new password to access again.",
    title: "Reset your password",
    greeting: (firstName) => `Hi${firstName ? ` ${firstName}` : ""},`,
    intro: "You requested to reset your password on Ocean Flow. If this wasn't you, you can ignore this email — your current password will keep working.",
    ctaLabel: "Create new password",
    securityNote: "Clicking the button will sign you in directly. As a first step, we'll ask you to create your new password.",
    expiryNote: "This link is single-use and expires soon — if it has expired, request password recovery again from the login screen.",
    footer: "Ocean Flow",
  },
};

// Única función que decide qué tabla de copy usar según el idioma elegido
// en las pantallas de entrada (Login/Registro/recuperar contraseña...) —
// hoy solo "en" tiene tabla propia; cualquier otro valor (incluido
// undefined, el comportamiento de siempre antes de esta función) cae a
// español. EmailService.js es el único llamador — no repitas esta
// resolución en otro sitio.
export function resolveActivationEmailCopy(reason, language) {
  const table = language === "en" ? ACTIVATION_EMAIL_COPY_EN : ACTIVATION_EMAIL_COPY;
  return table[reason] || table.signup;
}

// HTML con tabla + CSS inline a propósito: los clientes de email (Outlook
// sobre todo) no soportan Flexbox/Grid ni <style> externo, así que este
// template no puede reutilizar las clases Tailwind del resto de la app —
// es su propio sistema reducido, coherente en color/tipografía con el
// resto de la app (mismo BRAND_NAVY, mismo logo real que el resto de la
// app — ver emailLayout.js). Una sola columna, mobile-first.
export function renderActivationEmailHtml({ firstName, actionLink, copy = ACTIVATION_EMAIL_COPY.signup }) {
  const safeName = escapeHtml(firstName);
  const safeLink = escapeHtml(actionLink);
  const bodyRows = `
    <tr>
      <td style="padding:12px 28px 0 28px;">
        <h1 style="margin:0 0 16px 0;font-size:20px;color:${BRAND_NAVY};">${escapeHtml(copy.title)}</h1>
        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#374151;">${copy.greeting(safeName)}</p>
        <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#374151;">${escapeHtml(copy.intro)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px;text-align:center;">
        <a href="${safeLink}" style="display:inline-block;width:100%;max-width:320px;box-sizing:border-box;background-color:${BRAND_NAVY};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:8px;">${escapeHtml(copy.ctaLabel)}</a>
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
    </tr>`;
  return renderEmailShell({ preheader: copy.preheader, bodyRows, footerText: copy.footer });
}

// Parte de texto plano — mejora la entregabilidad en clientes/filtros que
// la valoran, coste mínimo al reutilizar el mismo copy.
export function renderActivationEmailText({ firstName, actionLink, copy = ACTIVATION_EMAIL_COPY.signup }) {
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
