import React, { useState, useMemo } from "react";
import { Plus, Pencil, Check, X } from "lucide-react";
import { NAVY, TEAL } from "./App";
import { inputCls, formatMoney, Money, Field, Select, CurrencySearchSelect, ListFilterBar, applyListFilters, colorFor, StatusPill, DeleteButton } from "./shared";

// schools / activities / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// rates / worklog: { rows: [...], insertRow, updateRow, deleteRow }
export default function WorkLogTab({ schools, activities, paymentStatuses, currencies, rates, worklog }) {
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";
  const defaultStatus = paymentStatuses.rows.find((s) => s.is_default)?.name || paymentStatuses.rows[0]?.name || "Pending";
  const defaultSchool = schools.rows.find((s) => s.is_default)?.name || "";
  const defaultActivity = activities.rows.find((a) => a.is_default)?.name || "";

  const emptyForm = {
    date: new Date().toISOString().slice(0, 10),
    school: defaultSchool, activity: defaultActivity, currency: defaultCurrency, people: 1, notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filters, setFilters] = useState({ from: "", to: "", school: "", activity: "" });

  const schoolNames = schools.rows.map((s) => s.name);
  const activityNames = activities.rows.map((a) => a.name);

  const rateFor = (school, activity) =>
    rates.rows.find((r) => r.school === school && r.activity === activity);

  const activityColor = (name) => colorFor(activities.rows, name, "#6B7280");

  const preview = useMemo(() => {
    const r = rateFor(form.school, form.activity);
    if (!r) return null;
    const total = r.payment_type === "Per Person" ? r.rate * (Number(form.people) || 0) : r.rate;
    return { rate: r.rate, paymentType: r.payment_type, total };
  }, [form, rates.rows]);

  const addEntry = async () => {
    if (!form.date || !form.school || !form.activity) return;
    await worklog.insertRow({ ...form, people: Number(form.people) || 0, status: defaultStatus });
    setForm({ ...emptyForm, school: form.school, currency: form.currency });
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    setEditForm({ date: e.date, school: e.school, activity: e.activity, currency: e.currency, people: e.people, notes: e.notes || "" });
  };
  const saveEdit = async () => {
    await worklog.updateRow(editingId, { ...editForm, people: Number(editForm.people) || 0 });
    setEditingId(null);
  };

  const sorted = [...worklog.rows].sort((a, b) => b.date.localeCompare(a.date));
  const filteredSorted = applyListFilters(sorted, filters);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Nueva entrada</h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Field label="Fecha">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={`${inputCls} w-full`} />
          </Field>
          <Field label="Escuela">
            <Select value={form.school} onChange={(v) => setForm({ ...form, school: v })} options={schoolNames} />
          </Field>
          <Field label="Actividad">
            <Select value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} options={activityNames} />
          </Field>
          <Field label="Nº personas">
            <input type="number" min={0} value={form.people} onChange={(e) => setForm({ ...form, people: e.target.value })} className={`${inputCls} w-full`} />
          </Field>
          <Field label="Moneda">
            <CurrencySearchSelect value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} currencyRows={currencies.rows} />
          </Field>
          <Field label="Notas">
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputCls} w-full`} placeholder="Opcional" />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2.5">
          <div className="text-xs text-gray-600">
            {preview ? (
              <span>
                Tarifa: <b>{formatMoney(preview.rate, form.currency, currencies.rows)}</b> ({preview.paymentType}) →
                {" "}Total: <b style={{ color: TEAL }}>{formatMoney(preview.total, form.currency, currencies.rows)}</b>
              </span>
            ) : form.school && form.activity ? (
              <span className="text-amber-600">Sin tarifa configurada — ve a Tarifas para añadirla.</span>
            ) : (
              <span>Elige escuela y actividad para ver el importe estimado.</span>
            )}
          </div>
          <button
            onClick={addEntry}
            className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: NAVY }}
          >
            <Plus size={15} /> Añadir
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">{filteredSorted.length} registros</h3>
        </div>
        <ListFilterBar filters={filters} setFilters={setFilters} schoolOptions={schoolNames} activityOptions={activityNames} />
        <div className="divide-y divide-gray-100">
          {filteredSorted.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">Sin registros con estos filtros.</p>}
          {filteredSorted.map((e) => {
            const isEditing = editingId === e.id;

            if (isEditing) {
              return (
                <div key={e.id} className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-6">
                  <input type="date" value={editForm.date} onChange={(ev) => setEditForm({ ...editForm, date: ev.target.value })} className={`${inputCls} col-span-2 sm:col-span-1`} />
                  <Select value={editForm.school} onChange={(v) => setEditForm({ ...editForm, school: v })} options={schoolNames} />
                  <Select value={editForm.activity} onChange={(v) => setEditForm({ ...editForm, activity: v })} options={activityNames} />
                  <input type="number" value={editForm.people} onChange={(ev) => setEditForm({ ...editForm, people: ev.target.value })} className={inputCls} />
                  <CurrencySearchSelect value={editForm.currency} onChange={(v) => setEditForm({ ...editForm, currency: v })} currencyRows={currencies.rows} />
                  <input value={editForm.notes} onChange={(ev) => setEditForm({ ...editForm, notes: ev.target.value })} placeholder="Notas" className={`${inputCls} col-span-2 sm:col-span-5`} />
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-700"><Check size={17} /></button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-red-500"><X size={17} /></button>
                  </div>
                </div>
              );
            }

            const r = rateFor(e.school, e.activity);
            const total = r ? (r.payment_type === "Per Person" ? r.rate * e.people : r.rate) : 0;
            return (
              <div key={e.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-medium" style={{ color: activityColor(e.activity) }}>{e.activity}</span>
                    <span className="text-gray-400"> · {e.school}</span>
                    <div className="text-xs text-gray-400">{e.date}{e.notes && ` · ${e.notes}`}</div>
                  </div>
                  <StatusPill status={e.status} paymentStatusRows={paymentStatuses.rows} />
                </div>
                <div className="mt-1.5 flex items-center justify-end gap-3">
                  <span className="text-xs text-gray-400">{e.people}p</span>
                  <Money amount={total} code={e.currency} currencyRows={currencies.rows} className="font-semibold" style={{ color: NAVY }} />
                  <button onClick={() => startEdit(e)} className="text-gray-300 hover:text-gray-600"><Pencil size={15} /></button>
                  <DeleteButton onConfirm={() => worklog.deleteRow(e.id)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
