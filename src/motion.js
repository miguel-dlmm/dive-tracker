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
