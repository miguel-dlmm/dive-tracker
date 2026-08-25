import { renderWelcomeEmailHtml, renderWelcomeEmailText, WELCOME_EMAIL_COPY } from "./welcomeEmailTemplate.js";

const ARGS = { firstName: "Ada", actionLink: "https://example.supabase.co/verify?token=abc" };

describe("renderWelcomeEmailHtml", () => {
  it("incluye el nombre, el enlace de acceso y el asunto/copy configurado", () => {
    const html = renderWelcomeEmailHtml(ARGS);

    expect(html).toContain("Ada");
    expect(html).toContain(ARGS.actionLink);
    expect(html).toContain(WELCOME_EMAIL_COPY.ctaLabel);
    expect(html).toContain(WELCOME_EMAIL_COPY.securityNote);
  });

  it("escapa HTML del nombre para evitar inyección en el email", () => {
    const html = renderWelcomeEmailHtml({ ...ARGS, firstName: '<script>alert(1)</script>' });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderWelcomeEmailText", () => {
  it("incluye el enlace de acceso en texto plano", () => {
    const text = renderWelcomeEmailText(ARGS);

    expect(text).toContain(ARGS.actionLink);
    expect(text).toContain(WELCOME_EMAIL_COPY.footer);
  });
});
