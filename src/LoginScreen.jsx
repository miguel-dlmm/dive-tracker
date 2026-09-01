import React, { useState } from "react";
import { Waves, Loader2 } from "lucide-react";
import { NAVY, TEAL, BG, BODY_FONT } from "./App";
import { inputCls, Field } from "./shared";
import { ACCOUNT_DEACTIVATED_MESSAGE } from "./useSession";

// signIn: (identifier, password) => Promise — de useSession. identifier
// acepta email o nickname indistintamente. Lanza en error — error.code
// "user_banned" (cuenta desactivada) es la única excepción a "mensaje
// genérico siempre": ese caso ya se muestra aparte vía la prop
// accountBanned (ver AuthGate en App.jsx), así que aquí se ignora
// explícitamente para no duplicar el aviso con un texto distinto ("email/
// contraseña incorrectos" sería además incorrecto en ese caso).
export default function LoginScreen({ signIn, accountBanned = false, onForgotPassword, onRegister }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setLoading(true);
    setError("");
    try {
      await signIn(identifier, password);
    } catch (err) {
      if (err?.code !== "user_banned") {
        setError("Email/nickname o contraseña incorrectos.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-5" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Waves size={28} style={{ color: TEAL }} strokeWidth={2.2} aria-hidden="true" />
          <h1 className="text-lg font-bold tracking-tight" style={{ color: NAVY }}>Ocean Flow</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <Field label="Email o nickname">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoFocus
              className={`${inputCls} w-full`}
            />
          </Field>
          <Field label="Contraseña">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={`${inputCls} w-full`}
            />
          </Field>

          {onForgotPassword && (
            <button type="button" onClick={onForgotPassword} className="-my-2 flex min-h-11 items-center text-xs font-medium" style={{ color: TEAL }}>
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {accountBanned && <p role="alert" className="text-sm text-red-600">{ACCOUNT_DEACTIVATED_MESSAGE}</p>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white disabled:opacity-70"
            style={{ backgroundColor: TEAL }}
          >
            {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            Entrar
          </button>

          {onRegister && (
            <p className="text-center text-xs text-gray-500">
              ¿Primera vez?{" "}
              <button type="button" onClick={onRegister} className="-my-2 inline-flex min-h-11 items-center font-medium" style={{ color: TEAL }}>
                Regístrate
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
