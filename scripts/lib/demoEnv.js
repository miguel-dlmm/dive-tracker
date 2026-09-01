// Utilidades compartidas por los scripts de scripts/ — nada de esto se usa
// desde la app real (server/, api/).
import { getServiceRoleClient } from "../../server/supabaseAdmin.js";

const REQUIRED_ENV_VARS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

export function checkEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Faltan estas variables de entorno: ${missing.join(", ")}`);
    console.error("¿Están en .env.local? Recuerda ejecutar con: node --env-file=.env.local <script> ...");
    process.exit(1);
  }
}

export { getServiceRoleClient };

// Admite --clave=valor y --flag (booleano sin valor).
export function parseArgs() {
  const args = {};
  for (const raw of process.argv.slice(2)) {
    const withValue = raw.match(/^--([a-z-]+)=(.*)$/);
    if (withValue) { args[withValue[1]] = withValue[2]; continue; }
    const flag = raw.match(/^--([a-z-]+)$/);
    if (flag) { args[flag[1]] = true; continue; }
  }
  return args;
}

// Resuelve --uuid=/--nickname=/--email= (exactamente uno) a un user_id real.
export async function resolveUserId(client, args) {
  const given = ["uuid", "nickname", "email"].filter((k) => args[k]);
  if (given.length !== 1) {
    throw new Error("Pasa exactamente uno de --uuid=, --nickname= o --email=.");
  }

  if (args.uuid) return args.uuid;

  if (args.nickname) {
    const { data, error } = await client.from("profiles").select("user_id").ilike("nickname", args.nickname).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`No existe ningún profile con nickname "${args.nickname}".`);
    return data.user_id;
  }

  // email: la Admin API no tiene "get by email" directo, hay que listar y filtrar.
  const { data, error } = await client.auth.admin.listUsers();
  if (error) throw error;
  const match = data.users.find((u) => u.email?.toLowerCase() === args.email.toLowerCase());
  if (!match) throw new Error(`No existe ningún usuario con email "${args.email}".`);
  return match.id;
}
