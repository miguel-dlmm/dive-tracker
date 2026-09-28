import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  X, ArrowLeft, Expand, Shrink, MapPin, Fish, Info, ChevronLeft, ChevronRight,
  LayoutGrid, Search, Moon, Sun, BookOpen, Smartphone, CircleCheck,
} from "lucide-react";
import { BRAND_NAVY, BRAND_OCEAN, BRAND_SKY, NAVY, GREEN, CORAL, BG } from "./App";
import { useEscapeClose, useBodyScrollLock } from "./shared";
import { DURATION, EASE, carouselSlideVariants, usePrefersReducedMotion, useSwipeHorizontal } from "./motion";

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

// Índice de puntos de buceo — nombre tal como aparece impreso en cada
// página y el número de página (del PDF/imágenes originales) al que salta.
// Catalogado a mano, página a página (pg 4-31 del propio libro, sección
// "Puntos de buceo"), no derivado del índice impreso de la página 4 (que
// lista los mismos 27 puntos pero en un orden ligeramente distinto al de
// las páginas reales — ver ese índice como referencia, no como fuente de
// la numeración). Varios nombres comparten página cuando el propio libro
// agrupa varios puntos en un mismo spread (p.ej. página 28: Sairee Reef,
// Samran Pinnacle, Tao Tong, Shark Bay, Buddha Point y Jansom Bay).
const SITE_INDEX = [
  { name: "Ang Thong · Koh Wao", page: 30 },
  { name: "Ang Thong · Koh Yippon", page: 30 },
  { name: "Aow Leuk", page: 23 },
  { name: "Aow Mao", page: 31 },
  { name: "Buddha Point", page: 28 },
  { name: "Buoyancy World", page: 11 },
  { name: "Chumphon Pinnacle", page: 16 },
  { name: "Green Rock", page: 12 },
  { name: "Hin Fai (Biorock)", page: 15 },
  { name: "Hin Ngam", page: 23 },
  { name: "Hin Pee Wee", page: 7 },
  { name: "Hin Wong Pinnacle", page: 19 },
  { name: "HTMS Sattakut", page: 29 },
  { name: "Jansom Bay", page: 28 },
  { name: "Japanese Gardens", page: 14 },
  { name: "Junkyard Reef", page: 6 },
  { name: "King Kong", page: 22 },
  { name: "Laem Thian", page: 21 },
  { name: "Lighthouse", page: 18 },
  { name: "Mango Bay", page: 17 },
  { name: "MV Trident", page: 29 },
  { name: "No Name Pinnacle", page: 9 },
  { name: "Pottery", page: 5 },
  { name: "Red Rock", page: 13 },
  { name: "Sail Rock", page: 27 },
  { name: "Sairee Reef", page: 28 },
  { name: "Samran Pinnacle", page: 28 },
  { name: "Shark Bay", page: 28 },
  { name: "Shark Island", page: 25 },
  { name: "Southwest Pinnacle", page: 26 },
  { name: "Suan Olan", page: 24 },
  { name: "Tanote Bay", page: 20 },
  { name: "Tao Tong", page: 28 },
  { name: "The Unicorn", page: 29 },
  { name: "Twins", page: 10 },
  { name: "White Rock", page: 8 },
  { name: "3 Rocks", page: 5 },
].sort((a, b) => a.name.localeCompare(b.name));

// Modo oscuro del VISOR (solo el lector de páginas, no la portada — la
// portada mantiene siempre su degradado de marca, es una pantalla de
// "título", no de lectura). Pedido explícito 2026-09-27: "ofrecer por
// supuesto en el visor tener modo oscuro". Persistido en localStorage
// (mismo patrón que otras preferencias sueltas de la app, p.ej. la moneda
// favorita, ADR-0007) — una preferencia de ESTE dispositivo/navegador, no
// de la cuenta, así que no necesita ir a Supabase. DARK_BG es un azul casi
// negro de marca, no negro puro — "toda la experiencia tiene que sentirse
// dentro de la app", y un negro neutro rompería esa continuidad con el
// resto de la identidad visual (BRAND_NAVY/BRAND_OCEAN).
const DIVE_GUIDE_DARK_KEY = "oceanflow:diveGuideDark";
const DARK_BG = "#0A1B2E";

