#!/usr/bin/env node
// Herramienta de desarrollo/testing — NO forma parte del flujo real de
// creación de usuarios (server/users/createUser.js no se toca). Crea una
// cuenta completa lista para probar Dashboard, Actividades, Tarifas,
// Pagos, Comisiones y Configuración: usuario en auth.users + profiles
// (misma Admin API que usa la app real), el dataset Ihasia clonado vía el
// mecanismo existente (clone_setup_dataset, sin duplicar escuelas/
// actividades/tarifas a mano), y payment_statuses/payment_types mínimos
// para que Pagos y Tarifas no aparezcan vacíos.
//
// Uso:
//   node --env-file=.env.local scripts/create-demo-user.js \
//     --email=demo@example.com --nickname=demo --password=Demo1234 \
//     [--first-name=Nombre] [--last-name=Apellido]
//
// Requiere SUPABASE_SERVICE_ROLE_KEY en el entorno (junto a las VITE_*
// que ya tienes en .env.local) — nunca se expone al frontend.

import { checkEnv, getServiceRoleClient, parseArgs } from "./lib/demoEnv.js";

async function main() {
  const args = parseArgs();
  const { email, nickname, password, "first-name": firstName, "last-name": lastName } = args;

  if (!email || !nickname || !password) {
    console.error("Uso: node --env-file=.env.local scripts/create-demo-user.js --email=... --nickname=... --password=... [--first-name=...] [--last-name=...]");
    process.exit(1);
  }

  checkEnv();

  const client = getServiceRoleClient();

  console.log(`Creando usuario demo: ${email} (${nickname})...`);
  const { data: created, error: createError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName || null, last_name: lastName || null, nickname },
  });

  if (createError) {
    console.error("No se pudo crear el usuario:", createError.message);
    process.exit(1);
  }

  const userId = created.user.id;

  // Cualquier fallo a partir de aquí deshace el alta en auth.users — no se
  // deja una cuenta demo a medias.
  const rollback = async (reason, err) => {
    console.error(reason, err?.message || err);
    console.error("Revirtiendo: borrando el usuario recién creado...");
    await client.auth.admin.deleteUser(userId);
    process.exit(1);
  };

  console.log("Clonando dataset Ihasia (schools/activities/rates)...");
  const { error: cloneError } = await client.rpc("clone_setup_dataset", {
    p_dataset_key: "ihasia",
    p_target_user_id: userId,
  });
  if (cloneError) await rollback("No se pudo clonar el dataset Ihasia:", cloneError);

  console.log("Sembrando payment_statuses (Pending, Paid)...");
  const { error: statusError } = await client.from("payment_statuses").insert([
    { name: "Pending", user_id: userId, is_default: true },
    { name: "Paid", user_id: userId, is_default: false },
  ]);
  if (statusError) await rollback("No se pudieron crear los payment_statuses:", statusError);

  console.log("Sembrando payment_types (Instructor, Comisión)...");
  const { error: typeError } = await client.from("payment_types").insert([
    { name: "Instructor", user_id: userId, is_default: true },
    { name: "Comisión", user_id: userId, is_default: false },
  ]);
  if (typeError) await rollback("No se pudieron crear los payment_types:", typeError);

  const count = async (table) => {
    const { count, error } = await client.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
    if (error) throw error;
    return count;
  };

  const [schools, activities, rates, statuses, types] = await Promise.all([
    count("schools"), count("activities"), count("rates"), count("payment_statuses"), count("payment_types"),
  ]);

  console.log("\nUsuario demo creado correctamente:");
  console.log(`  UUID:              ${userId}`);
  console.log(`  Email:             ${email}`);
  console.log(`  Nickname:          ${nickname}`);
  console.log(`  Escuelas:          ${schools}`);
  console.log(`  Actividades:       ${activities}`);
  console.log(`  Tarifas:           ${rates}`);
  console.log(`  Estados de pago:   ${statuses} (Pending, Paid)`);
  console.log(`  Tipos de pago:     ${types} (Instructor, Comisión)`);
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
