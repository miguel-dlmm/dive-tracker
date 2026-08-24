import React, { useState, useMemo } from "react";
import { Plus, Pencil, Check, X } from "lucide-react";
import { NAVY, TEAL } from "./App";
import { inputCls, formatMoney, Money, Field, Select, ListFilterBar, applyListFilters, colorFor, StatusPill, DeleteButton, DatePicker } from "./shared";

// schools / activities / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// commissionRates / comisiones: { rows: [...], insertRow, updateRow, deleteRow }
// accentColor: color de sección (nav_sections), para el botón flotante de crear
// La moneda ya NO se elige aquí — se toma de la tarifa de comisión en Tarifas.
export default function ComisionesTab({ schools, activities, paymentStatuses, currencies, commissionRates, comisiones, accentColor = TEAL }) {
  const defaultStatus = paymentStatuses.rows.find((s) => s.is_default)?.name || paymentStatuses.rows[0]?.name || "Pending";
  const defaultSchool = schools.rows.find((s) => s.is_default)?.name || "";
  const defaultActivity = activities.rows.find((a) => a.is_default)?.name || "";

  const emptyForm = {
    date: new Date().toISOString().slice(0, 10),
    school: defaultSchool, activity: defaultActivity, people: 1, notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ from: "", to: "", school: "", activity: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const schoolNames = schools.rows.map((s) => s.name);
  const activityNames = activities.rows.map((a) => a.name);

  const rateFor = (school, activity) =>
    commissionRates.rows.find((r) => r.school === school && r.activity === activity);

  const activityColor = (name) => colorFor(activities.rows, name, "#6B7280");

  const preview = useMemo(() => {
    const r = rateFor(form.school, form.activity);
    if (!r) return null;
    const total = r.payment_type === "Per Person" ? r.rate * (Number(form.people) || 0) : r.rate;
    return { rate: r.rate, paymentType: r.payment_type, total, currency: r.currency };
  }, [form, commissionRates.rows]);

  const addEntry = async () => {
    if (!form.date || !form.school || !form.activity) return;
    await comisiones.insertRow({ ...form, people: Number(form.people) || 0, status: defaultStatus });
    setForm({ ...emptyForm, school: form.school });
    setSheetOpen(false);
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    setEditForm({ date: e.date, school: e.school, activity: e.activity, people: e.people, notes: e.notes || "" });
  };
  const saveEdit = async () => {
    await comisiones.updateRow(editingId, { ...editForm, people: Number(editForm.people) || 0 });
    setEditingId(null);
  };

  const sorted = [...comisiones.rows].sort((a, b) => b.date.localeCompare(a.date));
  const filteredSorted = applyListFilters(sorted, filters);

  return (
    <div className="relative space-y-4 pb-16">
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">{filteredSorted.length} comisiones</h3>
        </div>
        <ListFilterBar filters={filters} setFilters={setFilters} schoolOptions={schoolNames} activityOptions={activityNames} />
        <div className="divide-y divide-gray-100">
          {filteredSorted.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">Sin comisiones con estos filtros.</p>}
          {filteredSorted.map((e) => {
            const isEditing = editingId === e.id;

            if (isEditing) {
              return (
                <div key={e.id} className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-5">
                  <div className="col-span-2 sm:col-span-1"><DatePicker value={editForm.date} onChange={(v) => setEditForm({ ...editForm, date: v })} /></div>
                  <Select value={editForm.school} onChange={(v) => setEditForm({ ...editForm, school: v })} options={schoolNames} />
                  <Select value={editForm.activity} onChange={(v) => setEditForm({ ...editForm, activity: v })} options={activityNames} />
                  <input type="number" value={editForm.people} onChange={(ev) => setEditForm({ ...editForm, people: ev.target.value })} className={inputCls} />
                  <input value={editForm.notes} onChange={(ev) => setEditForm({ ...editForm, notes: ev.target.value })} placeholder="Notas" className={`${inputCls} col-span-2 sm:col-span-4`} />
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
                  <div className="min-w-0 truncate font-medium text-gray-800">
                    {e.school} - <span style={{ color: activityColor(e.activity) }}>{e.activity}</span>
                  </div>
                  <StatusPill status={e.status} paymentStatusRows={paymentStatuses.rows} />
                </div>
                <div className="mt-0.5 truncate text-xs text-gray-400">{e.date}{e.notes && ` · ${e.notes}`}</div>
                <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2.5">
                  <span className="text-xs text-gray-400">{e.people}p</span>
                  <Money amount={total} code={r?.currency} currencyRows={currencies.rows} className="font-semibold" style={{ color: NAVY }} />
                  <button onClick={() => startEdit(e)} className="text-gray-300 hover:text-gray-600"><Pencil size={15} /></button>
                  <DeleteButton onConfirm={() => comisiones.deleteRow(e.id)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 right-4 z-20 flex items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-90"
        style={{ backgroundColor: accentColor, width: 52, height: 52 }}
      >
        <Plus size={24} />
      </button>

      {sheetOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/25" onClick={() => setSheetOpen(false)}>
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Nuevo cliente referido</h3>
              <button onClick={() => setSheetOpen(false)} className="text-gray-400"><X size={19} /></button>
            </div>
            <p className="mb-3 text-xs text-gray-400">Un contacto tuyo que fue a gastar a la escuela — la actividad es la que hizo esa persona, no algo que impartieras tú.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Field label="Fecha">
                <DatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
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
              <div className="col-span-2 sm:col-span-3">
                <Field label="Notas">
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputCls} w-full`} placeholder="Opcional" />
                </Field>
              </div>
            </div>

            <div className="mt-3 rounded-md bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
              {preview ? (
                <span>
                  Tarifa: <b>{formatMoney(preview.rate, preview.currency, currencies.rows)}</b> ({preview.paymentType}) →
                  {" "}Total: <b style={{ color: TEAL }}>{formatMoney(preview.total, preview.currency, currencies.rows)}</b>
                </span>
              ) : form.school && form.activity ? (
                <span className="text-amber-600">Sin tarifa de comisión configurada — ve a Tarifas para añadirla.</span>
              ) : (
                <span>Elige escuela y actividad para ver el importe estimado.</span>
              )}
            </div>

            <button
              onClick={addEntry}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={16} /> Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
