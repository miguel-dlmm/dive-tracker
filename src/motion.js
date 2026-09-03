import { useState, useEffect, useRef } from "react";

// =================================================================
// Convención de motion de Ocean Flow — un único vocabulario de
// duración/curva para toda la app, en vez de que cada pantalla
// invente las suyas (como ya pasaba con EXIT_EASING/CONTENT_MS/
// HEIGHT_MS en MiTrabajoTab). Basado en los tokens de movimiento de
// Material Design 3 (estándar consolidado, no inventado): "emphasized
// decelerate" para lo que ENTRA en pantalla, "emphasized accelerate"
// para lo que SALE, "standard" para cambios que ocurren dentro del
// propio elemento sin entrar/salir.
// =================================================================
export const EASE = {
  standard: [0.2, 0, 0, 1],
  enter: [0.05, 0.7, 0.1, 1],
  exit: [0.3, 0, 0.8, 0.15],
};

export const DURATION = {
  xs: 0.15, // microinteracciones (press, toggle)
  sm: 0.2,  // filas de lista, chips
  md: 0.28, // hojas, paneles
  lg: 0.4,  // transiciones de pantalla completa
};

// Funciones, no objetos estáticos: cada variante necesita saber si el
// visitante pidió prefers-reduced-motion para colapsar la duración a casi
// cero sin cambiar el resultado final (la fila/hoja igual entra o sale,
// solo que sin la animación intermedia) — ver usePrefersReducedMotion.
const d = (reduced, normal) => (reduced ? 0.01 : normal);

// Variants listas para <AnimatePresence>+<motion.div> en filas de lista
// (sustituye la coreografía manual de altura/opacidad/desplazamiento de
// MiTrabajoTab): entra con "enter" (decelera), sale con "exit" (acelera).
export function listItemVariants(reduced = false) {
  return {
    initial: { opacity: 0, height: 0, x: -16, scale: 0.97 },
    animate: { opacity: 1, height: "auto", x: 0, scale: 1, transition: { duration: d(reduced, DURATION.md), ease: EASE.enter } },
    exit: { opacity: 0, height: 0, x: -16, scale: 0.97, transition: { duration: d(reduced, DURATION.sm), ease: EASE.exit } },
  };
}

// Panel de detalle que aparece bajo un elemento ya visible (p. ej. el
// desglose del día seleccionado en MonthCalendar) — a diferencia de
// listItemVariants (pensado para filas dentro de una lista, con
// desplazamiento horizontal propio), aquí no hay lista ni dirección
// lateral: solo aparece/desaparece y cambia de alto, con el mismo par de
// duraciones/easings que el resto de la app, no un tercer vocabulario.
export function panelVariants(reduced = false) {
  return {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: "auto", transition: { duration: d(reduced, DURATION.md), ease: EASE.enter } },
    exit: { opacity: 0, height: 0, transition: { duration: d(reduced, DURATION.sm), ease: EASE.exit } },
  };
}

// Hoja inferior: entra deslizando desde abajo (decelera), sale acelerando.
export function sheetVariants(reduced = false) {
  return {
    initial: { y: "100%" },
    animate: { y: 0, transition: { duration: d(reduced, DURATION.md), ease: EASE.enter } },
    exit: { y: "100%", transition: { duration: d(reduced, DURATION.sm), ease: EASE.exit } },
  };
}

// Toast (shared.jsx, ToastProvider) — entra/sale con el mismo par
// enter/exit que el resto de feedback de la app, en vez del pop-in/pop-out
// instantáneo que tenía antes (revisión de notificaciones, Bloque 7 del
// job nocturno 2026-09-03: la propia app anima hojas y filas, pero el
// toast, que es feedback puro, se quedaba fuera de ese vocabulario).
// Desplazamiento vertical pequeño porque el toast ya vive fijo arriba de
// la pantalla — no necesita el desplazamiento lateral de listItemVariants.
export function toastVariants(reduced = false) {
  return {
    initial: { opacity: 0, y: -12, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: d(reduced, DURATION.sm), ease: EASE.enter } },
    exit: { opacity: 0, y: -8, scale: 0.95, transition: { duration: d(reduced, DURATION.xs), ease: EASE.exit } },
  };
}

// prefers-reduced-motion — cualquier componente que anime debe consultar
// esto y, si es true, usar duraciones ~0 en vez de desactivar la
// funcionalidad (el estado final debe seguir siendo el mismo).
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// Cuenta ascendente para cifras de KPI (Fase 3, Release V1 — "algún KPI
// interesante en formato animado"): anima de 0 al valor real con ease-out
// cúbico (decelera al llegar, mismo espíritu que EASE.enter aunque aquí no
// puede reutilizarse tal cual — Motion anima propiedades CSS/transform, no
// un número entero arbitrario que además hay que redondear en cada
// fotograma). requestAnimationFrame, no Motion: no hay ningún elemento del
// DOM que animar, solo un valor de React — traer la librería para esto
// sería más pesado que 15 líneas de rAF. Con prefers-reduced-motion, salta
// directa al valor final (mismo criterio que el resto de la app: el
// resultado nunca cambia, solo si se ve la transición).
export function useCountUp(target, { duration = 1.1, reduced = false } = {}) {
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) { setValue(target); return; }
    let raf;
    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);
  return value;
}

// Deslizar hacia la derecha = "atrás" — feedback explícito 2026-08-30,
// pensado para Configuración y Ayuda ("debe sentirse como navegación real,
// no como un truco aislado").
//
// 2026-08-30, segunda vuelta: la primera versión envolvía TODO el
// contenido de la pantalla en un <motion.div drag="x"> — un elemento con
// transform gestionado por Motion, hermano de la cabecera `sticky`, justo
// el patrón que un comentario ya existente en App.jsx identifica como
// causa de un bug de compositing de WebKit ya reportado una vez en Ayuda
// ("backdrop-filter + un hermano con transform" — aquí no hay
// backdrop-filter, pero el hermano-con-transform es el mismo ingrediente
// de riesgo). Reportado de nuevo justo tras añadir este drag-wrapper a
// Configuración: la cabecera quedaba cubierta por el contenido en un
// iPhone real, no reproducible en Chromium.
//
// Reescrito sin Motion: solo listeners de touch nativos (onTouchStart/
// onTouchEnd), sin transform, sin capa de composición propia, sin
// arrastre visual — se detecta el gesto (desplazamiento predominantemente
// horizontal hacia la derecha, por encima de un umbral) y se dispara
// onBack() directamente, sin que el contenido se mueva del sitio mientras
// se arrastra. Se pierde el feedback elástico de la versión anterior; se
// gana quitar de en medio al sospechoso más concreto de un bug que el
// propio proyecto ya documentó como grave (cubre la cabecera — "es la
// identidad de la app"). Sigue respetando prefers-reduced-motion (el
// gesto se desactiva del todo; el botón "‹" de siempre sigue ahí).
export function useSwipeBack(onBack, { enabled = true } = {}) {
  const reduced = usePrefersReducedMotion();
  const active = enabled && !reduced && typeof onBack === "function";
  const startRef = useRef(null);

  if (!active) return {};

  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      startRef.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      // Predominantemente horizontal (evita interpretar un scroll
      // vertical como "atrás") y por encima de un umbral deliberado.
      if (dx > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) onBack();
    },
  };
}
