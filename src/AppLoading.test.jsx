import { render } from "@testing-library/react";
import { AppLoading } from "./shared";

// Feedback 2026-09-07: la ola del logo de carga debe "aparecer hacia
// arriba" por separado del aro que la envuelve, no todo el icono a la vez
// (ver comentario junto a AppLoading en shared.jsx). Este test fija que
// las 3 capas (fondo tenue completo, aro fijo, ola animada) siguen siendo
// 3 imágenes distintas — si alguien vuelve sin querer a una sola imagen
// para las 3 capas, este test lo detecta.
describe("AppLoading (variante Logo)", () => {
  it("renderiza el fondo tenue, el aro fijo y la ola como 3 imágenes separadas", () => {
    const { container } = render(<AppLoading />);
    const sources = Array.from(container.querySelectorAll("img")).map((img) => img.getAttribute("src"));
    expect(sources).toEqual([
      "/brand/logo-mark-navy.svg",
      "/brand/logo-mark-navy-ring.svg",
      "/brand/logo-mark-navy-wave.svg",
    ]);
  });

  it("solo la capa de la ola lleva la animación de relleno, no el aro", () => {
    const { container } = render(<AppLoading />);
    const ring = container.querySelector('img[src="/brand/logo-mark-navy-ring.svg"]');
    const waveWrapper = container.querySelector('img[src="/brand/logo-mark-navy-wave.svg"]').parentElement;
    expect(ring.style.animation).toBe("");
    expect(waveWrapper.style.animation).toContain("oceanFill");
  });
});
