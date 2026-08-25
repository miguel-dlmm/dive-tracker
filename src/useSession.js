import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// Mapa provisional username -> email interno de Supabase Auth. Hoy solo
// existe la cuenta admin (ver CLAUDE.md, migración de auth por pasos).
// Cuando exista alta de usuarios real, esto se sustituye por una consulta
// a profiles en vez de un mapa fijo.
const USERNAME_TO_EMAIL = {
  admin: "migueldlmm@gmail.com",
};

export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (username, password) => {
    const key = username.trim().toLowerCase();
    const email = USERNAME_TO_EMAIL[key] || username.trim();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  return { session, loading, signIn, signOut };
}
