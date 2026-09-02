import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, UserPlus, Pencil, FileText, ImageDown, AlertTriangle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useToast, Fab, RowMenu } from "../shared";
import { TEAL } from "../App";

// Generador de Training Records (Release V1, Fase 5). El roster de
// alumnos, su configuración y los documentos ya generados se guardan en
// sessionStorage (ver serializeRoster/loadStoredRoster) — sobreviven a
// recargar la página (pedido explícito del usuario 2026-09-02: "cuando
// recargo la página... si tengo alumnos y/o documentos generados,
// mantenerlos"), pero no a cerrar la pestaña ni la sesión, mismo criterio
// de "efímero, nunca en Supabase ni permanente" que ya regía este módulo —
// solo se amplía de "mientras dure la instancia de React" a "mientras dure
// la pestaña del navegador".
//
// Los datos del instructor (nombre, iniciales, número SSI Pro, firma) YA NO
// se piden ni se editan aquí — viven en el perfil real (ver ProfileTab.jsx
// → "Datos de instructor"). Si faltan al entrar, la pantalla bloquea el
// generador con un aviso y un botón directo a "Mi perfil".
//
// Pestaña única de creación (pedido explícito 2026-09-02): la plantilla ya
// no se elige una vez para toda la sesión — se elige por alumno, dentro de
// la misma hoja donde se rellenan sus datos y la configuración del
// documento (ver StudentRecordSheet.jsx). El roster de esta pantalla puede
// tener alumnos de varias plantillas distintas a la vez.
import StudentRecordSheet from "./StudentRecordSheet";

const SESSION_KEY = "oceanpulse:trainingRecordsSession";

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function loadStoredRoster() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((s) => ({ ...s, pdfBytes: s.pdfBytes ? base64ToBytes(s.pdfBytes) : null }));
  } catch {
    return [];
  }
}
function persistRoster(roster) {
  try {
    const serializable = roster.map((s) => ({ ...s, pdfBytes: s.pdfBytes ? bytesToBase64(s.pdfBytes) : null }));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(serializable));
  } catch {
    // sessionStorage lleno o no disponible (navegación privada) — la
    // persistencia entre recargas es una comodidad, no algo crítico; se
    // sigue funcionando con normalidad dentro de la misma sesión de React.
  }
}

