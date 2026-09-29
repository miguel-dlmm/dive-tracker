import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { BRAND_NAVY } from "./App";
import { useEscapeClose, useBodyScrollLock } from "./shared";
import { usePrefersReducedMotion, carouselSlideVariants, useSwipeHorizontal } from "./motion";

// Mecánica de carrusel compartida entre WhatsNew.jsx y OnboardingTour.jsx
// (2026-09-27) — extraído de WhatsNew tras confirmarse la segunda
// necesidad real de exactamente el mismo carrusel (swipe, puntos,
// Atrás/Siguiente/Empezar). Cada píldora aporta solo su propio contenido
// (`slides`, con icon/color/title/body por diapositiva) y sus propias
// etiquetas traducidas (`labels`) — la navegación, el gesto de deslizar y
// la animación viven aquí una sola vez.
//
// Bug real ya resuelto en WhatsNew antes de esta extracción (se mantiene
// documentado aquí porque la mecánica es la que se movió, no solo el
// código): un <AnimatePresence> normal alrededor de la diapositiva
// combinado con el `drag`/`dragElastic` integrado de Motion en el MISMO
// elemento dejaba la diapositiva ANTERIOR permanentemente en el DOM al
// avanzar. La combinación que sí funciona es AnimatePresence con
// mode="popLayout" + useSwipeHorizontal (motion.js, gesto de touch
// nativo, sin `drag` de Motion) — el mismo patrón que ya usa
// MonthCalendar (shared.jsx) para su propio slide de mes.
export default function SlideDeck({ slides, onClose, labels, testId }) {
  const [step, setStep] = useState(0);
  // direction: de qué lado entra/sale cada diapositiva en
  // carouselSlideVariants, para que "Atrás" siempre deslice al revés que
  // "Siguiente"/deslizar hacia la izquierda, sea cual sea el punto de
  // partida.
  const [direction, setDirection] = useState(1);
  const reduced = usePrefersReducedMotion();
  useEscapeClose(true, onClose);
  useBodyScrollLock(true);

  const slide = slides[step];
  const Icon = slide.icon;
  const isLast = step === slides.length - 1;
  const goNext = () => { setDirection(1); setStep((s) => s + 1); };
  const goBack = () => { setDirection(-1); setStep((s) => s - 1); };
  const swipeProps = useSwipeHorizontal({
    onSwipeLeft: () => { if (!isLast) goNext(); },
    onSwipeRight: () => { if (step > 0) goBack(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-deck-title"
        className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{labels.eyebrow}</span>
          <button onClick={onClose} aria-label={labels.close} className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* touch-pan-y + overflow-hidden: depende de overflow-hidden para no
            desbordar el diálogo mientras la diapositiva saliente atraviesa
            el 100% de su ancho (carouselSlideVariants). */}
        <div data-testid={testId} className="min-h-[220px] touch-pan-y overflow-hidden px-6 pb-2 text-center" {...swipeProps}>
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={carouselSlideVariants(reduced)}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${slide.color}1A` }}>
                <Icon size={26} style={{ color: slide.color }} aria-hidden="true" />
              </div>
              {/* whitespace-pre-line (2026-09-29, pedido explícito: título del
                  libro de Koh Tao en 2 líneas, salto antes de "Accede desde la
                  Home" en el cuerpo): un "\n" literal en la traducción no
                  hace nada por sí solo en HTML/CSS (los saltos de línea se
                  colapsan como cualquier otro espacio) — esta clase respeta
                  los "\n" que traiga la cadena, sin afectar a ninguna
                  diapositiva que no incluya ninguno. */}
              <h2 id="slide-deck-title" className="mb-2 whitespace-pre-line text-base font-bold" style={{ color: BRAND_NAVY }}>{slide.title}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-500">{slide.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-1.5 py-4" role="tablist" aria-label={labels.slideTablist}>
          {slides.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === step ? 16 : 6, backgroundColor: i === step ? BRAND_NAVY : "#E5E7EB" }}
            />
          ))}
        </div>

        <div className="flex gap-2 border-t border-gray-100 p-3">
          {step > 0 && (
            <button
              onClick={goBack}
              className="min-h-11 flex-1 rounded-md border border-gray-200 text-sm font-medium text-gray-600"
            >
              {labels.back}
            </button>
          )}
          <button
            onClick={() => (isLast ? onClose() : goNext())}
            className="flex min-h-11 flex-1 items-center justify-center rounded-md text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND_NAVY }}
          >
            {isLast ? labels.start : labels.next}
          </button>
        </div>
      </div>
    </div>
  );
}
