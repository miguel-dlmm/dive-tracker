#!/usr/bin/env node
// Herramienta de desarrollo/testing — replica el flujo real de creación de
// usuarios (server/users/createUser.js, que no se toca) en vez de tomar un
// atajo: auth.admin.createUser() SIN contraseña + auth.admin.generateLink()
// tipo "recovery", igual que el alta real, para que el usuario demo pase
// por el mismo primer acceso que cualquier usuario real (CreatePasswordScreen
// + aceptación de documentos legales) en vez de nacer con password_set ya
// resuelto. Además deja la cuenta lista para probar Dashboard, Actividades,
// Tarifas, Pagos, Comisiones y Configuración: dataset Ihasia clonado vía el
// mecanismo existente (clone_setup_dataset, sin duplicar escuelas/
// actividades/tarifas a mano), y payment_statuses/payment_types mínimos
// para que Pagos y Tarifas no aparezcan vacíos.
//
// A diferencia del alta real, no envía email de bienvenida (sendWelcomeEmail
// no se llama) — el enlace de activación se imprime directamente por
// consola para pegarlo en el navegador.
//
// Uso:
//   node --env-file=.env.local scripts/create-demo-user.js \
//     --email=demo@example.com --nickname=demo \
//     [--first-name=Nombre] [--last-name=Apellido]
//
// Requiere SUPABASE_SERVICE_ROLE_KEY en el entorno (junto a las VITE_*
// que ya tienes en .env.local) — nunca se expone al frontend. Si además
// tienes APP_URL en el entorno, el enlace redirige ahí tras fijar la
// contraseña; si no, Supabase usa el Site URL configurado en el proyecto.

import { checkEnv, getServiceRoleClient, parseArgs } from "./lib/demoEnv.js";

async function main() {
  const args = parseArgs();
  const { email, nickname, "first-name": firstName, "last-name": lastName } = args;

  if (!email || !nickname) {
    console.error("Uso: node --env-file=.env.local scripts/create-demo-user.js --email=... --nickname=... [--first-name=...] [--last-name=...]");
    process.exit(1);
  }

  checkEnv();

  const client = getServiceRoleClient();

  console.log(`Creando usuario demo: ${email} (${nickname})...`);
  const { data: created, error: createError } = await client.auth.admin.createUser({
    email,
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

  // Enlace de primer acceso — igual que server/users/createUser.js: mismo
  // best-effort (un fallo aquí no deshace la cuenta ni el dataset ya
  // sembrado, se informa y ya está).
  if (!process.env.APP_URL) {
    console.warn("Aviso: falta APP_URL en el entorno — el enlace usará el Site URL por defecto de Supabase.");
  }
  console.log("Generando enlace de primer acceso...");
  const { data: linkData, error: linkError } = await client.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: process.env.APP_URL },
  });
  if (linkError) {
    console.error("No se pudo generar el enlace de primer acceso:", linkError.message);
  }
  const actionLink = linkData?.properties?.action_link;

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
  if (actionLink) {
    console.log(`\nEnlace de primer acceso (crear contraseña + aceptar documentos legales):\n  ${actionLink}`);
  } else {
    console.log("\nNo se generó enlace de primer acceso — usa 'Olvidé mi contraseña' desde el login para generarlo.");
  }
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
