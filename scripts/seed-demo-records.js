#!/usr/bin/env node
// Herramienta de desarrollo/testing — NO forma parte de la app real. Rellena
// Registro (worklog), Comisiones y Pagos de compañeros de un usuario ya
// existente (normalmente el creado con create-demo-user.js) con datos
// "humanizados": fechas repartidas entre junio y hoy (o el 31 de agosto si
// se ejecuta más tarde) del año en curso, sin fechas futuras; nº de
// personas sesgado hacia 1-2; notas presentes solo ~25% de las veces;
// estado sesgado a "Paid" cuanto más antigua la fecha; importes de pagos
// de compañeros mayormente positivos con un 15% de probabilidad de ser
// negativos (la tabla lo permite explícitamente).
//
// Cada registro generado usa una escuela+actividad que YA existe en las
// rates/commission_rates reales del usuario, para que el importe se
// calcule y se vea correctamente en la app en vez de aparecer como "sin
// tarifa configurada". Si el usuario no tiene ninguna commission_rate
// (el dataset Ihasia no las incluye), este script siembra una mínima por
// cada combinación escuela+actividad que sí tenga en rates, avisándolo
// por consola.
//
// Uso:
//   node --env-file=.env.local scripts/seed-demo-records.js --nickname=demo \
//     [--worklog=40] [--comisiones=15] [--payments=10] [--clear]
//
// --clear borra antes los worklog/comisiones/colleague_payments de ese
// usuario dentro del rango de fechas (para no acumular en cada re-run).

import { checkEnv, getServiceRoleClient, parseArgs, resolveUserId } from "./lib/demoEnv.js";

const COLLEAGUE_NAMES = [
  "Laura Fernández", "Marco Rossi", "Aiko Tanaka", "Diego Ramírez",
  "Sophie Dubois", "James Wilson", "Elena Petrova", "Carlos Méndez",
  "Nadia Haddad", "Tom Becker",
];

const NOTES_POOL = [
  "Cliente muy majo, seguro que repite",
  "Grupo numeroso, salió todo bien",
  "Buena visibilidad hoy",
  "Primera inmersión del cliente, algo nervioso al principio",
  "Mar un poco picado pero sin problemas",
  "Cliente con certificación previa, todo fluido",
];

function dateRange() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(Date.UTC(year, 5, 1));   // 1 de junio
  const cap = new Date(Date.UTC(year, 7, 31));     // 31 de agosto
  const end = now < cap ? now : cap;
  return { start, end };
}

function randomDate(start, end) {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t).toISOString().slice(0, 10);
}

function randomPeople() {
  const r = Math.random();
  if (r < 0.4) return 1;
  if (r < 0.7) return 2;
  if (r < 0.9) return 3;
  return 4;
}

function randomNote() {
  return Math.random() < 0.25 ? NOTES_POOL[Math.floor(Math.random() * NOTES_POOL.length)] : "";
}

function randomStatus(dateStr, today, pendingName, paidName) {
  const daysAgo = (today.getTime() - new Date(dateStr).getTime()) / 86400000;
  const paidChance = daysAgo > 10 ? 0.8 : 0.3;
  return Math.random() < paidChance ? paidName : pendingName;
}

