import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMoney, Money, colorFor, DatePicker, MoneyLine, MonthCalendar, Select } from "./shared";
import { NAVY, TEAL, SUN, AQUA, CORAL, GREEN } from "./App";

const NEUTRAL_GRAY = "#94A3B8";
const SOURCES = [
  ["total", "Total"],
  ["ganado", "Ganado"],
  ["comision", "Comisión"],
  ["companeros", "Compañeros"],
];

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmtInt = (n) => (n || 0).toLocaleString("es-ES");

const UNITS_PER_YEAR = { mensual: 12, trimestral: 4, semestral: 2, anual: 1 };

function periodRange(granularity, year, unitIndex, customFrom, customTo) {
  if (granularity === "personalizado") return [customFrom || null, customTo || null];
  if (granularity === "mensual") {
    const start = new Date(year, unitIndex, 1);
    const end = new Date(year, unitIndex + 1, 0);
    return [start, end];
  }
  if (granularity === "trimestral") {
    const m0 = unitIndex * 3;
    return [new Date(year, m0, 1), new Date(year, m0 + 3, 0)];
  }
  if (granularity === "semestral") {
    const m0 = unitIndex * 6;
    return [new Date(year, m0, 1), new Date(year, m0 + 6, 0)];
  }
  return [new Date(year, 0, 1), new Date(year, 11, 31)]; // anual
}

function periodLabel(granularity, year, unitIndex) {
  if (granularity === "mensual") return `${MONTHS[unitIndex]} ${year}`;
  if (granularity === "trimestral") return `T${unitIndex + 1} ${year}`;
  if (granularity === "semestral") return `S${unitIndex + 1} ${year}`;
  return `${year}`;
}

// current-period unit index para cada granularidad, a partir de "hoy"
function currentUnitFor(granularity, now) {
  if (granularity === "mensual") return now.getMonth();
  if (granularity === "trimestral") return Math.floor(now.getMonth() / 3);
  if (granularity === "semestral") return Math.floor(now.getMonth() / 6);
  return 0;
}

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

