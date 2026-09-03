import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { DOCUMENT_TYPE as PRIVACY_TYPE, VERSION as PRIVACY_VERSION } from "./legal/privacyPolicy";
import { DOCUMENT_TYPE as TERMS_TYPE, VERSION as TERMS_VERSION } from "./legal/termsOfUse";
import { meetsPasswordPolicy } from "./passwordPolicy";

// Documentos legales vigentes — la versión es una constante de código (ver
// legal/privacyPolicy.js), no hay tabla legal_documents todavía (MVP).
// Subir VERSION ahí es lo único que hace falta para que pendingLegalConsents
// vuelva a considerar pendiente ese documento para todos los usuarios.
const REQUIRED_LEGAL_DOCS = [
  { document_type: PRIVACY_TYPE, document_version: PRIVACY_VERSION },
  { document_type: TERMS_TYPE, document_version: TERMS_VERSION },
];

// Mensajes propios de activateAccount() — nunca se deja escapar un error
// crudo de Supabase hacia la UI. Ver activateAccount más abajo para cuándo
// se usa cada uno.
const ACTIVATION_LINK_INVALID =
  "Este enlace ya no es válido. Puede que ya se haya usado o que haya " +
  "caducado. Si ya creaste tu contraseña, inicia sesión. Si no, pide a " +
  "un administrador que te envíe un enlace nuevo.";

// Texto idéntico al que CreatePasswordScreen ya usa como mensaje genérico
// de error — así su catch no necesita distinguir el origen del fallo.
const ACTIVATION_GENERIC_RETRY = "No se pudo guardar la contraseña. Inténtalo de nuevo.";

const ACTIVATION_SESSION_MISMATCH = "No se pudo activar esta cuenta desde la sesión actual.";

// Mensaje único para cualquier punto del flujo (restauración de sesión,
// recarga, login, activación, creación de contraseña) donde se detecta que
// la cuenta está desactivada — ver isBannedError más abajo. Un solo texto,
// reutilizado también por LoginScreen, para que nunca queden dos redacciones
// distintas del mismo caso.
export const ACCOUNT_DEACTIVATED_MESSAGE =
  "Tu cuenta ha sido desactivada. Contacta con un administrador si crees que es un error.";

// GoTrue devuelve error.code === "user_banned" en CUALQUIER endpoint de
// auth.* (signInWithPassword, getUser, updateUser, verifyOtp, refreshSession)
// cuando banned_until está en el futuro — confirmado en vivo contra el
// proyecto real: incluso un access_token ya emitido ANTES del baneo deja de
// aceptarse en cuanto se banea (GoTrue lo revalida en cada llamada, no solo
// al emitirlo). Es el único punto de verdad del "está desactivado" en todo
// este archivo — nunca se infiere desde profiles.activated_at, que ahora
// también se limpia al desactivar y por tanto no basta para distinguir
// "desactivado" de "pendiente de primer acceso" (ver docs/ADR "modelo de
// activación").
function isBannedError(error) {
  return error?.code === "user_banned";
}

// Punto único de resolución de sesión — lo usan tanto la carga inicial como
// onAuthStateChange, para que "restauración de sesión" y "recarga" tengan
// EXACTAMENTE el mismo criterio de detección de cuenta desactivada que
// "login" (signIn) y "activación" (activateAccount) más abajo. Sin esto,
// getSession() por sí sola nunca detecta un baneo ocurrido después de emitir
// el token: es una lectura local, no consulta al servidor mientras el token
// no haya caducado — confirmado en vivo. supabase.auth.getUser() sí golpea
// el servidor y sí lo detecta, de ahí la llamada explícita aquí.
async function resolveSessionState(rawSession) {
  if (!rawSession) return { session: null, profile: null, consents: [], banned: false };

  const { error: getUserError } = await supabase.auth.getUser();
  if (isBannedError(getUserError)) {
    await supabase.auth.signOut();
    return { session: null, profile: null, consents: [], banned: true };
  }

  const userId = rawSession.user?.id;
  const [profileData, consentsData] = await Promise.all([loadProfile(userId), loadConsents(userId)]);
  return { session: rawSession, profile: profileData, consents: consentsData, banned: false };
}

