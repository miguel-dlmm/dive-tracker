import { renderActivationEmailHtml, renderActivationEmailText, ACTIVATION_EMAIL_COPY } from "./activationEmailTemplate.js";

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

describe("renderActivationEmailText", () => {
  it("incluye el enlace de acceso en texto plano", () => {
    const text = renderActivationEmailText(ARGS);

    expect(text).toContain(ARGS.actionLink);
    expect(text).toContain(ACTIVATION_EMAIL_COPY.signup.footer);
  });
});
