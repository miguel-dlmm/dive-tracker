import React, { useState } from "react";
import { Waves, Loader2, Eye, EyeOff, Check } from "lucide-react";
import { NAVY, TEAL, BG, BODY_FONT } from "./App";
import { inputCls, Field } from "./shared";

const MIN_LENGTH = 8;

// Fila de un requisito de contraseña con feedback en vivo: círculo relleno
// con check cuando se cumple, anillo vacío cuando no.
function RequirementRow({ met, children }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: met ? TEAL : "#9CA3AF" }}>
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${met ? "" : "border border-gray-300"}`}
        style={met ? { backgroundColor: TEAL } : undefined}
        aria-hidden="true"
      >
        {met && <Check size={9} className="text-white" strokeWidth={3} />}
      </span>
      {children}
    </div>
  );
}

// Campo de contraseña con botón de mostrar/ocultar (reduce la ansiedad de
// "¿lo he escrito bien?" sin depender solo del campo de confirmación — ver
// recomendación de NN/g sobre creación de contraseñas).
function PasswordField({ label, value, onChange, autoComplete, autoFocus, visible, onToggleVisible }) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className={`${inputCls} w-full pr-11`}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600"
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
    </Field>
  );
}

// onSubmit: (newPassword) => Promise — de completePasswordChange en
// useSession. Lanza en error (mismo contrato que signIn en LoginScreen).
// Se muestra en vez de la app normal mientras profile.password_set sea
// false (ver AuthGate en App.jsx) — primer acceso tras entrar por el
// enlace de bienvenida.
export default function CreatePasswordScreen({ onSubmit }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lengthOk = password.length >= MIN_LENGTH;
  const matchOk = confirm.length > 0 && password === confirm;
  const canSubmit = lengthOk && matchOk && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
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
    <div className="flex min-h-screen items-start justify-center px-5 py-10" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${TEAL}1A` }}>
            <Waves size={22} style={{ color: TEAL }} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="text-center leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEAL }}>Primer acceso</p>
            <h1 className="mt-1 text-lg font-bold tracking-tight" style={{ color: NAVY }}>¡Bienvenido a Ocean Pulse!</h1>
            <p className="mt-0.5 text-[11px] font-medium text-gray-400">by Ocean Flow</p>
          </div>
        </div>

        <p className="mb-6 text-center text-sm text-gray-500">
          Te han invitado a unirte. Elige tu contraseña personal para acceder de forma segura.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <PasswordField
            label="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
          />

          <div className="space-y-1 rounded-md bg-gray-50 px-3 py-2.5">
            <RequirementRow met={lengthOk}>Mínimo 8 caracteres</RequirementRow>
            <RequirementRow met={matchOk}>Las contraseñas coinciden</RequirementRow>
          </div>

          <PasswordField
            label="Confirmar contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            visible={showConfirm}
            onToggleVisible={() => setShowConfirm((v) => !v)}
          />

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: TEAL }}
          >
            {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            Crear contraseña y continuar
          </button>

          <p className="text-center text-[11px] text-gray-400">
            Al guardar, entrarás directamente en Ocean Pulse.
          </p>
        </form>
      </div>
    </div>
  );
}