function readStoredDarkMode() {
  try { return localStorage.getItem(DIVE_GUIDE_DARK_KEY) === "true"; } catch { return false; }
}

// Mismo Supabase por entorno que el resto de la app (VITE_SUPABASE_URL) —
// así TEST y producción sirven cada uno su propio bucket sin tocar código
// cuando el libro se suba también a producción (scripts/
// upload-dive-guide-assets.mjs --prod). WebP, no JPEG (2026-09-27, pedido
// explícito de aligerar la carga sin perder calidad) — ver el comentario
// del script de subida para la comparación de peso.
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
  return `${base}/storage/v1/object/public/dive-guide/koh-tao/page-${String(n).padStart(2, "0")}.webp`;
}

export default function DiveGuideTab({ onClose, onOpenInstallApp }) {
  const { t } = useTranslation("diveGuide");
  const reduced = usePrefersReducedMotion();
  const [screen, setScreen] = useState("cover"); // "cover" | "reader"
  const [pageIdx, setPageIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dark, setDark] = useState(readStoredDarkMode);
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

  // Precarga la página anterior y la siguiente (pedido explícito 2026-09-27:
  // "las imágenes tardan mucho en cargar") — el peso ya se redujo pasando a
  // WebP (ver pageUrl), pero la sensación de lentitud real está en pasar de
  // página y ESPERAR a que la siguiente cargue. new Image().src cachea en
  // el navegador sin montar nada visible; cuando el <img> real de esa
  // página se monte al navegar, ya la tiene en caché.
  useEffect(() => {
    [pageIdx - 1, pageIdx + 1].forEach((i) => {
      const neighbor = PAGES[i];
      if (!neighbor) return;
      const img = new Image();
      img.src = pageUrl(neighbor.n);
    });
  }, [pageIdx]);

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
  // Selector de puntos de buceo (pedido explícito 2026-09-27: "un selector
  // para ir directamente a la página del site") — salta a la página exacta
  // sin pasar por el resto de páginas intermedias de la sección.
  const jumpToPage = (pageNumber) => {
    setDirection(1);
    setIsZoomed(false);
    setPageIdx(PAGES.findIndex((p) => p.n === pageNumber));
    setScreen("reader");
    setSheetOpen(false);
  };

  const swipeProps = useSwipeHorizontal({
    onSwipeLeft: () => { if (pageIdx < PAGES.length - 1) goNext(); },
    onSwipeRight: () => { if (pageIdx > 0) goPrev(); },
    enabled: !isZoomed,
  });

  // Safari de iPhone nunca ha implementado la Fullscreen API (sí Safari de
  // Mac/iPad, y Chrome en cualquier plataforma) — no es un bug a arreglar,
  // es una restricción real de esa plataforma concreta (pedido explícito
  // 2026-09-28, tras confirmar el matiz con el usuario: "no lo ocultes,
  // hazlo que funcione para Safari y Chrome al menos"). Donde la API no
  // existe, el botón deja de intentar activarla (no hay nada que activar)
  // y en su lugar resuelve lo que el usuario busca de verdad:
  //   - si la app NO está instalada en la pantalla de inicio, lleva a
  //     "Instalar la app" — el camino real hacia una vista sin barras de
  //     Safari en ese dispositivo.
  //   - si ya está instalada (display-mode: standalone / navigator.
  //     standalone), Safari ya no muestra ninguna barra desde el primer
  //     segundo — no hay nada que alternar, así que el icono pasa a ser un
  //     indicador de "ya estás a pantalla completa" en vez de desaparecer.
  const fullscreenSupported = typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function";
  const isStandalone =
    typeof window !== "undefined" &&
    (window.navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)")?.matches === true);

  const toggleFullscreen = () => {
    if (fullscreenSupported) {
      if (document.fullscreenElement) safeExitFullscreen();
      else safeRequestFullscreen(rootRef.current);
      return;
    }
    if (!isStandalone && onOpenInstallApp) {
      if (document.fullscreenElement) safeExitFullscreen();
      onOpenInstallApp();
    }
    // Ya instalada y sin API: no hay acción que ejecutar, el botón es
    // solo un indicador (ver icono/aria-label en ReaderTopBar).
  };

  const toggleDark = () => {
    setDark((v) => {
      const next = !v;
      try { localStorage.setItem(DIVE_GUIDE_DARK_KEY, String(next)); } catch { /* no-op */ }
      return next;
    });
  };

  const handleClose = () => {
    if (document.fullscreenElement) safeExitFullscreen();
    onClose();
  };

  // La "X" del lector (dentro de una página) vuelve a la portada del
  // libro, no a Home — pedido explícito 2026-09-27: "cuando cierro el
  // visor vuelvo a la home de la app, debería volver a la portada del
  // libro". Salir de la app entera sigue siendo la "X" de la propia
  // portada (CoverScreen, más abajo), que sí llama a handleClose.
  const backToCover = () => {
    if (document.fullscreenElement) safeExitFullscreen();
    setScreen("cover");
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", backgroundColor: screen === "reader" ? (dark ? DARK_BG : BG) : BRAND_NAVY }}
    >
      {screen === "cover" ? (
        <CoverScreen
          t={t}
          reduced={reduced}
          onStart={startFromBeginning}
          onOpenSection={openSection}
          onSelectSitePage={jumpToPage}
          onClose={handleClose}
        />
      ) : (
        <>
          <ReaderTopBar
            t={t}
            dark={dark}
            section={currentSection}
            current={current}
            onClose={backToCover}
            onOpenSections={() => setSheetOpen(true)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onToggleDark={toggleDark}
            fullscreenSupported={fullscreenSupported}
            isStandalone={isStandalone}
          />
          {/* touch-none (no touch-pan-y, a diferencia del carrusel de
              SlideDeck/motion.js): aquí no hace falta scroll vertical
              nativo, y CUALQUIER touch-action que no sea "none" deja a
              Safari con margen para interpretar el pellizco como su
              propio zoom nativo de página en vez de entregárselo entero a
              react-zoom-pan-pinch — bug real confirmado (pedido explícito
              del usuario: "arregla que funcione el zoom en Safari"), no
              reproducible en Chrome (que es más permisivo con
              preventDefault en touchmove incluso sin este ajuste). */}
          <div className="relative min-h-0 flex-1 touch-none overflow-hidden" {...swipeProps}>
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
                  <TransformComponent
                    wrapperStyle={{ width: "100%", height: "100%", touchAction: "none" }}
                    contentStyle={{ width: "100%", height: "100%" }}
                  >
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
              <motion.button
                type="button"
                onClick={goPrev}
                whileTap={reduced ? undefined : { scale: 0.85 }}
                aria-label={t("viewer.prevPageAria")}
                className="absolute left-2 top-1/2 -mt-[22px] flex h-11 w-11 items-center justify-center rounded-full shadow-lg"
                style={{ backgroundColor: dark ? "rgba(255,255,255,0.14)" : "#fff", color: dark ? "#fff" : BRAND_NAVY }}
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </motion.button>
            )}
            {!isZoomed && pageIdx < PAGES.length - 1 && (
              <motion.button
                type="button"
                onClick={goNext}
                whileTap={reduced ? undefined : { scale: 0.85 }}
                aria-label={t("viewer.nextPageAria")}
                className="absolute right-2 top-1/2 -mt-[22px] flex h-11 w-11 items-center justify-center rounded-full shadow-lg"
                style={{ backgroundColor: dark ? "rgba(255,255,255,0.14)" : "#fff", color: dark ? "#fff" : BRAND_NAVY }}
              >
                <ChevronRight size={22} aria-hidden="true" />
              </motion.button>
            )}
          </div>

          <div className="h-1 w-full" style={{ backgroundColor: dark ? "rgba(255,255,255,0.12)" : "#E5E7EB" }}>
            <div
              className="h-full transition-all duration-200"
              style={{ width: `${((pageIdx + 1) / PAGES.length) * 100}%`, backgroundColor: dark ? BRAND_SKY : BRAND_OCEAN }}
            />
          </div>
        </>
      )}

      {sheetOpen && (
        <SectionSheet t={t} onSelect={openSection} onSelectPage={jumpToPage} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}

// Entrada escalonada de la portada (pedido explícito 2026-09-27: "dale un
// aspecto más guay a la portada... anima cosas guay") — mismo vocabulario
// de movimiento que el resto de la app (DURATION/EASE de motion.js,
// idéntico patrón de delay por índice que ya usan MoneyKpiTile/MiniKpiTile
// en HomeTab.jsx), no una animación inventada aparte solo para esto.
function fadeUpVariant(reduced, index) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: reduced ? 0.01 : DURATION.md, ease: EASE.enter, delay: reduced ? 0 : index * 0.06 } },
  };
}

