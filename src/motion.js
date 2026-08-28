import { useState, useEffect } from "react";

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
