import { getServiceRoleClient, verifyCaller, isSuperadmin, hasServerConfig } from "../supabaseAdmin.js";
import { sendWelcomeEmail } from "../email/sendWelcomeEmail.js";

// Alta de usuarios (MVP) — el acceso depende exclusivamente del enlace de
// primer acceso: justo debajo se genera un enlace de recovery de un solo
// uso y se envía por email, para que el usuario entre y fije su propia
// contraseña (ver CreatePasswordScreen) sin que nadie tenga que
// comunicarle ninguna. auth.admin.createUser() no recibe password —
// Supabase permite crear la cuenta sin ella; la cuenta queda sin
// contraseña utilizable hasta que el propio usuario la fija.
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
  if (message.includes("unknown setup dataset")) return "El dataset seleccionado ya no existe. Recarga la página e inténtalo de nuevo.";
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

// Se reutiliza tanto al pedir el enlace a Supabase como al construir la URL
// de activación de abajo, para que ambos usos no puedan desincronizarse.
const ACTIVATION_LINK_TYPE = "recovery";

// URL de activación propia de la app — NUNCA se envía el action_link de
// Supabase directamente (ver el uso más abajo). Ese enlace apunta al
// endpoint público de verificación de Supabase, que consume el token con un
// simple GET: un escáner de email/link-preview que lo precargue lo
// invalidaría antes de que el usuario llegue a pulsarlo. Con esta URL
// propia, cargar la página no consume nada — solo lo hace activateAccount()
// al enviar el formulario (ver useSession.js). email va en la URL a
// propósito: AuthGate lo necesitará para poder detectar una sesión ajena
// más adelante (ver App.jsx), y no añade exposición nueva — es el mismo
// email al que ya se envía este correo.
function buildActivationUrl(baseUrl, { tokenHash, email }) {
  const url = new URL(baseUrl);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", ACTIVATION_LINK_TYPE);
  url.searchParams.set("email", email);
  return url.toString();
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

  const { email, first_name, last_name, nickname, dataset_key } = input;
  if (!email || !nickname || !dataset_key) {
    return { status: 400, payload: { error: "Email, nickname y dataset inicial son obligatorios." } };
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

  // Dataset inicial obligatorio: sin esto, el alta dejaría al usuario con
  // escuelas/actividades/tarifas/comisiones/catálogos de pago completamente
  // vacíos. A diferencia del bloque best-effort de más abajo, un fallo aquí
  // SÍ deshace el alta — no se deja un usuario a medias, sin configuración
  // inicial (mismo criterio que ya sigue scripts/create-demo-user.js).
  const { error: cloneError } = await getServiceRoleClient().rpc("clone_setup_dataset", {
    p_dataset_key: dataset_key,
    p_target_user_id: created.user.id,
  });
  if (cloneError) {
    console.error(cloneError);
    await getServiceRoleClient().auth.admin.deleteUser(created.user.id);
    return { status: 400, payload: { error: friendlyError(cloneError.message) } };
  }

  // Enlace de primer acceso + email de bienvenida — best-effort: la cuenta
  // ya está creada, así que un fallo aquí no debe impedir la respuesta de
  // éxito. Si falla, el admin puede seguir compartiendo la contraseña
  // inicial a mano (ver comentario de arriba).
  let emailSent = false;
  let emailError = null;
  let activationLink;
  const { data: linkData, error: linkError } = await getServiceRoleClient().auth.admin.generateLink({
    type: ACTIVATION_LINK_TYPE,
    email,
    options: { redirectTo: process.env.APP_URL },
  });

  if (linkError) {
    console.error("create-user: no se pudo generar el enlace de primer acceso", linkError);
    emailError = "No se pudo generar el enlace de acceso.";
  } else if (!process.env.APP_URL || !linkData?.properties?.hashed_token) {
    // Ya no hay Site URL de Supabase de respaldo como antes: el
    // action_link de Supabase no se usa (ver buildActivationUrl), así que
    // sin APP_URL no hay base para construir ningún enlace de activación.
    console.error("create-user: no se pudo construir el enlace de activación — falta APP_URL o hashed_token en la respuesta de generateLink");
    emailError = "No se pudo generar el enlace de acceso.";
  } else {
    activationLink = buildActivationUrl(process.env.APP_URL, { tokenHash: linkData.properties.hashed_token, email });
    // try/catch defensivo: sendWelcomeEmail está documentado como "nunca
    // lanza", pero no dependemos solo de esa convención — si algún día deja
    // de cumplirse, esto sigue garantizando email_sent:false + el fallback
    // de action_link en vez de tumbar toda la petición sin respuesta útil.
    try {
      const result = await sendWelcomeEmail({
        email,
        firstName: first_name,
        nickname,
        actionLink: activationLink,
      });
      emailSent = result.sent;
      if (!result.sent) emailError = result.error;
    } catch (err) {
      console.error("create-user: sendWelcomeEmail lanzó una excepción inesperada", err);
      emailError = "No se pudo enviar el email de bienvenida.";
    }
  }

  // Fallback operativo MVP. Permite activar usuarios manualmente si el
  // proveedor de email falla. Revisar/eliminar antes de producción pública.
  // Solo se devuelve cuando el email NO se ha enviado (fallo de envío o
  // configuración incompleta) — si el envío funciona, la respuesta no
  // incluye el enlace y se comporta igual que antes de este fallback.
  const actionLink = !emailSent ? activationLink : undefined;

  return {
    status: 200,
    payload: {
      user_id: created.user.id,
      email_sent: emailSent,
      ...(emailError ? { email_error: emailError } : {}),
      ...(actionLink ? { action_link: actionLink } : {}),
    },
  };
}
