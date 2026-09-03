import { useState, useMemo, useEffect } from "react";
import { Plus, Pencil, X } from "lucide-react";
import { NAVY, TEAL } from "./App";
import { inputCls, formatMoney, Money, Field, Select, CurrencySearchSelect, MoneyInput, ListFilterBar, applyListFilters, colorFor, StatusPill, DeleteButton, DatePicker, EditActions, AppLoading, EntryTitle, useToast } from "./shared";
import { computeRateTotal } from "./rateCalc";

// schools / activities / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// commissionRates / comisiones: { rows: [...], insertRow, updateRow, deleteRow }
// accentColor: color de sección (nav_sections), para el botón flotante de crear
// appConfig: { rows: [...] } — para el icono de carga configurado, usado en el loading al dar de alta una tarifa al vuelo
// La moneda ya NO se elige aquí — se toma de la tarifa de comisión en Tarifas.
export default function ComisionesTab({ schools, activities, paymentStatuses, currencies, commissionRates, comisiones, appConfig, accentColor = TEAL, autoOpenSheet = false, onAutoOpened }) {
  const defaultStatus = paymentStatuses.rows.find((s) => s.is_default)?.name || paymentStatuses.rows[0]?.name || "Pending";
  const defaultSchool = schools.rows.find((s) => s.is_default)?.name || "";
  const defaultActivity = activities.rows.find((a) => a.is_default)?.name || "";
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";

  const emptyForm = () => ({
    date: new Date().toISOString().slice(0, 10),
    school: defaultSchool, activity: defaultActivity, people: 1, notes: "",
  });
  const [form, setForm] = useState(emptyForm);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Alta de tarifa de comisión al vuelo, cuando no existe una para la
  // escuela+actividad elegidas en el formulario de arriba.
  const [rateSheetOpen, setRateSheetOpen] = useState(false);
  const [rateForm, setRateForm] = useState(null);
  const [savingRate, setSavingRate] = useState(false);

  // Llegado desde el acceso directo de Home: abre la hoja de creación sola.
  useEffect(() => {
    if (autoOpenSheet) {
      setSheetOpen(true);
      onAutoOpened?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFilters] = useState({ from: "", to: "", school: "", activity: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const schoolNames = schools.rows.map((s) => s.name);
  const activityNames = activities.rows.map((a) => a.name);

  const rateFor = (school, activity) =>
    commissionRates.rows.find((r) => r.school === school && r.activity === activity);

  const activityColor = (name) => colorFor(activities.rows, name, "#6B7280");
  const schoolColor = (name) => colorFor(schools.rows, name, "#334155");

  const preview = useMemo(() => {
    const r = rateFor(form.school, form.activity);
    if (!r) return null;
    const total = computeRateTotal(r, form.people);
    return { rate: r.rate, total, currency: r.currency };
  }, [form, commissionRates.rows]);

  const toast = useToast();
  const disableSave = !form.date || !form.school || !form.activity || !preview;

  const addEntry = async () => {
    if (disableSave) return;
    try {
      await comisiones.insertRow({ ...form, people: Number(form.people) || 0, status: defaultStatus });
      setForm({ ...emptyForm(), school: form.school });
      setSheetOpen(false);
      toast?.success("Comisión añadida");
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  // Alta de tarifa de comisión al vuelo desde el aviso de "sin tarifa configurada".
  const openRateSheet = () => {
    setRateForm({
      school: form.school || defaultSchool,
      activity: form.activity || defaultActivity,
      // payment_type ya no se elige — se escribe fijo hasta que la migración
      // de ADR-0003 elimine la columna de la tabla.
      payment_type: "Per Person",
      currency: defaultCurrency,
      rate: "",
    });
    setRateSheetOpen(true);
  };
  const saveRate = async () => {
    if (!rateForm.school || !rateForm.activity || !rateForm.rate) return;
    setSavingRate(true);
    try {
      await commissionRates.insertRow({ ...rateForm, rate: Number(rateForm.rate) });
      setRateSheetOpen(false);
      toast?.success("Tarifa añadida");
    } catch {
      toast?.error("No se pudo guardar la tarifa. Inténtalo de nuevo.");
    } finally {
      setSavingRate(false);
    }
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    setEditForm({ date: e.date, school: e.school, activity: e.activity, people: e.people, notes: e.notes || "" });
  };
  const saveEdit = async () => {
    try {
      await comisiones.updateRow(editingId, { ...editForm, people: Number(editForm.people) || 0 });
      setEditingId(null);
      toast?.success("Cambios guardados");
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
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
                    <EditActions onSave={saveEdit} onCancel={() => setEditingId(null)} />
                  </div>
                </div>
              );
            }

            const r = rateFor(e.school, e.activity);
            const total = computeRateTotal(r, e.people);
            return (
              <div key={e.id} className="px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <EntryTitle school={e.school} activity={e.activity} schoolColor={schoolColor(e.school)} activityColor={activityColor(e.activity)} />
                  <StatusPill status={e.status} paymentStatusRows={paymentStatuses.rows} />
                </div>
                <div className="mt-2 truncate pl-3.5 text-xs text-gray-400">{e.date}{e.notes && ` · ${e.notes}`}</div>
                <div className="mt-2 flex flex-wrap items-center justify-end gap-2.5">
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
        onClick={() => { setForm(emptyForm()); setSheetOpen(true); }}
        className="fixed bottom-24 right-4 z-20 flex items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-90"
        style={{ backgroundColor: accentColor, width: 52, height: 52 }}
      >
        <Plus size={24} />
      </button>

      {sheetOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/25" onClick={() => setSheetOpen(false)}>
          <div
            className="max-h-[85dvh] w-full max-w-3xl overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl"
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
                  Tarifa: <b>{formatMoney(preview.rate, preview.currency, currencies.rows)}</b> →
                  {" "}Total: <b style={{ color: TEAL }}>{formatMoney(preview.total, preview.currency, currencies.rows)}</b>
                </span>
              ) : form.school && form.activity ? (
                <span className="text-amber-600">
                  Sin tarifa de comisión configurada —{" "}
                  <button type="button" onClick={openRateSheet} className="font-semibold underline underline-offset-2">
                    añadir tarifa
                  </button>.
                </span>
              ) : (
                <span>Elige escuela y actividad para ver el importe estimado.</span>
              )}
            </div>

            <button
              onClick={addEntry}
              disabled={disableSave}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={16} /> Guardar
            </button>
          </div>
        </div>
      )}

      {rateSheetOpen && rateForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25" onClick={() => !savingRate && setRateSheetOpen(false)}>
          <div
            className="max-h-[85dvh] w-full max-w-3xl overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Nueva tarifa de comisión</h3>
              <button onClick={() => setRateSheetOpen(false)} disabled={savingRate} className="text-gray-400" aria-label="Cerrar"><X size={19} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Field label="Escuela">
                <Select value={rateForm.school} onChange={(v) => setRateForm({ ...rateForm, school: v })} options={schoolNames} />
              </Field>
              <Field label="Actividad">
                <Select value={rateForm.activity} onChange={(v) => setRateForm({ ...rateForm, activity: v })} options={activityNames} />
              </Field>
              <Field label="Moneda">
                <CurrencySearchSelect value={rateForm.currency} onChange={(v) => setRateForm({ ...rateForm, currency: v })} currencyRows={currencies.rows} />
              </Field>
              <Field label="Tarifa">
                <MoneyInput value={rateForm.rate} onChange={(v) => setRateForm({ ...rateForm, rate: v })} />
              </Field>
            </div>

            <button
              onClick={saveRate}
              disabled={savingRate || !rateForm.school || !rateForm.activity || !rateForm.rate}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={16} /> Guardar
            </button>
          </div>
        </div>
      )}

      {savingRate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80">
          <AppLoading iconName={appConfig?.rows?.[0]?.logo_icon} color={accentColor} label="Guardando tarifa" />
        </div>
      )}
    </div>
  );
}
