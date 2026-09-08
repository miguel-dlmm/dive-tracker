import { useEffect, useRef } from "react";
import SignaturePad from "signature_pad";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";

// Captura de firma táctil — usada tanto por el generador de Training
// Records (firma del alumno, efímera, nunca se persiste — ver
// docs/RELEASE-V1-PROGRESS.md, Fase 5) como por "Mi perfil" → "Datos de
// instructor" (firma del instructor, esa sí persistida en
// profiles.instructor_signature — se firma una vez y se reutiliza en cada
// generación posterior, pedido explícito del usuario). Componente
// compartido en la raíz de src/, no bajo trainingRecords/, precisamente
// porque ya no es exclusivo de esa pantalla.
//
// El tamaño real del canvas se fija en píxeles de dispositivo
// (devicePixelRatio) en vez de dejarlo al tamaño CSS — sin esto, signature_pad
// dibuja a la resolución lógica del elemento y el trazo sale borroso en
// cualquier pantalla de alta densidad (todos los iPhone actuales).
export default function SignatureCapture({ label, value, onChange, optionalHint }) {
  const { t } = useTranslation("common");
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
        // stopPropagation en touchstart/touchmove/touchend (bug real,
        // 2026-09-04): signature_pad llama a preventDefault() en sus
        // propios listeners nativos pero nunca a stopPropagation() — el
        // toque sigue burbujeando por encima del canvas. Cuando esta
        // pantalla vive dentro de un contenedor con useSwipeBack
        // (motion.js) — hoy Configuración/Ayuda, "deslizar a la derecha
        // = atrás" — un trazo de firma con componente horizontal hacia
        // la derecha (cualquier firma normal) se leía TAMBIÉN como el
        // gesto de "volver", devolviendo de golpe al menú de
        // Configuración a mitad de firmar. Cortar la burbuja aquí evita
        // que el gesto de dibujar se confunda nunca con el de navegar,
        // sea cual sea el contenedor donde se use este componente.
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="h-28 w-full touch-none rounded-md border border-gray-200 bg-gray-50"
        role="img"
        aria-label={value ? t("signature.firmadoAria", { label }) : t("signature.sinFirmarAria", { label })}
      />
    </div>
  );
}
