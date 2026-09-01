import React, { useState } from "react";
import { Star, Copy, Loader2 } from "lucide-react";
import { NAVY, TEAL } from "./colors";
import { useSupabaseTable } from "./useSupabaseTable";
import { supabase } from "./supabaseClient";
import { useToast, Field, Sheet, Fab, DeleteButton, BooleanToggle, inputCls } from "./shared";

// Editor de datasets iniciales (Bloque 4, 2026-09-01) — antes se creaban a
// mano vía SQL editor (ver schema.sql, comentario de setup_datasets), esta
// pantalla es ahora la vía normal. Solo superadmin: gate real en RLS
// (insert/update/delete de setup_datasets y sus 4 tablas hijas exigen
// is_superadmin(auth.uid()), ver schema.sql), este componente además solo
// se monta si profile.is_superadmin (ver ConfigTab.jsx) — misma doble
// garantía que ya usa DeploymentNotice.jsx.
//
// "Duplicar" copia escuelas/actividades/tarifas/comisiones (las únicas 4
// tablas de contenido de un dataset) de uno existente a uno nuevo, vacío
// de id. Editar ESE contenido fila a fila (qué escuelas/tarifas concretas
// lleva un dataset) es una pantalla aparte, deliberadamente no incluida en
// este primer corte — ver docs/BACKLOG.md.

const CONTENT_TABLES = ["setup_dataset_schools", "setup_dataset_activities", "setup_dataset_rates", "setup_dataset_commission_rates"];

function slugify(label) {
  return label
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "") || "dataset";
}

async function duplicateDatasetContent(sourceId, targetId) {
  for (const table of CONTENT_TABLES) {
    const { data: rows, error: readError } = await supabase.from(table).select("*").eq("dataset_id", sourceId);
    if (readError) throw readError;
    if (!rows.length) continue;
    const copies = rows.map(({ dataset_id: _drop, ...rest }) => ({ ...rest, dataset_id: targetId }));
    const { error: insertError } = await supabase.from(table).insert(copies);
    if (insertError) throw insertError;
  }
}

export default function DatasetsSection() {
  const datasets = useSupabaseTable("setup_datasets", "label", "id");
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);

  const activeCount = datasets.rows.filter((r) => r.is_active).length;

  const create = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await datasets.insertRow({ label: trimmed, key: slugify(trimmed) });
      toast?.success("Dataset creado — añade su contenido antes de activarlo");
      setSheetOpen(false);
      setLabel("");
    } catch (err) {
      toast?.error(err?.message?.includes("setup_datasets_key_key") ? "Ya existe un dataset con esa clave." : "No se pudo crear. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async (row) => {
    setDuplicatingId(row.id);
    try {
      const newLabel = `${row.label} (copia)`;
      const created = await datasets.insertRow({ label: newLabel, key: `${row.key}-copia-${Date.now().toString(36)}`, is_active: false });
      await duplicateDatasetContent(row.id, created.id);
      toast?.success(`"${newLabel}" creado con el mismo contenido que "${row.label}"`);
    } catch {
      toast?.error("No se pudo duplicar. Inténtalo de nuevo.");
    } finally {
      setDuplicatingId(null);
    }
  };

  const toggleActive = async (row) => {
    try {
      // Desactivar el dataset marcado como predeterminado también le quita
      // ese marcado — un dataset inactivo nunca debe seguir siendo el
      // predeterminado (pickDatasetKey, externalRegister.js, ya cae al
      // primero activo si no encuentra ninguno, pero dejar el dato
      // inconsistente confundiría a cualquiera que abra esta pantalla).
      const patch = { is_active: !row.is_active };
      if (row.is_active && row.is_default) patch.is_default = false;
      await datasets.updateRow(row.id, patch);
    } catch {
      toast?.error("No se pudo actualizar.");
    }
  };

  const handleDelete = async (row) => {
    if (row.is_default) {
      throw new Error("Es el dataset predeterminado — marca otro como predeterminado antes de eliminar este.");
    }
    if (datasets.rows.length <= 1) {
      throw new Error("No puedes eliminar el único dataset — el registro externo y el alta manual necesitan al menos uno.");
    }
    await datasets.deleteRow(row.id);
  };

  return (
    <div className="space-y-3 pb-16">
      <p className="text-xs text-gray-400">
        Configuración inicial (escuelas, cursos y tarifas) que se clona en cada cuenta nueva. {activeCount} activo{activeCount === 1 ? "" : "s"} de {datasets.rows.length}.
      </p>

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {datasets.rows.map((row) => (
          <li key={row.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-800">{row.label}</p>
              <p className="truncate text-xs text-gray-400">{row.key}{!row.is_active && " · Inactivo"}</p>
            </div>
            <button
              onClick={() => datasets.setDefault(row.id)}
              disabled={!row.is_active}
              title="Marcar como predeterminado"
              aria-label={`Marcar "${row.label}" como predeterminado`}
              className={`-m-2 flex min-h-11 min-w-11 items-center justify-center rounded p-2 disabled:opacity-30 ${row.is_default ? "text-amber-500" : "text-gray-300 hover:text-amber-400"}`}
            >
              <Star size={15} fill={row.is_default ? "currentColor" : "none"} aria-hidden="true" />
            </button>
            <button
              onClick={() => duplicate(row)}
              disabled={duplicatingId === row.id}
              title="Duplicar"
              aria-label={`Duplicar "${row.label}"`}
              className="-m-2 flex min-h-11 min-w-11 items-center justify-center rounded p-2 text-gray-400 hover:text-gray-600 disabled:opacity-40"
            >
              {duplicatingId === row.id ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            </button>
            <BooleanToggle checked={row.is_active} onChange={() => toggleActive(row)} ariaLabel={`Dataset "${row.label}" activo`} />
            <DeleteButton onConfirm={() => handleDelete(row)} itemLabel={`el dataset "${row.label}"`} />
          </li>
        ))}
        {datasets.loaded && datasets.rows.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-400">Sin datasets todavía.</li>
        )}
      </ul>

      <Fab onClick={() => setSheetOpen(true)} label="Nuevo dataset" color={TEAL} />

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <h3 className="mb-1 text-sm font-semibold text-gray-800">Nuevo dataset</h3>
        <p className="mb-3 text-xs text-gray-400">Nace vacío e inactivo — duplica uno existente si quieres partir de contenido ya cargado.</p>
        <Field label="Nombre">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            className={`${inputCls} w-full`}
            autoFocus
          />
        </Field>
        <button
          onClick={create}
          disabled={saving || !label.trim()}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: TEAL }}
        >
          {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />} Crear
        </button>
      </Sheet>
    </div>
  );
}
