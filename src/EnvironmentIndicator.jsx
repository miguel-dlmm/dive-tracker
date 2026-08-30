import { useEffect } from "react";

// Identificador visual permanente del entorno TEST — ver
// docs/ADR/0006-estrategia-de-ramas-y-entornos.md (Fase 3) y
// docs/ADR/0020-migraciones-supabase-y-separacion-test.md. Deliberadamente
// aislado: no depende de auth, navegación ni ningún componente de negocio,
// y se monta en el punto más alto de App.jsx para cubrir login, pantallas
// intermedias y todas las pestañas por igual.
//
// Fuente de verdad única: VITE_ENVIRONMENT=test. Nunca detección de rama
// Git, de proyecto Vercel ni de URL — ver la solicitud original de esta
// tarea para el porqué.
const IS_TEST_ENV = import.meta.env.VITE_ENVIRONMENT === "test";

export default function EnvironmentIndicator() {
  useEffect(() => {
    if (!IS_TEST_ENV) return;
    const original = document.title;
    document.title = `[TEST] ${original}`;
    return () => {
      document.title = original;
    };
  }, []);

  if (!IS_TEST_ENV) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed flex items-center rounded-full font-bold uppercase tracking-wide shadow-lg"
      style={{
        // Centrado con el eje horizontal de la cabecera (misma coordenada
        // en toda la app, al montarse una única vez en App.jsx fuera de
        // AuthGate — cubre por igual login/crear contraseña, que no
        // tienen cabecera, y el resto de pantallas, que sí). Verticalmente
        // apunta al centro de la fila de contenido de esa cabecera
        // (App.jsx: safe-area-inset-top + py-4 ≈ 28px de alto medio).
        top: "calc(env(safe-area-inset-top) + 1.75rem)",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
        pointerEvents: "none",
        padding: "0.25rem 0.625rem",
        fontSize: "0.6875rem",
        lineHeight: 1,
        color: "#1C1917",
        background: "repeating-linear-gradient(135deg, #FBBF24, #FBBF24 6px, #1C1917 6px, #1C1917 12px)",
        border: "1px solid rgba(0,0,0,0.15)",
      }}
    >
      <span className="rounded-full bg-white/90 px-1.5 py-0.5" style={{ color: "#1C1917" }}>
        TEST
      </span>
    </div>
  );
}
