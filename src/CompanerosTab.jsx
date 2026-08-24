import React, { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { NAVY, CORAL, GREEN } from "./App";
import { inputCls, formatMoney, Field, Select, CurrencySearchSelect, colorFor, StatusPill, ListFilterBar, applyListFilters } from "./shared";

// schools / activities / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// rates: { rows: [...] } — para filtrar actividades relevantes de cada escuela
// colleaguePayments: { rows: [...], insertRow, updateRow, deleteRow } — tabla colleague_payments
export default function CompanerosTab({ schools, activities, paymentStatuses, currencies, rates, colleaguePayments }) {
  const defaultSchool = schools.rows.find((s) => s.is_default)?.name || "";
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";
  const defaultStatus = paymentStatuses.rows.find((s) => s.is_default)?.name || paymentStatuses.rows[0]?.name || "Pending";

  const emptyForm = {
    date: new Date().toISOString().slice(0, 10),
    school: defaultSchool, activity: "", colleague_name: "", amount: "", currency: defaultCurrency, notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filters, setFilters] = useState({ from: "", to: "", school: "" });

  const schoolNames = schools.rows.map((s) => s.name);
  const allActivityNames = activities.rows.map((a) => a.name);
  const activityColor = (name) => colorFor(activities.rows, name, "#334155");

  // Actividades que realmente tienen tarifa configurada para la escuela elegida
  // (así el desplegable solo ofrece "actividades de la escuela", como pediste).
  const activitiesForSchool = (school) => {
    const names = [...new Set(rates.rows.filter((r) => r.school === school).map((r) => r.activity))];
    return names.length > 0 ? names : allActivityNames;
  };

  // Sugerencias de nombre de compañero ya usados con esa escuela (evita
  // typos que rompan el agrupado por nombre en el Resumen).
  const nameSuggestions = (school) =>
    [...new Set(colleaguePayments.rows.filter((p) => p.school === school).map((p) => p.colleague_name))];

  const addEntry = async () => {
    if (!form.date || !form.school || !form.activity || !form.colleague_name || form.amount === "") return;
    await colleaguePayments.insertRow({ ...form, amount: Number(form.amount), status: defaultStatus });
    setForm({ ...emptyForm, school: form.school, currency: form.currency });
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ date: p.date, school: p.school, activity: p.activity, colleague_name: p.colleague_name, amount: p.amount, currency: p.currency, notes: p.notes || "" });
  };
  const saveEdit = async () => {
    await colleaguePayments.updateRow(editingId, { ...editForm, amount: Number(editForm.amount) });
    setEditingId(null);
  };

  const filtered = useMemo(() => {
    const list = applyListFilters(colleaguePayments.rows, filters);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [colleaguePayments.rows, filters]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h3 className="mb-1 font-semibold text-slate-800">Nuevo pago de compañero</h3>
        <p className="mb-4 text-xs text-slate-400">Importe positivo si te paga a ti; negativo si le pagas tú a él/ella.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Fecha">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Escuela">
            <Select value={form.school} onChange={(v) => setForm({ ...form, school: v, activity: "" })} options={schoolNames} />
          </Field>
          <Field label="Actividad">
            <Select value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} options={activitiesForSchool(form.school)} />
          </Field>
          <Field label="Nombre">
            <input
              list="colleague-names"
              value={form.colleague_name}
              onChange={(e) => setForm({ ...form, colleague_name: e.target.value })}
              className={inputCls}
              placeholder="Ana, Marc..."
            />
            <datalist id="colleague-names">
              {nameSuggestions(form.school).map((n) => <option key={n} value={n} />)}
            </datalist>
          </Field>
          <Field label="Importe (puede ser negativo)">
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="90 ó -30" />
          </Field>
          <Field label="Moneda">
            <CurrencySearchSelect value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} currencyRows={currencies.rows} />
          </Field>
          <div className="col-span-2 sm:col-span-3">
            <Field label="Notas">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} placeholder="Opcional" />
            </Field>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={addEntry}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-transform active:scale-95"
            style={{ backgroundColor: NAVY }}
          >
            <Plus size={16} /> Añadir
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="px-5 py-3">
          <h3 className="font-semibold text-slate-800">Pagos ({filtered.length})</h3>
        </div>
        <ListFilterBar filters={filters} setFilters={setFilters} schoolOptions={schoolNames} />
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 && <p className="px-5 py-6 text-sm text-slate-400">Sin pagos con estos filtros.</p>}
          {filtered.map((p) => {
            const isEditing = editingId === p.id;

            if (isEditing) {
              return (
                <div key={p.id} className="grid grid-cols-2 gap-2 px-5 py-3 sm:grid-cols-6">
                  <input type="date" value={editForm.date} onChange={(ev) => setEditForm({ ...editForm, date: ev.target.value })} className={inputCls} />
                  <Select value={editForm.school} onChange={(v) => setEditForm({ ...editForm, school: v })} options={schoolNames} />
                  <Select value={editForm.activity} onChange={(v) => setEditForm({ ...editForm, activity: v })} options={activitiesForSchool(editForm.school)} />
                  <input value={editForm.colleague_name} onChange={(ev) => setEditForm({ ...editForm, colleague_name: ev.target.value })} className={inputCls} />
                  <input type="number" step="0.01" value={editForm.amount} onChange={(ev) => setEditForm({ ...editForm, amount: ev.target.value })} className={inputCls} />
                  <CurrencySearchSelect value={editForm.currency} onChange={(v) => setEditForm({ ...editForm, currency: v })} currencyRows={currencies.rows} />
                  <input value={editForm.notes} onChange={(ev) => setEditForm({ ...editForm, notes: ev.target.value })} placeholder="Notas" className={`${inputCls} col-span-2 sm:col-span-5`} />
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-700"><Check size={18} /></button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
                  </div>
                </div>
              );
            }

            const positive = Number(p.amount) >= 0;
            return (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <div className="w-24 shrink-0 text-slate-500">{p.date}</div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">
                    {p.school} - {p.colleague_name} - <span style={{ color: activityColor(p.activity) }}>{p.activity}</span>
                  </div>
                  {p.notes && <div className="text-xs text-slate-400">{p.notes}</div>}
                </div>
                <StatusPill status={p.status} paymentStatusRows={paymentStatuses.rows} />
                <div className="w-24 shrink-0 text-right font-semibold" style={{ color: positive ? GREEN : CORAL }}>
                  {positive ? "+" : ""}{formatMoney(p.amount, p.currency, currencies.rows)}
                </div>
                <button onClick={() => startEdit(p)} className="text-slate-300 hover:text-slate-600"><Pencil size={16} /></button>
                <button onClick={() => colleaguePayments.deleteRow(p.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
