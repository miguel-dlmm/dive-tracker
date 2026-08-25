import { getServiceRoleClient, verifyCaller, isSuperadmin, hasServerConfig } from "../supabaseAdmin.js";
import { sendWelcomeEmail } from "../email/sendWelcomeEmail.js";

// Alta de usuarios (MVP) — el superadmin sigue fijando una contraseña
// inicial a mano (respaldo temporal mientras se valida el flujo nuevo:
// justo debajo, se genera además un enlace de recovery de un solo uso y se
// envía por email, para que el usuario pueda entrar y fijar su propia
// contraseña sin que nadie se la tenga que compartir). Cuando ese flujo
// esté validado, `password` dejará de ser obligatorio en el body.
//
// Lógica de negocio pura, sin nada de Netlify ni de Vercel: recibe una
// petición ya normalizada ({ method, headers, body }) y devuelve una
// respuesta normalizada ({ status, payload }). Los adaptadores de cada
// proveedor (netlify/functions/create-user.js, api/create-user.js) son los
// únicos que traducen el formato de evento/HTTP de su plataforma hacia/desde
// esta forma — así no hay lógica duplicada entre proveedores.

// Traduce violaciones de constraint conocidas de public.profiles a mensajes
// legibles; cualquier otro error (de Postgres o de GoTrue) se propaga tal
// cual, ya suele venir en un formato razonable.
function friendlyError(message) {
  if (!message) return "Error desconocido";
  if (message.includes("profiles_nickname_lower_key")) return "Ese nickname ya está en uso.";
  if (message.includes("profiles_nickname_no_at")) return 'El nickname no puede contener "@".';
  return message;
}

// Netlify entrega event.body como string; Vercel ya entrega req.body
// parseado como objeto cuando el Content-Type es JSON. Se acepta cualquiera
// de las dos formas aquí para que ningún adaptador tenga que parsear nada.
function parseBody(body) {
  if (body == null) return {};
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
}

// event.headers (Netlify) y req.headers (Vercel) no garantizan la misma
// capitalización, así que la búsqueda es case-insensitive.
function getHeader(headers, name) {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

export async function handleCreateUser({ method, headers, body }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("create-user: faltan variables de entorno de Supabase");
    return { status: 500, payload: { error: "Configuración del servidor incompleta." } };
  }

  const authHeader = getHeader(headers, "authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { status: 401, payload: { error: "Falta el token de sesión." } };
  }

  const input = parseBody(body);
  if (input === null) {
    return { status: 400, payload: { error: "Cuerpo de la petición inválido." } };
  }

  const { email, password, first_name, last_name, nickname } = input;
  if (!email || !password || !nickname) {
    return { status: 400, payload: { error: "Email, nickname y contraseña son obligatorios." } };
  }

  const caller = await verifyCaller(token);
  if (!caller) {
    return { status: 401, payload: { error: "Sesión inválida o caducada." } };
  }

  // Crear usuarios es exclusivo de superadmin — los admins normales solo
  // tienen acceso de lectura al directorio (ver ConfigTab → UsersDirectory).
  if (!(await isSuperadmin(caller.id))) {
    return { status: 403, payload: { error: "Solo un superadmin puede crear usuarios." } };
  }

  // is_admin / is_superadmin NUNCA se pasan aquí a propósito: handle_new_user()
  // no los toca al crear la fila de profiles, así que nace siempre con
  // ambos en false, sin importar lo que llegue en el body de esta función.
  const { data: created, error: createError } = await getServiceRoleClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: first_name || null,
      last_name: last_name || null,
      nickname,
    },
  });

  if (createError) {
    console.error(createError);
    return { status: 400, payload: { error: friendlyError(createError.message) } };
  }

  // Enlace de primer acceso + email de bienvenida — best-effort: la cuenta
  // ya está creada, así que un fallo aquí no debe impedir la respuesta de
  // éxito. Si falla, el admin puede seguir compartiendo la contraseña
  // inicial a mano (ver comentario de arriba).
  let emailSent = false;
  let emailError = null;
  const { data: linkData, error: linkError } = await getServiceRoleClient().auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: process.env.APP_URL },
  });

  if (linkError) {
    console.error("create-user: no se pudo generar el enlace de primer acceso", linkError);
    emailError = "No se pudo generar el enlace de acceso.";
  } else {
    const result = await sendWelcomeEmail({
      email,
      firstName: first_name,
      nickname,
      actionLink: linkData?.properties?.action_link,
    });
    emailSent = result.sent;
    if (!result.sent) emailError = result.error;
  }

  return {
    status: 200,
    payload: { user_id: created.user.id, email_sent: emailSent, ...(emailError ? { email_error: emailError } : {}) },
  };
}
