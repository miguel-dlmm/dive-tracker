import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, Pencil, FileText, ImageDown, AlertTriangle, Share2, ChevronRight, Award, Download, Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useToast, Fab, RowMenu, DatePicker, Select, ConfirmDialog } from "../shared";
import { TEAL } from "../App";
import { fillTrainingRecordPdf } from "./pdfFill";
import { TEMPLATE_FIELD_MAPS } from "./templateFieldMaps";
import { buildDefaultConfig, validateRecordConfig, validateStudentFields, buildFillData } from "./recordConfig";
import StudentQuickEntrySheet from "./StudentQuickEntrySheet";

// Generador de Training Records (Release V1, Fase 5) — rediseño
// 2026-09-03 (Bloque 5 del job nocturno, pedido explícito del usuario):
// "no es una configuración de Training Record por alumno, es una
// configuración de Training Record para un listado de alumnos". La
// pantalla pasa a tener una única configuración COMPARTIDA (plantilla,
// progreso del curso, fechas, versión de examen...) para todo el
// listado, y una lista ligera de alumnos que solo aportan lo que
// realmente varía de uno a otro: nombre, apellidos, iniciales y firma.
// "Generar" produce el documento de TODOS los alumnos del listado a la
// vez, con descarga/compartir individual o en lote.
//
// Los datos del instructor (nombre, iniciales, número SSI Pro, firma) NO
// se piden ni se editan aquí — viven en el perfil real (ver ProfileTab.jsx
// → "Datos de instructor"). Si faltan al entrar, la pantalla bloquea el
// generador con un aviso y un botón directo a "Mi perfil".
//
// Sesión (config + listado + documentos ya generados) en sessionStorage
// — sobrevive a recargar la página, no a cerrar la pestaña ni la sesión,
// mismo criterio "efímero, nunca en Supabase" que ya regía este módulo.

const SESSION_KEY = "oceanpulse:trainingRecordsSession";

// Orden de aparición pedido explícito del usuario (2026-09-02) — no
// alfabético ni por código: el progreso natural de un instructor SSI
// (Open Water primero, después Advanced, después las especialidades).
const TEMPLATE_DISPLAY_ORDER = ["OWD", "AOWD", "SC-EAN", "SC-DD"];
function sortTemplatesForDisplay(templates) {
  return [...templates].sort((a, b) => {
    const ia = TEMPLATE_DISPLAY_ORDER.indexOf(a.code);
    const ib = TEMPLATE_DISPLAY_ORDER.indexOf(b.code);
    return (ia === -1 ? TEMPLATE_DISPLAY_ORDER.length : ia) - (ib === -1 ? TEMPLATE_DISPLAY_ORDER.length : ib);
  });
}

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

function loadStoredSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { templateCode: null, config: null, students: [] };
    const parsed = JSON.parse(raw);
    return {
      templateCode: parsed.templateCode || null,
      config: parsed.config || null,
      students: (parsed.students || []).map((s) => ({ ...s, pdfBytes: s.pdfBytes ? base64ToBytes(s.pdfBytes) : null })),
    };
  } catch {
    return { templateCode: null, config: null, students: [] };
  }
}
function persistSession(session) {
  try {
    const serializable = {
      ...session,
      students: session.students.map((s) => ({ ...s, pdfBytes: s.pdfBytes ? bytesToBase64(s.pdfBytes) : null })),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(serializable));
  } catch {
    // sessionStorage lleno o no disponible (navegación privada) — la
    // persistencia entre recargas es una comodidad, no algo crítico.
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
function filenameFor(student, templateCode, ext = "pdf") {
  return `${safeFilePart(student.firstName)}_${safeFilePart(student.lastName)}_${templateCode}.${ext}`;
}

function canShareFiles(files) {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

function formatGeneratedAt(timestamp, locale) {
  return new Date(timestamp).toLocaleString(locale === "en" ? "en-GB" : "es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function InstructorSummary({ instructor }) {
  const { t } = useTranslation("trainingRecords");
  return (
    <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
      {t("instructorSummary.firmandoComo", { name: instructor.namePrinted, initials: instructor.initials, number: instructor.number })}
    </p>
  );
}

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

function FieldError({ message }) {
  if (!message) return null;
  return <p role="alert" className="mt-1 text-xs text-red-600">{message}</p>;
}

function ProgressRowToggle({ label, checked, onChange, dateValue, onDateChange, dateError, dateLabel }) {
  return (
    <div>
      <label className="flex min-h-11 items-center gap-2.5 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 shrink-0 rounded border-gray-300" style={{ accentColor: TEAL }} />
        <span className="flex-1">{label}</span>
      </label>
      {checked && onDateChange && (
        <div className="mt-1 pl-3">
          <DatePicker value={dateValue} onChange={onDateChange} placeholder={dateLabel} />
          <FieldError message={dateError} />
        </div>
      )}
    </div>
  );
}

function RadioChoice({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          className="flex min-h-11 items-center rounded-md border px-3 text-sm font-medium"
          style={value === opt.value ? { borderColor: TEAL, backgroundColor: "#F0FDFA", color: TEAL } : { borderColor: "#E5E7EB", color: "#4B5563" }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Cambiar de plantilla descarta toda la configuración compartida
// (fechas, progreso, firmas de examen) — solo pide confirmación si de
// verdad hay algo que perder.
function configHasData(config) {
  if (!config) return false;
  if (Object.values(config.rowDates || {}).some(Boolean)) return true;
  if (config.examConfirmed || config.examConfirmedDate) return true;
  if ((config.specialtyDives || []).some((d) => d.adventureId)) return true;
  return false;
}

function StudentRow({ student, hasError, locale, onEdit, onDelete, onDownloadPdf, onDownloadJpg, onShare }) {
  const { t } = useTranslation("trainingRecords");
  const hasGenerated = !!student.pdfBytes;
  return (
    <li className="flex items-center gap-1.5 px-4 py-2.5 text-sm">
      <button onClick={() => onEdit(student)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={hasError ? { backgroundColor: "#FEF2F2", color: "#DC2626" } : { backgroundColor: "#F3F4F6", color: "#4B5563" }}
        >
          {student.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-gray-800">{student.firstName} {student.lastName}</span>
          {hasGenerated && <span className="block text-xs text-gray-400">{t("roster.generadoEl", { date: formatGeneratedAt(student.generatedAt, locale) })}</span>}
          {!hasGenerated && hasError && <span className="block text-xs text-red-600">{t("roster.faltanDatos")}</span>}
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
          {onShare && (
            <button onClick={() => onShare(student)} aria-label={t("roster.compartir")} title={t("roster.compartir")} className="-m-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center p-2" style={{ color: TEAL }}>
              <Share2 size={17} aria-hidden="true" />
            </button>
          )}
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
  const [session, setSession] = useState(loadStoredSession);
  const { templateCode, config, students } = session;
  const [configErrors, setConfigErrors] = useState({});
  const [entrySheet, setEntrySheet] = useState(null); // null | {mode:"add"} | {mode:"edit", id}
  const [templateBytesCache, setTemplateBytesCache] = useState({});
  const [confirmingTemplateChange, setConfirmingTemplateChange] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [batchWorking, setBatchWorking] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("training_record_templates").select("code, name, storage_path").eq("status", "active").order("name"),
      supabase.from("training_record_adventures").select("id, name").order("sort_order"),
    ]).then(([templatesRes, adventuresRes]) => {
      if (!active) return;
      if (templatesRes.error) { console.error(templatesRes.error); toast?.error(t("noSePudieronCargarPlantillas")); }
      else setTemplates(sortTemplatesForDisplay(templatesRes.data || []));
      if (adventuresRes.error) console.error(adventuresRes.error);
      else setAdventures(adventuresRes.data || []);
      setLoading(false);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { persistSession(session); }, [session]);

  const templateMap = templateCode ? TEMPLATE_FIELD_MAPS[templateCode] : null;

  const getTemplateBytes = async (code) => {
    if (templateBytesCache[code]) return templateBytesCache[code];
    const tpl = templates.find((tp) => tp.code === code);
    const { data, error } = await supabase.storage.from("training-record-templates").download(tpl.storage_path);
    if (error) throw error;
    const bytes = new Uint8Array(await data.arrayBuffer());
    setTemplateBytesCache((c) => ({ ...c, [code]: bytes }));
    return bytes;
  };

  const selectTemplate = (code) => {
    setSession({ templateCode: code, config: buildDefaultConfig(TEMPLATE_FIELD_MAPS[code]), students: students.map((s) => ({ ...s, pdfBytes: null, generatedAt: null })) });
    setConfigErrors({});
  };
  const clearTemplate = () => {
    setSession({ templateCode: null, config: null, students: students.map((s) => ({ ...s, pdfBytes: null, generatedAt: null })) });
    setConfigErrors({});
  };
  const requestTemplateChange = () => {
    if (configHasData(config)) setConfirmingTemplateChange(true);
    else clearTemplate();
  };

  const updateConfig = (patch) => setSession((s) => ({ ...s, config: { ...s.config, ...patch } }));
  const toggleRow = (i, checked) => setSession((s) => ({ ...s, config: { ...s.config, includedRows: s.config.includedRows.map((v, idx) => (idx === i ? checked : v)) } }));
  const setRowDate = (i, value) => setSession((s) => ({ ...s, config: { ...s.config, rowDates: { ...s.config.rowDates, [i]: value } } }));
  const updateDive = (i, patch) => setSession((s) => ({ ...s, config: { ...s.config, specialtyDives: s.config.specialtyDives.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) } }));

  const removeStudent = (student) => setSession((s) => ({ ...s, students: s.students.filter((x) => x.id !== student.id) }));
  const handleStudentSaved = (entry) => {
    setSession((s) => {
      const exists = s.students.some((x) => x.id === entry.id);
      return { ...s, students: exists ? s.students.map((x) => (x.id === entry.id ? { ...entry, pdfBytes: x.pdfBytes, generatedAt: x.generatedAt } : x)) : [...s.students, entry] };
    });
    setEntrySheet(null);
  };

  const downloadPdf = (student) => { if (student.pdfBytes) downloadBytes(student.pdfBytes, filenameFor(student, templateCode)); };
  // import() dinámico, no estático: pdfjs-dist (~2MB) usa
  // Promise.withResolvers internamente, disponible solo desde Safari 17.4
  // — con un import estático, revienta en Safari más antiguo con una
  // pantalla en blanco total en TODA la app, no solo aquí.
  const downloadJpg = async (student) => {
    if (!student.pdfBytes) return;
    try {
      const { renderPdfToJpgBytes } = await import("./pdfToJpg");
      const jpgBytes = await renderPdfToJpgBytes(student.pdfBytes);
      downloadBytes(jpgBytes, filenameFor(student, templateCode, "jpg"), "image/jpeg");
      toast?.success(t("roster.imagenDescargada"));
    } catch (err) {
      console.error(err);
      toast?.error(t("roster.noSePudoExportarImagen"));
    }
  };
  const shareRecord = async (student) => {
    if (!student.pdfBytes) return;
    try {
      const file = new File([student.pdfBytes], filenameFor(student, templateCode), { type: "application/pdf" });
      await navigator.share({ files: [file], title: `${student.firstName} ${student.lastName}` });
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error(err);
      toast?.error(t("roster.noSePudoCompartir"));
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

  const studentValidations = students.map((s) => validateStudentFields(s));
  const generatedStudents = students.filter((s) => s.pdfBytes);
  const shareAllFiles = generatedStudents.map((s) => new File([s.pdfBytes], filenameFor(s, templateCode), { type: "application/pdf" }));
  const shareAllSupported = generatedStudents.length > 0 && canShareFiles(shareAllFiles);

  const generateAll = async () => {
    if (!templateCode) return;
    const { valid: configValid, errors } = validateRecordConfig(templateMap, config);
    setConfigErrors(errors);
    const allStudentsValid = studentValidations.every((v) => v.valid);
    if (!configValid || students.length === 0 || !allStudentsValid) {
      toast?.error(students.length === 0 ? t("studentSheet.sinAlumnos") : t("studentSheet.faltanCampos"));
      return;
    }
    setGenerating(true);
    try {
      const templateBytes = await getTemplateBytes(templateCode);
      const updated = [];
      for (const student of students) {
        const data = buildFillData(templateMap, student, config, instructor);
        // eslint-disable-next-line no-await-in-loop -- cada PDF depende del anterior solo por orden de descarga, no hay independencia real que paralelizar aquí
        const pdfBytes = await fillTrainingRecordPdf(templateBytes, templateMap, data);
        updated.push({ ...student, pdfBytes, generatedAt: Date.now() });
      }
      setSession((s) => ({ ...s, students: updated }));
      toast?.success(t("studentSheet.generadoCorrectamente"));
    } catch (err) {
      console.error(err);
      toast?.error(t("studentSheet.noSePudoGenerar"));
    } finally {
      setGenerating(false);
    }
  };

  const downloadAllAs = async (format) => {
    setBatchWorking(true);
    try {
      for (const student of generatedStudents) {
        // eslint-disable-next-line no-await-in-loop -- descargas secuenciales a propósito: varias descargas simultáneas se bloquean en algunos navegadores
        if (format === "pdf") downloadPdf(student);
        else await downloadJpg(student);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } finally {
      setBatchWorking(false);
    }
  };
  const shareAll = async () => {
    try {
      await navigator.share({ files: shareAllFiles, title: t("roster.titulo") });
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error(err);
      toast?.error(t("roster.noSePudoCompartir"));
    }
  };

  if (loading) return <p className="text-sm text-gray-400">{t("cargandoPlantillas")}</p>;

  if (!instructorComplete) {
    return (
      <div className="space-y-4 pb-16">
        <InstructorMissingNotice onOpenProfile={onOpenProfile} />
      </div>
    );
  }

  const editingEntry = entrySheet?.mode === "edit" ? students.find((s) => s.id === entrySheet.id) : null;

  return (
    <div className="space-y-5 pb-24">
      <p className="text-sm text-gray-500">{t("intro")}</p>
      <InstructorSummary instructor={instructor} />

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentForm.plantilla")}</h3>
        {templateCode && (
          <button onClick={requestTemplateChange} className="mb-2 flex min-h-9 items-center gap-1 text-xs font-medium" style={{ color: TEAL }}>
            {t("studentForm.cambiarPlantilla")}
          </button>
        )}
        {!templateCode ? (
          templates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">{t("sinPlantillas")}</p>
          ) : (
            <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
              {templates.map((tpl) => (
                <button key={tpl.code} onClick={() => selectTemplate(tpl.code)} className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: "#F0FDFA", color: TEAL }}>
                    <Award size={18} aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-800">{tpl.name}</span>
                  <ChevronRight size={16} className="shrink-0 text-gray-300" aria-hidden="true" />
                </button>
              ))}
            </div>
          )
        ) : (
          <p className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800">{templateMap.name}</p>
        )}
      </section>

      {templateMap && config && (
        <>
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.progreso")}</h3>
            <div className="space-y-1.5">
              {templateMap.sessionRows.map((r, i) => (
                <ProgressRowToggle
                  key={i}
                  label={r.label}
                  checked={config.includedRows[i]}
                  onChange={(checked) => toggleRow(i, checked)}
                  dateValue={config.rowDates[i]}
                  onDateChange={(v) => setRowDate(i, v)}
                  dateError={configErrors.rowDates?.[i]}
                  dateLabel={t("studentSheet.fechaDeFila", { label: r.label })}
                />
              ))}
            </div>
            <FieldError message={configErrors.rows} />
          </section>

          {templateMap.optionalSpecialtyDives && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.inmersionesEspecialidad")}</h3>
              <div className="space-y-2">
                {templateMap.optionalSpecialtyDives.map((dive, i) => {
                  const current = config.specialtyDives[i];
                  return (
                    <div key={i} className="rounded-md border border-gray-200 p-2.5">
                      <p className="mb-1.5 text-xs font-medium text-gray-500">{dive.label}</p>
                      <Select
                        value={current.adventureName || ""}
                        onChange={(name) => {
                          const found = adventures.find((a) => a.name === name);
                          updateDive(i, { adventureId: found?.id || null, adventureName: name || "", completed: !!found });
                        }}
                        options={adventures.map((a) => a.name)}
                        placeholder={t("studentSheet.elegirAventura")}
                      />
                      {current.adventureId && (
                        <div className="mt-1.5">
                          <DatePicker value={current.date} onChange={(v) => updateDive(i, { date: v })} placeholder={t("studentSheet.fechaDeFila", { label: dive.label })} />
                          <FieldError message={configErrors.specialtyDates?.[i]} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {templateMap.examVersion && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.versionExamen")}</h3>
              <RadioChoice
                value={config.examVersion}
                onChange={(v) => updateConfig({ examVersion: v })}
                options={[
                  { value: "printed", label: t("studentSheet.examenImpreso") },
                  { value: "online", label: t("studentSheet.examenOnline") },
                ]}
              />
              <FieldError message={configErrors.examVersion} />
            </section>
          )}

          {templateMap.upgradeCheckboxes && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.certificacion")}</h3>
              <RadioChoice
                value={config.upgrade}
                onChange={(v) => updateConfig({ upgrade: v })}
                options={[
                  { value: "openWaterDiver", label: t("studentSheet.openWaterDiver") },
                  { value: "scubaDiver", label: t("studentSheet.scubaDiver") },
                ]}
              />
              <FieldError message={configErrors.upgrade} />
            </section>
          )}

          {templateMap.courseVariant && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.varianteCurso")}</h3>
              <RadioChoice
                value={config.courseVariant}
                onChange={(v) => updateConfig({ courseVariant: v })}
                options={[
                  { value: "ean32", label: t("studentSheet.ean32") },
                  { value: "ean40", label: t("studentSheet.ean40") },
                ]}
              />
            </section>
          )}

          {templateMap.examConfirmation && (
            <section>
              <ProgressRowToggle
                label={templateMap.examConfirmation.label}
                checked={config.examConfirmed}
                onChange={(v) => updateConfig({ examConfirmed: v })}
                dateValue={config.examConfirmedDate}
                onDateChange={(v) => updateConfig({ examConfirmedDate: v })}
                dateError={configErrors.examConfirmationDate}
                dateLabel={t("studentSheet.fechaDeFila", { label: templateMap.examConfirmation.label })}
              />
              <FieldError message={configErrors.examConfirmation} />
            </section>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("roster.titulo")}</h3>
            {students.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                <p className="mb-2">{t("roster.vacio")}</p>
                <button onClick={() => setEntrySheet({ mode: "add" })} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium" style={{ color: TEAL }}>
                  <UserPlus size={15} aria-hidden="true" /> {t("roster.anadirPrimerAlumno")}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
                {students.map((student, i) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    hasError={!studentValidations[i].valid}
                    locale={i18n.language}
                    onEdit={(s) => setEntrySheet({ mode: "edit", id: s.id })}
                    onDelete={removeStudent}
                    onDownloadPdf={downloadPdf}
                    onDownloadJpg={downloadJpg}
                    onShare={canShareFiles([new File([""], "t.pdf", { type: "application/pdf" })]) ? shareRecord : null}
                  />
                ))}
              </ul>
            )}
          </section>

          <button
            onClick={generateAll}
            disabled={generating}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: TEAL }}
          >
            {generating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
            {generating ? t("studentSheet.generando") : t("studentSheet.generarTodos")}
          </button>

          {generatedStudents.length > 0 && (
            <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("roster.enLote")}</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => downloadAllAs("pdf")}
                  disabled={batchWorking}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium disabled:opacity-60"
                  style={{ borderColor: TEAL, color: TEAL }}
                >
                  <FileText size={15} aria-hidden="true" /> {t("roster.descargarTodoPdf")}
                </button>
                <button
                  onClick={() => downloadAllAs("jpg")}
                  disabled={batchWorking}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium disabled:opacity-60"
                  style={{ borderColor: TEAL, color: TEAL }}
                >
                  <ImageDown size={15} aria-hidden="true" /> {t("roster.descargarTodoJpg")}
                </button>
                {shareAllSupported && (
                  <button
                    onClick={shareAll}
                    className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium"
                    style={{ borderColor: TEAL, color: TEAL }}
                  >
                    <Share2 size={15} aria-hidden="true" /> {t("roster.compartirTodo")}
                  </button>
                )}
              </div>
            </section>
          )}

          <Fab onClick={() => setEntrySheet({ mode: "add" })} label={t("roster.anadirAlumno")} color={accentColor || TEAL} icon={UserPlus} />
        </>
      )}

      <StudentQuickEntrySheet
        open={!!entrySheet}
        onClose={() => setEntrySheet(null)}
        mode={entrySheet?.mode}
        initial={editingEntry}
        onSaved={handleStudentSaved}
      />
      <ConfirmDialog
        open={confirmingTemplateChange}
        title={t("studentForm.confirmarCambioPlantilla.titulo")}
        message={t("studentForm.confirmarCambioPlantilla.mensaje")}
        confirmLabel={t("studentForm.confirmarCambioPlantilla.confirmar")}
        onCancel={() => setConfirmingTemplateChange(false)}
        onConfirm={() => { setConfirmingTemplateChange(false); clearTemplate(); }}
      />
    </div>
  );
}
