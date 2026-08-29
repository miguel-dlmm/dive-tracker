import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Layers, ClipboardList, Settings, BarChart3 } from "lucide-react";
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
// Cada diapositiva cubre un concepto distinto, sin solaparse con las
// demás: creación (el flujo, no una pantalla concreta), la unificación
// conceptual Registro/Comisiones/Compañeros → Mi trabajo (el "antes/
// ahora" del nombre), qué se puede HACER dentro de Mi trabajo (acciones
// concretas — antes esto se mezclaba con la diapositiva de unificación,
// haciendo que ambas dijeran casi lo mismo), Configuración, y Resumen.
//
// Sin capturas de pantalla a propósito: se evaluaron capturas reales de
// esta misma sesión (Home, Mi trabajo, Resumen) y ninguna quedaba
// presentable para mostrarle a un usuario real — mostraban el nombre de la
// cuenta de desarrollo ("dev-bypass") y datos de prueba repetidos de esta
// sesión. Iconografía + color, ya coherente con el resto de la app
// (mismos iconos que MOVEMENT_TYPE_META/CREATE_TYPES/navegación), cumple
// igual el objetivo ("muy visual") sin ese riesgo — capturas reales quedan
// para una futura release si en su momento se generan limpias a propósito.
const SLIDES = [
  {
    icon: Plus,
    color: TEAL,
    title: "Un único botón para crear",
    body: "Desde Home o desde Mi trabajo, un solo \"Añadir movimiento\" — el propio formulario te deja elegir Curso, Comisión o Ajuste, sin acertar antes el botón correcto.",
  },
  {
    icon: Layers,
    color: SUN,
    title: "Registro, Comisiones y Compañeros ahora es Mi trabajo",
    body: "Antes vivían en tres pantallas separadas, cada una con su propia forma de crear y editar. Ahora es una sola pantalla, con una sola forma de hacer las cosas.",
  },
  {
    icon: ClipboardList,
    color: GREEN,
    title: "Mi trabajo: todo sin salir de la lista",
    body: "Crear, editar, marcar cobrado o pendiente y eliminar un movimiento ocurre en el sitio, sin cambiar de pantalla. La moneda se recuerda de la última vez, y puedes dar de alta una tarifa nueva sin abandonar el formulario.",
  },
  {
    icon: Settings,
    color: CORAL,
    title: "Configuración, con menos vueltas",
    body: "Escuelas, Cursos, Tarifas y el resto de catálogos se crean ahora con el mismo botón flotante que ya conoces de Mi trabajo. Y en Usuarios puedes desactivar una cuenta sin perder ningún dato, o eliminarla del todo si hace falta.",
  },
  {
    icon: BarChart3,
    color: NAVY,
    title: "Resumen: la respuesta rápida, y todo lo demás si lo pides",
    body: "Arriba, un único total con la comparación al periodo anterior. Debajo, cada desglose — por escuela, por curso, calendario, comisiones — se despliega solo cuando lo tocas.",
  },
];

const SWIPE_THRESHOLD = 60;

export default function WhatsNew({ onClose }) {
  const [step, setStep] = useState(0);
  const reduced = usePrefersReducedMotion();
  useEscapeClose(true, onClose);
  useBodyScrollLock(true);

  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;

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
          <button onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50">
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

        <div className="flex items-center justify-center gap-1.5 py-4" role="tablist" aria-label="Diapositiva">
          {SLIDES.map((_, i) => (
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
              Atrás
            </button>
          )}
          <button
            onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
            className="flex min-h-11 flex-1 items-center justify-center rounded-md text-sm font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            {isLast ? "Empezar" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
