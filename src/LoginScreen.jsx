import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { BG, BODY_FONT, BRAND_NAVY } from "./App";
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
  const { t } = useTranslation("auth");
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
        setError(t("login.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-5" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/brand/logo-mark-navy.svg" alt="" width={52} height={52} aria-hidden="true" />
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: BRAND_NAVY }}>Ocean Flow</h1>
            {/* Tagline (Fase 7, 2026-09-07) — pedido explícito para dar más
                personalidad a la pantalla de login, antes solo el nombre.
                Frase corta + subtítulo de una línea con lo que hace la app en
                concreto, mismo criterio "manos mojadas" del resto de la app
                (CLAUDE.md, regla 3): nada que requiera pararse a leer. */}
            <p className="mt-1 text-sm font-semibold" style={{ color: BRAND_NAVY }}>{t("login.tagline")}</p>
            <p className="mt-0.5 text-xs text-gray-500">{t("login.taglineSubtitle")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <Field label={t("login.emailOrNicknameLabel")}>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoFocus
              className={`${inputCls} w-full`}
            />
          </Field>
          <Field label={t("login.passwordLabel")}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={`${inputCls} w-full`}
            />
          </Field>

          {onForgotPassword && (
            <button type="button" onClick={onForgotPassword} className="-my-2 flex min-h-11 items-center text-xs font-medium" style={{ color: BRAND_NAVY }}>
              {t("login.forgotPassword")}
            </button>
          )}

          {accountBanned && <p role="alert" className="text-sm text-red-600">{ACCOUNT_DEACTIVATED_MESSAGE}</p>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white disabled:opacity-70"
            style={{ backgroundColor: BRAND_NAVY }}
          >
            {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {t("login.submit")}
          </button>

          {onRegister && (
            <p className="text-center text-xs text-gray-500">
              {t("login.firstTime")}{" "}
              <button type="button" onClick={onRegister} className="-my-2 inline-flex min-h-11 items-center font-medium" style={{ color: BRAND_NAVY }}>
                {t("login.register")}
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
