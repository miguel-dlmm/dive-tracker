import { useTranslation } from "react-i18next";
import { FileDown, LayoutGrid, IdCard, GraduationCap, Sparkles } from "lucide-react";
import { TEAL, SUN, CORAL, BRAND_NAVY, BRAND_OCEAN } from "./App";
import SlideDeck from "./SlideDeck";

// Píldora de novedades — no un manual: pocas frases por diapositiva,
// navegable con "Siguiente"/"Atrás", puntos, o deslizando lateralmente
// (swipe), sin texto de más. Ver docs/ADR/0010-proceso-de-release.md:
// redactar este contenido pasa a formar parte de preparar cada release,
// con la misma fuente de verdad que CHANGELOG.md (no una tarea aparte
// inventada después). La mecánica del carrusel en sí vive en
// SlideDeck.jsx (compartida con OnboardingTour.jsx desde el 2026-09-27).
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
// Training Records retirado de aquí el 2026-09-03 (pedido explícito del
// usuario: no salía en ese paquete de Release V1 porque todavía no
// estaba disponible de verdad para el usuario final). Reintroducido el
// 2026-09-08, también pedido explícito del usuario, una vez Training
// Records ya es una funcionalidad real y accesible desde Home — mismo
// criterio de fondo en ambos momentos ("no anunciar algo que el usuario
// no puede usar todavía"), no una contradicción.
//
// Sin capturas de pantalla, mismo motivo que la versión anterior de este
// archivo: ninguna captura real de esta sesión queda presentable para un
// usuario real (cuenta "dev-bypass", datos de prueba). Iconografía + color
// coherente con el resto de la app cumple igual el objetivo ("muy
// visual") sin ese riesgo.
//
// Contenido reescrito 2026-09-27 (release v1.5.0/v1.5.1, texto aprobado
// explícitamente por el usuario en el chat antes de comitearse — ver
// docs/ADR/0010-proceso-de-release.md, addendum 2026-09-09): 4
// diapositivas de funcionalidad nueva + la meta-diapositiva final de
// siempre. icon/color no son traducibles — título/cuerpo de cada
// diapositiva viven en notices.json (whatsNew.slides, mismo orden por
// índice) y se combinan con este array en el componente. La última
// diapositiva se queda última a propósito, como siempre: es un
// meta-mensaje sobre el propio WhatsNew ("consúltalo de nuevo en
// Ayuda"), no una funcionalidad más — su texto no cambia de release a
// release, así que no necesita nueva aprobación cada vez.
const SLIDE_ICONS = [
  { icon: FileDown, color: BRAND_OCEAN }, // 1. Exporta tu informe en PDF
  { icon: GraduationCap, color: SUN }, // 2. Training Records más ligeros
  { icon: LayoutGrid, color: CORAL }, // 3. Portada renovada
  { icon: IdCard, color: TEAL }, // 4. Mi perfil, reestructurado
  { icon: Sparkles, color: BRAND_NAVY }, // 5. Repásalo cuando quieras, desde Ayuda
];

export default function WhatsNew({ onClose }) {
  const { t } = useTranslation("notices");
  // returnObjects: true — necesario en i18next para leer un array/objeto
  // completo de la traducción en vez de una única cadena.
  const slideCopy = t("whatsNew.slides", { returnObjects: true });
  const slides = SLIDE_ICONS.map((s, i) => ({ ...s, ...slideCopy[i] }));

  return (
    <SlideDeck
      slides={slides}
      onClose={onClose}
      testId="whatsnew-slide"
      labels={{
        eyebrow: t("whatsNew.eyebrow"),
        close: t("whatsNew.close"),
        back: t("whatsNew.back"),
        next: t("whatsNew.next"),
        start: t("whatsNew.start"),
        slideTablist: t("whatsNew.slideTablist"),
      }}
    />
  );
}
