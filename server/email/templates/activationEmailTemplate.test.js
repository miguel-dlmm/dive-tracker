import { renderActivationEmailHtml, renderActivationEmailText, ACTIVATION_EMAIL_COPY, ACTIVATION_EMAIL_COPY_EN, resolveActivationEmailCopy } from "./activationEmailTemplate.js";

const ARGS = { firstName: "Ada", actionLink: "https://example.supabase.co/verify?token=abc" };

describe("renderActivationEmailHtml", () => {
  it("incluye el nombre, el enlace de acceso y el asunto/copy del motivo por defecto (signup)", () => {
    const html = renderActivationEmailHtml(ARGS);

    expect(html).toContain("Ada");
    expect(html).toContain(ARGS.actionLink);
    expect(html).toContain(ACTIVATION_EMAIL_COPY.signup.ctaLabel);
    expect(html).toContain(ACTIVATION_EMAIL_COPY.signup.securityNote);
  });

  it("usa el copy del motivo indicado (reactivation, password_reset)", () => {
    const reactivationHtml = renderActivationEmailHtml({ ...ARGS, copy: ACTIVATION_EMAIL_COPY.reactivation });
    const resetHtml = renderActivationEmailHtml({ ...ARGS, copy: ACTIVATION_EMAIL_COPY.password_reset });

    expect(reactivationHtml).toContain(ACTIVATION_EMAIL_COPY.reactivation.title);
    expect(resetHtml).toContain(ACTIVATION_EMAIL_COPY.password_reset.title);
    expect(resetHtml).toContain(ACTIVATION_EMAIL_COPY.password_reset.ctaLabel);
  });

  it("escapa HTML del nombre para evitar inyección en el email", () => {
    const html = renderActivationEmailHtml({ ...ARGS, firstName: '<script>alert(1)</script>' });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("resolveActivationEmailCopy", () => {
  it("language 'en' devuelve la tabla en inglés para el motivo indicado", () => {
    expect(resolveActivationEmailCopy("signup", "en")).toBe(ACTIVATION_EMAIL_COPY_EN.signup);
    expect(resolveActivationEmailCopy("password_reset", "en")).toBe(ACTIVATION_EMAIL_COPY_EN.password_reset);
  });

  it("sin language, o con un idioma sin plantilla propia, cae a español", () => {
    expect(resolveActivationEmailCopy("signup", undefined)).toBe(ACTIVATION_EMAIL_COPY.signup);
    expect(resolveActivationEmailCopy("signup", "th")).toBe(ACTIVATION_EMAIL_COPY.signup);
  });

  it("un motivo desconocido cae a 'signup' en la tabla del idioma que corresponda", () => {
    expect(resolveActivationEmailCopy("no-existe", "en")).toBe(ACTIVATION_EMAIL_COPY_EN.signup);
    expect(resolveActivationEmailCopy("no-existe", undefined)).toBe(ACTIVATION_EMAIL_COPY.signup);
  });
});

describe("renderActivationEmailText", () => {
  it("incluye el enlace de acceso en texto plano", () => {
    const text = renderActivationEmailText(ARGS);

    expect(text).toContain(ARGS.actionLink);
    expect(text).toContain(ACTIVATION_EMAIL_COPY.signup.footer);
  });
});
