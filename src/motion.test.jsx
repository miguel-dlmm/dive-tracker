import { renderHook } from "@testing-library/react";
import { useSwipeBack, animateScrollBy } from "./motion";

// animate() de Motion se mockea para no depender de requestAnimationFrame
// real en jsdom (poco fiable en tests, mismo criterio que useSwipeBack
// arriba) — se simula que la animación llega directa al valor final,
// suficiente para comprobar el CONTRATO (a qué scrollY final llega, con
// qué API) sin necesitar reproducir el tween fotograma a fotograma.
vi.mock("motion/react", () => ({
  animate: vi.fn((from, to, opts) => {
    opts.onUpdate?.(to);
    return { stop: vi.fn() };
  }),
}));

// Deslizar hacia la derecha = "atrás" (feedback explícito 2026-08-30,
// Configuración y Ayuda). Reescrito 2026-08-30 (segunda vuelta) para usar
// solo listeners de touch nativos, no drag de Motion — un <motion.div
// drag="x"> envolviendo toda la pantalla resultó ser un sospechoso
// concreto de un bug de compositing de WebKit ya documentado (cabecera
// cubierta en un iPhone real, ver motion.js) — se prueba aquí el nuevo
// contrato (onTouchStart/onTouchEnd), no simulando gestos reales de
// Motion en jsdom (poco fiable, ver notas de sesiones anteriores).
function touch(x, y) {
  return { touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] };
}

describe("useSwipeBack", () => {
  it("activo: expone onTouchStart/onTouchEnd (nunca drag/onDragEnd — no debe volver a envolver la pantalla en un motion.div arrastrable)", () => {
    const onBack = vi.fn();
    const { result } = renderHook(() => useSwipeBack(onBack));
    expect(typeof result.current.onTouchStart).toBe("function");
    expect(typeof result.current.onTouchEnd).toBe("function");
    expect(result.current.drag).toBeUndefined();
  });

  it("dispara onBack con un gesto predominantemente horizontal hacia la derecha por encima del umbral", () => {
    const onBack = vi.fn();
    const { result } = renderHook(() => useSwipeBack(onBack));
    result.current.onTouchStart(touch(10, 100));
    result.current.onTouchEnd(touch(100, 105)); // dx=90, dy=5
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("no dispara onBack si el arrastre no llega al umbral", () => {
    const onBack = vi.fn();
    const { result } = renderHook(() => useSwipeBack(onBack));
    result.current.onTouchStart(touch(10, 100));
    result.current.onTouchEnd(touch(40, 100)); // dx=30
    expect(onBack).not.toHaveBeenCalled();
  });

  it("no dispara onBack si el gesto es predominantemente vertical (scroll, no swipe)", () => {
    const onBack = vi.fn();
    const { result } = renderHook(() => useSwipeBack(onBack));
    result.current.onTouchStart(touch(10, 10));
    result.current.onTouchEnd(touch(100, 200)); // dx=90, pero dy=190 domina
    expect(onBack).not.toHaveBeenCalled();
  });

  it("enabled:false desactiva el gesto del todo (sin handlers)", () => {
    const onBack = vi.fn();
    const { result } = renderHook(() => useSwipeBack(onBack, { enabled: false }));
    expect(result.current.onTouchStart).toBeUndefined();
    expect(result.current.onTouchEnd).toBeUndefined();
  });

  it("sin onBack (nada adonde volver) se desactiva solo, sin necesidad de pasar enabled:false", () => {
    const { result } = renderHook(() => useSwipeBack(null));
    expect(result.current.onTouchStart).toBeUndefined();
  });
});

// Calendario, 2026-09-07: "haz una animación al scroll down al calendario
// al pulsar en un día" — antes el desplazamiento (medido en el clic, ver
// MonthCalendar en shared.jsx) era instantáneo a propósito
// (`window.scrollBy` directo), porque `behavior: "smooth"` nativo no
// desplaza nada en este entorno de pruebas (hallazgo ya documentado).
describe("animateScrollBy", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.scrollBy = vi.fn();
    Object.defineProperty(window, "scrollY", { value: 100, writable: true, configurable: true });
  });

  it("reduced:true salta directo al destino con scrollBy, sin animar", () => {
    animateScrollBy(50, { reduced: true });
    expect(window.scrollBy).toHaveBeenCalledWith({ top: 50, behavior: "auto" });
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("delta ~0 salta directo, aunque reduced sea false (nada que animar)", () => {
    animateScrollBy(0.4, { reduced: false });
    expect(window.scrollBy).toHaveBeenCalledWith({ top: 0.4, behavior: "auto" });
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("con movimiento activo, anima con Motion hasta el scrollY objetivo (startY + delta)", () => {
    animateScrollBy(-40, { reduced: false });
    expect(window.scrollBy).not.toHaveBeenCalled();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 60); // 100 - 40
  });
});
