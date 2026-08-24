import React, { useState, useMemo } from "react";
import { Plus, Pencil, Check, X } from "lucide-react";
import { NAVY, CORAL, GREEN } from "./App";
import { inputCls, formatMoney, Money, Field, Select, CurrencySearchSelect, colorFor, StatusPill, ListFilterBar, applyListFilters, DeleteButton } from "./shared";

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
  const activityColor = (name) => colorFor(activities.rows, name, "#6B7280");

  const activitiesForSchool = (school) => {
    const names = [...new Set(rates.rows.filter((r) => r.school === school).map((r) => r.activity))];
    return names.length > 0 ? names : allActivityNames;
  };

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
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-1 text-sm font-semibold text-gray-800">Nuevo pago de compañero</h3>
        <p className="mb-3 text-xs text-gray-400">Importe positivo si te paga a ti; negativo si le pagas tú a él/ella.</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Field label="Fecha">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={`${inputCls} w-full`} />
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
              className={`${inputCls} w-full`}
              placeholder="Ana, Marc..."
            />
            <datalist id="colleague-names">
              {nameSuggestions(form.school).map((n) => <option key={n} value={n} />)}
            </datalist>
          </Field>
          <Field label="Importe (puede ser negativo)">
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={`${inputCls} w-full`} placeholder="90 ó -30" />
          </Field>
          <Field label="Moneda">
            <CurrencySearchSelect value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} currencyRows={currencies.rows} />
          </Field>
          <div className="col-span-2 sm:col-span-3">
            <Field label="Notas">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputCls} w-full`} placeholder="Opcional" />
            </Field>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
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
          <h3 className="text-sm font-semibold text-gray-800">{filtered.length} pagos</h3>
        </div>
        <ListFilterBar filters={filters} setFilters={setFilters} schoolOptions={schoolNames} />
        <div className="divide-y divide-gray-100">
          {filtered.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">Sin pagos con estos filtros.</p>}
          {filtered.map((p) => {
            const isEditing = editingId === p.id;

            if (isEditing) {
              return (
                <div key={p.id} className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-6">
                  <input type="date" value={editForm.date} onChange={(ev) => setEditForm({ ...editForm, date: ev.target.value })} className={inputCls} />
                  <Select value={editForm.school} onChange={(v) => setEditForm({ ...editForm, school: v })} options={schoolNames} />
                  <Select value={editForm.activity} onChange={(v) => setEditForm({ ...editForm, activity: v })} options={activitiesForSchool(editForm.school)} />
                  <input value={editForm.colleague_name} onChange={(ev) => setEditForm({ ...editForm, colleague_name: ev.target.value })} className={inputCls} />
                  <input type="number" step="0.01" value={editForm.amount} onChange={(ev) => setEditForm({ ...editForm, amount: ev.target.value })} className={inputCls} />
                  <CurrencySearchSelect value={editForm.currency} onChange={(v) => setEditForm({ ...editForm, currency: v })} currencyRows={currencies.rows} />
                  <input value={editForm.notes} onChange={(ev) => setEditForm({ ...editForm, notes: ev.target.value })} placeholder="Notas" className={`${inputCls} col-span-2 sm:col-span-5`} />
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-700"><Check size={17} /></button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-red-500"><X size={17} /></button>
                  </div>
                </div>
              );
            }

            const positive = Number(p.amount) >= 0;
            return (
              <div key={p.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-medium text-gray-800">{p.colleague_name}</span>
                    <span className="text-gray-400"> · {p.school} · </span>
                    <span style={{ color: activityColor(p.activity) }}>{p.activity}</span>
                    <div className="text-xs text-gray-400">{p.date}{p.notes && ` · ${p.notes}`}</div>
                  </div>
                  <StatusPill status={p.status} paymentStatusRows={paymentStatuses.rows} />
                </div>
                <div className="mt-1.5 flex items-center justify-end gap-3">
                  <span className="flex items-center font-semibold" style={{ color: positive ? GREEN : CORAL }}>
                    {positive ? "+" : "−"}
                    <Money amount={Math.abs(p.amount)} code={p.currency} currencyRows={currencies.rows} />
                  </span>
                  <button onClick={() => startEdit(p)} className="text-gray-300 hover:text-gray-600"><Pencil size={15} /></button>
                  <DeleteButton onConfirm={() => colleaguePayments.deleteRow(p.id)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
