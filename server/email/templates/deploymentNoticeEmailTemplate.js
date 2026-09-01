// Email de "aviso de despliegue" para el superadmin (ADR-0024/0025) —
// mismo sistema visual (tabla + CSS inline, colores Ocean Flow) que
// activationEmailTemplate.js, pero forma de contenido distinta a propósito:
// no es un CTA de "un solo uso" hacia un enlace de recuperación, es un
// resumen de lo que cambió en un commit. Por eso vive en su propio fichero
// en vez de forzarlo dentro de ACTIVATION_EMAIL_COPY, cuya forma
// (actionLink/ctaLabel/securityNote/expiryNote únicos) no encaja aquí.
//
// Formato ampliado 2026-09-01 (encargo explícito): separa cambios técnicos
// de cambios de funcionalidad, confirma si hay cambios de UI, da un paso a
// paso de qué probar/hacer, y distingue la preview de SOLO la rama del
// bloque de la preview YA INTEGRADA en nightjob-2026.08.31 — dos URLs
// distintas, no una.

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

function renderSteps(items) {
  if (!items || items.length === 0) return "";
  return `<ol style="margin:0 0 20px 0;padding:0 0 0 20px;">${items
    .map((item) => `<li style="font-size:13.5px;line-height:1.6;color:#374151;margin-bottom:6px;">${escapeHtml(item)}</li>`)
    .join("")}</ol>`;
}

function renderSection(title, html) {
  if (!html) return "";
  return `<tr><td style="padding:0 28px;"><p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#0F172A;text-transform:uppercase;letter-spacing:0.02em;">${title}</p>${html}</td></tr>`;
}

function renderPreviewButton(label, url) {
  return url
    ? `<tr><td style="padding:4px 28px 0 28px;text-align:center;">
        <a href="${escapeHtml(url)}" style="display:inline-block;width:100%;max-width:320px;box-sizing:border-box;background-color:#0F766E;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;margin-bottom:8px;">${escapeHtml(label)}</a>
      </td></tr>`
    : `<tr><td style="padding:4px 28px 0 28px;">
        <p style="margin:0 0 8px 0;font-size:12.5px;line-height:1.6;color:#9CA3AF;text-align:center;">${escapeHtml(label)}: todavía no hay Preview Deployment.</p>
      </td></tr>`;
}

export function renderDeploymentNoticeEmailHtml({ notice }) {
  const {
    summary, commit_hash: commitHash, branch,
    technical_changes: technicalChanges = [], functional_changes: functionalChanges = [],
    has_ui_changes: hasUiChanges, ui_changes_note: uiChangesNote,
    steps = [], tests_status: testsStatus, build_status: buildStatus,
    preview_url: previewUrl, integration_preview_url: integrationPreviewUrl,
    // legado — solo si el aviso no usa todavía los campos nuevos
    changes = [], suggested_tests: suggestedTests = [],
  } = notice;
  const shortHash = commitHash ? commitHash.slice(0, 7) : "";
  const uiLine = hasUiChanges
    ? `Sí${uiChangesNote ? ` — ${uiChangesNote}` : ""}`
    : "No";

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
            ${renderSection("Cambios técnicos", renderList(technicalChanges.length ? technicalChanges : changes))}
            ${renderSection("Cambios de funcionalidad", renderList(functionalChanges))}
            <tr>
              <td style="padding:0 28px;">
                <p style="margin:0 0 16px 0;font-size:13.5px;line-height:1.6;color:#374151;"><strong>Cambios de UI:</strong> ${escapeHtml(uiLine)}</p>
              </td>
            </tr>
            ${renderSection("Qué probar / qué hacer", renderSteps(steps.length ? steps : suggestedTests))}
            <tr>
              <td style="padding:0 28px 0 28px;">
                <p style="margin:0 0 16px 0;font-size:12px;line-height:1.6;color:#6B7280;">Tests: ${escapeHtml(testsStatus || "no reportado")} &middot; Build: ${escapeHtml(buildStatus || "no reportado")}</p>
              </td>
            </tr>
            ${renderPreviewButton("Ver preview del commit (solo esta rama)", previewUrl)}
            ${renderPreviewButton("Ver preview integrada (nightjob)", integrationPreviewUrl)}
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
  const {
    summary, commit_hash: commitHash, branch,
    technical_changes: technicalChanges = [], functional_changes: functionalChanges = [],
    has_ui_changes: hasUiChanges, ui_changes_note: uiChangesNote,
    steps = [], tests_status: testsStatus, build_status: buildStatus,
    preview_url: previewUrl, integration_preview_url: integrationPreviewUrl,
    changes = [], suggested_tests: suggestedTests = [],
  } = notice;
  const lines = [
    `Nuevo aviso de despliegue — rama ${branch}, commit ${commitHash ? commitHash.slice(0, 7) : ""}`,
    "",
    summary,
    "",
  ];
  const tech = technicalChanges.length ? technicalChanges : changes;
  if (tech.length) lines.push("Cambios técnicos:", ...tech.map((c) => `- ${c}`), "");
  if (functionalChanges.length) lines.push("Cambios de funcionalidad:", ...functionalChanges.map((c) => `- ${c}`), "");
  lines.push(`Cambios de UI: ${hasUiChanges ? `Sí${uiChangesNote ? ` — ${uiChangesNote}` : ""}` : "No"}`, "");
  const stepList = steps.length ? steps : suggestedTests;
  if (stepList.length) lines.push("Qué probar / qué hacer:", ...stepList.map((s, i) => `${i + 1}. ${s}`), "");
  lines.push(`Tests: ${testsStatus || "no reportado"} · Build: ${buildStatus || "no reportado"}`);
  lines.push(previewUrl ? `Preview del commit: ${previewUrl}` : "Preview del commit: todavía no hay Preview Deployment.");
  lines.push(integrationPreviewUrl ? `Preview integrada (nightjob): ${integrationPreviewUrl}` : "Preview integrada (nightjob): todavía no hay Preview Deployment.");
  return lines.join("\n");
}
