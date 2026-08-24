import React, { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { NAVY, TEAL } from "./App";
import { inputCls, formatMoney, Field, Select, CurrencySearchSelect, ListFilterBar, applyListFilters, colorFor, StatusPill } from "./shared";

// schools / activities / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// commissionRates / comisiones: { rows: [...], insertRow, updateRow, deleteRow }
export default function ComisionesTab({ schools, activities, paymentStatuses, currencies, commissionRates, comisiones }) {
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";
  const defaultStatus = paymentStatuses.rows.find((s) => s.is_default)?.name || paymentStatuses.rows[0]?.name || "Pending";
  const defaultSchool = schools.rows.find((s) => s.is_default)?.name || "";
  const defaultActivity = activities.rows.find((a) => a.is_default)?.name || "";

  const emptyForm = {
    date: new Date().toISOString().slice(0, 10),
    school: defaultSchool, activity: defaultActivity, currency: defaultCurrency, people: 1, notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ from: "", to: "", school: "", activity: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const schoolNames = schools.rows.map((s) => s.name);
  const activityNames = activities.rows.map((a) => a.name);

  const rateFor = (school, activity) =>
    commissionRates.rows.find((r) => r.school === school && r.activity === activity);

  const activityColor = (name) => colorFor(activities.rows, name, "#94A3B8");

  const preview = useMemo(() => {
    const r = rateFor(form.school, form.activity);
    if (!r) return null;
    const total = r.payment_type === "Per Person" ? r.rate * (Number(form.people) || 0) : r.rate;
    return { rate: r.rate, paymentType: r.payment_type, total };
  }, [form, commissionRates.rows]);

  const addEntry = async () => {
    if (!form.date || !form.school || !form.activity) return;
    await comisiones.insertRow({ ...form, people: Number(form.people) || 0, status: defaultStatus });
    setForm({ ...emptyForm, school: form.school, currency: form.currency });
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    setEditForm({ date: e.date, school: e.school, activity: e.activity, currency: e.currency, people: e.people, notes: e.notes || "" });
  };
  const saveEdit = async () => {
    await comisiones.updateRow(editingId, { ...editForm, people: Number(editForm.people) || 0 });
    setEditingId(null);
  };

  const sorted = [...comisiones.rows].sort((a, b) => b.date.localeCompare(a.date));
  const filteredSorted = applyListFilters(sorted, filters);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h3 className="mb-1 font-semibold text-slate-800">Nuevo cliente referido</h3>
        <p className="mb-4 text-xs text-slate-400">Un contacto tuyo que fue a gastar a la escuela — la actividad es la que hizo esa persona, no algo que impartieras tú.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Fecha">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Escuela">
            <Select value={form.school} onChange={(v) => setForm({ ...form, school: v })} options={schoolNames} />
          </Field>
          <Field label="Actividad">
            <Select value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} options={activityNames} />
          </Field>
          <Field label="Nº personas">
            <input type="number" min={0} value={form.people} onChange={(e) => setForm({ ...form, people: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Moneda">
            <CurrencySearchSelect value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} currencyRows={currencies.rows} />
          </Field>
          <Field label="Notas">
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} placeholder="Opcional" />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-sm text-slate-600">
            {preview ? (
              <span>
                Tarifa: <b>{formatMoney(preview.rate, form.currency, currencies.rows)}</b> ({preview.paymentType}) →
                {" "}Total: <b style={{ color: TEAL }}>{formatMoney(preview.total, form.currency, currencies.rows)}</b>
              </span>
            ) : form.school && form.activity ? (
              <span className="text-amber-600">Sin tarifa de comisión configurada para esta combinación — ve a Tarifas para añadirla.</span>
            ) : (
              <span>Elige escuela y actividad para ver el importe estimado.</span>
            )}
          </div>
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
          <h3 className="font-semibold text-slate-800">Comisiones ({filteredSorted.length})</h3>
        </div>
        <ListFilterBar filters={filters} setFilters={setFilters} schoolOptions={schoolNames} activityOptions={activityNames} />
        <div className="divide-y divide-slate-100">
          {filteredSorted.length === 0 && <p className="px-5 py-6 text-sm text-slate-400">Sin comisiones con estos filtros.</p>}
          {filteredSorted.map((e) => {
            const isEditing = editingId === e.id;

            if (isEditing) {
              return (
                <div key={e.id} className="grid grid-cols-2 gap-2 px-5 py-3 sm:grid-cols-6">
                  <input type="date" value={editForm.date} onChange={(ev) => setEditForm({ ...editForm, date: ev.target.value })} className={`${inputCls} col-span-2 sm:col-span-1`} />
                  <Select value={editForm.school} onChange={(v) => setEditForm({ ...editForm, school: v })} options={schoolNames} />
                  <Select value={editForm.activity} onChange={(v) => setEditForm({ ...editForm, activity: v })} options={activityNames} />
                  <input type="number" value={editForm.people} onChange={(ev) => setEditForm({ ...editForm, people: ev.target.value })} className={inputCls} />
                  <CurrencySearchSelect value={editForm.currency} onChange={(v) => setEditForm({ ...editForm, currency: v })} currencyRows={currencies.rows} />
                  <input value={editForm.notes} onChange={(ev) => setEditForm({ ...editForm, notes: ev.target.value })} placeholder="Notas" className={`${inputCls} col-span-2 sm:col-span-5`} />
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-700"><Check size={18} /></button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
                  </div>
                </div>
              );
            }

            const r = rateFor(e.school, e.activity);
            const total = r ? (r.payment_type === "Per Person" ? r.rate * e.people : r.rate) : 0;
            return (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <div className="w-24 shrink-0 text-slate-500">{e.date}</div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">
                    {e.school} - <span style={{ color: activityColor(e.activity) }}>{e.activity}</span>
                  </div>
                  {e.notes && <div className="text-xs text-slate-400">{e.notes}</div>}
                </div>
                <StatusPill status={e.status} paymentStatusRows={paymentStatuses.rows} />
                <div className="shrink-0 text-right">
                  <div className="text-xs text-slate-400">{e.people} pers.</div>
                  <div className="font-semibold" style={{ color: NAVY }}>{formatMoney(total, e.currency, currencies.rows)}</div>
                </div>
                <button onClick={() => startEdit(e)} className="text-slate-300 hover:text-slate-600">
                  <Pencil size={16} />
                </button>
                <button onClick={() => comisiones.deleteRow(e.id)} className="text-slate-300 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
