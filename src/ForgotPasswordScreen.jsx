import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Waves, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { NAVY, TEAL, BG, BODY_FONT } from "./App";
import { inputCls, Field } from "./shared";

// Mismo mensaje SIEMPRE, exista o no la cuenta — el backend
// (requestPasswordReset.js) ya responde igual en ambos casos a propósito
// (evita enumeración de emails), así que esta pantalla no tiene ninguna
// rama que distinga "encontrado" de "no encontrado". Nunca reintenta ni
// muestra un botón de "reenviar" inmediato: forzaría al backend a exponer
// más información de la que ya da, sin beneficio real (el email, si
// existía, ya se envió). Texto real en i18n/locales/*/auth.json →
// forgotPassword.confirmationMessage.

export default function ForgotPasswordScreen({ onBack }) {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      // Best-effort a propósito: aunque falle la red, el backend ya está
      // diseñado para no revelar nada por el status/payload — mostrar
      // siempre la misma confirmación es coherente con esa decisión,
      // incluso si esta petición concreta no llegó a completarse.
      await fetch("/api/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      }).catch(() => {});
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-5" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Waves size={28} style={{ color: TEAL }} strokeWidth={2.2} aria-hidden="true" />
          <h1 className="text-lg font-bold tracking-tight" style={{ color: NAVY }}>Ocean Flow</h1>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
            <MailCheck size={28} style={{ color: TEAL }} aria-hidden="true" />
            <p className="text-sm text-gray-700">{t("forgotPassword.confirmationMessage")}</p>
            <button
              onClick={onBack}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white"
              style={{ backgroundColor: TEAL }}
            >
              {t("forgotPassword.backToLogin")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={onBack}
              className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-gray-500"
            >
              <ArrowLeft size={16} aria-hidden="true" /> {t("forgotPassword.backToLogin")}
            </button>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: NAVY }}>{t("forgotPassword.title")}</h2>
              <p className="mt-1 text-xs text-gray-500">{t("forgotPassword.description")}</p>
            </div>
            <Field label={t("forgotPassword.emailLabel")}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
                className={`${inputCls} w-full`}
              />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white disabled:opacity-70"
              style={{ backgroundColor: TEAL }}
            >
              {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {t("forgotPassword.submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
