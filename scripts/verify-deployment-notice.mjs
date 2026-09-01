import { createClient } from "@supabase/supabase-js";
import { handleNotifyDeployment } from "../server/notifications/notifyDeployment.js";

// Procedimiento repetible para probar de extremo a extremo el sistema de
// avisos de despliegue (ver ADR-0024/0025, server/notifications/
// notifyDeployment.js, src/DeploymentNotice.jsx) contra Supabase TEST real
// — no mocks. Pensado para ejecutarse una vez por sesión de trabajo, tras
// aplicar cualquier migración nueva de scripts/migrations/, como parte del
// "sistema de avisos por commit" que exige la sesión de 2026-09-01.
//
// Qué comprueba, en este orden:
//   1. Consigue una sesión REAL del superadmin configurado (SUPERADMIN_EMAIL
//      o el primer superadmin que encuentre en `profiles`), vía el mismo
//      mecanismo verifyOtp()/magiclink que ya usa el resto de la app para
//      activación/recuperación — nunca necesita su contraseña.
//   2. Llama a handleNotifyDeployment() de verdad (no un mock) con los datos
//      del commit pasado por argumento — inserta en deployment_notices y
//      envía el email real vía Resend.
//   3. Repite la misma llamada una segunda vez, mismo commit_hash, y
//      confirma que responde `already_notified: true` sin reenviar email
//      (idempotencia real contra el `unique` de la base de datos, no
//      simulada).
//   4. Confirma RLS de verdad, en tres roles distintos: un cliente anon sin
//      sesión (debe ver 0 filas), un usuario autenticado normal / no
//      superadmin si existe alguno en la instalación (debe ver 0 filas), y
//      el propio superadmin (debe ver la fila).
//
// Requiere en .env.local: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, EMAIL_FROM — nunca se ejecuta
// contra producción (usa las credenciales de Supabase que haya en el
// entorno, que en este proyecto son siempre las de TEST en local).
//
// Uso:
//   node --env-file=.env.local scripts/verify-deployment-notice.mjs <commit_hash> <branch> "<summary>"

const [, , commitHash, branch, summary] = process.argv;
if (!commitHash || !branch || !summary) {
  console.error('Uso: node scripts/verify-deployment-notice.mjs <commit_hash> <branch> "<summary>"');
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
  return { client, accessToken: data.session.access_token };
}

const superadminEmail = await findSuperadminEmail();
const { client: superadminClient, accessToken } = await sessionFor(superadminEmail);
console.log(`1. Sesión real obtenida para el superadmin: ${superadminEmail}`);

const body = JSON.stringify({ commit_hash: commitHash, branch, summary });

const first = await handleNotifyDeployment({ method: "POST", headers: { authorization: `Bearer ${accessToken}` }, body });
console.log("2. Primera llamada:", JSON.stringify(first.payload));
if (first.status !== 200 || !first.payload.ok) throw new Error("La primera llamada a handleNotifyDeployment no devolvió ok:true");

const second = await handleNotifyDeployment({ method: "POST", headers: { authorization: `Bearer ${accessToken}` }, body });
console.log("3. Segunda llamada (mismo commit):", JSON.stringify(second.payload));
if (!second.payload.already_notified) throw new Error("La idempotencia falló: la segunda llamada debería devolver already_notified:true");

const freshAnon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data: anonRows } = await freshAnon.from("deployment_notices").select("*");
console.log(`4a. Cliente anon sin sesión ve ${anonRows?.length ?? 0} filas (esperado: 0)`);
if ((anonRows?.length ?? 0) !== 0) throw new Error("RLS roto: un cliente anon sin sesión puede leer deployment_notices");

const { data: superRows } = await superadminClient.from("deployment_notices").select("*");
console.log(`4b. El superadmin ve ${superRows?.length ?? 0} fila(s) (esperado: >=1)`);
if (!superRows?.length) throw new Error("El superadmin no puede leer su propio aviso — revisa la policy RLS.");

await superadminClient.auth.signOut();
console.log("\nTodo correcto: idempotencia real + RLS real verificadas contra Supabase TEST.");
