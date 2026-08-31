import React, { useState } from "react";
import { Waves, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { NAVY, TEAL, BG, BODY_FONT } from "./App";
import { inputCls, Field } from "./shared";
import { useToast } from "./shared";

// No pide contraseña ni aceptación legal aquí — eso ya lo resuelve
// CreatePasswordScreen (tiene su propio checkbox de bases legales) cuando
// la persona pulsa el enlace del email de confirmación. Mismo mecanismo
// que el alta hecha por un admin (activateAccount()), autoregistrado en
// vez de admin-invitado — ver ADR-0023. Nunca un segundo camino de
// autenticación paralelo.
const CONFIRMATION_MESSAGE = "Te hemos enviado un email para confirmar tu cuenta. Ábrelo y crea tu contraseña para empezar a usar Ocean Flow.";

const emptyForm = { email: "", first_name: "", last_name: "", nickname: "" };

export default function RegisterScreen({ onBack }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.nickname) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/external-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || "No se pudo completar el registro. Inténtalo de nuevo.");
        return;
      }
      if (!payload.email_sent) {
        // Mismo criterio que CreateUserSheet (ConfigTab.jsx): si el email
        // falla, se avisa igualmente en vez de dejar a la persona sin
        // saber qué ha pasado — aquí no hay ningún admin al que enseñarle
        // un enlace manual, así que solo queda pedirle que lo intente de
        // nuevo más tarde.
        toast?.error("No se pudo enviar el email de confirmación. Inténtalo de nuevo en unos minutos.");
        return;
      }
      setSent(true);
    } catch {
      setError("No se pudo completar el registro. Comprueba tu conexión e inténtalo de nuevo.");
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
            <p className="text-sm text-gray-700">{CONFIRMATION_MESSAGE}</p>
            <button
              onClick={onBack}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white"
              style={{ backgroundColor: TEAL }}
            >
              Volver a entrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={onBack}
              className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-gray-500"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Volver a entrar
            </button>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Crea tu cuenta</h2>
              <p className="mt-1 text-xs text-gray-500">Te enviaremos un email para confirmar tu cuenta y crear tu contraseña.</p>
            </div>
            <Field label="Email">
              <input type="email" value={form.email} onChange={set("email")} autoComplete="email" autoFocus required className={`${inputCls} w-full`} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nombre">
                <input type="text" value={form.first_name} onChange={set("first_name")} autoComplete="given-name" className={`${inputCls} w-full`} />
              </Field>
              <Field label="Apellidos">
                <input type="text" value={form.last_name} onChange={set("last_name")} autoComplete="family-name" className={`${inputCls} w-full`} />
              </Field>
            </div>
            <Field label="Nickname">
              <input type="text" value={form.nickname} onChange={set("nickname")} autoComplete="username" required className={`${inputCls} w-full`} />
            </Field>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white disabled:opacity-70"
              style={{ backgroundColor: TEAL }}
            >
              {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              Registrarme
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