function BreakdownCard({ title, rows, currencyRows, textColor }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">Sin datos.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400">
              <th className="pb-2 text-left font-medium"></th>
              <th className="w-14 pb-2 text-center font-medium">Pers.</th>
              <th className="pb-2 text-right font-medium">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="py-2 pr-2 font-medium" style={textColor ? { color: textColor(r.key) } : { color: "#334155" }}>
                  {r.key}
                </td>
                <td className="w-14 py-2 text-center tabular-nums text-gray-500">{fmtInt(r.people)}</td>
                <td className="py-2 text-right font-semibold" style={{ color: NAVY }}>
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

// worklog / rates / comisiones / commissionRates / activities / schools / currencies / colleaguePayments: hooks de useSupabaseTable
export default function SummaryTab({ worklog, rates, comisiones, commissionRates, activities, schools, currencies, colleaguePayments }) {
  const now = new Date();
  const [granularity, setGranularity] = useState("mensual");
  const [source, setSource] = useState("total"); // "total" | "ganado" | "comision" | "companeros"
  const [year, setYear] = useState(now.getFullYear());
  const [unitIndex, setUnitIndex] = useState(now.getMonth());
  const [customFrom, setCustomFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(now.toISOString().slice(0, 10));
  const [selectedSchool, setSelectedSchool] = useState(schools.rows.find((s) => s.is_default)?.name || schools.rows[0]?.name || "");

  const SOURCE_META = {
    ganado: { label: "Ganado", color: TEAL },
    comision: { label: "Comisión", color: SUN },
    companeros: { label: "Compañeros", color: AQUA },
  };

  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";
  const activityColor = (name) => colorFor(activities.rows, name, "#94A3B8");
  const schoolColor = (name) => colorFor(schools.rows, name, "#334155");
  const sourceColor = source === "total" ? NAVY : SOURCE_META[source].color;
  const sourceLabel = source === "total" ? "Total combinado" : `Total ${SOURCE_META[source].label}`;

  const rateTotal = (e, ratesTable) => {
    const r = ratesTable.rows.find((r) => r.school === e.school && r.activity === e.activity);
    return { total: r ? (r.payment_type === "Per Person" ? r.rate * e.people : r.rate) : 0, currency: r?.currency || e.currency || fallbackCurrency };
  };

  const ganadoEntries = useMemo(() => worklog.rows.map((e) => ({ ...e, ...rateTotal(e, rates), _source: "ganado" })), [worklog.rows, rates.rows, fallbackCurrency]);
  const comisionEntries = useMemo(() => comisiones.rows.map((e) => ({ ...e, ...rateTotal(e, commissionRates), _source: "comision" })), [comisiones.rows, commissionRates.rows, fallbackCurrency]);
  const companerosEntries = useMemo(() => colleaguePayments.rows.map((p) => ({ ...p, total: p.amount, people: 0, _source: "companeros" })), [colleaguePayments.rows]);

  const withTotals = useMemo(() => {
    if (source === "total") return [...ganadoEntries, ...comisionEntries, ...companerosEntries];
    if (source === "ganado") return ganadoEntries;
    if (source === "comision") return comisionEntries;
    return companerosEntries;
  }, [source, ganadoEntries, comisionEntries, companerosEntries]);

  // ---- navegación de periodo — cambiar de granularidad siempre salta al
  // periodo actual de esa granularidad (nunca se queda "colgado" en un
  // índice que no corresponde a hoy). ----
  const unitsPerYear = UNITS_PER_YEAR[granularity] || 12;
  const changeGranularity = (g) => {
    setGranularity(g);
    setYear(now.getFullYear());
    setUnitIndex(currentUnitFor(g, now));
  };
  const goPrev = () => {
    if (granularity === "anual") { setYear((y) => y - 1); return; }
    if (unitIndex === 0) { setUnitIndex(unitsPerYear - 1); setYear((y) => y - 1); }
    else setUnitIndex((u) => u - 1);
  };
  const goNext = () => {
    if (granularity === "anual") { setYear((y) => y + 1); return; }
    if (unitIndex === unitsPerYear - 1) { setUnitIndex(0); setYear((y) => y + 1); }
    else setUnitIndex((u) => u + 1);
  };

  const [rangeStart, rangeEnd] = periodRange(granularity, year, unitIndex, customFrom ? new Date(customFrom) : null, customTo ? new Date(customTo) : null);

  const periodEntries = useMemo(() => withTotals.filter((e) => {
    if (!rangeStart || !rangeEnd) return false;
    const d = new Date(e.date);
    return d >= rangeStart && d <= rangeEnd;
  }), [withTotals, rangeStart, rangeEnd]);

  const schoolEntries = useMemo(() => periodEntries.filter((e) => e.school === selectedSchool), [periodEntries, selectedSchool]);

  // Color del círculo de cada día en el calendario global: el de la escuela
  // que más ha facturado ese día (sumando importes sin convertir divisas —
  // aproximación suficiente para elegir "cuál domina"), o gris neutro si hay
  // empate.
  const topSchoolColorForDay = (list) => {
    const sums = {};
    list.forEach((e) => { sums[e.school] = (sums[e.school] || 0) + (e.total || 0); });
    const sorted = Object.entries(sums).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return NEUTRAL_GRAY;
    if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) return NEUTRAL_GRAY;
    return schoolColor(sorted[0][0]);
  };

  const globalLegend = useMemo(() => {
    const names = [...new Set(periodEntries.map((e) => e.school))];
    return names.map((n) => ({ label: n, color: schoolColor(n) }));
  }, [periodEntries, schools.rows]);

  const globalTotal = groupSum(periodEntries, () => "Total")[0]?.totals || {};
  const globalBySchool = groupSum(periodEntries, (e) => e.school, { withPeople: true });
  const globalByActivity = groupSum(periodEntries, (e) => e.activity, { withPeople: true });

  const schoolTotal = groupSum(schoolEntries, () => "Total")[0]?.totals || {};
  const schoolByActivity = groupSum(schoolEntries, (e) => e.activity, { withPeople: true });

  // En modo Total, el combinado por escuela/actividad no distingue de dónde
  // viene el dinero — se añade aparte el desglose solo de Comisiones para
  // no perder esa cifra dentro del total.
  const comisionPeriodEntries = useMemo(() => comisionEntries.filter((e) => {
    if (!rangeStart || !rangeEnd) return false;
    const d = new Date(e.date);
    return d >= rangeStart && d <= rangeEnd;
  }), [comisionEntries, rangeStart, rangeEnd]);
  const comisionBySchool = groupSum(comisionPeriodEntries, (e) => e.school, { withPeople: true });
  const comisionByActivity = groupSum(comisionPeriodEntries, (e) => e.activity, { withPeople: true });
  const comisionSchoolByActivity = groupSum(comisionPeriodEntries.filter((e) => e.school === selectedSchool), (e) => e.activity, { withPeople: true });

  const colleaguePeriodEntries = useMemo(() => colleaguePayments.rows.filter((p) => {
    if (!rangeStart || !rangeEnd) return false;
    const d = new Date(p.date);
    return d >= rangeStart && d <= rangeEnd && p.school === selectedSchool;
  }), [colleaguePayments.rows, selectedSchool, rangeStart, rangeEnd]);
  const colleagueByName = groupSum(colleaguePeriodEntries, (p) => p.colleague_name, { amountKey: "amount", currencyKey: "currency" });

  const schoolNames = schools.rows.map((s) => s.name);
  const label = granularity === "personalizado"
    ? (customFrom && customTo ? `${customFrom} → ${customTo}` : "Elige un rango")
    : periodLabel(granularity, year, unitIndex);

  return (
    <div className="space-y-4">
      {/* Mensual / Trimestral / Semestral / Anual / Personalizado */}
      <div className="flex flex-wrap gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
        {[["mensual", "Mensual"], ["trimestral", "Trimestral"], ["semestral", "Semestral"], ["anual", "Anual"], ["personalizado", "Personalizado"]].map(([key, l]) => (
          <button
            key={key}
            onClick={() => changeGranularity(key)}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={granularity === key ? { backgroundColor: NAVY, color: "white" } : { color: "#6B7280" }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Navegación de periodo */}
      {granularity === "personalizado" ? (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-white p-3">
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500">Desde</span>
            <DatePicker value={customFrom} onChange={setCustomFrom} />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500">Hasta</span>
            <DatePicker value={customTo} onChange={setCustomTo} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
          <button onClick={goPrev} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><ChevronLeft size={18} /></button>
          <span className="text-sm font-semibold tabular-nums" style={{ color: NAVY }}>{label}</span>
          <button onClick={goNext} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><ChevronRight size={18} /></button>
        </div>
      )}

      {/* Total / Ganado / Comisión / Compañeros */}
      <div className="inline-flex gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
        {SOURCES.map(([key, l]) => (
          <button
            key={key}
            onClick={() => setSource(key)}
            className="rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors"
            style={source === key ? { backgroundColor: key === "total" ? NAVY : SOURCE_META[key].color, color: "white" } : { color: "#6B7280" }}
          >
            {l}
          </button>
        ))}
      </div>

      {granularity === "mensual" && (
        <MonthCalendar
          year={year}
          month={unitIndex}
          entries={periodEntries}
          dotColor={topSchoolColorForDay}
          legend={globalLegend}
          currencyRows={currencies.rows}
          activityColor={activityColor}
          groupBySource={source === "total"}
          sourceMeta={SOURCE_META}
        />
      )}

      {/* ================= GLOBAL ================= */}
      <div>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Vista global — {label}</h2>
        <div className="mb-3 rounded-lg p-4 text-white" style={{ backgroundColor: sourceColor }}>
          <div className="text-xs font-medium opacity-80">{sourceLabel} (todas las escuelas)</div>
          <div className="mt-1 text-2xl font-bold tabular-nums"><MoneyLine totals={globalTotal} currencyRows={currencies.rows} /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <BreakdownCard title="Por escuela" rows={globalBySchool} currencyRows={currencies.rows} textColor={schoolColor} />
          <BreakdownCard title="Por actividad" rows={globalByActivity} currencyRows={currencies.rows} textColor={activityColor} />
        </div>

        {source === "total" && (
          <div className="mt-3">
            <h3 className="mb-2 text-xs font-semibold" style={{ color: SOURCE_META.comision.color }}>Comisiones</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <BreakdownCard title="Por escuela" rows={comisionBySchool} currencyRows={currencies.rows} textColor={schoolColor} />
              <BreakdownCard title="Por actividad" rows={comisionByActivity} currencyRows={currencies.rows} textColor={activityColor} />
            </div>
          </div>
        )}
      </div>

      {/* ================= POR ESCUELA ================= */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Por escuela</h2>
          <div className="w-40">
            <Select value={selectedSchool} onChange={setSelectedSchool} options={schoolNames} />
          </div>
        </div>
        <div className="mb-3 rounded-lg p-4 text-white" style={{ backgroundColor: schoolColor(selectedSchool) }}>
          <div className="text-xs font-medium opacity-80">{sourceLabel} — {selectedSchool || "—"}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums"><MoneyLine totals={schoolTotal} currencyRows={currencies.rows} /></div>
        </div>
        <BreakdownCard title="Por actividad" rows={schoolByActivity} currencyRows={currencies.rows} textColor={activityColor} />

        {source === "total" && (
          <div className="mt-3">
            <BreakdownCard title="Comisiones — por actividad" rows={comisionSchoolByActivity} currencyRows={currencies.rows} textColor={activityColor} />
          </div>
        )}

        {(source === "total" || source === "companeros") && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">Pagos de compañeros — {selectedSchool || "—"} ({label})</h3>
            {colleagueByName.length === 0 ? (
              <p className="text-sm text-gray-400">Sin pagos de compañeros en este periodo para esta escuela.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {colleagueByName.map((r) => {
                  const netPositive = Object.values(r.totals).reduce((s, v) => s + v, 0) >= 0;
                  return (
                    <li key={r.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="text-gray-700">{r.key}</span>
                      <span className="font-semibold tabular-nums" style={{ color: netPositive ? GREEN : CORAL }}>
                        <MoneyLine totals={r.totals} currencyRows={currencies.rows} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {granularity === "mensual" && (
          <div className="mt-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              Calendario por escuela — {selectedSchool || "—"}
            </h3>
            <MonthCalendar
              year={year}
              month={unitIndex}
              entries={schoolEntries}
              dotColor={schoolColor(selectedSchool)}
              currencyRows={currencies.rows}
              activityColor={activityColor}
              detailed={source !== "total"}
              groupBySource={source === "total"}
              sourceMeta={SOURCE_META}
            />
          </div>
        )}
      </div>
    </div>
  );
}
