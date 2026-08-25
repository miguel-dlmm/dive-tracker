import { render, screen } from "@testing-library/react";

// Test de humo — solo confirma que Vitest + jsdom + Testing Library +
// jest-dom arrancan correctamente. Sin lógica de negocio. Bórrese en
// cuanto haya un test real que cumpla el mismo papel de "smoke test".
describe("entorno de testing", () => {
  it("renderiza y localiza un nodo con Testing Library", () => {
    render(<div>ok</div>);
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
