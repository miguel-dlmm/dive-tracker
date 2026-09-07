#!/usr/bin/env node
// Herramienta de desarrollo/testing puntual — NO forma parte de la app real.
// Pedido explícito del usuario (cola pendiente de la Fase 10/11 del
// rediseño v2): "carga el usuario [migueldlmm@gmail.com]... con datos de
// movimientos reales de los últimos 4-5 meses y un par de meses a
// futuro... cantidades redondas... varias escuelas". Solo contra el
// Supabase TEST (verificado antes de ejecutar) — nunca contra producción.
//
// La cuenta ya tenía datos reales propios (3 escuelas: Ihasia, Reef
// Divers, Taco; 24 worklog + 2 comisiones, todo entre 2026-08-01 y
// 2026-09-07, casi todo en Ihasia) — este script no toca nada de eso,
// solo AÑADE:
//   1. Meses pasados adicionales (mayo/junio/julio 2026, antes del rango
//      ya sembrado) y un par de meses futuros (octubre/noviembre 2026).
//   2. Repartido entre las 3 escuelas ya existentes (no solo Ihasia, que
//      es donde estaba casi toda la actividad real) — solo sobre
//      combinaciones escuela+actividad cuya tarifa YA es una cifra
//      redonda (se excluyen a propósito 3 tarifas de Ihasia con
//      decimales/cifras sueltas — 34, 12, 10 THB — que son ruido de
//      pruebas anterior, no datos reales).
// Futuros siempre "Pending" (no se puede haber cobrado ya un curso que
// aún no ha pasado). Mismo patrón que scripts/seed-fase4-datos-reales.mjs
// (cuenta demo) — aquí sobre la cuenta real del superadmin.
//
// Uso: node --env-file=.env.local scripts/seed-real-account-movimientos.mjs

import { checkEnv, getServiceRoleClient, resolveUserId, parseArgs } from "./lib/demoEnv.js";

const EMAIL = "migueldlmm@gmail.com";

// Solo tarifas activas y de cifra redonda (ver comentario de cabecera).
const ROUND_RATE_COMBOS = [
  { school: "Ihasia", activity: "Open Water" },
  { school: "Ihasia", activity: "Adventure Dive" },
  { school: "Ihasia", activity: "OW 2D" },
  { school: "Ihasia", activity: "Try Scuba" },
  { school: "Ihasia", activity: "Refresh" },
  { school: "Ihasia", activity: "Fun Dive 2T" },
  { school: "Ihasia", activity: "Advanced" },
  { school: "Taco", activity: "Rescue" },
  { school: "Reef Divers", activity: "Try Scuba" },
];

const NOTES_POOL = [
  "Cliente repite, va genial",
  "Grupo numeroso, salió todo bien",
  "Buena visibilidad hoy",
  "Reserva confirmada por WhatsApp",
  "Mar un poco picado pero sin problemas",
];
function randomNote() {
  return Math.random() < 0.25 ? NOTES_POOL[Math.floor(Math.random() * NOTES_POOL.length)] : "";
}
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}
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

async function main() {
  checkEnv();
  const client = getServiceRoleClient();
  const args = parseArgs();
  const userId = args.email || args.nickname || args.uuid
    ? await resolveUserId(client, args)
    : await resolveUserId(client, { email: EMAIL });
  console.log(`Usuario: ${userId} (${EMAIL})`);

  const { data: allRates, error: ratesError } = await client
    .from("rates").select("school, activity, currency, rate, is_active").eq("user_id", userId);
  if (ratesError) throw ratesError;
  const { data: allCommissionRates, error: crError } = await client
    .from("commission_rates").select("school, activity, currency, rate, is_active").eq("user_id", userId);
  if (crError) throw crError;

  const usableRates = allRates.filter((r) => r.is_active && ROUND_RATE_COMBOS.some((c) => c.school === r.school && c.activity === r.activity));
  const usableCommissionRates = allCommissionRates.filter((r) => r.is_active);
  if (usableRates.length === 0) throw new Error("No hay tarifas activas de cifra redonda que coincidan con ROUND_RATE_COMBOS.");
  console.log(`Tarifas usables: ${usableRates.length} (${[...new Set(usableRates.map((r) => r.school))].join(", ")})`);
  console.log(`Commission_rates usables: ${usableCommissionRates.length}`);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexado, ya activo en la app (agosto/septiembre 2026)

  // Pasados adicionales: los 3 meses anteriores al más antiguo ya
  // sembrado (2026-08-01) — mayo/junio/julio. currentMonth ya es
  // agosto/septiembre (mes en curso), así que el mes YA sembrado es
  // currentMonth-1 (agosto) — los 3 adicionales empiezan en
  // currentMonth-4 (mayo), no currentMonth-3 (que sería agosto otra
  // vez, duplicando el rango real ya existente).
  const pastMonths = [4, 3, 2].map((offset) => {
    const d = new Date(currentYear, currentMonth - offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  // Futuros: "un par de meses" — los 2 siguientes al actual.
  const futureMonths = [1, 2].map((offset) => {
    const d = new Date(currentYear, currentMonth + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const worklogRows = [];
  const comisionesRows = [];
  for (const { year, month } of [...pastMonths, ...futureMonths]) {
    const isFuture = new Date(year, month, 1) > new Date(currentYear, currentMonth, 1);
    const entriesThisMonth = 4 + Math.floor(Math.random() * 3); // 4-6
    for (let i = 0; i < entriesThisMonth; i++) {
      const r = pick(usableRates);
      worklogRows.push({
        date: randomDayInMonth(year, month), school: r.school, activity: r.activity,
        people: randomPeople(), notes: randomNote(),
        status: isFuture ? "Pending" : (Math.random() < 0.7 ? "Paid" : "Pending"),
        currency: r.currency, user_id: userId,
      });
    }
    const commissionsThisMonth = 1 + Math.floor(Math.random() * 2); // 1-2
    for (let i = 0; i < commissionsThisMonth; i++) {
      const cr = pick(usableCommissionRates);
      comisionesRows.push({
        date: randomDayInMonth(year, month), school: cr.school, activity: cr.activity,
        people: randomPeople(), notes: randomNote(),
        status: isFuture ? "Pending" : (Math.random() < 0.7 ? "Paid" : "Pending"),
        currency: cr.currency, user_id: userId,
      });
    }
  }

  const { error: worklogError } = await client.from("worklog").insert(worklogRows);
  if (worklogError) throw worklogError;
  const { error: comisionesError } = await client.from("comisiones").insert(comisionesRows);
  if (comisionesError) throw comisionesError;

  console.log(`\nMovimientos añadidos:`);
  console.log(`  Meses pasados adicionales: ${pastMonths.map((m) => `${m.year}-${String(m.month + 1).padStart(2, "0")}`).join(", ")}`);
  console.log(`  Meses futuros:             ${futureMonths.map((m) => `${m.year}-${String(m.month + 1).padStart(2, "0")}`).join(", ")}`);
  console.log(`  Worklog:                   ${worklogRows.length}`);
  console.log(`  Comisiones:                ${comisionesRows.length}`);
  const bySchool = {};
  worklogRows.forEach((w) => { bySchool[w.school] = (bySchool[w.school] || 0) + 1; });
  console.log(`  Worklog por escuela:       ${Object.entries(bySchool).map(([s, n]) => `${s}: ${n}`).join(", ")}`);
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