function randomAmount() {
  const base = 20 + Math.random() * 130;
  const negative = Math.random() < 0.15;
  return Number((negative ? -base : base).toFixed(2));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function main() {
  checkEnv();
  const args = parseArgs();
  const worklogCount = Number(args.worklog ?? 40);
  const comisionesCount = Number(args.comisiones ?? 15);
  const paymentsCount = Number(args.payments ?? 10);

  const client = getServiceRoleClient();
  const userId = await resolveUserId(client, args);
  const { start, end } = dateRange();

  const [{ data: rates, error: ratesError }, { data: schools, error: schoolsError }, { data: activities, error: activitiesError },
    { data: paymentStatuses }, { data: paymentTypes }, { data: commissionRatesExisting, error: commissionRatesError }] = await Promise.all([
    client.from("rates").select("school, activity, payment_type, currency").eq("user_id", userId),
    client.from("schools").select("name").eq("user_id", userId),
    client.from("activities").select("name").eq("user_id", userId),
    client.from("payment_statuses").select("name").eq("user_id", userId),
    client.from("payment_types").select("name").eq("user_id", userId),
    client.from("commission_rates").select("school, activity, payment_type, currency").eq("user_id", userId),
  ]);
  if (ratesError) throw ratesError;
  if (schoolsError) throw schoolsError;
  if (activitiesError) throw activitiesError;
  if (commissionRatesError) throw commissionRatesError;

  if (!rates || rates.length === 0) {
    console.error("El usuario no tiene ninguna tarifa (rates) — no se puede generar Registro sin al menos una.");
    process.exit(1);
  }
  if (!schools || schools.length === 0 || !activities || activities.length === 0) {
    console.error("El usuario no tiene escuelas o actividades — no se pueden generar Pagos de compañeros.");
    process.exit(1);
  }

  const pendingName = paymentStatuses?.find((s) => /pending/i.test(s.name))?.name || paymentStatuses?.[0]?.name || "Pending";
  const paidName = paymentStatuses?.find((s) => /paid/i.test(s.name))?.name || paymentStatuses?.[1]?.name || "Paid";
  const comisionPaymentType = paymentTypes?.find((t) => /comisi/i.test(t.name))?.name || paymentTypes?.[0]?.name || "Comisión";

  let commissionRates = commissionRatesExisting;
  if (!commissionRates || commissionRates.length === 0) {
    console.log("El usuario no tenía commission_rates — sembrando una mínima por cada escuela+actividad de rates...");
    const seen = new Set();
    const toInsert = [];
    for (const r of rates) {
      const key = `${r.school}::${r.activity}`;
      if (seen.has(key)) continue;
      seen.add(key);
      toInsert.push({
        school: r.school,
        activity: r.activity,
        payment_type: comisionPaymentType,
        rate: Math.round((5 + Math.random() * 20) * 100) / 100,
        currency: r.currency,
        user_id: userId,
      });
    }
    const { data: inserted, error: insertError } = await client.from("commission_rates").insert(toInsert).select("school, activity, payment_type, currency");
    if (insertError) throw insertError;
    commissionRates = inserted;
    console.log(`  ${inserted.length} commission_rates sembradas.`);
  }

  if (args.clear) {
    console.log("Borrando worklog/comisiones/colleague_payments existentes en el rango de fechas...");
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    for (const table of ["worklog", "comisiones", "colleague_payments"]) {
      const { error } = await client.from(table).delete().eq("user_id", userId).gte("date", startStr).lte("date", endStr);
      if (error) throw error;
    }
  }

  const today = new Date();
  const schoolNames = schools.map((s) => s.name);
  const activityNames = activities.map((a) => a.name);

  const worklogRows = Array.from({ length: worklogCount }, () => {
    const r = pick(rates);
    const date = randomDate(start, end);
    return {
      date, school: r.school, activity: r.activity, people: randomPeople(),
      notes: randomNote(), status: randomStatus(date, today, pendingName, paidName),
      currency: r.currency, user_id: userId,
    };
  });

  const comisionesRows = Array.from({ length: comisionesCount }, () => {
    const r = pick(commissionRates);
    const date = randomDate(start, end);
    return {
      date, school: r.school, activity: r.activity, people: randomPeople(),
      notes: randomNote(), status: randomStatus(date, today, pendingName, paidName),
      currency: r.currency, user_id: userId,
    };
  });

  const paymentsRows = Array.from({ length: paymentsCount }, () => {
    const date = randomDate(start, end);
    return {
      date, school: pick(schoolNames), activity: pick(activityNames), colleague_name: pick(COLLEAGUE_NAMES),
      amount: randomAmount(), status: randomStatus(date, today, pendingName, paidName),
      notes: randomNote(), currency: pick(rates).currency, user_id: userId,
    };
  });

  const { error: worklogError } = await client.from("worklog").insert(worklogRows);
  if (worklogError) throw worklogError;

  const { error: comisionesError } = await client.from("comisiones").insert(comisionesRows);
  if (comisionesError) throw comisionesError;

  const { error: paymentsError } = await client.from("colleague_payments").insert(paymentsRows);
  if (paymentsError) throw paymentsError;

  console.log("\nRegistros generados correctamente:");
  console.log(`  Rango de fechas:        ${start.toISOString().slice(0, 10)} — ${end.toISOString().slice(0, 10)}`);
  console.log(`  Registro (worklog):     ${worklogRows.length}`);
  console.log(`  Comisiones:             ${comisionesRows.length}`);
  console.log(`  Pagos de compañeros:    ${paymentsRows.length}`);
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
