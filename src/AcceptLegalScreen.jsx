import React, { useState } from "react";
import { Waves, Loader2 } from "lucide-react";
import { NAVY, TEAL, BG, BODY_FONT } from "./App";
import LegalConsentFields from "./legal/LegalConsentFields";

// onSubmit: () => Promise — acceptLegalConsents de useSession. Lanza en
// error, mismo contrato que CreatePasswordScreen. Se muestra en vez de la
// app normal mientras pendingLegalConsents no esté vacío (ver AuthGate en
// App.jsx) — reconsentimiento de usuarios ya existentes (password_set ya en
// true) tras publicar una versión nueva de un documento. El primer acceso
// de un usuario nuevo acepta los documentos dentro de CreatePasswordScreen,
// no aquí — ver LegalConsentFields, reutilizado en ambas pantallas.
export default function AcceptLegalScreen({ onSubmit }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = accepted && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await onSubmit();
    } catch {
      setError("No se pudo guardar tu aceptación. Inténtalo de nuevo.");
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
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEAL }}>Antes de continuar</p>
            <h1 className="mt-1 text-lg font-bold tracking-tight" style={{ color: NAVY }}>Privacidad y condiciones de uso</h1>
            <p className="mt-0.5 text-[11px] font-medium text-gray-400">by Ocean Flow</p>
          </div>
        </div>

        <p className="mb-6 text-center text-sm text-gray-500">
          Revisa y acepta estos documentos para poder usar Ocean Pulse.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <LegalConsentFields accepted={accepted} onAcceptedChange={setAccepted} />

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: TEAL }}
          >
            {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            Continuar
          </button>
        </form>
      </div>
    </div>
  );
}