async function loadProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

async function loadConsents(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("legal_consents")
    .select("document_type, document_version")
    .eq("user_id", userId);
  if (error) {
    console.error(error);
    return [];
  }
  return data;
}

function pendingConsentsFor(consents) {
  return REQUIRED_LEGAL_DOCS.filter(
    (doc) => !consents.some((c) => c.document_type === doc.document_type && c.document_version === doc.document_version)
  );
}

export function useSession() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  // Nunca se pone a false dentro de este efecto — solo resolveSessionState
  // detectando un baneo (aquí o en signIn/activateAccount) lo pone a true.
  // Motivo: el propio signOut() que dispara resolveSessionState al detectar
  // el baneo provoca un SIGNED_OUT casi inmediato en onAuthStateChange, que
  // vuelve a llamar a este mismo efecto con newSession=null — si ese camino
  // normal (banned:false) pudiera poner accountBanned a false, borraría el
  // aviso justo después de mostrarlo. Solo signIn() lo reinicia, al empezar
  // un intento nuevo.
  const [accountBanned, setAccountBanned] = useState(false);
  // Cuenta ya existente cuya contraseña actual no cumple la política
  // reforzada (1 mayúscula + 1 símbolo, ver passwordPolicy.js) — se
  // detecta en signIn(), es la única vez que este hook tiene la
  // contraseña en texto plano. Igual que accountBanned, solo signIn()
  // decide su valor: una recarga que restaura una sesión ya existente
  // (resolveSessionState, más abajo) no puede volver a comprobar esto, no
  // hay contraseña en texto plano disponible fuera de un login explícito.
  const [forcedPasswordUpdate, setForcedPasswordUpdate] = useState(false);

  useEffect(() => {
    // setSession/setProfile/setConsents se llaman siempre juntos, DESPUÉS de
    // esperar los fetches (resolveSessionState ya usa Promise.all
    // internamente) — nunca uno tras otro con un await de por medio. Con un
    // await entre cada setState, cada uno dispara su propio render por
    // separado (el batching automático de React 18 solo agrupa llamadas
    // síncronas consecutivas, no las separadas por un await): había un
    // instante real, no solo teórico, en el que `session` ya era la nueva
    // sesión pero `profile` seguía siendo el de ANTES de iniciar sesión
    // (null en un login fresco desde LoginScreen) — AuthGate leía ese
    // instante como "sesión sin perfil activado" y mostraba
    // CreatePasswordScreen/AcceptLegalScreen un instante de más en cualquier
    // login normal, incluso para una cuenta ya completamente activada. Con
    // un único bloque de setState tras el await, los tres cambian en el
    // mismo render — nunca un estado a medias visible.
    supabase.auth.getSession().then(async ({ data }) => {
      const resolved = await resolveSessionState(data.session);
      setSession(resolved.session);
      setProfile(resolved.profile);
      setConsents(resolved.consents);
      if (resolved.banned) setAccountBanned(true);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // TOKEN_REFRESHED (Bloque 12, job nocturno 2026-09-03): GoTrue
      // refresca el access token en segundo plano cada ~1h mientras la
      // pestaña sigue abierta — antes, cada refresco disparaba
      // resolveSessionState entera (getUser() + profile + consents, 3
      // peticiones de red) aunque ni el perfil ni los consentimientos
      // cambien nunca en un refresco de token. Basta con actualizar
      // `session` con el token nuevo. La detección de baneo no se
      // debilita: un refresh token de una cuenta baneada ya falla en el
      // propio endpoint de refresco de GoTrue (nunca llega a emitir
      // TOKEN_REFRESHED) — la garantía de resolveSessionState en cada
      // llamada de auth.* sigue intacta, solo evita repetirla aquí donde
      // ya está implícita en el propio evento.
      if (event === "TOKEN_REFRESHED" && newSession) {
        setSession(newSession);
        return;
      }
      const resolved = await resolveSessionState(newSession);
      setSession(resolved.session);
      setProfile(resolved.profile);
      setConsents(resolved.consents);
      if (resolved.banned) setAccountBanned(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // identifier: email o nickname. Si no contiene "@" se resuelve a email vía
  // la RPC email_for_nickname (security definer, solo expone el email) antes
  // de autenticar. Nickname desconocido y contraseña incorrecta lanzan el
  // mismo error genérico — no hay que revelar cuál de las dos falló. Cuenta
  // desactivada es la única excepción deliberada a esa ambigüedad: GoTrue ya
  // distingue error.code "user_banned" de credenciales inválidas sin
  // necesidad de una consulta aparte, así que aprovecharlo no añade ninguna
  // superficie de enumeración nueva (ver isBannedError arriba). Reinicia
  // accountBanned al empezar cada intento — es el único sitio del hook que
  // lo pone a false (ver comentario en el useState), para que un intento
  // nuevo (con o sin la cuenta ya reactivada) no arrastre el aviso del
  // intento anterior.
  const signIn = useCallback(async (identifier, password) => {
    setAccountBanned(false);
    const value = identifier.trim();
    let email = value;
    if (!value.includes("@")) {
      const { data, error } = await supabase.rpc("email_for_nickname", { p_nickname: value });
      if (error || !data) throw new Error("invalid_credentials");
      email = data;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (isBannedError(error)) setAccountBanned(true);
      throw error;
    }
    // Única oportunidad de comprobar la política reforzada contra una
    // cuenta ya existente — ver comentario del useState de arriba.
    setForcedPasswordUpdate(!meetsPasswordPolicy(password));
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  // Cambia solo la contraseña de Supabase Auth — nunca toca profiles.
  // updateUser siempre actúa sobre quien esté autenticado en este
  // navegador, así que no hace falta (ni tiene sentido) pasarle un userId.
  // La usa activateAccount (ver más abajo), que la compone junto con
  // markAccountActivated y acceptLegalConsents. Lanza en error, mismo
  // contrato que signIn — salvo error.code "same_password" (GoTrue lo
  // devuelve si la contraseña nueva coincide con la ya guardada), que se
  // trata como éxito: en un reintento tras un fallo parcial (ver Caso A en
  // activateAccount) esta llamada ya tuvo éxito la vez anterior, y el
  // usuario reintenta con la misma contraseña que ya escribió — bloquear
  // ahí dejaría la activación atascada para siempre. Mismo espíritu que el
  // 23505 de acceptLegalConsents más abajo.
  const completePasswordChange = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error && error.code !== "same_password") throw error;
  }, []);

  // Guarda la contraseña nueva para una cuenta con forcedPasswordUpdate en
  // curso y cierra ese gate — reutiliza completePasswordChange de arriba en
  // vez de duplicar la llamada a supabase.auth.updateUser.
  const updateForcedPassword = useCallback(async (newPassword) => {
    await completePasswordChange(newPassword);
    setForcedPasswordUpdate(false);
  }, [completePasswordChange]);

  // Marca que la fase de contraseña de la activación ha terminado — NO
  // significa que se haya completado todo el onboarding, ver
  // pendingLegalConsents más abajo, que es una puerta aparte. Un único
  // trabajo, deliberadamente separado de completePasswordChange y de
  // acceptLegalConsents (ver activateAccount). El filtro
  // .is("activated_at", null) hace que repetir la llamada sea un no-op
  // real, no solo inofensivo — el instante guardado nunca se adelanta en
  // un reintento. userId siempre explícito, nunca el `session` del
  // closure: activateAccount puede llamar a esto justo después de que
  // verifyOtp cree la sesión, antes de que el listener de
  // onAuthStateChange haya tenido tiempo de actualizar el estado de React.
  const markAccountActivated = useCallback(async (userId) => {
    const { error } = await supabase
      .from("profiles")
      .update({ activated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("activated_at", null);
    if (error) throw error;

    setProfile((p) => (p ? { ...p, activated_at: p.activated_at || new Date().toISOString() } : p));
  }, []);

  const pendingLegalConsents = pendingConsentsFor(consents);

  // Inserta de una vez las filas de consentimiento que falten (un único
  // checkbox en AcceptLegalScreen acepta todos los documentos pendientes a
  // la vez). userId explícito opcional, mismo motivo que markAccountActivated
  // — el call site existente (AcceptLegalScreen vía AuthGate) sigue sin
  // pasarlo, usa la sesión ya establecida; activateAccount lo pasa siempre.
  // 23505 = unique_violation: un intento anterior insertó esta fila con
  // éxito pero la respuesta se perdió por red — se trata como éxito, no
  // como fallo, en vez de bloquear un reintento legítimo. Lanza en
  // cualquier otro error, mismo contrato que signIn/completePasswordChange.
  const acceptLegalConsents = useCallback(async (userId = session?.user?.id) => {
    const missing = pendingConsentsFor(consents);
    if (missing.length === 0) return;
    const rows = missing.map((doc) => ({ user_id: userId, ...doc }));
    const { error } = await supabase.from("legal_consents").insert(rows);
    if (error && error.code !== "23505") throw error;
    setConsents((c) => [...c, ...rows]);
  }, [session, consents]);

  // Resuelve QUIÉN es la persona a partir de un enlace de un solo uso
  // (verifyOtp), o reutiliza la sesión ya creada si es un reintento —
  // compartido por activateAccount() (alta/reactivación/regenerar
  // contraseña) y resetPassword() (recuperación autoservicio) para no
  // duplicar la detección de "enlace inválido"/"cuenta baneada" en dos
  // sitios: ambos flujos parten del mismo tipo de enlace de Supabase
  // (type=recovery), solo cambia qué se hace DESPUÉS de identificar a la
  // persona (ver comentarios de cada función más abajo).
  //
  // Resumible: si ya existe una sesión (un intento previo ya llamó a
  // verifyOtp con éxito, o esta llamada es un reintento tras un fallo
  // parcial), se salta verifyOtp por completo — volver a llamarlo con el
  // mismo token fallaría, ya está consumido.
  //
  // expectedEmail es una defensa adicional, no la única: quien llama
  // (AuthGate) ya decide si corresponde invocar esto, pero la función no
  // confía ciegamente en esa decisión — si hay sesión y no coincide con
  // expectedEmail, nunca la reutiliza en silencio. No se repite la
  // comprobación tras un verifyOtp fresco: el token ya es la frontera de
  // seguridad real ahí, solo puede resolver a la cuenta para la que se
  // emitió.
  const resolveRecoverySession = useCallback(async ({ tokenHash, type, expectedEmail }) => {
    const { data: { session: existing } } = await supabase.auth.getSession();

    if (existing) {
      if (existing.user.email.toLowerCase() !== expectedEmail.toLowerCase()) {
        throw new Error(ACTIVATION_SESSION_MISMATCH);
      }
      return existing.user.id;
    }

    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      // Confirmado en vivo: un enlace recién generado para una cuenta ya
      // desactivada también falla aquí con "user_banned" (GoTrue banea
      // antes de aceptar el OTP, no solo antes de emitirlo) — nunca debe
      // leerse como "enlace inválido/caducado", que sugeriría pedir uno
      // nuevo cuando lo que hace falta es que un superadmin reactive la
      // cuenta primero.
      if (isBannedError(error)) {
        setAccountBanned(true);
        throw new Error(ACCOUNT_DEACTIVATED_MESSAGE, { cause: error });
      }
      throw new Error(ACTIVATION_LINK_INVALID, { cause: error });
    }
    // onAuthStateChange actualiza `session` (estado React) de forma
    // asíncrona a partir de aquí — quien llama debe seguir usando el
    // userId devuelto aquí, nunca `session` del closure.
    return data.user.id;
  }, []);

  // Punto de entrada único y resumible para todo el primer acceso (alta,
  // reactivación, regenerar contraseña por un admin): fija la contraseña,
  // marca profiles.activated_at y registra el consentimiento legal, en ese
  // orden — así un fallo que solo afecte al consentimiento legal deja
  // activated_at ya fijado y el usuario converge en AcceptLegalScreen en
  // vez de tener que repetir el formulario de contraseña.
  //
  // Lanza siempre un Error con uno de los tres mensajes de arriba, nunca
  // un error crudo de Supabase — CreatePasswordScreen solo tiene que
  // mostrar err.message tal cual.
  const activateAccount = useCallback(async ({ tokenHash, type, expectedEmail, password }) => {
    const userId = await resolveRecoverySession({ tokenHash, type, expectedEmail });

    try {
      await completePasswordChange(password);
      await markAccountActivated(userId);
      await acceptLegalConsents(userId);
    } catch (err) {
      // Caso "pantalla de activación ya abierta, la cuenta se desactiva
      // mientras tanto": completePasswordChange golpea el mismo endpoint de
      // GoTrue que ya confirmamos que revisa el baneo en cada llamada, así
      // que este catch lo detecta igual que el de verifyOtp de arriba, sin
      // necesidad de una comprobación previa aparte. signOut() explícito
      // porque aquí SÍ puede existir ya una sesión real (Caso B, resumible,
      // o la recién creada por verifyOtp) que hay que cerrar — nunca debe
      // prevalecer sobre el estado real de cuenta desactivada.
      if (isBannedError(err)) {
        setAccountBanned(true);
        await supabase.auth.signOut();
        throw new Error(ACCOUNT_DEACTIVATED_MESSAGE, { cause: err });
      }
      throw new Error(ACTIVATION_GENERIC_RETRY, { cause: err });
    }

    window.history.replaceState(null, "", window.location.pathname);
    return { userId };
  }, [resolveRecoverySession, completePasswordChange, markAccountActivated, acceptLegalConsents]);

  // Recuperación de contraseña autoservicio (ForgotPasswordScreen →
  // ResetPasswordScreen) — deliberadamente MÁS ESTRECHA que
  // activateAccount(): valida el enlace, fija la contraseña nueva y nada
  // más. NUNCA llama a acceptLegalConsents() — esa aceptación ya se hizo
  // en el alta original y no debe repetirse solo por recuperar una
  // contraseña (encargo explícito 2026-09-01). Si algún día los documentos
  // legales cambiaran de versión DESPUÉS de esa aceptación, la puerta de
  // `pendingLegalConsents` en AuthGate lo sigue detectando igual para
  // CUALQUIER sesión — no es responsabilidad de este flujo, es el mismo
  // control ya existente para un login normal.
  //
  // Sí llama a markAccountActivated(): no tiene relación con bases legales
  // (es la marca de "esta persona ya fijó una contraseña alguna vez"), y
  // cubre sin coste extra el caso límite de una cuenta admin-creada que
  // nunca completó su primer acceso y usa "olvidé mi contraseña" en vez
  // del enlace original — sin esto, quedaría con acceso real pero
  // marcada "Pendiente" para siempre en el directorio de Usuarios.
  const resetPassword = useCallback(async ({ tokenHash, type, expectedEmail, password }) => {
    const userId = await resolveRecoverySession({ tokenHash, type, expectedEmail });

    try {
      await completePasswordChange(password);
      await markAccountActivated(userId);
    } catch (err) {
      if (isBannedError(err)) {
        setAccountBanned(true);
        await supabase.auth.signOut();
        throw new Error(ACCOUNT_DEACTIVATED_MESSAGE, { cause: err });
      }
      throw new Error(ACTIVATION_GENERIC_RETRY, { cause: err });
    }

    window.history.replaceState(null, "", window.location.pathname);
    return { userId };
  }, [resolveRecoverySession, completePasswordChange, markAccountActivated]);

  // Parche optimista local del perfil (Bloque 5, ProfileTab.jsx) — quien
  // llama ya ha escrito en Supabase (supabase.from("profiles").update(...))
  // y sabe que ha funcionado; esto solo evita esperar al próximo
  // onAuthStateChange (que no se dispara por una edición de perfil, solo
  // por cambios de sesión) para que la cabecera/el resto de la app vean el
  // cambio. Mismo patrón que markAccountActivated de arriba.
  const updateProfile = useCallback((patch) => {
    setProfile((p) => (p ? { ...p, ...patch } : p));
  }, []);

  return {
    session,
    profile,
    loading,
    accountBanned,
    forcedPasswordUpdate,
    updateForcedPassword,
    signIn,
    signOut,
    completePasswordChange,
    markAccountActivated,
    acceptLegalConsents,
    activateAccount,
    resetPassword,
    updateProfile,
    pendingLegalConsents,
  };
}
