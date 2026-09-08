#!/usr/bin/env node
// Herramienta de desarrollo/testing puntual — NO forma parte de la app real.
// Pedido explícito del usuario (2026-09-07, con el usuario ya conectado):
// "añade movimientos reales para el usuario demo en test, que sean cifras
// redondas fáciles de cuadrar para meses pasados, actuales y futuros."
//
// Encontrado antes de escribir esto (auditoría rápida de la cuenta demo,
// Supabase TEST): el mes ACTUAL (septiembre 2026) tenía muchos menos
// movimientos que junio/julio/agosto y CERO comisiones; Pagos de
// compañeros (Ajuste) solo existía en junio-agosto, con cifras nada
// redondas (76.96, -31.2, 99.7...) sembradas en una sesión anterior. Este
// script no toca ni borra nada existente — solo añade filas nuevas, todas
// con cifras redondas:
//   1. Refuerzo de septiembre 2026 (mes actual): más worklog + comisiones,
//      para que esté al nivel de junio/julio/agosto.
//   2. Pagos de compañeros (Ajuste) en marzo/abril/mayo (pasado),
//      septiembre (actual) y octubre/noviembre/diciembre (futuro) —
//      cerraba en junio-agosto, ahora cubre todo el rango.
//   3. Enero y febrero 2026 (pasado más profundo) y enero y febrero 2027
//      (futuro más profundo) — worklog + comisiones + pagos de
//      compañeros, para cruzar el límite de año en Resumen.
//
// Uso: node --env-file=.env.local scripts/seed-fase6-mas-movimientos.mjs

import { checkEnv, getServiceRoleClient, resolveUserId } from "./lib/demoEnv.js";

const NICKNAME = "demo";
const TODAY = new Date(2026, 8, 7); // 2026-09-07, fecha real de esta sesión

const COLLEAGUE_NAMES = [
  "Laura Fernández", "Marco Rossi", "Aiko Tanaka", "Diego Ramírez",
  "Sophie Dubois", "James Wilson", "Elena Petrova", "Carlos Méndez",
  "Nadia Haddad", "Tom Becker",
];
const NOTES_POOL = [
  "Cliente muy majo, seguro que repite",
  "Grupo numeroso, salió todo bien",
  "Buena visibilidad hoy",
  "Reserva confirmada por WhatsApp",
  "Mar un poco picado pero sin problemas",
  "",
  "",
];
// Cifras redondas de verdad para Pagos de compañeros — la tabla existente
// tenía decimales aleatorios (76.96, -31.2...), justo lo que se pidió
// evitar. Mayormente positivas (~80%), con negativas ocasionales (la
// tabla admite ambos signos, ADR ya existente).
const ROUND_ADJUSTMENT_AMOUNTS = [50, 100, 150, 200, 250, 300];

function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
function randomNote() { return pick(NOTES_POOL); }
function randomPeople() {
  const r = Math.random();
  if (r < 0.5) return 1;
  if (r < 0.85) return 2;
  return 3;
}
function randomDayInMonth(year, monthIndex0) {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const day = 1 + Math.floor(Math.random() * daysInMonth);
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function isFutureDate(dateStr) {
  return new Date(dateStr + "T00:00:00") > TODAY;
}
function randomAdjustmentAmount() {
  const base = pick(ROUND_ADJUSTMENT_AMOUNTS);
  return Math.random() < 0.2 ? -base : base;
}

async function main() {
  checkEnv();
  const client = getServiceRoleClient();
  const userId = await resolveUserId(client, { nickname: NICKNAME });
  console.log(`Usuario demo: ${userId}`);

  const [{ data: rates }, { data: commissionRates }, { data: schools }, { data: activities }] = await Promise.all([
    client.from("rates").select("school, activity, currency").eq("user_id", userId),
    client.from("commission_rates").select("school, activity, currency").eq("user_id", userId),
    client.from("schools").select("name").eq("user_id", userId),
    client.from("activities").select("name").eq("user_id", userId),
  ]);
  const schoolNames = schools.map((s) => s.name);
  const activityNames = activities.map((a) => a.name);

  const worklogRows = [];
  const comisionesRows = [];
  const paymentsRows = [];

  const addWorklogComisiones = (year, month, worklogCount, comisionesCount) => {
    for (let i = 0; i < worklogCount; i++) {
      const r = pick(rates);
      const date = randomDayInMonth(year, month);
      const future = isFutureDate(date);
      worklogRows.push({
        date, school: r.school, activity: r.activity, people: randomPeople(),
        notes: randomNote(), status: future ? "Pending" : (Math.random() < 0.75 ? "Paid" : "Pending"),
        currency: r.currency, user_id: userId,
      });
    }
    for (let i = 0; i < comisionesCount; i++) {
      const cr = pick(commissionRates);
      const date = randomDayInMonth(year, month);
      const future = isFutureDate(date);
      comisionesRows.push({
        date, school: cr.school, activity: cr.activity, people: randomPeople(),
        notes: randomNote(), status: future ? "Pending" : (Math.random() < 0.75 ? "Paid" : "Pending"),
        currency: cr.currency, user_id: userId,
      });
    }
  };
  const addPayments = (year, month, count) => {
    for (let i = 0; i < count; i++) {
      const date = randomDayInMonth(year, month);
      const future = isFutureDate(date);
      paymentsRows.push({
        date, school: pick(schoolNames), activity: pick(activityNames), colleague_name: pick(COLLEAGUE_NAMES),
        amount: randomAdjustmentAmount(), status: future ? "Pending" : (Math.random() < 0.75 ? "Paid" : "Pending"),
        notes: randomNote(), currency: pick(rates).currency, user_id: userId,
      });
    }
  };

  // 1. Refuerzo de septiembre 2026 (mes actual) — worklog/comisiones a la
  // altura de junio/julio/agosto (~30/~12), sin tocar lo que ya había
  // (16 worklog, 0 comisiones).
  addWorklogComisiones(2026, 8, 14, 12);

  // 2. Pagos de compañeros (Ajuste), cifras redondas, en los meses donde
  // no existía ninguno: marzo/abril/mayo (pasado), septiembre (actual),
  // octubre/noviembre/diciembre (futuro).
  for (const month of [2, 3, 4, 8, 9, 10, 11]) addPayments(2026, month, 4);

  // 3. Enero/febrero 2026 (pasado más profundo) y enero/febrero 2027
  // (futuro más profundo) — worklog + comisiones + pagos, cruzando el
  // límite de año.
  for (const month of [0, 1]) {
    addWorklogComisiones(2026, month, 6, 2);
    addPayments(2026, month, 3);
    addWorklogComisiones(2027, month, 6, 2);
    addPayments(2027, month, 3);
  }

  const { error: worklogError } = await client.from("worklog").insert(worklogRows);
  if (worklogError) throw worklogError;
  const { error: comisionesError } = await client.from("comisiones").insert(comisionesRows);
  if (comisionesError) throw comisionesError;
  const { error: paymentsError } = await client.from("colleague_payments").insert(paymentsRows);
  if (paymentsError) throw paymentsError;

  console.log(`\nMovimientos añadidos:`);
  console.log(`  Worklog:              ${worklogRows.length}`);
  console.log(`  Comisiones:           ${comisionesRows.length}`);
  console.log(`  Pagos de compañeros:  ${paymentsRows.length}`);
  console.log(`  Meses cubiertos ahora: enero 2026 → diciembre 2026 → febrero 2027`);
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
