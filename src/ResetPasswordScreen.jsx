import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Waves, Loader2, Eye, EyeOff, Check } from "lucide-react";
import { NAVY, TEAL, BG, BODY_FONT } from "./App";
import { inputCls, Field } from "./shared";

const MIN_LENGTH = 8;

// Pantalla de "poner nueva contraseña" para la recuperación autoservicio
// (ForgotPasswordScreen → email → aquí), deliberadamente SEPARADA de
// CreatePasswordScreen: no incluye LegalConsentFields — la aceptación de
// bases legales ya se hizo en el alta original y no debe repetirse solo
// por recuperar una contraseña (encargo explícito 2026-09-01, ver
// resetPassword() en useSession.js). Mismo layout de campos de contraseña
// que CreatePasswordScreen (RequirementRow/PasswordField), pero sin
// duplicar esos subcomponentes internos — son privados de ese archivo y
// triviales, replicarlos aquí es más simple que exportarlos solo para
// esto.
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

function PasswordField({ label, value, onChange, autoComplete, autoFocus, visible, onToggleVisible }) {
  const { t } = useTranslation("auth");
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
          aria-label={visible ? t("password.hidePassword") : t("password.showPassword")}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600"
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
    </Field>
  );
}

// onSubmit: (newPassword) => Promise — en AuthGate es resetPassword() de
// useSession con tokenHash/type/expectedEmail ya aplicados (ver App.jsx).
// resetPassword lanza siempre un Error con un mensaje ya pensado para
// mostrarse tal cual — nunca un error crudo de Supabase. Texto genérico de
// respaldo (onSubmit lanza sin .message, no debería pasar) en
// i18n/locales/*/auth.json → resetPassword.genericError.
export default function ResetPasswordScreen({ onSubmit }) {
  const { t } = useTranslation("auth");
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
    } catch (err) {
      setError(err.message || t("resetPassword.genericError"));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-start justify-center px-5 py-10" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${TEAL}1A` }}>
            <Waves size={22} style={{ color: TEAL }} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="text-center leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEAL }}>{t("resetPassword.eyebrow")}</p>
            <h1 className="mt-1 text-lg font-bold tracking-tight" style={{ color: NAVY }}>{t("resetPassword.title")}</h1>
          </div>
        </div>

        <p className="mb-6 text-center text-sm text-gray-500">
          {t("resetPassword.description")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <PasswordField
            label={t("resetPassword.newPasswordLabel")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
          />

          <div className="space-y-1 rounded-md bg-gray-50 px-3 py-2.5">
            <RequirementRow met={lengthOk}>{t("password.lengthRequirement")}</RequirementRow>
            <RequirementRow met={matchOk}>{t("password.matchRequirement")}</RequirementRow>
          </div>

          <PasswordField
            label={t("resetPassword.confirmPasswordLabel")}
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
            {t("resetPassword.submit")}
          </button>

          <p className="text-center text-[11px] text-gray-400">
            {t("resetPassword.footNote")}
          </p>
        </form>
      </div>
    </div>
  );
}
