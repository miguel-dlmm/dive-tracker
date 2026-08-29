import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { DOCUMENT_TYPE as PRIVACY_TYPE, VERSION as PRIVACY_VERSION } from "./legal/privacyPolicy";
import { DOCUMENT_TYPE as TERMS_TYPE, VERSION as TERMS_VERSION } from "./legal/termsOfUse";

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

  useEffect(() => {
    // setSession/setProfile/setConsents se llaman siempre juntos, DESPUÉS de
    // esperar los dos fetches con Promise.all — nunca uno tras otro con un
    // await de por medio. Con un await entre cada setState, cada uno
    // dispara su propio render por separado (el batching automático de
    // React 18 solo agrupa llamadas síncronas consecutivas, no las
    // separadas por un await): había un instante real, no solo teórico, en
    // el que `session` ya era la nueva sesión pero `profile` seguía siendo
    // el de ANTES de iniciar sesión (null en un login fresco desde
    // LoginScreen) — AuthGate leía ese instante como "sesión sin perfil
    // activado" y mostraba CreatePasswordScreen/AcceptLegalScreen un
    // instante de más en cualquier login normal, incluso para una cuenta ya
    // completamente activada. Con Promise.all + un único bloque de
    // setState, los tres cambian en el mismo render — nunca un estado a
    // medias visible.
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user?.id;
      const [profileData, consentsData] = await Promise.all([loadProfile(userId), loadConsents(userId)]);
      setSession(data.session);
      setProfile(profileData);
      setConsents(consentsData);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const userId = newSession?.user?.id;
      const [profileData, consentsData] = await Promise.all([loadProfile(userId), loadConsents(userId)]);
      setSession(newSession);
      setProfile(profileData);
      setConsents(consentsData);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // identifier: email o nickname. Si no contiene "@" se resuelve a email vía
  // la RPC email_for_nickname (security definer, solo expone el email) antes
  // de autenticar. Nickname desconocido y contraseña incorrecta lanzan el
  // mismo error genérico — no hay que revelar cuál de las dos falló.
  const signIn = useCallback(async (identifier, password) => {
    const value = identifier.trim();
    let email = value;
    if (!value.includes("@")) {
      const { data, error } = await supabase.rpc("email_for_nickname", { p_nickname: value });
      if (error || !data) throw new Error("invalid_credentials");
      email = data;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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

  // Punto de entrada único y resumible para todo el primer acceso: valida
  // o consume el enlace de invitación (verifyOtp, una sola vez en la vida
  // de ese token), fija la contraseña, marca profiles.activated_at y
  // registra el consentimiento legal, en ese orden — así un fallo que solo
  // afecte al consentimiento legal deja activated_at ya fijado y el
  // usuario converge en AcceptLegalScreen en vez de tener que repetir el
  // formulario de contraseña.
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
  //
  // Lanza siempre un Error con uno de los tres mensajes de arriba, nunca
  // un error crudo de Supabase — CreatePasswordScreen solo tiene que
  // mostrar err.message tal cual.
  const activateAccount = useCallback(async ({ tokenHash, type, expectedEmail, password }) => {
    const { data: { session: existing } } = await supabase.auth.getSession();

    let userId;
    if (existing) {
      if (existing.user.email.toLowerCase() !== expectedEmail.toLowerCase()) {
        throw new Error(ACTIVATION_SESSION_MISMATCH);
      }
      userId = existing.user.id;
    } else {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) throw new Error(ACTIVATION_LINK_INVALID, { cause: error });
      userId = data.user.id;
      // onAuthStateChange actualiza `session` (estado React) de forma
      // asíncrona a partir de aquí — todo lo de abajo usa `userId`, nunca
      // `session`.
    }

    try {
      await completePasswordChange(password);
      await markAccountActivated(userId);
      await acceptLegalConsents(userId);
    } catch (err) {
      throw new Error(ACTIVATION_GENERIC_RETRY, { cause: err });
    }

    window.history.replaceState(null, "", window.location.pathname);
    return { userId };
  }, [completePasswordChange, markAccountActivated, acceptLegalConsents]);

  return {
    session,
    profile,
    loading,
    signIn,
    signOut,
    completePasswordChange,
    markAccountActivated,
    acceptLegalConsents,
    activateAccount,
    pendingLegalConsents,
  };
}
