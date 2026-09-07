import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { X, Languages, TrendingUp, UserCircle, IdCard, Sparkles } from "lucide-react";
import { TEAL, SUN, GREEN, CORAL, BRAND_NAVY } from "./App";
import { useEscapeClose, useBodyScrollLock } from "./shared";
import { usePrefersReducedMotion, monthSlideVariants, useSwipeHorizontal } from "./motion";

// Píldora de novedades — no un manual: pocas frases por diapositiva,
// navegable con "Siguiente"/"Atrás", puntos, o deslizando lateralmente
// (swipe), sin texto de más. Ver docs/ADR/0010-proceso-de-release.md:
// redactar este contenido pasa a formar parte de preparar cada release,
// con la misma fuente de verdad que CHANGELOG.md (no una tarea aparte
// inventada después).
//
// Contenido reescrito 2026-09-03 (Bloque 8 del job nocturno — "adaptarlo a
// los cambios de Release V1"). El contenido anterior (2026-08-30) hablaba
// de cambios de `develop` (Mi trabajo, Tarifas, Resumen) que ya llevaban
// semanas en producción para cuando esta rama fuera a desplegarse — nada
// de eso es "nuevo" en Release V1. Mismo criterio que la reescritura
// anterior: "instructor en el descanso del barco, con las manos
// mojadas" — frases cortas, sin tecnicismos, el detalle completo vive en
// CHANGELOG.md para quien lo quiera.
//
// Training Records retirado de aquí (y de Ayuda, que nunca llegó a
// documentarlo) el mismo 2026-09-03, pedido explícito del usuario: no
// sale en este paquete de Release V1, se desplegará en una versión
// posterior como feature nueva — no tiene sentido anunciarla antes de
// que esté disponible de verdad para el usuario final. El código de
// Training Records en sí (generador, acceso desde Home) sigue en la
// rama tal cual, solo se retira de los sitios que la ANUNCIAN.
//
// Sin capturas de pantalla, mismo motivo que la versión anterior de este
// archivo: ninguna captura real de esta sesión queda presentable para un
// usuario real (cuenta "dev-bypass", datos de prueba). Iconografía + color
// coherente con el resto de la app cumple igual el objetivo ("muy
// visual") sin ese riesgo.
//
// Diapositiva "Mi perfil" añadida 2026-09-04 (ya en producción sin
// anunciar desde Release V1: carnet de instructor, datos personales,
// nivel profesional, moneda favorita, contraseña, borrado de cuenta).
// Ángulo elegido: el carnet — es lo más visual y lo único realmente nuevo
// como concepto (el resto son campos de datos, no una pieza de UI nueva).
// icon/color no son traducibles — título/cuerpo de cada diapositiva viven en
// notices.json (whatsNew.slides, mismo orden por índice) y se combinan con
// este array en el componente.
const SLIDE_ICONS = [
  { icon: Languages, color: SUN },
  { icon: TrendingUp, color: GREEN },
  { icon: UserCircle, color: CORAL },
  // Mi perfil / carnet de instructor (2026-09-04) — se inserta antes de la
  // diapositiva de cierre ("Repásalo cuando quieras"), que se queda última
  // a propósito porque es un meta-mensaje sobre el propio WhatsNew.
  { icon: IdCard, color: TEAL },
  { icon: Sparkles, color: BRAND_NAVY },
];

export default function WhatsNew({ onClose }) {
  const { t } = useTranslation("notices");
  const [step, setStep] = useState(0);
  // direction: misma idea que monthDirection en MonthCalendar
  // (shared.jsx) — de qué lado entra/sale cada diapositiva en
  // monthSlideVariants, para que "Atrás" siempre deslice al revés que
  // "Siguiente"/deslizar hacia la izquierda, sea cual sea el punto de
  // partida.
  const [direction, setDirection] = useState(1);
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
  const goNext = () => { setDirection(1); setStep((s) => s + 1); };
  const goBack = () => { setDirection(-1); setStep((s) => s - 1); };
  // Deslizar con el dedo (2026-09-07, "revisa la animación del slider,
  // ahora mismo se ve rara") — antes usaba el `drag`/`dragElastic`
  // integrado de Motion directamente sobre la diapositiva animada, a la
  // vez que un <AnimatePresence> alrededor: combinación que dejaba la
  // diapositiva ANTERIOR permanentemente en el DOM al avanzar (bug real
  // ya documentado más abajo, en el JSX) — nunca se pudo arreglar sin
  // quitar el fundido de salida del todo. useSwipeHorizontal (motion.js)
  // es el mismo hook ya usado por el calendario de Home/Resumen para su
  // propio slide de mes: gesto nativo por eventos de touch (confirma el
  // swipe AL SOLTAR, sin arrastre en vivo), sin pelearse con
  // AnimatePresence — mismo lenguaje de "deslizar" que el resto de la
  // app, no un tercer mecanismo.
  const swipeProps = useSwipeHorizontal({
    onSwipeLeft: () => { if (!isLast) goNext(); },
    onSwipeRight: () => { if (step > 0) goBack(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Eyebrow (Bloque 8, job nocturno 2026-09-03): antes se entraba
            directo al contenido de la primera diapositiva, sin ninguna
            palabra que dijera "esto son las novedades" — para alguien con
            prisa que solo ve la primera diapositiva antes de cerrar, ese
            contexto importa. Mismo patrón ya usado en DeploymentNotice.jsx
            (deploymentNotice.eyebrow), no un patrón nuevo. */}
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("whatsNew.eyebrow")}</span>
          <button onClick={onClose} aria-label={t("whatsNew.close")} className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Bug real (Bloque 8, job nocturno 2026-09-03): un <AnimatePresence>
            normal (sync o mode="wait") alrededor de esta diapositiva dejaba
            la ANTERIOR permanentemente en el DOM al avanzar — dos elementos
            #whats-new-title a la vez, el visible siempre el viejo. La causa
            real (encontrada al retomar esto, 2026-09-07, "revisa la
            animación del slider, se ve rara"): no era AnimatePresence en
            sí, sino combinarlo con el `drag`/`dragElastic` integrado de
            Motion en el MISMO elemento — la misma combinación que
            MonthCalendar (shared.jsx) SÍ resuelve bien, pero ahí el gesto
            de deslizar nunca usa `drag` de Motion, usa eventos de touch
            nativos (useSwipeHorizontal) sin tocar la posición del elemento
            mientras se arrastra. Aplicado aquí el mismo patrón —
            AnimatePresence con `mode="popLayout"` (el que ya usa
            MonthCalendar, nunca probado aquí hasta ahora) + swipeProps
            nativo en vez de `drag` — recupera el slide lateral real
            (entra/sale por el lado correcto según `direction`) sin
            reproducir el bug. */}
        <div className="min-h-[220px] touch-pan-y overflow-hidden px-6 pb-2 text-center" {...swipeProps}>
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={monthSlideVariants(reduced)}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${slide.color}1A` }}>
                <Icon size={26} style={{ color: slide.color }} aria-hidden="true" />
              </div>
              <h2 id="whats-new-title" className="mb-2 text-base font-bold" style={{ color: BRAND_NAVY }}>{slide.title}</h2>
              <p className="text-sm leading-relaxed text-gray-500">{slide.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-1.5 py-4" role="tablist" aria-label={t("whatsNew.slideTablist")}>
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
              {t("whatsNew.back")}
            </button>
          )}
          <button
            onClick={() => (isLast ? onClose() : goNext())}
            className="flex min-h-11 flex-1 items-center justify-center rounded-md text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND_NAVY }}
          >
            {isLast ? t("whatsNew.start") : t("whatsNew.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
