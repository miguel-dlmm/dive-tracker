#!/usr/bin/env node
// Herramienta de desarrollo/testing — borra POR COMPLETO una cuenta demo:
// las 9 tablas de negocio que referencian su user_id, y después la propia
// cuenta en auth.users (lo que arrastra profiles vía su on delete cascade).
// Ninguna de esas 9 tablas tiene on delete cascade desde auth.users, así
// que hay que vaciarlas primero o auth.admin.deleteUser() falla por
// violación de foreign key.
//
// Seguridad: identifica al usuario por --uuid=, --nickname= o --email=
// (exactamente uno), muestra qué se va a borrar y pide confirmación antes
// de ejecutar (--yes la salta, para uso no interactivo). Se niega a tocar
// cualquier cuenta con is_admin o is_superadmin — esta herramienta es solo
// para cuentas demo, nunca para cuentas reales, sin excepción/override.
//
// Uso:
//   node --env-file=.env.local scripts/delete-demo-user.js --nickname=demo [--yes]

import { createInterface } from "node:readline/promises";
import { checkEnv, getServiceRoleClient, parseArgs, resolveUserId } from "./lib/demoEnv.js";

const USER_OWNED_TABLES = [
  "schools", "activities", "payment_types", "payment_statuses",
  "rates", "commission_rates", "worklog", "comisiones", "colleague_payments",
];

async function countAll(client, userId) {
  const counts = {};
  for (const table of USER_OWNED_TABLES) {
    const { count, error } = await client.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
    if (error) throw error;
    counts[table] = count;
  }
  return counts;
}

async function main() {
  const args = parseArgs();

  checkEnv();

  const client = getServiceRoleClient();
  const userId = await resolveUserId(client, args);

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("first_name, last_name, nickname, is_admin, is_superadmin")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) {
    console.error(`No existe ningún profile para user_id ${userId} — nada que borrar.`);
    process.exit(1);
  }

  if (profile.is_admin || profile.is_superadmin) {
    console.error(`Me niego a borrar ${userId} (${profile.nickname}): es una cuenta admin/superadmin, no una cuenta demo. Esta herramienta no tiene override para esto.`);
    process.exit(1);
  }

  const { data: authUser, error: authError } = await client.auth.admin.getUserById(userId);
  if (authError) throw authError;

  const counts = await countAll(client, userId);

  console.log("Se va a borrar:");
  console.log(`  UUID:      ${userId}`);
  console.log(`  Email:     ${authUser.user.email}`);
  console.log(`  Nickname:  ${profile.nickname}`);
  console.log(`  Nombre:    ${profile.first_name || "—"} ${profile.last_name || "—"}`);
  for (const [table, n] of Object.entries(counts)) {
    console.log(`  ${table}: ${n} fila(s)`);
  }

  if (!args.yes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('\nEscribe "yes" para confirmar el borrado: ');
    rl.close();
    if (answer.trim().toLowerCase() !== "yes") {
      console.log("Cancelado, no se ha borrado nada.");
      process.exit(0);
    }
  }

  console.log("\nBorrando filas de negocio...");
  for (const table of USER_OWNED_TABLES) {
    const { error } = await client.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`Fallo borrando ${table}: ${error.message}`);
  }

  console.log("Borrando cuenta de auth.users (arrastra profiles)...");
  const { error: deleteError } = await client.auth.admin.deleteUser(userId);
  if (deleteError) throw deleteError;

  console.log("\nVerificando...");
  const finalCounts = await countAll(client, userId);
  const leftover = Object.entries(finalCounts).filter(([, n]) => n > 0);
  const { data: leftoverProfile } = await client.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  const { error: getError } = await client.auth.admin.getUserById(userId);

  if (leftover.length === 0 && !leftoverProfile && getError) {
    console.log("Confirmado: no queda nada en tablas de aplicación ni en auth.users.");
  } else {
    console.error("Aviso: quedan restos sin borrar:", { leftover, leftoverProfile: !!leftoverProfile, authStillExists: !getError });
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
