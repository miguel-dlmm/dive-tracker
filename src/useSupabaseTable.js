import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// pkField: nombre de la columna clave primaria ('id' normalmente, 'code' para currencies)
//
// insertRow/updateRow/deleteRow LANZAN si Supabase devuelve error — así el
// código que llama (p. ej. DeleteButton, o un botón "Guardar" con toast de
// confirmación/error) puede usar try/catch para saber si de verdad funcionó,
// en vez de asumir éxito silenciosamente.
export function useSupabaseTable(table, orderBy = "id", pkField = "id") {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from(table).select("*").order(orderBy);
    if (error) console.error(table, error);
    setRows(data || []);
    setLoaded(true);
  }, [table, orderBy]);

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
    const { error } = await supabase.from(table).delete().eq(pkField, pk);
    if (error) { console.error(error); throw error; }
    setRows((prev) => prev.filter((r) => r[pkField] !== pk));
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

  return { rows, loaded, insertRow, updateRow, deleteRow, bulkUpdateWhere, setDefault, reload };
}
