import { renderHook } from "@testing-library/react";
import { useSwipeBack } from "./motion";

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
