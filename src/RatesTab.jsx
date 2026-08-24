import React, { useState, useMemo } from "react";
import { Plus, Pencil, Check, X, Search } from "lucide-react";
import { NAVY, TEAL } from "./App";
import { inputCls, Select, Field, colorFor, DeleteButton, Money, CurrencySearchSelect, MoneyInput } from "./shared";

// schools / activities / paymentTypes / currencies: { rows: [...] } — de useSupabaseTable
// rates / commissionRates: { rows, insertRow, updateRow, deleteRow }
export default function RatesTab({ schools, activities, paymentTypes, currencies, rates, commissionRates }) {
  const [mode, setMode] = useState("instructor"); // "instructor" | "comision"
  const table = mode === "instructor" ? rates : commissionRates;
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";

  const [form, setForm] = useState({ school: "", activity: "", payment_type: "", currency: defaultCurrency, rate: "" });
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ school: "", activity: "", payment_type: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const schoolNames = schools.rows.map((s) => s.name);
  const activityNames = activities.rows.map((a) => a.name);
  const paymentTypeNames = paymentTypes.rows.map((t) => t.name);
  const activityColor = (name) => colorFor(activities.rows, name, "#374151");

  const presentValues = (key) => [...new Set(table.rows.map((r) => r[key]).filter(Boolean))].sort();

  const filtered = useMemo(() => {
    let list = table.rows;
    if (filters.school) list = list.filter((r) => r.school === filters.school);
    if (filters.activity) list = list.filter((r) => r.activity === filters.activity);
    if (filters.payment_type) list = list.filter((r) => r.payment_type === filters.payment_type);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => [r.school, r.activity, r.payment_type].some((v) => String(v ?? "").toLowerCase().includes(q)));
    }
    return list;
  }, [table.rows, query, filters]);

  const addRate = async () => {
    if (!form.school || !form.activity || !form.payment_type || !form.rate) return;
    await table.insertRow({ ...form, rate: Number(form.rate) });
    setForm({ ...form, rate: "" });
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditForm({ school: r.school, activity: r.activity, payment_type: r.payment_type, currency: r.currency, rate: r.rate });
  };
  const saveEdit = async () => {
    await table.updateRow(editingId, { ...editForm, rate: Number(editForm.rate) });
    setEditingId(null);
  };

  return (
    <div className="space-y-5">
      <div className="inline-flex gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
        {[["instructor", "Instructor"], ["comision", "Comisión"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setMode(key); setFilters({ school: "", activity: "", payment_type: "" }); setEditingId(null); }}
            className="rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors"
            style={mode === key ? { backgroundColor: TEAL, color: "white" } : { color: "#6B7280" }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-3 text-xs text-gray-400">
          {mode === "instructor"
            ? "Lo que cobras por impartir tú la actividad."
            : "Lo que cobras por traer un cliente que hace esta actividad con otra persona."}
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <Select value={form.school} onChange={(v) => setForm({ ...form, school: v })} options={schoolNames} placeholder="Escuela" />
          <Select value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} options={activityNames} placeholder="Actividad" />
          <Select value={form.payment_type} onChange={(v) => setForm({ ...form, payment_type: v })} options={paymentTypeNames} placeholder="Tipo de pago" />
          <CurrencySearchSelect value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} currencyRows={currencies.rows} />
          <div className="flex gap-2">
            <MoneyInput placeholder="Tarifa" value={form.rate} onChange={(v) => setForm({ ...form, rate: v })} />
            <button onClick={addRate} className="flex shrink-0 items-center justify-center rounded-lg px-3 text-white" style={{ backgroundColor: TEAL }}><Plus size={16} /></button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold" style={{ color: NAVY }}>{filtered.length} tarifas</h3>
          <div className="relative w-32">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-2.5 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" className={`${inputCls} w-full pl-7 text-xs`} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
          <div className="w-28"><Select value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })} options={presentValues("school")} placeholder="Escuela" /></div>
          <div className="w-28"><Select value={filters.activity} onChange={(v) => setFilters({ ...filters, activity: v })} options={presentValues("activity")} placeholder="Actividad" /></div>
          <div className="w-28"><Select value={filters.payment_type} onChange={(v) => setFilters({ ...filters, payment_type: v })} options={presentValues("payment_type")} placeholder="Pago" /></div>
        </div>

        <div className="divide-y divide-gray-100">
          {filtered.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">Sin resultados.</p>}
          {filtered.map((r) => {
            const isEditing = editingId === r.id;
            if (isEditing) {
              return (
                <div key={r.id} className="space-y-2 px-4 py-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={editForm.school} onChange={(v) => setEditForm({ ...editForm, school: v })} options={schoolNames} />
                    <Select value={editForm.activity} onChange={(v) => setEditForm({ ...editForm, activity: v })} options={activityNames} />
                    <Select value={editForm.payment_type} onChange={(v) => setEditForm({ ...editForm, payment_type: v })} options={paymentTypeNames} />
                    <CurrencySearchSelect value={editForm.currency} onChange={(v) => setEditForm({ ...editForm, currency: v })} currencyRows={currencies.rows} />
                    <MoneyInput value={editForm.rate} onChange={(v) => setEditForm({ ...editForm, rate: v })} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={saveEdit} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: TEAL }}><Check size={13} /> Guardar</button>
                    <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500">Cancelar</button>
                  </div>
                </div>
              );
            }
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-gray-800">
                    {r.school} - <span style={{ color: activityColor(r.activity) }}>{r.activity}</span>
                  </div>
                  <div className="text-xs text-gray-400">{r.payment_type}</div>
                </div>
                <Money amount={r.rate} code={r.currency} currencyRows={currencies.rows} className="shrink-0 font-semibold" style={{ color: NAVY }} />
                <button onClick={() => startEdit(r)} className="shrink-0 text-gray-300 hover:text-gray-600"><Pencil size={15} /></button>
                <DeleteButton onConfirm={() => table.deleteRow(r.id)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
