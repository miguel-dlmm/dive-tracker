import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

async function loadProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

export function useSession() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setProfile(await loadProfile(data.session?.user?.id));
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setProfile(await loadProfile(newSession?.user?.id));
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

  return { session, profile, loading, signIn, signOut, completePasswordChange };
}
