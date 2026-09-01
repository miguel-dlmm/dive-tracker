import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { NAVY, TEAL } from "../App";
import LegalDocumentViewer from "../LegalDocumentViewer";

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
//
// i18n (Release V1, Fase 2): el título y el contenido de cada documento
// viven en i18n/locales/*/auth.json → legal.privacyPolicy/legal.termsOfUse
// (returnObjects:true para las secciones), no en privacyPolicy.js/
// termsOfUse.js — esos dos archivos siguen existiendo solo por
// DOCUMENT_TYPE/VERSION, que useSession.js usa para el versionado del
// consentimiento (independiente del idioma en que se mostró el texto).
export default function LegalConsentFields({ accepted, onAcceptedChange }) {
  const { t } = useTranslation("auth");
  const [openDoc, setOpenDoc] = useState(null); // "privacy" | "terms" | null

  const privacyTitle = t("legal.privacyPolicy.title");
  const privacySections = t("legal.privacyPolicy.sections", { returnObjects: true });
  const termsTitle = t("legal.termsOfUse.title");
  const termsSections = t("legal.termsOfUse.sections", { returnObjects: true });

  return (
    <div className="space-y-2">
      <DocumentLink label={privacyTitle} onClick={() => setOpenDoc("privacy")} />
      <DocumentLink label={termsTitle} onClick={() => setOpenDoc("terms")} />

      <label className="flex items-start gap-2.5 rounded-md bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAcceptedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
          style={{ accentColor: TEAL }}
        />
        {t("legalConsent.checkboxLabel")}
      </label>

      {openDoc === "privacy" && (
        <LegalDocumentViewer title={privacyTitle} sections={privacySections} onClose={() => setOpenDoc(null)} />
      )}
      {openDoc === "terms" && (
        <LegalDocumentViewer title={termsTitle} sections={termsSections} onClose={() => setOpenDoc(null)} />
      )}
    </div>
  );
}
