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

  return { session, profile, loading, signIn, signOut };
}
