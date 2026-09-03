import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { X, Briefcase, Coins, TrendingUp, Hand, ShieldCheck } from "lucide-react";
import { NAVY, TEAL, SUN, GREEN, CORAL } from "./App";
import { useEscapeClose, useBodyScrollLock } from "./shared";
import { DURATION, EASE, usePrefersReducedMotion } from "./motion";

// Píldora de novedades — no un manual: pocas frases por diapositiva,
// navegable con "Siguiente"/"Atrás", puntos, o deslizando lateralmente
// (swipe), sin texto de más. Ver docs/ADR/0010-proceso-de-release.md:
// redactar este contenido pasa a formar parte de preparar cada release,
// con la misma fuente de verdad que CHANGELOG.md (no una tarea aparte
// inventada después).
//
// Contenido reescrito 2026-08-30, segunda vuelta (feedback explícito: "no
// hables del cambio de nombre de la app... piensa en un instructor en el
// descanso del barco, con las manos mojadas, sin ganas de leer texto
// largo"). La primera reescritura de esta sesión abría con una diapositiva
// dedicada a "Ocean Pulse → Ocean Flow" — dato interno de branding, no algo
// que un instructor necesite parar a leer entre inmersiones. Se sustituye
// por Mi trabajo (la unificación real de Registro/Comisiones/Compañeros en
// una sola pantalla, el cambio de fondo más grande de esta tanda de
// ramas) y se mantiene el resto: 5 diapositivas, título + una frase de
// cuerpo, nada que exija pararse a leer. Se prioriza lo que un instructor
// SIENTE al usar la app sobre el detalle técnico — ese detalle ya vive en
// CHANGELOG.md para quien lo quiera.
//
// Sin capturas de pantalla, mismo motivo que la versión anterior de este
// archivo: ninguna captura real de esta sesión queda presentable para un
// usuario real (cuenta "dev-bypass", datos de prueba). Iconografía + color
// coherente con el resto de la app cumple igual el objetivo ("muy
// visual") sin ese riesgo.
// icon/color no son traducibles — título/cuerpo de cada diapositiva viven en
// notices.json (whatsNew.slides, mismo orden por índice) y se combinan con
// este array en el componente.
const SLIDE_ICONS = [
  { icon: Briefcase, color: TEAL },
  { icon: Coins, color: SUN },
  { icon: TrendingUp, color: GREEN },
  { icon: Hand, color: CORAL },
  { icon: ShieldCheck, color: NAVY },
];

const SWIPE_THRESHOLD = 60;

export default function WhatsNew({ onClose }) {
  const { t } = useTranslation("notices");
  const [step, setStep] = useState(0);
  const reduced = usePrefersReducedMotion();
  useEscapeClose(true, onClose);
  useBodyScrollLock(true);

  // returnObjects: true — necesario en i18next para leer un array/objeto
  // completo de la traducción en vez de una única cadena.
  const slideCopy = t("whatsNew.slides", { returnObjects: true });
  const slides = SLIDE_ICONS.map((s, i) => ({ ...s, ...slideCopy[i] }));
  const slide = slides[step];
  const Icon = slide.icon;
  const isLast = step === slides.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end p-2">
          <button onClick={onClose} aria-label={t("whatsNew.close")} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-[220px] touch-pan-y overflow-hidden px-6 pb-2 text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              drag={reduced ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(_e, info) => {
                if (info.offset.x < -SWIPE_THRESHOLD && !isLast) setStep((s) => s + 1);
                else if (info.offset.x > SWIPE_THRESHOLD && step > 0) setStep((s) => s - 1);
              }}
              initial={{ opacity: 0, x: reduced ? 0 : 16 }}
              animate={{ opacity: 1, x: 0, transition: { duration: reduced ? 0.01 : DURATION.sm, ease: EASE.enter } }}
              exit={{ opacity: 0, x: reduced ? 0 : -16, transition: { duration: reduced ? 0.01 : DURATION.xs, ease: EASE.exit } }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${slide.color}1A` }}>
                <Icon size={26} style={{ color: slide.color }} aria-hidden="true" />
              </div>
              <h2 id="whats-new-title" className="mb-2 text-base font-bold" style={{ color: NAVY }}>{slide.title}</h2>
              <p className="text-sm leading-relaxed text-gray-500">{slide.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-1.5 py-4" role="tablist" aria-label={t("whatsNew.slideTablist")}>
          {slides.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === step ? 16 : 6, backgroundColor: i === step ? TEAL : "#E5E7EB" }}
            />
          ))}
        </div>

        <div className="flex gap-2 border-t border-gray-100 p-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="min-h-11 flex-1 rounded-md border border-gray-200 text-sm font-medium text-gray-600"
            >
              {t("whatsNew.back")}
            </button>
          )}
          <button
            onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
            className="flex min-h-11 flex-1 items-center justify-center rounded-md text-sm font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            {isLast ? t("whatsNew.start") : t("whatsNew.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
