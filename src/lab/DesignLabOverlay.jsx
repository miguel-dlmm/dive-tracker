import React, { useEffect } from "react";
import DesignLabShell from "./DesignLabShell";

// Overlay a pantalla completa que monta el laboratorio visual. Se monta y
// desmonta por completo con `open` — no deja nada residual (sin
// localStorage, sin contexto global), así que quitar este archivo y su
// botón de apertura en ConfigTab basta para eliminar el laboratorio sin
// dejar rastro en la app real.
export default function DesignLabOverlay({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Laboratorio visual de diseño">
      <DesignLabShell onClose={onClose} />
    </div>
  );
}
