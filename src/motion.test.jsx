import { renderHook } from "@testing-library/react";
import { useSwipeBack } from "./motion";

// Deslizar hacia la derecha = "atrás" (feedback explícito 2026-08-30,
// Configuración y Ayuda) — se prueba la lógica del hook de forma aislada,
// no simulando el gesto de arrastre real de Motion en jsdom (poco fiable,
// ver notas de sesiones anteriores sobre no simular física de gestos).
describe("useSwipeBack", () => {
  it("activo: expone drag='x' y dispara onBack cuando el arrastre supera el umbral", () => {
    const onBack = vi.fn();
    const { result } = renderHook(() => useSwipeBack(onBack));
    expect(result.current.drag).toBe("x");
    result.current.onDragEnd(null, { offset: { x: 80 } });
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("activo: no dispara onBack si el arrastre no llega al umbral (evita disparos accidentales)", () => {
    const onBack = vi.fn();
    const { result } = renderHook(() => useSwipeBack(onBack));
    result.current.onDragEnd(null, { offset: { x: 30 } });
    expect(onBack).not.toHaveBeenCalled();
  });

  it("enabled:false desactiva el gesto del todo (drag=false, sin onDragEnd)", () => {
    const onBack = vi.fn();
    const { result } = renderHook(() => useSwipeBack(onBack, { enabled: false }));
    expect(result.current.drag).toBe(false);
    expect(result.current.onDragEnd).toBeUndefined();
  });

  it("sin onBack (nada adonde volver) se desactiva solo, sin necesidad de pasar enabled:false", () => {
    const { result } = renderHook(() => useSwipeBack(null));
    expect(result.current.drag).toBe(false);
  });
});
