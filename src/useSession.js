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
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user?.id;
      setSession(data.session);
      setProfile(await loadProfile(userId));
      setConsents(await loadConsents(userId));
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const userId = newSession?.user?.id;
      setSession(newSession);
      setProfile(await loadProfile(userId));
      setConsents(await loadConsents(userId));
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

  // Cierra el primer acceso: fija la contraseña propia del usuario (la
  // sesión ya existe porque llegó por el enlace de recovery del email de
  // bienvenida, ver createUser.js) y marca profiles.password_set = true —
  // permitido por la RLS existente (auth.uid() = user_id), sin RPC nueva.
  // Lanza en error, mismo contrato que signIn.
  const completePasswordChange = useCallback(async (newPassword) => {
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ password_set: true })
      .eq("user_id", session.user.id);
    if (profileError) throw profileError;

    setProfile((p) => (p ? { ...p, password_set: true } : p));
  }, [session]);

  const pendingLegalConsents = pendingConsentsFor(consents);

  // Inserta de una vez las filas de consentimiento que falten (un único
  // checkbox en AcceptLegalScreen acepta todos los documentos pendientes a
  // la vez). Lanza en error, mismo contrato que signIn/completePasswordChange.
  const acceptLegalConsents = useCallback(async () => {
    const missing = pendingConsentsFor(consents);
    if (missing.length === 0) return;
    const rows = missing.map((doc) => ({ user_id: session.user.id, ...doc }));
    const { error } = await supabase.from("legal_consents").insert(rows);
    if (error) throw error;
    setConsents((c) => [...c, ...rows]);
  }, [session, consents]);

  return { session, profile, loading, signIn, signOut, completePasswordChange, pendingLegalConsents, acceptLegalConsents };
}
