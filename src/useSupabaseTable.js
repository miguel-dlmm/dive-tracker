import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// pkField: nombre de la columna clave primaria ('id' normalmente, 'code' para currencies)
//
// insertRow/updateRow/deleteRow LANZAN si Supabase devuelve error — así el
// código que llama (p. ej. DeleteButton, o un botón "Guardar" con toast de
// confirmación/error) puede usar try/catch para saber si de verdad funcionó,
// en vez de asumir éxito silenciosamente.
//
// options.softDelete (Bloque baja lógica, 2026-09-04, migración 0015):
// para tablas con columna `deleted_at` (hoy worklog/comisiones/
// colleague_payments, ver src/App.jsx) — con esto activado, `reload`
// filtra `deleted_at is null` (una fila dada de baja nunca llega a
// `rows`, en NINGÚN consumidor de este hook, sin que cada pantalla tenga
// que acordarse de filtrarla por su cuenta) y `deleteRow` deja de borrar
// de verdad: hace un UPDATE que rellena `deleted_at`. `restoreRow`
// (deshacer una baja) es lo contrario: limpia `deleted_at` a null y
// recarga. Con `softDelete: false` (todas las demás tablas de la app)
// el comportamiento es exactamente el de siempre, sin ningún cambio.
export function useSupabaseTable(table, orderBy = "id", pkField = "id", options = {}) {
  const { softDelete = false } = options;
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    let query = supabase.from(table).select("*");
    if (softDelete) query = query.is("deleted_at", null);
    const { data, error } = await query.order(orderBy);
    if (error) console.error(table, error);
    setRows(data || []);
    setLoaded(true);
  }, [table, orderBy, softDelete]);

  useEffect(() => { reload(); }, [reload]);

  const insertRow = async (row) => {
    const { data, error } = await supabase.from(table).insert(row).select();
    if (error) { console.error(error); throw error; }
    setRows((prev) => [...prev, ...data]);
    return data[0];
  };

  const updateRow = async (pk, patch) => {
    const { data, error } = await supabase.from(table).update(patch).eq(pkField, pk).select();
    if (error) { console.error(error); throw error; }
    setRows((prev) => prev.map((r) => (r[pkField] === pk ? data[0] : r)));
    return data[0];
  };

  const deleteRow = async (pk) => {
    if (softDelete) {
      const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq(pkField, pk);
      if (error) { console.error(error); throw error; }
      setRows((prev) => prev.filter((r) => r[pkField] !== pk));
      return;
    }
    const { error } = await supabase.from(table).delete().eq(pkField, pk);
    if (error) { console.error(error); throw error; }
    setRows((prev) => prev.filter((r) => r[pkField] !== pk));
  };

  // Deshacer una baja lógica ("Deshacer" del toast de borrar, ver
  // DeleteButton/RowMenu en shared.jsx) — recarga desde la BD en vez de
  // parchear `rows` a mano, mismo criterio ya usado por
  // bulkUpdateWhere/setDefault más abajo: `rows` vuelve a ser exactamente
  // lo que hay en la BD, con el orden real de `orderBy`, sin arriesgarse a
  // insertar la fila recuperada en una posición incorrecta del array.
  const restoreRow = async (pk) => {
    const { error } = await supabase.from(table).update({ deleted_at: null }).eq(pkField, pk);
    if (error) { console.error(error); throw error; }
    await reload();
  };

  // Actualiza en bloque todas las filas que cumplan `predicate` (función sobre
  // la fila) con el mismo `patch`. Devuelve cuántas filas se tocaron.
  const bulkUpdateWhere = async (predicate, patch) => {
    const targets = rows.filter(predicate);
    if (targets.length === 0) return 0;
    const ids = targets.map((r) => r[pkField]);
    const { error } = await supabase.from(table).update(patch).in(pkField, ids);
    if (error) { console.error(error); throw error; }
    await reload();
    return ids.length;
  };

  // Desmarca cualquier otro "is_default" de la tabla y marca este. Recarga
  // desde la BD al final para evitar desincronizaciones de estado local.
  const setDefault = async (pk) => {
    const others = rows.filter((r) => r[pkField] !== pk && r.is_default);
    await Promise.all(
      others.map((r) => supabase.from(table).update({ is_default: false }).eq(pkField, r[pkField]))
    );
    const { error } = await supabase.from(table).update({ is_default: true }).eq(pkField, pk);
    if (error) { console.error(error); throw error; }
    await reload();
  };

  return { rows, loaded, insertRow, updateRow, deleteRow, restoreRow, bulkUpdateWhere, setDefault, reload };
}
