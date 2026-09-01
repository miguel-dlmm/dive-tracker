import { renderEmailShell, escapeHtml } from "./emailLayout.js";

describe("renderEmailShell", () => {
  it("incluye lang=\"es\" (accesibilidad — lectores de pantalla)", () => {
    const html = renderEmailShell({ preheader: "x", bodyRows: "<tr><td>hola</td></tr>" });
    expect(html).toContain('<html lang="es">');
  });

  it("incluye el icono Waves inline (coherencia visual con el login) y el nombre de marca", () => {
    const html = renderEmailShell({ preheader: "x", bodyRows: "<tr><td>hola</td></tr>" });
    expect(html).toContain("<svg");
    expect(html).toContain("Ocean Flow");
  });

  it("escapa el preheader y usa el footer indicado", () => {
    const html = renderEmailShell({ preheader: '<script>x</script>', bodyRows: "<tr><td>hola</td></tr>", footerText: "Pie personalizado" });
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("Pie personalizado");
  });

  it("intercala el contenido propio de cada plantilla (bodyRows) dentro de la tarjeta", () => {
    const html = renderEmailShell({ preheader: "x", bodyRows: "<tr><td>CONTENIDO-UNICO</td></tr>" });
    expect(html).toContain("CONTENIDO-UNICO");
  });
});

describe("escapeHtml", () => {
  it("escapa los caracteres peligrosos de HTML", () => {
    expect(escapeHtml(`<b>"it's"</b> & co`)).toBe("&lt;b&gt;&quot;it&#39;s&quot;&lt;/b&gt; &amp; co");
  });
});