// Burbujas decorativas de fondo — pura ambientación temática ("somos una
// marca completa", pedido explícito de innovar en la portada sin
// sobrecargar los controles): grandes, muy tenues, y SIN interactuar con
// nada (pointer-events-none, aria-hidden) — el movimiento vive solo aquí,
// nunca en un botón o tarjeta real, para que la portada se sienta viva sin
// que ningún control parezca "temblar" o distraiga de tocarlo. Se
// desactiva con prefers-reduced-motion (queda como decoración estática).
function FloatingBubbles({ reduced }) {
  const bubbles = [
    { size: 90, left: "8%", top: "6%", duration: 9, delay: 0 },
    { size: 50, left: "78%", top: "14%", duration: 7, delay: 0.6 },
    { size: 130, left: "62%", top: "58%", duration: 11, delay: 1.1 },
    { size: 40, left: "18%", top: "72%", duration: 8, delay: 0.3 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {bubbles.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: b.size, height: b.size, left: b.left, top: b.top, backgroundColor: "rgba(255,255,255,0.05)" }}
          animate={reduced ? undefined : { y: [0, -18, 0] }}
          transition={reduced ? undefined : { duration: b.duration, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function CoverScreen({ t, reduced, onStart, onOpenSection, onSelectSitePage, onClose }) {
  const smallSections = SECTION_DEFS.slice(1); // Vida marina, Información extra
  return (
    <div
      className="relative flex h-full flex-col overflow-y-auto px-5 pb-4 text-center"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.6rem)",
        background: `linear-gradient(165deg, ${BRAND_NAVY} 0%, ${BRAND_OCEAN} 100%)`,
      }}
    >
      <FloatingBubbles reduced={reduced} />

      {/* self-start + -ml-2 (2026-09-27, pedido explícito: "el libro
          digital se cierra con la X en el lado contrario que el resto de
          páginas, estandariza eso") — la cabecera global de la app y el
          propio lector (ReaderTopBar, la flecha "‹") ponen SIEMPRE el
          control de cierre/atrás a la izquierda; esta portada era la
          única excepción, con la X a la derecha (self-end). */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t("viewer.closeAria")}
        className="relative -ml-2 mb-1 flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-full text-white/80"
      >
        <X size={20} aria-hidden="true" />
      </button>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-3">
        <motion.img
          {...fadeUpVariant(reduced, 0)}
          src="/brand/logo-mark-white.svg"
          width={30}
          height={30}
          alt=""
          aria-hidden="true"
          className="opacity-90"
        />
        <motion.div {...fadeUpVariant(reduced, 1)}>
          <h1 className="text-xl font-extrabold tracking-tight text-white">{t("cover.title")}</h1>
          <p className="mt-0.5 text-sm font-medium text-white/70">{t("cover.subtitle")}</p>
          {/* El tagline sigue existiendo para quien usa lector de pantalla
              (contexto real de qué es esto) pero deja de ocupar sitio en
              pantalla — la información ya está, más compacta, en las
              propias tarjetas de sección de abajo (pedido explícito:
              "sube todo el contenido un poco más arriba... quitamos el
              scroll vertical siempre que quepa"). */}
          <p className="sr-only">{t("cover.tagline")}</p>
        </motion.div>

        <motion.div {...fadeUpVariant(reduced, 2)} className="grid w-full max-w-xs grid-cols-2 gap-2">
          {smallSections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => onOpenSection(section.key)}
              className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl bg-white/10 px-2 py-2.5 text-center active:scale-[0.97]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${section.color}40` }}>
                <section.Icon size={16} style={{ color: "#fff" }} aria-hidden="true" />
              </span>
              {/* w-full, no solo min-w-0 (bug real reportado: "el subtítulo
                  se sale de la pastilla") — el botón es flex-col con
                  items-center, que NO estira a sus hijos al ancho del
                  contenedor (a diferencia de items-stretch, el valor por
                  defecto). Sin w-full, este bloque de texto no tenía
                  ningún ancho real contra el que recortarse: crecía tanto
                  como hiciera falta para caber su línea más larga
                  ("Señales, seguridad y curiosidades"), desbordando la
                  tarjeta en vez de truncarse. */}
              <span className="w-full min-w-0">
                <div className="truncate text-[12.5px] font-bold text-white">{t(`sections.${section.key}.label`)}</div>
                <div className="truncate text-[10px] text-white/60">{t(`sections.${section.key}.hint`)}</div>
              </span>
            </button>
          ))}
        </motion.div>

        {/* "Puntos de buceo" lleva el buscador de sites EMBEBIDO dentro de
            su propia tarjeta (pedido explícito 2026-09-27: "quiero que el
            buscador... esté dentro de la pastilla de puntos de buceo en la
            home del libro digital"), no detrás de un enlace aparte que
            abriera una hoja. maxResultsHeight = 144 (2026-09-28, pedido
            explícito: "añade una tercera fila de resultados") — 3 filas
            completas de min-h-11 (44px) + gap-1.5 (6px) entre ellas: 44×3 +
            6×2 = 144. Menos que en la hoja del lector (148, ~3 filas con
            algo más de aire) porque aquí compite por sitio con el resto de
            la portada; en el lector tiene toda la pantalla para él. */}
        <motion.div {...fadeUpVariant(reduced, 3)} className="w-full max-w-xs overflow-hidden rounded-xl bg-white/10">
          <button
            type="button"
            onClick={() => onOpenSection("sites")}
            className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-white/5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${SECTION_DEFS[0].color}40` }}>
              <MapPin size={17} style={{ color: "#fff" }} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{t("sections.sites.label")}</div>
              <div className="truncate text-[11px] text-white/60">{t("sections.sites.hint")}</div>
            </span>
          </button>
          <div className="border-t border-white/10 px-3 pb-3 pt-2">
            <SiteSearch t={t} onSelectPage={onSelectSitePage} variant="dark" maxResultsHeight={144} />
          </div>
        </motion.div>

        <motion.button
          {...fadeUpVariant(reduced, 4)}
          whileTap={reduced ? undefined : { scale: 0.97 }}
          type="button"
          onClick={onStart}
          className="mt-1 flex min-h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold"
          style={{ color: BRAND_NAVY }}
        >
          <BookOpen size={16} aria-hidden="true" />
          {t("cover.start")}
        </motion.button>
      </div>

      <p className="relative mt-2 text-[9.5px] leading-relaxed text-white/40">{t("cover.credit")}</p>
    </div>
  );
}

