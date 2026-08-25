import React, { useState, useMemo, useEffect } from "react";
import { Plus, Pencil, X } from "lucide-react";
import { TEAL, CORAL, GREEN } from "./App";
import { inputCls, formatMoney, Money, Field, Select, CurrencySearchSelect, colorFor, StatusPill, ListFilterBar, applyListFilters, DeleteButton, DatePicker, MoneyInput, EditActions, useToast } from "./shared";

// schools / activities / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// rates: { rows: [...] } — para filtrar actividades relevantes de cada escuela
// colleaguePayments: { rows: [...], insertRow, updateRow, deleteRow } — tabla colleague_payments
// accentColor: color de sección (nav_sections), para el botón flotante de crear
export default function CompanerosTab({ schools, activities, paymentStatuses, currencies, rates, colleaguePayments, accentColor = TEAL, autoOpenSheet = false, onAutoOpened }) {
  const defaultSchool = schools.rows.find((s) => s.is_default)?.name || "";
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";
  const defaultStatus = paymentStatuses.rows.find((s) => s.is_default)?.name || paymentStatuses.rows[0]?.name || "Pending";

  const emptyForm = {
    date: new Date().toISOString().slice(0, 10),
    school: defaultSchool, activity: "", colleague_name: "", amount: "", currency: defaultCurrency, notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filters, setFilters] = useState({ from: "", to: "", school: "" });
  const toast = useToast();

  // Llegado desde el acceso directo de Home: abre la hoja de creación sola.
  useEffect(() => {
    if (autoOpenSheet) {
      setSheetOpen(true);
      onAutoOpened?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    try {
      await colleaguePayments.insertRow({ ...form, amount: Number(form.amount), status: defaultStatus });
      setForm({ ...emptyForm, school: form.school, currency: form.currency });
      setSheetOpen(false);
      toast?.success("Pago añadido");
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ date: p.date, school: p.school, activity: p.activity, colleague_name: p.colleague_name, amount: p.amount, currency: p.currency, notes: p.notes || "" });
  };
  const saveEdit = async () => {
    try {
      await colleaguePayments.updateRow(editingId, { ...editForm, amount: Number(editForm.amount) });
      setEditingId(null);
      toast?.success("Cambios guardados");
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  const filtered = useMemo(() => {
    const list = applyListFilters(colleaguePayments.rows, filters);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [colleaguePayments.rows, filters]);

  return (
    <div className="relative space-y-4 pb-16">
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
                  <DatePicker value={editForm.date} onChange={(v) => setEditForm({ ...editForm, date: v })} />
                  <Select value={editForm.school} onChange={(v) => setEditForm({ ...editForm, school: v })} options={schoolNames} />
                  <Select value={editForm.activity} onChange={(v) => setEditForm({ ...editForm, activity: v })} options={activitiesForSchool(editForm.school)} />
                  <input value={editForm.colleague_name} onChange={(ev) => setEditForm({ ...editForm, colleague_name: ev.target.value })} className={inputCls} />
                  <MoneyInput value={editForm.amount} onChange={(v) => setEditForm({ ...editForm, amount: v })} />
                  <CurrencySearchSelect value={editForm.currency} onChange={(v) => setEditForm({ ...editForm, currency: v })} currencyRows={currencies.rows} />
                  <input value={editForm.notes} onChange={(ev) => setEditForm({ ...editForm, notes: ev.target.value })} placeholder="Notas" className={`${inputCls} col-span-2 sm:col-span-5`} />
                  <EditActions onSave={saveEdit} onCancel={() => setEditingId(null)} />
                </div>
              );
            }

            const positive = Number(p.amount) >= 0;
            return (
              <div key={p.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 truncate">
                    <span className="font-medium text-gray-800">{p.colleague_name}</span>
                    <span className="text-gray-400"> · {p.school} · </span>
                    <span style={{ color: activityColor(p.activity) }}>{p.activity}</span>
                  </div>
                  <StatusPill status={p.status} paymentStatusRows={paymentStatuses.rows} />
                </div>
                <div className="mt-0.5 truncate text-xs text-gray-400">{p.date}{p.notes && ` · ${p.notes}`}</div>
                <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2.5">
                  <span className="flex items-center font-semibold" style={{ color: positive ? GREEN : CORAL }}>
                    {positive ? "+" : "−"}
                    <Money amount={Math.abs(p.amount)} code={p.currency} currencyRows={currencies.rows} />
                  </span>
                  <button onClick={() => startEdit(p)} className="text-gray-300 hover:text-gray-600"><Pencil size={15} /></button>
                  <DeleteButton onConfirm={() => colleaguePayments.deleteRow(p.id)} itemLabel={`el pago de ${p.colleague_name}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => setSheetOpen(true)}
        aria-label="Nuevo pago de compañero"
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
              <h3 className="text-sm font-semibold text-gray-800">Nuevo pago de compañero</h3>
              <button onClick={() => setSheetOpen(false)} className="text-gray-400" aria-label="Cerrar"><X size={19} /></button>
            </div>
            <p className="mb-3 text-xs text-gray-400">Importe positivo si te paga a ti; negativo si le pagas tú a él/ella.</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Field label="Fecha">
                <DatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
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
                <MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} placeholder="90 ó -30" />
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
