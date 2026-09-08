#!/usr/bin/env node
// Herramienta de desarrollo/testing puntual — NO forma parte de la app real.
// Pedido explícito del usuario (lote nocturno 2026-09-07): "carga varias
// escuelas, las tarifas y movimientos para varios meses pasados y futuros
// con datos reales y cifras redondas para probar fácilmente los cálculos"
// sobre la cuenta demo (nickname "demo") del Supabase TEST.
//
// A diferencia de scripts/seed-demo-records.js (genera worklog/comisiones/
// colleague_payments aleatorios solo entre junio y "hoy", nunca futuro, y
// crea commission_rates con decimales aleatorios si no existen), este
// script:
//   1. Redondea a cifras enteras las commission_rates ya sembradas con
//      decimales aleatorios (13.5, 16.41... -> 10/15/20...), para que el
//      cálculo de comisiones sea fácil de verificar a mano.
//   2. Añade una tercera escuela ("Blue Manta") con sus propias tarifas y
//      comisiones, en cifras redondas desde el origen.
//   3. Añade movimientos (worklog + comisiones) en 3 meses FUTUROS
//      (respecto a hoy) y 3 meses PASADOS adicionales anteriores a los que
//      ya había — todos con nº de personas 1-3 y tarifas ya redondas, para
//      que el importe total (tarifa × personas) sea siempre una cifra
//      limpia. Los futuros se marcan siempre "Pending" (no se puede haber
//      cobrado ya un curso que aún no ha pasado).
//
// No borra ni modifica ningún worklog/comisiones/colleague_payments ya
// existente — solo añade filas nuevas (aparte del redondeo puntual de
// commission_rates, que si se deja tal cual dificulta la verificación
// manual pedida).
//
// Uso: node --env-file=.env.local scripts/seed-fase4-datos-reales.mjs

import { checkEnv, getServiceRoleClient, resolveUserId } from "./lib/demoEnv.js";

const NICKNAME = "demo";

// Redondeo de las commission_rates ya sembradas por seed-demo-records.js —
// mapeadas por escuela+actividad, mismo valor por persona que ya se
// mostraba pero limpio (sin decimales).
const COMMISSION_ROUNDING = {
  "Ihasia::Try Scuba": 15,
  "Ihasia::Refresh": 15,
  "Ihasia::Open Water": 20,
  "Ihasia::OW 2D": 25,
  "Ihasia::Advanced": 10,
  "Ihasia::Fun Dive 2T": 20,
  "Ihasia::Rescue": 15,
  "Ihasia::Adventure Dive": 20,
  "Ihasia::Specialty": 10,
};

const NEW_SCHOOL_NAME = "Blue Manta";
const NEW_SCHOOL_COLOR = "#2563EB";

// Tarifas de la nueva escuela — cifras redondas desde el origen, sobre
// actividades que YA existen en el catálogo del usuario (no se crean
// actividades nuevas: serían compartidas con Ihasia/Reef Divers igualmente,
// conv. #1 de CLAUDE.md, "nada hardcodeado que sea configuración de
// negocio" ya vive en la tabla `activities`, ya sembrada).
const NEW_SCHOOL_RATES = [
  { activity: "Try Scuba", rate: 900 },
  { activity: "Open Water", rate: 2200 },
  { activity: "Fun Dive 1T", rate: 400 },
];
const NEW_SCHOOL_COMMISSION_RATES = [
  { activity: "Try Scuba", rate: 20 },
  { activity: "Open Water", rate: 25 },
  { activity: "Fun Dive 1T", rate: 10 },
];