function ReaderTopBar({ t, dark, section, current, onClose, onOpenSections, isFullscreen, onToggleFullscreen, onToggleDark, fullscreenSupported, isStandalone }) {
  const iconColor = dark ? "#fff" : BRAND_NAVY;
  // 3 estados reales (ver el comentario largo junto a toggleFullscreen):
  // API disponible (Chrome/iPad/Mac) → icono y aria normales de siempre;
  // sin API y sin instalar (iPhone en el navegador) → icono de instalar
  // app; sin API y ya instalada (iPhone, PWA) → indicador "ya a pantalla
  // completa", sin acción real que ejecutar.
  const fullscreenIcon = !fullscreenSupported && !isStandalone
    ? <Smartphone size={18} style={{ color: iconColor }} aria-hidden="true" />
    : !fullscreenSupported && isStandalone
      ? <CircleCheck size={18} style={{ color: iconColor }} aria-hidden="true" />
      : isFullscreen
        ? <Shrink size={18} style={{ color: iconColor }} aria-hidden="true" />
        : <Expand size={18} style={{ color: iconColor }} aria-hidden="true" />;
  const fullscreenAria = !fullscreenSupported && !isStandalone
    ? t("viewer.installForFullscreenAria")
    : !fullscreenSupported && isStandalone
      ? t("viewer.alreadyFullscreenAria")
      : isFullscreen
        ? t("viewer.fullscreenExitAria")
        : t("viewer.fullscreenEnterAria");
  return (
    <div
      className="z-10 flex items-center justify-between gap-1 border-b px-2 py-2"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
        backgroundColor: dark ? DARK_BG : "#fff",
        borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      }}
    >
      <motion.button
        type="button"
        onClick={onClose}
        whileTap={{ scale: 0.85 }}
        aria-label={t("viewer.backToCoverAria")}
        className="flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <ArrowLeft size={20} style={{ color: iconColor }} aria-hidden="true" />
      </motion.button>

      <motion.button
        type="button"
        onClick={onOpenSections}
        whileTap={{ scale: 0.96 }}
        aria-label={t("viewer.sectionsAria")}
        className="flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5"
        style={{ backgroundColor: dark ? "rgba(255,255,255,0.1)" : "#F3F4F6" }}
      >
        <section.Icon size={13} style={{ color: iconColor }} aria-hidden="true" />
        <span className="truncate text-[12px] font-semibold" style={{ color: iconColor }}>{t(`sections.${section.key}.label`)}</span>
        <span className="shrink-0 text-[11px] tabular-nums" style={{ color: dark ? "rgba(255,255,255,0.55)" : "#9CA3AF" }}>
          · {t("viewer.pageCounter", { current: current.indexInSection + 1, total: current.totalInSection })}
        </span>
        <LayoutGrid size={12} className="shrink-0" style={{ color: dark ? "rgba(255,255,255,0.55)" : "#9CA3AF" }} aria-hidden="true" />
      </motion.button>

      <motion.button
        type="button"
        onClick={onToggleDark}
        whileTap={{ scale: 0.85 }}
        aria-label={dark ? t("viewer.lightModeAria") : t("viewer.darkModeAria")}
        className="flex h-11 w-11 shrink-0 items-center justify-center"
      >
        {dark ? <Sun size={18} style={{ color: iconColor }} aria-hidden="true" /> : <Moon size={18} style={{ color: iconColor }} aria-hidden="true" />}
      </motion.button>

      <motion.button
        type="button"
        onClick={onToggleFullscreen}
        whileTap={{ scale: 0.85 }}
        aria-label={fullscreenAria}
        className="flex h-11 w-11 shrink-0 items-center justify-center"
      >
        {fullscreenIcon}
      </motion.button>
    </div>
  );
}

