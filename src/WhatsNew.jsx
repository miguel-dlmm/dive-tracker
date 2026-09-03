import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { X, Languages, TrendingUp, UserCircle, IdCard, Sparkles } from "lucide-react";
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
  { icon: Sparkles, color: NAVY },
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

        {/* Bug real encontrado y arreglado en el Bloque 8 (job nocturno
            2026-09-03), preexistente en Release-V1 desde antes de esta
            sesión — no introducido por el cambio de contenido de más
            arriba: envolver este motion.div en <AnimatePresence
            mode="wait"> (o incluso sin mode, en modo "sync" por defecto)
            dejaba la diapositiva ANTERIOR permanentemente en el DOM al
            avanzar — dos elementos #whats-new-title a la vez, el visible
            siempre el viejo, aunque los puntos/botones (que leen `step`
            directo, sin pasar por la animación) ya mostraran la
            diapositiva nueva. Confirmado con motion 13.1.1 + React
            19.2.8: ni quitar `mode="wait"`, ni desactivar `drag`, ni
            quitar el desplazamiento en `x` de animate/exit lo arreglaban
            — solo quitar AnimatePresence. Se pierde el fundido de SALIDA
            de la diapositiva vieja (React la desmonta al instante, sin
            animar) pero se mantiene el fundido de ENTRADA de la nueva
            (motion.div sigue animando `initial`→`animate` en cualquier
            montaje, con o sin AnimatePresence) — mejor un cambio abrupto
            que una pantalla rota. Ver docs/BACKLOG.md para investigar la
            causa raíz de fondo (versión de "motion", modo concurrente de
            React 19) si se quiere recuperar el fundido de salida más
            adelante. */}
        <div className="min-h-[220px] touch-pan-y overflow-hidden px-6 pb-2 text-center">
          <motion.div
            key={step}
            drag={reduced ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD && !isLast) setStep((s) => s + 1);
              else if (info.offset.x > SWIPE_THRESHOLD && step > 0) setStep((s) => s - 1);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: reduced ? 0.01 : DURATION.sm, ease: EASE.enter } }}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${slide.color}1A` }}>
              <Icon size={26} style={{ color: slide.color }} aria-hidden="true" />
            </div>
            <h2 id="whats-new-title" className="mb-2 text-base font-bold" style={{ color: NAVY }}>{slide.title}</h2>
            <p className="text-sm leading-relaxed text-gray-500">{slide.body}</p>
          </motion.div>
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
