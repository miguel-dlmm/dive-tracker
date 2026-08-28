import React, { useState, useMemo } from "react";
import { Plus, Pencil, X, Search, SlidersHorizontal } from "lucide-react";
import { NAVY, TEAL } from "./App";
import { inputCls, Select, MultiSelect, Field, colorFor, DeleteButton, Money, CurrencySearchSelect, MoneyInput, EditActions, EntryTitle, useToast, useBodyScrollLock } from "./shared";

// schools / activities / paymentTypes / currencies: { rows: [...] } — de useSupabaseTable
// rates / commissionRates: { rows, insertRow, updateRow, deleteRow }
// worklog / comisiones: { rows: [...] } — para comprobar si una tarifa está en uso antes de dejar borrarla
// accentColor: color de sección (nav_sections), para el botón flotante de crear
export default function RatesTab({ schools, activities, paymentTypes, currencies, rates, commissionRates, worklog, comisiones, accentColor = TEAL }) {
  const [mode, setMode] = useState("instructor"); // "instructor" | "comision"
  const table = mode === "instructor" ? rates : commissionRates;
  const entriesForMode = mode === "instructor" ? worklog.rows : comisiones.rows;
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";
  // El tipo de pago ya no se elige en ningún formulario — toda tarifa nueva
  // se crea como "Per Person" (si no existe esa fila en payment_types, cae
  // al is_default de la tabla y, si tampoco hay, al primero).
  // WORKAROUND TEMPORAL (ver docs/BACKLOG.md y docs/ADR/0003): una cuenta
  // nueva nace con payment_types vacío (clone_setup_dataset no lo siembra),
  // así que sin este último fallback a "Per Person" el guardado de tarifa
  // queda bloqueado para todo instructor recién dado de alta. payment_type
  // como concepto está aprobado para eliminarse (ADR-0003) — este fallback
  // desaparece con esa migración, no antes.
  const defaultPaymentType = paymentTypes.rows.find((t) => t.name === "Per Person")?.name || paymentTypes.rows.find((t) => t.is_default)?.name || paymentTypes.rows[0]?.name || "Per Person";
  const toast = useToast();

  const emptyForm = { school: "", activity: "", payment_type: defaultPaymentType, currency: defaultCurrency, rate: "" };
  const [form, setForm] = useState(emptyForm);
  const [sheetOpen, setSheetOpen] = useState(false);
  useBodyScrollLock(sheetOpen);
  const [query, setQuery] = useState("");
  // Filtros colapsables detrás de un botón "Filtrar" (mismo patrón que Mi
  // trabajo, ver filtersOpen/activeFilterCount en MiTrabajoTab.jsx) en vez
  // de mostrarlos siempre — coherencia con la pantalla que más se parece a
  // esta en el resto de la app.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ school: "", activity: [], payment_type: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const schoolNames = schools.rows.map((s) => s.name);
  const activityNames = activities.rows.map((a) => a.name);
  const activityColor = (name) => colorFor(activities.rows, name, "#374151");
  const schoolColor = (name) => colorFor(schools.rows, name, "#334155");

  const presentValues = (key) => [...new Set(table.rows.map((r) => r[key]).filter(Boolean))].sort();
  const hasFilters = filters.school || (filters.activity && filters.activity.length > 0) || filters.payment_type;
  const activeFilterCount = [Boolean(filters.school), filters.activity.length > 0, Boolean(filters.payment_type)].filter(Boolean).length;

  const filtered = useMemo(() => {
    let list = table.rows;
    if (filters.school) list = list.filter((r) => r.school === filters.school);
    if (filters.activity && filters.activity.length > 0) list = list.filter((r) => filters.activity.includes(r.activity));
    if (filters.payment_type) list = list.filter((r) => r.payment_type === filters.payment_type);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => [r.school, r.activity, r.payment_type].some((v) => String(v ?? "").toLowerCase().includes(q)));
    }
    return list;
  }, [table.rows, query, filters]);

  const addRate = async () => {
    if (!form.school || !form.activity || !form.payment_type || !form.rate) return;
    try {
      await table.insertRow({ ...form, rate: Number(form.rate) });
      setForm({ ...emptyForm, currency: form.currency });
      setSheetOpen(false);
      toast?.success("Tarifa añadida");
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditForm({ school: r.school, activity: r.activity, payment_type: r.payment_type, currency: r.currency, rate: r.rate });
  };
  const saveEdit = async () => {
    try {
      await table.updateRow(editingId, { ...editForm, rate: Number(editForm.rate) });
      setEditingId(null);
      toast?.success("Cambios guardados");
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  // Antes de borrar, comprobamos que ningún registro/comisión ya guardado
  // dependa de esta tarifa — si se borrara igualmente, esas filas se
  // quedarían sin tarifa que las emparejara y mostrarían 0,00 sin avisar.
  const deleteRate = async (r) => {
    const inUse = entriesForMode.filter((e) => e.school === r.school && e.activity === r.activity).length;
    if (inUse > 0) {
      throw new Error(`No se puede eliminar: hay ${inUse} ${inUse === 1 ? "registro que usa" : "registros que usan"} esta tarifa.`);
    }
    await table.deleteRow(r.id);
  };

  return (
    <div className="relative space-y-4 pb-16">
      <div className="inline-flex gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
        {[["instructor", "Instructor"], ["comision", "Comisión"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setMode(key); setFilters({ school: "", activity: [], payment_type: "" }); setEditingId(null); }}
            className="min-h-11 rounded-md px-3.5 text-sm font-medium transition-colors"
            style={mode === key ? { backgroundColor: TEAL, color: "white" } : { color: "#6B7280" }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className={`flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors ${filtersOpen ? "border-transparent text-white" : "border-gray-200 bg-white text-gray-600"}`}
          style={filtersOpen ? { backgroundColor: TEAL } : {}}
        >
          <SlidersHorizontal size={15} aria-hidden="true" /> Filtrar{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </button>
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-3.5 text-gray-400" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" aria-label="Buscar tarifa" className={`${inputCls} w-full pl-9`} />
        </div>
      </div>

      {filtersOpen && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Escuela"><Select value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })} options={presentValues("school")} placeholder="Todas" /></Field>
            <Field label="Curso"><MultiSelect value={filters.activity} onChange={(v) => setFilters({ ...filters, activity: v })} options={presentValues("activity")} placeholder="Todos" /></Field>
            <Field label="Pago"><Select value={filters.payment_type} onChange={(v) => setFilters({ ...filters, payment_type: v })} options={presentValues("payment_type")} placeholder="Todos" /></Field>
          </div>
          {hasFilters && (
            <button onClick={() => setFilters({ school: "", activity: [], payment_type: "" })} className="min-h-9 text-xs font-medium text-gray-400 hover:text-gray-600">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold" style={{ color: NAVY }}>{filtered.length} tarifas</h3>
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
                    <CurrencySearchSelect value={editForm.currency} onChange={(v) => setEditForm({ ...editForm, currency: v })} currencyRows={currencies.rows} />
                    <MoneyInput value={editForm.rate} onChange={(v) => setEditForm({ ...editForm, rate: v })} />
                  </div>
                  <EditActions onSave={saveEdit} onCancel={() => setEditingId(null)} />
                </div>
              );
            }
            return (
              <div key={r.id} className="px-4 py-3 text-sm">
                <EntryTitle school={r.school} activity={r.activity} schoolColor={schoolColor(r.school)} activityColor={activityColor(r.activity)} />
                <div className="mt-2 truncate pl-3.5 text-xs text-gray-400">{r.payment_type}</div>
                <div className="mt-2 flex items-center justify-end gap-2.5">
                  <Money amount={r.rate} code={r.currency} currencyRows={currencies.rows} className="font-semibold" style={{ color: NAVY }} />
                  <button onClick={() => startEdit(r)} aria-label="Editar tarifa" className="text-gray-300 hover:text-gray-600"><Pencil size={15} /></button>
                  <DeleteButton onConfirm={() => deleteRate(r)} itemLabel={`la tarifa de ${r.school} - ${r.activity}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => setSheetOpen(true)}
        aria-label="Nueva tarifa"
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
              <h3 className="text-sm font-semibold text-gray-800">Nueva tarifa de {mode === "instructor" ? "Instructor" : "Comisión"}</h3>
              <button onClick={() => setSheetOpen(false)} className="text-gray-400" aria-label="Cerrar"><X size={19} /></button>
            </div>
            <p className="mb-3 text-xs text-gray-400">
              {mode === "instructor"
                ? "Lo que cobras por impartir tú el curso."
                : "Lo que cobras por traer un cliente que hace este curso con otra persona."}
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Field label="Escuela">
                <Select value={form.school} onChange={(v) => setForm({ ...form, school: v })} options={schoolNames} />
              </Field>
              <Field label="Curso">
                <Select value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} options={activityNames} />
              </Field>
              <Field label="Moneda">
                <CurrencySearchSelect value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} currencyRows={currencies.rows} />
              </Field>
              <Field label="Tarifa">
                <MoneyInput value={form.rate} onChange={(v) => setForm({ ...form, rate: v })} />
              </Field>
            </div>

            <button
              onClick={addRate}
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
