import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { handleNotifyDeployment } from "../server/notifications/notifyDeployment.js";

// Envío real de un aviso de despliegue (formato ampliado 2026-09-01) tras
// cerrar un bloque/subbloque de trabajo — hermano de
// scripts/verify-deployment-notice.mjs (esa comprueba idempotencia+RLS de
// extremo a extremo una vez; esta es la que se usa en el día a día,
// commit a commit, con el payload completo: cambios técnicos, cambios de
// funcionalidad, confirmación de UI, pasos a probar/hacer, y las dos URLs
// de preview — la de la rama suelta y la de nightjob-2026.08.31 ya con el
// commit integrado).
//
// Uso:
//   node --env-file=.env.local scripts/send-deployment-notice.mjs <ruta-al-.json>
//
// Forma del JSON (todos los campos opcionales salvo commit_hash/branch/summary):
// {
//   "commit_hash": "abc1234", "branch": "feature/x", "summary": "...",
//   "technical_changes": ["..."], "functional_changes": ["..."],
//   "has_ui_changes": true, "ui_changes_note": "...",
//   "steps": ["..."], "tests_status": "468 passed (468)", "build_status": "ok",
//   "preview_url": "https://...", "integration_preview_url": "https://..."
// }

const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/send-deployment-notice.mjs <ruta-al-.json>");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(file, "utf8"));
if (!payload.commit_hash || !payload.branch || !payload.summary) {
  console.error("El JSON necesita al menos commit_hash, branch y summary.");
  process.exit(1);
}

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findSuperadminEmail() {
  if (SUPERADMIN_EMAIL) return SUPERADMIN_EMAIL;
  const { data: profiles, error } = await admin.from("profiles").select("user_id").eq("is_superadmin", true).limit(1);
  if (error || !profiles?.length) throw new Error("No hay ningún superadmin en esta instalación de Supabase.");
  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = listData.users.find((u) => u.id === profiles[0].user_id);
  if (!user?.email) throw new Error("No se pudo resolver el email del superadmin.");
  return user.email;
}

async function sessionFor(email) {
  const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw linkError;
  const { data, error } = await client.auth.verifyOtp({ token_hash: linkData.properties.hashed_token, type: "magiclink" });
  if (error) throw error;
  return accessToken(data);
}
function accessToken(data) { return data.session.access_token; }

const superadminEmail = await findSuperadminEmail();
const token = await sessionFor(superadminEmail);
console.log(`Sesión real obtenida para el superadmin: ${superadminEmail}`);

const result = await handleNotifyDeployment({
  method: "POST",
  headers: { authorization: `Bearer ${token}` },
  body: JSON.stringify(payload),
});
console.log(JSON.stringify(result, null, 2));
if (result.status !== 200 || !result.payload.ok) {
  console.error("El aviso no se registró correctamente.");
  process.exit(1);
}
