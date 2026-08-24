import React, { useState, useMemo } from "react";
import { formatMoney, Select, colorFor } from "./shared";
import { NAVY, AQUA, CORAL, GREEN, DISPLAY_FONT } from "./App";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// Suma `total` de `entries` agrupado por `keyFn`, separado por moneda,
// y opcionalmente el nº de personas. Devuelve [{ key, totals, people }]
function groupSum(entries, keyFn, opts = {}) {
  const { amountKey = "total", currencyKey = "currency", withPeople = false } = opts;
  const map = {};
  entries.forEach((e) => {
    const key = keyFn(e);
    if (!map[key]) map[key] = { totals: {}, people: 0 };
    map[key].totals[e[currencyKey]] = (map[key].totals[e[currencyKey]] || 0) + e[amountKey];
    if (withPeople) map[key].people += (e.people || 0);
  });
  return Object.entries(map).map(([key, v]) => ({ key, totals: v.totals, people: v.people }));
}

function MoneyLine({ totals, currencyRows }) {
  const entries = Object.entries(totals || {});
  if (entries.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <span>
      {entries.map(([code, amt], i) => (
        <span key={code}>{i > 0 && " + "}{formatMoney(amt, code, currencyRows)}</span>
      ))}
    </span>
  );
}

// Tabla real con columnas separadas: etiqueta | Personas | Importe.
function BreakdownCard({ title, rows, currencyRows, textColor, showPeople }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h3 className="mb-3 font-bold" style={{ fontFamily: DISPLAY_FONT, color: NAVY }}>{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos.</p>
      ) : (
        <table className="w-full text-sm">
          {showPeople && (
            <thead>
              <tr className="text-xs text-slate-400">
                <th className="pb-2 text-left font-medium"></th>
                <th className="w-16 pb-2 text-right font-medium">Personas</th>
                <th className="pb-2 text-right font-medium">Importe</th>
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-black/5">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="py-2.5 pr-2 font-medium" style={textColor ? { color: textColor(r.key) } : { color: "#334155" }}>
                  {r.key}
                </td>
                {showPeople && <td className="w-16 py-2.5 text-right text-slate-400">{r.people}</td>}
                <td className="py-2.5 text-right font-semibold" style={{ color: NAVY }}>
                  <MoneyLine totals={r.totals} currencyRows={currencyRows} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// worklog / rates / activities / schools / currencies / colleaguePayments: hooks de useSupabaseTable
// NOTA: esto cubre solo Work Log (Instructor) por ahora. Comisiones se
// integrará en el Resumen en un paso posterior, según lo hablado.
export default function SummaryTab({ worklog, rates, activities, schools, currencies, colleaguePayments }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedSchool, setSelectedSchool] = useState(schools.rows.find((s) => s.is_default)?.name || schools.rows[0]?.name || "");

  const schoolNames = schools.rows.map((s) => s.name);
  const activityColor = (name) => colorFor(activities.rows, name, "#94A3B8");
  const schoolColor = (name) => colorFor(schools.rows, name, "#334155");

  const rateFor = (school, activity) =>
    rates.rows.find((r) => r.school === school && r.activity === activity);

  const withTotals = useMemo(() => worklog.rows.map((e) => {
    const r = rateFor(e.school, e.activity);
    const total = r ? (r.payment_type === "Per Person" ? r.rate * e.people : r.rate) : 0;
    return { ...e, total };
  }), [worklog.rows, rates.rows]);

  const monthEntries = useMemo(() => withTotals.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  }), [withTotals, year, month]);

  const schoolEntries = useMemo(() => monthEntries.filter((e) => e.school === selectedSchool), [monthEntries, selectedSchool]);

  // ---- Global ----
  const globalTotal = groupSum(monthEntries, () => "Total")[0]?.totals || {};
  const globalBySchool = groupSum(monthEntries, (e) => e.school, { withPeople: true });
  const globalByActivity = groupSum(monthEntries, (e) => e.activity, { withPeople: true });

  // ---- Por escuela ----
  const schoolTotal = groupSum(schoolEntries, () => "Total")[0]?.totals || {};
  const schoolByActivity = groupSum(schoolEntries, (e) => e.activity, { withPeople: true });

  // ---- Compañeros agrupados por nombre, para la escuela + mes seleccionados ----
  const colleagueMonthEntries = useMemo(() => colleaguePayments.rows.filter((p) => {
    const d = new Date(p.date);
    return p.school === selectedSchool && d.getFullYear() === year && d.getMonth() === month;
  }), [colleaguePayments.rows, selectedSchool, year, month]);
  const colleagueByName = groupSum(colleagueMonthEntries, (p) => p.colleague_name, { amountKey: "amount", currencyKey: "currency" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(year)} onChange={(v) => setYear(Number(v))} options={[year - 1, year, year + 1].map(String)} />
        <Select value={String(month)} onChange={(v) => setMonth(Number(v))} options={MONTHS.map((_, i) => String(i))} />
        <span className="text-sm text-slate-400">→ {MONTHS[month]} {year}</span>
      </div>

      {/* ================= GLOBAL ================= */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Vista global del mes</h2>
        <div className="mb-4 rounded-3xl p-5 text-white shadow-sm" style={{ backgroundColor: AQUA }}>
          <div className="text-xs font-medium opacity-80">Total Ganado (todas las escuelas)</div>
          <div className="mt-1 text-3xl font-bold" style={{ fontFamily: DISPLAY_FONT }}><MoneyLine totals={globalTotal} currencyRows={currencies.rows} /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <BreakdownCard title="Por escuela" rows={globalBySchool} currencyRows={currencies.rows} textColor={schoolColor} showPeople />
          <BreakdownCard title="Por actividad" rows={globalByActivity} currencyRows={currencies.rows} textColor={activityColor} showPeople />
        </div>
      </div>

      {/* ================= POR ESCUELA ================= */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Vista por escuela</h2>
          <div className="w-48">
            <Select value={selectedSchool} onChange={setSelectedSchool} options={schoolNames} />
          </div>
        </div>
        <div className="mb-4 rounded-3xl p-5 text-white shadow-sm" style={{ backgroundColor: schoolColor(selectedSchool) }}>
          <div className="text-xs font-medium opacity-80">Total Ganado — {selectedSchool || "—"}</div>
          <div className="mt-1 text-3xl font-bold" style={{ fontFamily: DISPLAY_FONT }}><MoneyLine totals={schoolTotal} currencyRows={currencies.rows} /></div>
        </div>
        <BreakdownCard title="Por actividad" rows={schoolByActivity} currencyRows={currencies.rows} textColor={activityColor} showPeople />

        {/* Compañeros agrupados por nombre */}
        <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h3 className="mb-3 font-bold" style={{ fontFamily: DISPLAY_FONT, color: NAVY }}>Pagos de compañeros — {selectedSchool || "—"} ({MONTHS[month]})</h3>
          {colleagueByName.length === 0 ? (
            <p className="text-sm text-slate-400">Sin pagos de compañeros este mes para esta escuela.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {colleagueByName.map((r) => {
                const netPositive = Object.values(r.totals).reduce((s, v) => s + v, 0) >= 0;
                return (
                  <li key={r.key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="text-slate-700">{r.key}</span>
                    <span className="font-semibold" style={{ color: netPositive ? GREEN : CORAL }}>
                      <MoneyLine totals={r.totals} currencyRows={currencies.rows} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-black/10 px-4 py-3 text-xs text-slate-400">
        Pendiente de integrar en este Resumen: Comisiones (Fase 7b, junto con los calendarios del mes por escuela).
      </div>
    </div>
  );
}
