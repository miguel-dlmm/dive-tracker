import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { X, Maximize2, Minimize2, MapPin, Fish, Info, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { BRAND_NAVY, BRAND_OCEAN, NAVY, GREEN, CORAL } from "./App";
import { useEscapeClose, useBodyScrollLock } from "./shared";
import { carouselSlideVariants, usePrefersReducedMotion, useSwipeHorizontal } from "./motion";

// Guía de Buceo (Koh Tao) — "libro digital" pensado para que el instructor
// se lo enseñe al cliente durante el briefing (pedido explícito
// 2026-09-27). Contenido real de un dive guide físico (56 páginas
// escaneadas), subido como imágenes ya optimizadas a Supabase Storage
// (bucket público "dive-guide", ver scripts/upload-dive-guide-assets.mjs)
// en vez de servir el PDF original de 58MB. La portada del libro físico
// llevaba pegado un adhesivo publicitario de un centro de buceo (Nitro Koh
// Tao) directamente sobre la ilustración original — al ser un adhesivo
// FÍSICO, no una capa digital, no hay forma de "quitarlo" sin inventar lo
// que hay debajo, así que en vez de usar esa portada se sustituye por una
// propia con el estilo de Ocean Flow (más abajo, CoverScreen).
//
// Estructura en 3 secciones, calcada del índice real del propio libro
// (páginas 2-3: portada interior + mapa; confirmado visualmente página a
// página, no adivinado): "Puntos de buceo" (2-31, incluye la introducción/
// mapa de la isla), "Vida marina" (32-44, Fish & Coral ID) e "Información
// extra" (45-56, Bonus Info: buddy checks, señales, seguridad, cómics).
const SECTION_DEFS = [
  { key: "sites", start: 2, end: 31, color: NAVY, Icon: MapPin },
  { key: "marine", start: 32, end: 44, color: GREEN, Icon: Fish },
  { key: "extra", start: 45, end: 56, color: CORAL, Icon: Info },
];

const PAGES = SECTION_DEFS.flatMap((section) => {
  const total = section.end - section.start + 1;
  return Array.from({ length: total }, (_, i) => ({
    n: section.start + i,
    sectionKey: section.key,
    indexInSection: i,
    totalInSection: total,
  }));
});

function firstIndexOfSection(key) {
  return PAGES.findIndex((p) => p.sectionKey === key);
}

// Mismo Supabase por entorno que el resto de la app (VITE_SUPABASE_URL) —
// así TEST y producción sirven cada uno su propio bucket sin tocar código
// cuando el libro se suba también a producción (scripts/
// upload-dive-guide-assets.mjs --prod).
// iOS Safari no expone requestFullscreen en iPhone (sí en iPad) — ahí el
// botón simplemente no hace nada, sin romper nada (una app instalada como
// PWA ya corre sin barra de navegador). Un contexto sin el permiso de
// "fullscreen" concedido (visto de verdad automatizando el navegador con
// claude-in-chrome para probar este visor: "TypeError: not granted") puede
// lanzar de forma SÍNCRONA, no solo rechazar la promesa — por eso el
// try/catch envuelve la llamada entera, no solo un `.catch()` colgado del
// resultado. No es un error que el usuario deba ver ni que rompa el visor.
function safeRequestFullscreen(el) {
  try { el?.requestFullscreen?.()?.catch(() => {}); } catch { /* no-op */ }
}
function safeExitFullscreen() {
  try { document.exitFullscreen?.()?.catch(() => {}); } catch { /* no-op */ }
}

function pageUrl(n) {
  const base = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/dive-guide/koh-tao/page-${String(n).padStart(2, "0")}.jpg`;
}

export default function DiveGuideTab({ onClose }) {
  const { t } = useTranslation("diveGuide");
  const reduced = usePrefersReducedMotion();
  const [screen, setScreen] = useState("cover"); // "cover" | "reader"
  const [pageIdx, setPageIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef(null);

  useEscapeClose(true, onClose);
  useBodyScrollLock(true);

  useEffect(() => {
    function handler() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const current = PAGES[pageIdx];
  const currentSection = SECTION_DEFS.find((s) => s.key === current.sectionKey);

  const goNext = () => {
    setDirection(1);
    setIsZoomed(false);
    setPageIdx((i) => Math.min(i + 1, PAGES.length - 1));
  };
  const goPrev = () => {
    setDirection(-1);
    setIsZoomed(false);
    setPageIdx((i) => Math.max(i - 1, 0));
  };

  // Flechas de teclado — fallback para quien no tiene pantalla táctil
  // (regla de accesibilidad de CLAUDE.md: no depender solo del gesto).
  useEffect(() => {
    if (screen !== "reader") return undefined;
    function handler(e) {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [screen]);

  const openSection = (key) => {
    setDirection(1);
    setIsZoomed(false);
    setPageIdx(firstIndexOfSection(key));
    setScreen("reader");
    setSheetOpen(false);
  };
  const startFromBeginning = () => {
    setDirection(1);
    setIsZoomed(false);
    setPageIdx(0);
    setScreen("reader");
  };

  const swipeProps = useSwipeHorizontal({
    onSwipeLeft: () => { if (pageIdx < PAGES.length - 1) goNext(); },
    onSwipeRight: () => { if (pageIdx > 0) goPrev(); },
    enabled: !isZoomed,
  });

  const toggleFullscreen = () => {
    if (document.fullscreenElement) safeExitFullscreen();
    else safeRequestFullscreen(rootRef.current);
  };

  const handleClose = () => {
    if (document.fullscreenElement) safeExitFullscreen();
    onClose();
  };

  return (
    <div ref={rootRef} className="fixed inset-0 z-50 flex flex-col bg-black" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {screen === "cover" ? (
        <CoverScreen t={t} onStart={startFromBeginning} onOpenSection={openSection} onClose={handleClose} />
      ) : (
        <>
          <ReaderTopBar
            t={t}
            section={currentSection}
            current={current}
            onClose={handleClose}
            onOpenSections={() => setSheetOpen(true)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
          <div className="relative min-h-0 flex-1 touch-pan-y overflow-hidden" {...swipeProps}>
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div
                key={current.n}
                custom={direction}
                variants={carouselSlideVariants(reduced)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute inset-0"
              >
                <TransformWrapper
                  initialScale={1}
                  minScale={1}
                  maxScale={4}
                  centerOnInit
                  doubleClick={{ mode: "toggle" }}
                  wheel={{ step: 0.2 }}
                  onTransform={(_, state) => setIsZoomed(state.scale > 1.01)}
                >
                  <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
                    <img
                      src={pageUrl(current.n)}
                      alt=""
                      className="h-full w-full object-contain select-none"
                      draggable={false}
                    />
                  </TransformComponent>
                </TransformWrapper>
              </motion.div>
            </AnimatePresence>

            {!isZoomed && pageIdx > 0 && (
              <button
                type="button"
                onClick={goPrev}
                aria-label={t("viewer.prevPageAria")}
                className="absolute left-1 top-1/2 -mt-[22px] flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white"
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
            )}
            {!isZoomed && pageIdx < PAGES.length - 1 && (
              <button
                type="button"
                onClick={goNext}
                aria-label={t("viewer.nextPageAria")}
                className="absolute right-1 top-1/2 -mt-[22px] flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white"
              >
                <ChevronRight size={22} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="h-1 w-full bg-white/10">
            <div
              className="h-full bg-white/70 transition-all duration-200"
              style={{ width: `${((pageIdx + 1) / PAGES.length) * 100}%` }}
            />
          </div>
        </>
      )}

      {sheetOpen && <SectionSheet t={t} onSelect={openSection} onClose={() => setSheetOpen(false)} />}
    </div>
  );
}

function CoverScreen({ t, onStart, onOpenSection, onClose }) {
  return (
    <div
      className="flex h-full flex-col overflow-y-auto px-6 pb-10 text-center"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)",
        background: `linear-gradient(165deg, ${BRAND_NAVY} 0%, ${BRAND_OCEAN} 100%)`,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("viewer.closeAria")}
        className="-mr-2 mb-2 flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-full text-white/80"
      >
        <X size={20} aria-hidden="true" />
      </button>

      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <img src="/brand/logo-mark-white.svg" width={40} height={40} alt="" aria-hidden="true" className="opacity-90" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{t("cover.title")}</h1>
          <p className="mt-1 text-sm font-medium text-white/70">{t("cover.subtitle")}</p>
        </div>
        <p className="max-w-xs text-[13px] leading-relaxed text-white/80">{t("cover.tagline")}</p>

        <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
          {SECTION_DEFS.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => onOpenSection(section.key)}
              className="flex min-h-14 items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-left backdrop-blur-sm active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${section.color}33` }}>
                <section.Icon size={17} style={{ color: "#fff" }} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <div className="truncate text-sm font-bold text-white">{t(`sections.${section.key}.label`)}</div>
                <div className="truncate text-[11px] text-white/60">{t(`sections.${section.key}.hint`)}</div>
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-2 min-h-11 w-full max-w-xs rounded-xl bg-white px-4 py-3 text-sm font-bold"
          style={{ color: BRAND_NAVY }}
        >
          {t("cover.start")}
        </button>
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-white/40">{t("cover.credit")}</p>
    </div>
  );
}

