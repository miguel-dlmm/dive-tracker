// Email de "aviso de despliegue" para el superadmin (ADR-0024/0025) —
// mismo sistema visual (tabla + CSS inline, colores Ocean Flow) que
// activationEmailTemplate.js, pero forma de contenido distinta a propósito:
// no es un CTA de "un solo uso" hacia un enlace de recuperación, es un
// resumen de lo que cambió en un commit — lista de cambios, pruebas
// sugeridas y (si existe ya) un botón hacia la Preview URL de Vercel. Por
// eso vive en su propio fichero en vez de forzarlo dentro de
// ACTIVATION_EMAIL_COPY, cuya forma (actionLink/ctaLabel/securityNote/
// expiryNote únicos) no encaja con "lista de cambios + lista de pruebas".

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderList(items) {
  if (!items || items.length === 0) return "";
  return `<ul style="margin:0 0 20px 0;padding:0 0 0 20px;">${items
    .map((item) => `<li style="font-size:13.5px;line-height:1.6;color:#374151;margin-bottom:4px;">${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

export function renderDeploymentNoticeEmailHtml({ notice }) {
  const { summary, changes = [], suggested_tests: suggestedTests = [], commit_hash: commitHash, branch, tests_status: testsStatus, build_status: buildStatus, preview_url: previewUrl } = notice;
  const shortHash = commitHash ? commitHash.slice(0, 7) : "";

  const previewButton = previewUrl
    ? `<tr><td style="padding:4px 28px 0 28px;text-align:center;">
        <a href="${escapeHtml(previewUrl)}" style="display:inline-block;width:100%;max-width:320px;box-sizing:border-box;background-color:#0F766E;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:8px;">Ver preview</a>
      </td></tr>`
    : `<tr><td style="padding:4px 28px 0 28px;">
        <p style="margin:0;font-size:12.5px;line-height:1.6;color:#9CA3AF;text-align:center;">Todavía no hay Preview Deployment para esta rama.</p>
      </td></tr>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#F7F8F8;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#F7F8F8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Nuevo aviso de despliegue en Ocean Flow</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F8F8;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px 28px 8px 28px;text-align:center;">
                <div style="font-size:15px;font-weight:700;color:#0F172A;">Ocean Flow</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 0 28px;">
                <h1 style="margin:0 0 6px 0;font-size:20px;color:#0F172A;">Nuevo aviso de despliegue</h1>
                <p style="margin:0 0 16px 0;font-size:12px;color:#6B7280;">Rama <strong>${escapeHtml(branch)}</strong> &middot; commit <code style="background-color:#F3F4F6;padding:1px 5px;border-radius:4px;">${escapeHtml(shortHash)}</code></p>
                <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#374151;">${escapeHtml(summary)}</p>
              </td>
            </tr>
            ${changes.length ? `<tr><td style="padding:0 28px;"><p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#0F172A;text-transform:uppercase;letter-spacing:0.02em;">Qué cambió</p>${renderList(changes)}</td></tr>` : ""}
            ${suggestedTests.length ? `<tr><td style="padding:0 28px;"><p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#0F172A;text-transform:uppercase;letter-spacing:0.02em;">Pruebas sugeridas</p>${renderList(suggestedTests)}</td></tr>` : ""}
            <tr>
              <td style="padding:0 28px 0 28px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6B7280;">Tests: ${escapeHtml(testsStatus || "no reportado")} &middot; Build: ${escapeHtml(buildStatus || "no reportado")}</p>
              </td>
            </tr>
            ${previewButton}
            <tr>
              <td style="padding:24px 28px 32px 28px;">
                <p style="margin:0;font-size:11.5px;line-height:1.5;color:#9CA3AF;text-align:center;">Solo lo reciben las cuentas superadmin de Ocean Flow.</p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0 0;font-size:11px;color:#9CA3AF;">Ocean Flow</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderDeploymentNoticeEmailText({ notice }) {
  const { summary, changes = [], suggested_tests: suggestedTests = [], commit_hash: commitHash, branch, tests_status: testsStatus, build_status: buildStatus, preview_url: previewUrl } = notice;
  const lines = [
    `Nuevo aviso de despliegue — rama ${branch}, commit ${commitHash ? commitHash.slice(0, 7) : ""}`,
    "",
    summary,
    "",
  ];
  if (changes.length) lines.push("Qué cambió:", ...changes.map((c) => `- ${c}`), "");
  if (suggestedTests.length) lines.push("Pruebas sugeridas:", ...suggestedTests.map((t) => `- ${t}`), "");
  lines.push(`Tests: ${testsStatus || "no reportado"} · Build: ${buildStatus || "no reportado"}`);
  lines.push(previewUrl ? `Preview: ${previewUrl}` : "Todavía no hay Preview Deployment para esta rama.");
  return lines.join("\n");
}
