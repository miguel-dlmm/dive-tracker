import React, { useState } from "react";
import { Waves, Loader2 } from "lucide-react";
import { NAVY, TEAL, BG, BODY_FONT } from "./App";
import { inputCls, Field } from "./shared";

const MIN_LENGTH = 8;

// onSubmit: (newPassword) => Promise — de completePasswordChange en
// useSession. Lanza en error (mismo contrato que signIn en LoginScreen).
// Se muestra en vez de la app normal mientras profile.password_set sea
// false (ver AuthGate en App.jsx) — primer acceso tras entrar por el
// enlace de bienvenida.
export default function CreatePasswordScreen({ onSubmit }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSubmit(password);
    } catch {
      setError("No se pudo guardar la contraseña. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Waves size={28} style={{ color: TEAL }} strokeWidth={2.2} aria-hidden="true" />
          <div className="text-center leading-tight">
            <h1 className="text-lg font-bold tracking-tight" style={{ color: NAVY }}>Crea tu contraseña</h1>
            <p className="text-[11px] font-medium text-gray-400">by Ocean Flow</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Por seguridad, antes de entrar tienes que crear tu propia contraseña. A partir de ahora la usarás para acceder a Ocean Pulse.
          </p>

          <Field label="Nueva contraseña">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              className={`${inputCls} w-full`}
            />
          </Field>
          <Field label="Confirmar contraseña">
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={`${inputCls} w-full`}
            />
          </Field>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white disabled:opacity-70"
            style={{ backgroundColor: TEAL }}
          >
            {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            Crear contraseña y continuar
          </button>
        </form>
      </div>
    </div>
  );
}