// Buscador de puntos de buceo — pedido explícito 2026-09-27: "integraría
// en la pastilla de puntos de buceo el buscador de texto y un alto de
// dos-tres filas... q se vayan filtrando los resultados conforme
// escribas". Un solo componente, dos sitios donde vive: embebido dentro
// de la propia tarjeta "Puntos de buceo" de la portada (variant="dark",
// sobre el degradado navy, maxResultsHeight más bajo por sitio limitado) y
// dentro de la hoja de secciones del lector (variant="light", sobre
// blanco, con más aire disponible) — mismo comportamiento de filtrado en
// vivo en los dos. Solo la rejilla de resultados tiene scroll propio, no
// el buscador ni el resto de lo que lo rodea.
function SiteSearch({ t, onSelectPage, variant = "light", maxResultsHeight = 148 }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredSites = normalizedQuery
    ? SITE_INDEX.filter((site) => site.name.toLowerCase().includes(normalizedQuery))
    : SITE_INDEX;
  const dark = variant === "dark";

  // Aviso real reportado (2026-09-28): en iOS Safari la barra de scroll
  // nativa es un overlay del sistema que solo aparece un instante mientras
  // se desplaza — no hay forma de dejarla siempre visible con CSS (a
  // diferencia de escritorio). En su lugar, un desvanecido al final de la
  // lista (el mismo patrón que usa el propio iOS en listas largas) avisa
  // de que hay más resultados debajo sin depender de esa barra. Se
  // calcula de verdad (scrollHeight/scrollTop/clientHeight), no un
  // degradado fijo siempre visible: desaparece en cuanto se llega al
  // final o cuando los resultados ya caben enteros (p. ej. tras filtrar).
  const resultsRef = useRef(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const checkOverflow = () => {
    const el = resultsRef.current;
    if (!el) return;
    setHasMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  };
  useEffect(() => { checkOverflow(); }, [filteredSites.length]);

  return (
    <div>
      <div className="relative">
        <Search
          size={14}
          className={`pointer-events-none absolute left-3 top-1/2 -mt-[7px] ${dark ? "text-white/50" : "text-gray-400"}`}
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("viewer.siteIndexHeading")}
          aria-label={t("viewer.siteIndexHeading")}
          className={
            dark
              ? "min-h-11 w-full rounded-lg border border-white/15 bg-white/10 py-2 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/50 focus:border-white/30"
              : "min-h-11 w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-[13px] outline-none focus:border-gray-300"
          }
          style={dark ? undefined : { color: BRAND_NAVY }}
        />
      </div>
      <div className="relative mt-2">
        <div
          ref={resultsRef}
          onScroll={checkOverflow}
          className="overflow-y-auto"
          style={{ maxHeight: maxResultsHeight }}
        >
          {filteredSites.length === 0 ? (
            <p className={`py-4 text-center text-[12.5px] ${dark ? "text-white/50" : "text-gray-400"}`}>{t("viewer.siteIndexEmpty")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {filteredSites.map((site) => (
                <button
                  key={site.name}
                  type="button"
                  onClick={() => onSelectPage(site.page)}
                  className={
                    dark
                      ? "min-h-11 truncate rounded-lg bg-white/10 px-3 py-2 text-left text-[12.5px] font-medium text-white active:bg-white/20"
                      : "min-h-11 truncate rounded-lg bg-gray-50 px-3 py-2 text-left text-[12.5px] font-medium active:bg-gray-100"
                  }
                  style={dark ? undefined : { color: BRAND_NAVY }}
                >
                  {site.name}
                </button>
              ))}
            </div>
          )}
        </div>
        {hasMoreBelow && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-5"
            style={{
              background: dark
                ? `linear-gradient(to top, ${BRAND_NAVY}, transparent)`
                : "linear-gradient(to top, #fff, transparent)",
            }}
          />
        )}
      </div>
    </div>
  );
}

function SectionSheet({ t, onSelect, onSelectPage, onClose }) {
  useEscapeClose(true, onClose);
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[80dvh] w-full max-w-lg flex-col rounded-t-xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-3 pb-1">
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

        <div className="shrink-0 border-t border-gray-100 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2">
          <SiteSearch t={t} onSelectPage={onSelectPage} variant="light" />
        </div>
      </div>
    </div>
  );
}
