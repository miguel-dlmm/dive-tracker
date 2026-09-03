import { useEffect } from "react";
import { X } from "lucide-react";
import { NAVY, TEAL } from "./App";

// Overlay de lectura para un documento legal (Política de Privacidad /
// Términos de Uso) — usado hoy desde AcceptLegalScreen; reutilizable más
// adelante para el acceso post-login (fuera de alcance de este MVP).
export default function LegalDocumentViewer({ title, sections, onClose }) {
  useEffect(() => {
    function handler(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-document-title"
        className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-xl bg-white shadow-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="legal-document-title" className="text-base font-bold tracking-tight" style={{ color: NAVY }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-400 hover:text-gray-600"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {sections.map((section) => (
            <section key={section.heading} className="mb-4 last:mb-0">
              <h3 className="mb-1 text-sm font-semibold" style={{ color: TEAL }}>
                {section.heading}
              </h3>
              {section.body.split("\n\n").map((paragraph, i) => (
                <p key={i} className="mb-1.5 text-sm leading-relaxed text-gray-600 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
