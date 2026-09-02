import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { X, Rocket, ExternalLink } from "lucide-react";
import { NAVY, TEAL } from "./colors";
import { supabase } from "./supabaseClient";
import { useEscapeClose, useBodyScrollLock } from "./shared";
import { DURATION, EASE, usePrefersReducedMotion } from "./motion";

// Slide de "aviso de despliegue" — mismo lenguaje visual que WhatsNew.jsx
// (modal centrado, icono redondo, título+cuerpo, franja de acciones), pero
// mecanismo de datos distinto a propósito: WhatsNew es contenido editorial
// fijo en código, gateado por versión (localStorage); esto lee la fila más
// reciente de `deployment_notices` que la cuenta actual no haya visto
// todavía (tabla `deployment_notice_views`), así que el contenido cambia
// con cada commit notificado, no con cada release de producto.
// Ver docs/ADR/0024-propuesta-avisos-despliegue-develop.md (implementado
// 2026-09-01) y docs/RELEASE-V1-PROGRESS.md Fase 6 (generalizado a dos
// audiencias, 2026-09-02) — diseño completo.
//
// Generalizado (Fase 6): se monta para CUALQUIER cuenta con sesión (ver
// App.jsx), ya no solo profile.is_superadmin. RLS de deployment_notices
// filtra sola qué filas puede ver cada quien según su columna `audience`
// ('all' para cualquiera, 'superadmin' solo si is_superadmin) — este
// componente no necesita repetir esa lógica, solo pedir todas las filas
// visibles y quedarse con la más reciente sin ver.
//
// profileCreatedAt (Fase 6): un aviso con created_at anterior al alta del
// usuario nunca se le muestra — sin este filtro, una cuenta creada
// después de un despliegue vería como "novedad" un aviso de antes de que
// existiera, justo el comportamiento que el encargo pedía evitar.
export default function DeploymentNotice({ userId, profileCreatedAt }) {
  const { t } = useTranslation("notices");
  const [notice, setNotice] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    let active = true;
    (async () => {
      let noticesQuery = supabase.from("deployment_notices").select("*");
      if (profileCreatedAt) noticesQuery = noticesQuery.gte("created_at", profileCreatedAt);
      noticesQuery = noticesQuery.order("created_at", { ascending: false }).limit(10);
      const [{ data: notices, error: noticesError }, { data: views, error: viewsError }] = await Promise.all([
        noticesQuery,
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
  }, [userId, profileCreatedAt]);

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

  const technicalChanges = Array.isArray(notice.technical_changes) && notice.technical_changes.length
    ? notice.technical_changes
    : (Array.isArray(notice.changes) ? notice.changes : []);
  const functionalChanges = Array.isArray(notice.functional_changes) ? notice.functional_changes : [];
  const steps = Array.isArray(notice.steps) && notice.steps.length
    ? notice.steps
    : (Array.isArray(notice.suggested_tests) ? notice.suggested_tests : []);

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
          <button onClick={dismiss} aria-label={t("deploymentNotice.close")} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50">
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
            <p className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEAL }}>{t("deploymentNotice.eyebrow")}</p>
            <h2 id="deployment-notice-title" className="mb-2 text-center text-base font-bold" style={{ color: NAVY }}>{notice.summary}</h2>
            <p className="mb-3 text-center text-[11px] text-gray-400">
              {t("deploymentNotice.branchLabel")} <span className="font-medium text-gray-600">{notice.branch}</span>
              {" · "}{t("deploymentNotice.commitLabel")} <span className="font-mono">{notice.commit_hash?.slice(0, 7)}</span>
            </p>

            {technicalChanges.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{t("deploymentNotice.technicalChanges")}</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  {technicalChanges.map((item, i) => <li key={i} className="flex gap-1.5"><span aria-hidden="true">•</span><span>{item}</span></li>)}
                </ul>
              </div>
            )}

            {functionalChanges.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{t("deploymentNotice.functionalChanges")}</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  {functionalChanges.map((item, i) => <li key={i} className="flex gap-1.5"><span aria-hidden="true">•</span><span>{item}</span></li>)}
                </ul>
              </div>
            )}

            <p className="mb-3 text-sm text-gray-600">
              <span className="font-semibold" style={{ color: NAVY }}>{t("deploymentNotice.uiChangesLabel")}</span>{" "}
              {notice.has_ui_changes ? (notice.ui_changes_note || t("deploymentNotice.uiChangesYes")) : t("deploymentNotice.uiChangesNo")}
            </p>

            {steps.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{t("deploymentNotice.stepsHeading")}</p>
                <ol className="space-y-1 text-sm text-gray-600">
                  {steps.map((item, i) => <li key={i} className="flex gap-1.5"><span aria-hidden="true">{i + 1}.</span><span>{item}</span></li>)}
                </ol>
              </div>
            )}

            <p className="mb-3 text-xs text-gray-500">
              {t("deploymentNotice.testsLabel")} {notice.tests_status || t("deploymentNotice.notReported")} · {t("deploymentNotice.buildLabel")} {notice.build_status || t("deploymentNotice.notReported")}
            </p>

            <div className="mb-3 space-y-2">
              {notice.preview_url ? (
                <a
                  href={notice.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 text-sm font-medium text-gray-600"
                >
                  {t("deploymentNotice.previewCommit")} <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : (
                <p className="text-center text-xs text-gray-400">{t("deploymentNotice.previewCommitEmpty")}</p>
              )}
              {notice.integration_preview_url ? (
                <a
                  href={notice.integration_preview_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 text-sm font-medium text-gray-600"
                >
                  {t("deploymentNotice.previewIntegrated")} <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : (
                <p className="text-center text-xs text-gray-400">{t("deploymentNotice.previewIntegratedEmpty")}</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 border-t border-gray-100 p-3">
          <button
            onClick={dismiss}
            className="flex min-h-11 flex-1 items-center justify-center rounded-md text-sm font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            {t("deploymentNotice.understood")}
          </button>
        </div>
      </div>
    </div>
  );
}