function downloadBytes(bytes, filename, mimeType = "application/pdf") {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeFilePart(text) {
  return (text || "").trim().replace(/[^\p{L}\p{N}]+/gu, "_");
}

function filenameFor(student, ext = "pdf") {
  return `${safeFilePart(student.firstName)}_${safeFilePart(student.lastName)}_${student.templateCode}.${ext}`;
}

function formatGeneratedAt(timestamp, locale) {
  return new Date(timestamp).toLocaleString(locale === "en" ? "en-GB" : "es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Recordatorio de solo lectura de con qué identidad de instructor se va a
// firmar — un documento de certificación real no debe generarse "a
// ciegas" sobre qué instructor queda impreso. Editar estos datos ya no se
// hace aquí, ver "Mi perfil" → "Datos de instructor".
function InstructorSummary({ instructor }) {
  const { t } = useTranslation("trainingRecords");
  return (
    <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
      {t("instructorSummary.firmandoComo", { name: instructor.namePrinted, initials: instructor.initials, number: instructor.number })}
    </p>
  );
}

// Bloquea el generador cuando al perfil le falta cualquiera de los datos de
// instructor (nombre/apellidos, iniciales, número SSI Pro, firma) — pedido
// explícito del usuario: mejor no dejar ni empezar un roster que llegar al
// final y no poder generar el documento.
function InstructorMissingNotice({ onOpenProfile }) {
  const { t } = useTranslation("trainingRecords");
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-5 text-center">
      <AlertTriangle size={22} className="text-amber-500" aria-hidden="true" />
      <p className="text-sm text-amber-800">{t("instructorMissing.mensaje")}</p>
      <button
        onClick={onOpenProfile}
        className="flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-white"
        style={{ backgroundColor: TEAL }}
      >
        {t("instructorMissing.boton")}
      </button>
    </div>
  );
}

// Fila de alumno — pedido explícito del usuario (2026-09-02): 3 iconos
// siempre reconocibles (Editar, PDF, JPG) en vez de esconder las descargas
// en un menú "⋯". PDF/JPG solo aparecen una vez generado el documento (no
// hay nada que descargar antes); Editar siempre está disponible. La fecha
// y hora de la última generación se muestra bajo el nombre.
function RosterRow({ student, locale, onEdit, onDelete, onDownloadPdf, onDownloadJpg }) {
  const { t } = useTranslation("trainingRecords");
  const hasGenerated = !!student.pdfBytes;
  return (
    <li className="flex items-center gap-1.5 px-4 py-2.5 text-sm">
      <button onClick={() => onEdit(student)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">{student.initials}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-gray-800">{student.firstName} {student.lastName}</span>
          {hasGenerated && <span className="block text-xs text-gray-400">{t("roster.generadoEl", { date: formatGeneratedAt(student.generatedAt, locale) })}</span>}
        </span>
      </button>
      <button onClick={() => onEdit(student)} aria-label={t("roster.editar")} title={t("roster.editar")} className="-m-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center p-2 text-gray-400">
        <Pencil size={16} aria-hidden="true" />
      </button>
      {hasGenerated && (
        <>
          <button onClick={() => onDownloadPdf(student)} aria-label={t("roster.descargarPdf")} title={t("roster.descargarPdf")} className="-m-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center p-2" style={{ color: TEAL }}>
            <FileText size={17} aria-hidden="true" />
          </button>
          <button onClick={() => onDownloadJpg(student)} aria-label={t("roster.descargarJpg")} title={t("roster.descargarJpg")} className="-m-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center p-2" style={{ color: TEAL }}>
            <ImageDown size={17} aria-hidden="true" />
          </button>
        </>
      )}
      <RowMenu onEdit={() => onEdit(student)} onDelete={() => onDelete(student)} itemLabel={`"${student.firstName} ${student.lastName}"`} />
    </li>
  );
}

export default function TrainingRecordsTab({ profile, accentColor, onOpenProfile }) {
  const { t, i18n } = useTranslation("trainingRecords");
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [adventures, setAdventures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState(loadStoredRoster);
  const [entrySheet, setEntrySheet] = useState(null); // null | {mode:"add"} | {mode:"edit", id}
  const [templateBytesCache, setTemplateBytesCache] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("training_record_templates").select("code, name, storage_path").eq("status", "active").order("name"),
      supabase.from("training_record_adventures").select("id, name").order("sort_order"),
    ]).then(([templatesRes, adventuresRes]) => {
      if (!active) return;
      if (templatesRes.error) { console.error(templatesRes.error); toast?.error(t("noSePudieronCargarPlantillas")); }
      else setTemplates(templatesRes.data || []);
      if (adventuresRes.error) console.error(adventuresRes.error);
      else setAdventures(adventuresRes.data || []);
      setLoading(false);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { persistRoster(roster); }, [roster]);

  const getTemplateBytes = async (code) => {
    if (templateBytesCache[code]) return templateBytesCache[code];
    const tpl = templates.find((tp) => tp.code === code);
    const { data, error } = await supabase.storage.from("training-record-templates").download(tpl.storage_path);
    if (error) throw error;
    const bytes = new Uint8Array(await data.arrayBuffer());
    setTemplateBytesCache((c) => ({ ...c, [code]: bytes }));
    return bytes;
  };

  const removeStudent = (student) => setRoster((r) => r.filter((s) => s.id !== student.id));

  const handleSaved = (entry) => {
    setRoster((r) => {
      const exists = r.some((s) => s.id === entry.id);
      return exists ? r.map((s) => (s.id === entry.id ? entry : s)) : [...r, entry];
    });
    downloadBytes(entry.pdfBytes, filenameFor(entry));
    setEntrySheet(null);
  };

  const downloadPdf = (student) => {
    if (student.pdfBytes) downloadBytes(student.pdfBytes, filenameFor(student));
  };

  // import() dinámico, no estático: pdfjs-dist (~2MB) usa
  // Promise.withResolvers internamente, disponible solo desde Safari 17.4
  // (marzo 2024) — con un import estático, ese código se ejecuta en
  // CUALQUIER pantalla de la app (hasta el login) en cuanto entra en el
  // bundle principal, y revienta en Safari más antiguo con una pantalla en
  // blanco total, no solo en Training Records (bug real encontrado en el
  // Preview, ver docs/RELEASE-V1-PROGRESS.md).
  const downloadJpg = async (student) => {
    if (!student.pdfBytes) return;
    try {
      const { renderPdfToJpgBytes } = await import("./pdfToJpg");
      const jpgBytes = await renderPdfToJpgBytes(student.pdfBytes);
      downloadBytes(jpgBytes, filenameFor(student, "jpg"), "image/jpeg");
      toast?.success(t("roster.imagenDescargada"));
    } catch (err) {
      console.error(err);
      toast?.error(t("roster.noSePudoExportarImagen"));
    }
  };

  const instructor = {
    namePrinted: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim(),
    initials: profile?.instructor_initials || "",
    number: profile?.ssi_pro_number || "",
    signature: profile?.instructor_signature || null,
  };
  const instructorComplete = Boolean(
    profile?.first_name?.trim() && profile?.last_name?.trim() && instructor.initials.trim() && instructor.number.trim() && instructor.signature
  );

  if (loading) return <p className="text-sm text-gray-400">{t("cargandoPlantillas")}</p>;

  if (!instructorComplete) {
    return (
      <div className="space-y-4 pb-16">
        <InstructorMissingNotice onOpenProfile={onOpenProfile} />
      </div>
    );
  }

  const editingEntry = entrySheet?.mode === "edit" ? roster.find((s) => s.id === entrySheet.id) : null;

  return (
    <div className="space-y-4 pb-24">
      <p className="text-sm text-gray-500">{t("intro")}</p>
      <InstructorSummary instructor={instructor} />

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("roster.titulo")}</h3>
        {roster.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
            <p className="mb-2">{t("roster.vacio")}</p>
            <button onClick={() => setEntrySheet({ mode: "add" })} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium" style={{ color: TEAL }}>
              <Plus size={15} aria-hidden="true" /> {t("roster.anadirPrimerAlumno")}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {roster.map((student) => (
              <RosterRow
                key={student.id}
                student={student}
                locale={i18n.language}
                onEdit={(s) => setEntrySheet({ mode: "edit", id: s.id })}
                onDelete={removeStudent}
                onDownloadPdf={downloadPdf}
                onDownloadJpg={downloadJpg}
              />
            ))}
          </ul>
        )}
      </div>

      <Fab onClick={() => setEntrySheet({ mode: "add" })} label={t("roster.anadirAlumno")} color={accentColor || TEAL} icon={UserPlus} />

      <StudentRecordSheet
        open={!!entrySheet}
        onClose={() => setEntrySheet(null)}
        mode={entrySheet?.mode}
        initial={editingEntry}
        templates={templates}
        adventures={adventures}
        instructor={instructor}
        getTemplateBytes={getTemplateBytes}
        onSaved={handleSaved}
      />
    </div>
  );
}
