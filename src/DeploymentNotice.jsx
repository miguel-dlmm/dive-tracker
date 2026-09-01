import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Rocket, ExternalLink } from "lucide-react";
import { NAVY, TEAL } from "./colors";
import { supabase } from "./supabaseClient";
import { useEscapeClose, useBodyScrollLock } from "./shared";
import { DURATION, EASE, usePrefersReducedMotion } from "./motion";

// Slide de "nuevo despliegue" — mismo lenguaje visual que WhatsNew.jsx
// (modal centrado, icono redondo, título+cuerpo, franja de acciones), pero
// mecanismo de datos distinto a propósito: WhatsNew es contenido editorial
// fijo en código, gateado por versión (localStorage); esto lee la fila más
// reciente de `deployment_notices` que el superadmin actual no haya visto
// todavía (tabla `deployment_notice_views`), así que el contenido cambia
// con cada commit notificado, no con cada release de producto.
// Ver docs/ADR/0024-propuesta-avisos-despliegue-develop.md (implementado
// 2026-09-01) — diseño completo y el motivo de RLS solo-superadmin.
//
// Solo se monta si profile.is_superadmin (ver App.jsx) — nunca se renderiza
// ni se hace la consulta para un admin normal o un usuario sin rol, doble
// garantía junto con la policy RLS "superadmin read" de la propia tabla.
export default function DeploymentNotice({ userId }) {
  const [notice, setNotice] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    let active = true;
    (async () => {
      // RLS ya restringe ambas tablas a is_superadmin(auth.uid()) — este
      // componente solo se monta para superadmin, pero aunque no lo fuera,
      // el servidor no devolvería filas de otra cuenta.
      const [{ data: notices, error: noticesError }, { data: views, error: viewsError }] = await Promise.all([
        supabase.from("deployment_notices").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("deployment_notice_views").select("notice_id").eq("user_id", userId),
      ]);
      if (!active) return;
      if (noticesError || viewsError) {
        console.error("No se pudieron cargar los avisos de despliegue", noticesError || viewsError);
        setLoaded(true);
        return;
      }
      const seenIds = new Set((views || []).map((v) => v.notice_id));
      const next = (notices || []).find((n) => !seenIds.has(n.id)) || null;
      setNotice(next);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [userId]);

  useEscapeClose(Boolean(notice), () => setNotice(null));
  useBodyScrollLock(Boolean(notice));

  const dismiss = async () => {
    const dismissed = notice;
    setNotice(null);
    try {
      const { error } = await supabase.from("deployment_notice_views").insert({ notice_id: dismissed.id, user_id: userId });
      // 23505 = unique_violation: otra pestaña ya marcó este mismo aviso
      // como visto para este mismo usuario (misma condición de carrera que
      // acceptLegalConsents en useSession.js) — éxito, no un fallo real.
      if (error && error.code !== "23505") throw error;
    } catch (err) {
      console.error("No se pudo marcar el aviso de despliegue como visto", err);
    }
  };

  if (!loaded || !notice) return null;

  const changes = Array.isArray(notice.changes) ? notice.changes : [];
  const suggestedTests = Array.isArray(notice.suggested_tests) ? notice.suggested_tests : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={dismiss}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deployment-notice-title"
        className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end p-2">
          <button onClick={dismiss} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={notice.id}
            className="max-h-[65vh] touch-pan-y overflow-y-auto px-6 pb-2"
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: reduced ? 0.01 : DURATION.sm, ease: EASE.enter } }}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${TEAL}1A` }}>
              <Rocket size={26} style={{ color: TEAL }} aria-hidden="true" />
            </div>
            <p className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEAL }}>Nuevo despliegue</p>
            <h2 id="deployment-notice-title" className="mb-2 text-center text-base font-bold" style={{ color: NAVY }}>{notice.summary}</h2>
            <p className="mb-3 text-center text-[11px] text-gray-400">
              Rama <span className="font-medium text-gray-600">{notice.branch}</span>
              {" · "}commit <span className="font-mono">{notice.commit_hash?.slice(0, 7)}</span>
            </p>

            {changes.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Qué cambió</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  {changes.map((item, i) => <li key={i} className="flex gap-1.5"><span aria-hidden="true">•</span><span>{item}</span></li>)}
                </ul>
              </div>
            )}

            {suggestedTests.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Pruebas sugeridas</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  {suggestedTests.map((item, i) => <li key={i} className="flex gap-1.5"><span aria-hidden="true">•</span><span>{item}</span></li>)}
                </ul>
              </div>
            )}

            <p className="mb-3 text-xs text-gray-500">
              Tests: {notice.tests_status || "no reportado"} · Build: {notice.build_status || "no reportado"}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 border-t border-gray-100 p-3">
          {notice.preview_url ? (
            <a
              href={notice.preview_url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-200 text-sm font-medium text-gray-600"
            >
              Ver preview <ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : (
            <span className="flex min-h-11 flex-1 items-center justify-center text-center text-xs text-gray-400">
              Sin preview todavía
            </span>
          )}
          <button
            onClick={dismiss}
            className="flex min-h-11 flex-1 items-center justify-center rounded-md text-sm font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
