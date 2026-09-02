import { useEffect, useRef } from "react";
import SignaturePad from "signature_pad";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";

// Captura de firma táctil para el generador de Training Records — nada de
// esto se persiste en ningún sitio (ni Supabase ni localStorage): la firma
// solo vive en memoria mientras se rellena el PDF de un alumno concreto, y
// desaparece al cerrar la hoja (ver docs/RELEASE-V1-PROGRESS.md, Fase 5,
// decisión de arquitectura "enteramente en cliente").
//
// El tamaño real del canvas se fija en píxeles de dispositivo
// (devicePixelRatio) en vez de dejarlo al tamaño CSS — sin esto, signature_pad
// dibuja a la resolución lógica del elemento y el trazo sale borroso en
// cualquier pantalla de alta densidad (todos los iPhone actuales).
export default function SignatureCapture({ label, value, onChange, optionalHint }) {
  const { t } = useTranslation("trainingRecords");
  const canvasRef = useRef(null);
  const padRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);
    const pad = new SignaturePad(canvas, { penColor: "#1E293B", backgroundColor: "rgba(0,0,0,0)" });
    pad.addEventListener("endStroke", () => onChange(pad.isEmpty() ? null : pad.toDataURL("image/png")));
    padRef.current = pad;
    return () => pad.off();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo se monta una vez, onChange puede cambiar de identidad sin motivo para reconstruir el pad
  }, []);

  const clear = () => {
    padRef.current?.clear();
    onChange(null);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">
          {label} {optionalHint && <span className="font-normal text-gray-400">({t("signature.opcional")})</span>}
        </span>
        <button type="button" onClick={clear} className="-m-2 flex min-h-9 items-center gap-1 p-2 text-xs font-medium text-gray-400">
          <RotateCcw size={12} aria-hidden="true" /> {t("signature.borrar")}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="h-28 w-full touch-none rounded-md border border-gray-200 bg-gray-50"
        role="img"
        aria-label={value ? t("signature.firmadoAria", { label }) : t("signature.sinFirmarAria", { label })}
      />
    </div>
  );
}