const NOTES_POOL = [
  "Cliente muy majo, seguro que repite",
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
  const userId = await resolveUserId(client, { nickname: NICKNAME });
  console.log(`Usuario demo: ${userId}`);

  // 1. Redondear commission_rates existentes con decimales.
  const { data: existingCommissionRates, error: crError } = await client
    .from("commission_rates").select("id, school, activity, rate").eq("user_id", userId);
  if (crError) throw crError;
  let rounded = 0;
  for (const cr of existingCommissionRates) {
    const key = `${cr.school}::${cr.activity}`;
    const target = COMMISSION_ROUNDING[key];
    if (target != null && cr.rate !== target) {
      const { error } = await client.from("commission_rates").update({ rate: target }).eq("id", cr.id);
      if (error) throw error;
      rounded++;
    }
  }
  console.log(`Commission_rates redondeadas: ${rounded}`);

  // 2. Nueva escuela + sus tarifas/comisiones.
  const { data: existingSchool } = await client.from("schools").select("id").eq("user_id", userId).eq("name", NEW_SCHOOL_NAME).maybeSingle();
  if (existingSchool) {
    console.log(`Escuela "${NEW_SCHOOL_NAME}" ya existía — no se duplica.`);
  } else {
    const { error: schoolError } = await client.from("schools").insert({ name: NEW_SCHOOL_NAME, color: NEW_SCHOOL_COLOR, is_default: false, user_id: userId });
    if (schoolError) throw schoolError;
    console.log(`Escuela creada: ${NEW_SCHOOL_NAME}`);

    const { data: paymentTypes } = await client.from("payment_types").select("name").eq("user_id", userId);
    const instructorType = paymentTypes.find((t) => t.name === "Instructor")?.name || paymentTypes[0].name;
    const comisionType = paymentTypes.find((t) => t.name === "Comisión")?.name || paymentTypes[0].name;

    const ratesToInsert = NEW_SCHOOL_RATES.map((r) => ({
      school: NEW_SCHOOL_NAME, activity: r.activity, payment_type: instructorType, rate: r.rate, currency: "THB", user_id: userId,
    }));
    const { error: ratesError } = await client.from("rates").insert(ratesToInsert);
    if (ratesError) throw ratesError;

    const commRatesToInsert = NEW_SCHOOL_COMMISSION_RATES.map((r) => ({
      school: NEW_SCHOOL_NAME, activity: r.activity, payment_type: comisionType, rate: r.rate, currency: "THB", user_id: userId,
    }));
    const { error: commRatesError } = await client.from("commission_rates").insert(commRatesToInsert);
    if (commRatesError) throw commRatesError;
    console.log(`Tarifas/comisiones creadas para ${NEW_SCHOOL_NAME}: ${ratesToInsert.length} + ${commRatesToInsert.length}`);
  }

  // 3. Movimientos en meses futuros y pasados adicionales.
  const { data: allRates } = await client.from("rates").select("school, activity, currency").eq("user_id", userId);
  const { data: allCommissionRates } = await client.from("commission_rates").select("school, activity, currency").eq("user_id", userId);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexado

  // Futuros: los 3 meses siguientes al actual.
  const futureMonths = [1, 2, 3].map((offset) => {
    const d = new Date(currentYear, currentMonth + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  // Pasados adicionales: los 3 meses anteriores al más antiguo ya sembrado
  // por seed-demo-records.js (junio 2026) — marzo/abril/mayo.
  const pastMonths = [3, 2, 1].map((offset) => {
    const d = new Date(currentYear, 5 - offset, 1); // mes 5 = junio (0-indexado)
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const worklogRows = [];
  const comisionesRows = [];
  for (const { year, month } of [...pastMonths, ...futureMonths]) {
    const isFuture = new Date(year, month, 1) > new Date(currentYear, currentMonth, 1);
    const entriesThisMonth = 4 + Math.floor(Math.random() * 3); // 4-6
    for (let i = 0; i < entriesThisMonth; i++) {
      const r = pick(allRates);
      worklogRows.push({
        date: randomDayInMonth(year, month), school: r.school, activity: r.activity,
        people: randomPeople(), notes: randomNote(),
        status: isFuture ? "Pending" : (Math.random() < 0.7 ? "Paid" : "Pending"),
        currency: r.currency, user_id: userId,
      });
    }
    const commissionsThisMonth = 1 + Math.floor(Math.random() * 2); // 1-2
    for (let i = 0; i < commissionsThisMonth; i++) {
      const cr = pick(allCommissionRates);
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
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