function ReaderTopBar({ t, section, current, onClose, onOpenSections, isFullscreen, onToggleFullscreen }) {
  return (
    <div
      className="z-10 flex items-center justify-between gap-2 px-3 py-2"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)", background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)" }}
    >
      <button type="button" onClick={onClose} aria-label={t("viewer.closeAria")} className="flex h-11 w-11 items-center justify-center text-white">
        <X size={20} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onOpenSections}
        aria-label={t("viewer.sectionsAria")}
        className="flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-white"
      >
        <section.Icon size={13} aria-hidden="true" />
        <span className="truncate text-[12px] font-semibold">{t(`sections.${section.key}.label`)}</span>
        <span className="shrink-0 text-[11px] text-white/60 tabular-nums">
          · {t("viewer.pageCounter", { current: current.indexInSection + 1, total: current.totalInSection })}
        </span>
        <Layers size={12} className="shrink-0 text-white/60" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? t("viewer.fullscreenExitAria") : t("viewer.fullscreenEnterAria")}
        className="flex h-11 w-11 items-center justify-center text-white"
      >
        {isFullscreen ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}

function SectionSheet({ t, onSelect, onClose }) {
  useEscapeClose(true, onClose);
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-t-xl bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-gray-200" aria-hidden="true" />
        {SECTION_DEFS.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => onSelect(section.key)}
            className="flex min-h-14 w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left active:bg-gray-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${section.color}1A` }}>
              <section.Icon size={16} style={{ color: section.color }} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <div className="truncate text-sm font-bold" style={{ color: BRAND_NAVY }}>{t(`sections.${section.key}.label`)}</div>
              <div className="truncate text-[11px] text-gray-400">{t(`sections.${section.key}.hint`)}</div>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
