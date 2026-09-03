import { useState } from "react";
import { FileText } from "lucide-react";
import { NAVY, TEAL } from "../App";
import LegalDocumentViewer from "../LegalDocumentViewer";
import * as privacyPolicy from "./privacyPolicy";
import * as termsOfUse from "./termsOfUse";

// Botón que abre uno de los dos documentos legales en el visor.
function DocumentLink({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-2 rounded-md border border-gray-200 px-3 text-left text-sm font-medium hover:bg-gray-50"
      style={{ color: NAVY }}
    >
      <FileText size={16} style={{ color: TEAL }} aria-hidden="true" />
      {label}
    </button>
  );
}

// Bloque reutilizable de consentimiento legal: enlaces a los documentos +
// checkbox obligatorio. Usado tanto en CreatePasswordScreen (primer acceso)
// como en AcceptLegalScreen (reconsentimiento de usuarios existentes) — ver
// CLAUDE.md, evitar duplicar el mismo bloque en dos pantallas.
export default function LegalConsentFields({ accepted, onAcceptedChange }) {
  const [openDoc, setOpenDoc] = useState(null); // "privacy" | "terms" | null

  return (
    <div className="space-y-2">
      <DocumentLink label={privacyPolicy.TITLE} onClick={() => setOpenDoc("privacy")} />
      <DocumentLink label={termsOfUse.TITLE} onClick={() => setOpenDoc("terms")} />

      <label className="flex items-start gap-2.5 rounded-md bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAcceptedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
          style={{ accentColor: TEAL }}
        />
        He leído y acepto la Política de Privacidad y los Términos de Uso
      </label>

      {openDoc === "privacy" && (
        <LegalDocumentViewer title={privacyPolicy.TITLE} sections={privacyPolicy.SECTIONS} onClose={() => setOpenDoc(null)} />
      )}
      {openDoc === "terms" && (
        <LegalDocumentViewer title={termsOfUse.TITLE} sections={termsOfUse.SECTIONS} onClose={() => setOpenDoc(null)} />
      )}
    </div>
  );
}
