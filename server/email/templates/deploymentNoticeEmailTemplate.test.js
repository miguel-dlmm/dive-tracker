import { renderDeploymentNoticeEmailHtml, renderDeploymentNoticeEmailText } from "./deploymentNoticeEmailTemplate.js";

const NOTICE = {
  commit_hash: "abc1234def",
  branch: "feature/x",
  summary: "Resumen del aviso",
  technical_changes: ["Cambio técnico 1"],
  functional_changes: ["Cambio funcional 1"],
  has_ui_changes: true,
  ui_changes_note: "Nota de UI",
  steps: ["Paso 1", "Paso 2"],
  tests_status: "10 passed (10)",
  build_status: "ok",
  preview_url: "https://preview.example/commit",
  integration_preview_url: "https://preview.example/nightjob",
};

describe("renderDeploymentNoticeEmailHtml", () => {
  it("incluye rama, commit corto y resumen", () => {
    const html = renderDeploymentNoticeEmailHtml({ notice: NOTICE });
    expect(html).toContain("feature/x");
    expect(html).toContain("abc1234");
    expect(html).toContain("Resumen del aviso");
  });

  it("separa cambios técnicos de cambios de funcionalidad", () => {
    const html = renderDeploymentNoticeEmailHtml({ notice: NOTICE });
    expect(html).toContain("Cambio técnico 1");
    expect(html).toContain("Cambio funcional 1");
    expect(html).toContain("Cambios técnicos");
    expect(html).toContain("Cambios de funcionalidad");
  });

  it("muestra los cambios de UI y los pasos a probar", () => {
    const html = renderDeploymentNoticeEmailHtml({ notice: NOTICE });
    expect(html).toContain("Nota de UI");
    expect(html).toContain("Paso 1");
    expect(html).toContain("Paso 2");
  });

  it("sin cambios de UI, muestra 'No'", () => {
    const html = renderDeploymentNoticeEmailHtml({ notice: { ...NOTICE, has_ui_changes: false, ui_changes_note: null } });
    expect(html).toMatch(/Cambios de UI:<\/strong> No/);
  });

  it("incluye las dos URLs de preview por separado", () => {
    const html = renderDeploymentNoticeEmailHtml({ notice: NOTICE });
    expect(html).toContain("https://preview.example/commit");
    expect(html).toContain("https://preview.example/nightjob");
    expect(html).toContain("Ver preview del commit");
    expect(html).toContain("Ver preview integrada");
  });

  it("sin preview todavía, muestra el aviso de 'sin preview' en vez de un enlace roto", () => {
    const html = renderDeploymentNoticeEmailHtml({ notice: { ...NOTICE, preview_url: null, integration_preview_url: null } });
    expect(html).toContain("todavía no hay Preview Deployment");
    expect(html).not.toContain('href=""');
  });

  it("usa changes/suggested_tests como respaldo si no hay campos nuevos (avisos legado)", () => {
    const legacy = { commit_hash: "xyz", branch: "b", summary: "s", changes: ["Legado técnico"], suggested_tests: ["Legado prueba"] };
    const html = renderDeploymentNoticeEmailHtml({ notice: legacy });
    expect(html).toContain("Legado técnico");
    expect(html).toContain("Legado prueba");
  });
});

describe("renderDeploymentNoticeEmailText", () => {
  it("incluye ambas URLs de preview en texto plano", () => {
    const text = renderDeploymentNoticeEmailText({ notice: NOTICE });
    expect(text).toContain("Preview del commit: https://preview.example/commit");
    expect(text).toContain("Preview integrada (Release-V1): https://preview.example/nightjob");
  });
});
