import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Waves, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { NAVY, TEAL, BG, BODY_FONT } from "./App";
import { inputCls, Field, Select } from "./shared";
import { useToast } from "./shared";
import i18n, { setStoredLanguage, SUPPORTED_LANGUAGES } from "./i18n";

// No pide contraseña ni aceptación legal aquí — eso ya lo resuelve
// CreatePasswordScreen (tiene su propio checkbox de bases legales) cuando
// la persona pulsa el enlace del email de confirmación. Mismo mecanismo
// que el alta hecha por un admin (activateAccount()), autoregistrado en
// vez de admin-invitado — ver ADR-0023. Nunca un segundo camino de
// autenticación paralelo. Texto real en i18n/locales/*/auth.json →
// register.confirmationMessage.

const emptyForm = { email: "", first_name: "", last_name: "", nickname: "" };

// El servidor rechaza igual un nickname con "@" (profiles_nickname_no_at,
// ver schema.sql) — esta validación es solo para dar feedback inmediato
// antes de enviar, no la única barrera. Motivo real de tenerla aquí:
// autoComplete="username" en el campo de abajo hace que Chrome sugiera a
// veces un email guardado (mucha gente usa su email como "username" en
// otros sitios) — sin este aviso, quien acepta esa sugerencia por error
// solo se enteraría al fallar el envío.

// Nombres de idioma en SU PROPIA lengua, no traducidos con el resto de la
// pantalla — convención estándar de cualquier selector de idioma (un
// hablante de inglés debe poder reconocer "Español" aunque la interfaz
// esté en inglés, y viceversa). SUPPORTED_LANGUAGES (src/i18n/index.js) es
// la fuente de verdad de qué idiomas existen; este objeto es solo su
// etiqueta visual.
const LANGUAGE_NATIVE_NAME = { es: "Español", en: "English" };

// inviteToken (opcional, Release V1 2026-09-02): presente cuando se llega
// aquí desde un enlace de invitación de un solo uso (?invite=... en la
// URL, ver AuthGate en App.jsx) — se manda tal cual en la petición para
// que el servidor pueda saltarse allow_external_registration si el token
// es válido (ver externalRegister.js). Sin inviteToken, comportamiento
// idéntico al registro externo normal de siempre.
export default function RegisterScreen({ onBack, inviteToken }) {
  const { t } = useTranslation("auth");
  const [form, setForm] = useState(emptyForm);
  const [language, setLanguage] = useState(() => (SUPPORTED_LANGUAGES.includes(i18n.language) ? i18n.language : "es"));
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  // Cambiar el idioma aquí traduce la pantalla entera al instante
  // (incluido este propio selector) — i18n.changeLanguage re-renderiza
  // cualquier componente que use useTranslation(). setStoredLanguage
  // persiste la elección para el resto de pantallas sin sesión (Login...)
  // hasta que haya perfil real que la sustituya (ver App.jsx → AppShell).
  const changeLanguage = (lang) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    setStoredLanguage(lang);
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const nicknameHasAt = form.nickname.includes("@");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.nickname || nicknameHasAt) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/external-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, language, ...(inviteToken ? { invite_token: inviteToken } : {}) }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || t("register.genericError"));
        return;
      }
      if (!payload.email_sent) {
        // Mismo criterio que CreateUserSheet (ConfigTab.jsx): si el email
        // falla, se avisa igualmente en vez de dejar a la persona sin
        // saber qué ha pasado — aquí no hay ningún admin al que enseñarle
        // un enlace manual, así que solo queda pedirle que lo intente de
        // nuevo más tarde.
        toast?.error(t("register.emailFailedToast"));
        return;
      }
      setSent(true);
    } catch {
      setError(t("register.networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Waves size={28} style={{ color: TEAL }} strokeWidth={2.2} aria-hidden="true" />
          <h1 className="text-lg font-bold tracking-tight" style={{ color: NAVY }}>Ocean Flow</h1>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
            <MailCheck size={28} style={{ color: TEAL }} aria-hidden="true" />
            <p className="text-sm text-gray-700">{t("register.confirmationMessage")}</p>
            <button
              onClick={onBack}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white"
              style={{ backgroundColor: TEAL }}
            >
              {t("register.backToLogin")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={onBack}
              className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-gray-500"
            >
              <ArrowLeft size={16} aria-hidden="true" /> {t("register.backToLogin")}
            </button>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: NAVY }}>{t("register.title")}</h2>
              <p className="mt-1 text-xs text-gray-500">{t("register.description")}</p>
            </div>
            <Field label={t("register.languageLabel")}>
              <Select
                value={LANGUAGE_NATIVE_NAME[language]}
                onChange={(label) => {
                  const lang = Object.keys(LANGUAGE_NATIVE_NAME).find((code) => LANGUAGE_NATIVE_NAME[code] === label);
                  if (lang) changeLanguage(lang);
                }}
                options={SUPPORTED_LANGUAGES.map((code) => LANGUAGE_NATIVE_NAME[code])}
                label={t("register.languageLabel")}
              />
            </Field>
            <Field label={t("register.emailLabel")}>
              <input type="email" value={form.email} onChange={set("email")} autoComplete="email" autoFocus required className={`${inputCls} w-full`} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t("register.firstNameLabel")}>
                <input type="text" value={form.first_name} onChange={set("first_name")} autoComplete="given-name" className={`${inputCls} w-full`} />
              </Field>
              <Field label={t("register.lastNameLabel")}>
                <input type="text" value={form.last_name} onChange={set("last_name")} autoComplete="family-name" className={`${inputCls} w-full`} />
              </Field>
            </div>
            <Field label={t("register.nicknameLabel")}>
              <input type="text" value={form.nickname} onChange={set("nickname")} autoComplete="username" required className={`${inputCls} w-full`} />
            </Field>
            {nicknameHasAt && <p role="alert" className="text-sm text-red-600">{t("register.nicknameAtError")}</p>}

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || nicknameHasAt}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white disabled:opacity-70"
              style={{ backgroundColor: TEAL }}
            >
              {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {t("register.submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
