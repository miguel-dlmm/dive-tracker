import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, RefreshCw, FileText, ImageDown, AlertTriangle, Share2, ChevronRight, Award, Download, Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useToast, Fab, RowMenu, DatePicker, Select, ConfirmDialog, Avatar } from "../shared";
import { resolveAvatar } from "../avatarCatalog";
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

// Bug real reportado en Safari iOS: "No se ha podido completar la
// operación (Error de WebKitBlobResource)" al descargar. Causa conocida
// de Safari/WebKit — revocar el blob: URL justo después de a.click()
// (como hacíamos antes) corta la descarga a mitad, porque Safari la
// gestiona de forma asíncrona (a diferencia de Chrome, donde revocar en
// el mismo tick funciona sin problema). Se retrasa la revocación para
// darle tiempo real a completarla.
function downloadBytes(bytes, filename, mimeType = "application/pdf") {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

// Card de instructor (rediseño 2026-09-03, pedido explícito del usuario:
// "algo como una pequeña card con el avatar de mi perfil, nombre,
// iniciales, SSI PRO Number, firma") — sustituye a la única línea de texto
// anterior. El avatar reutiliza exactamente el mismo icono/color que "Mi
// perfil" (resolveAvatar), nunca una foto: mismo criterio que el resto de
// la app (ver avatarCatalog.js).
function InstructorCard({ profile, instructor }) {
  const { t } = useTranslation("trainingRecords");
  const { icon, color } = resolveAvatar(profile);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <Avatar icon={icon} color={color} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">{instructor.namePrinted}</p>
        <p className="text-xs text-gray-500">{t("instructorSummary.datos", { initials: instructor.initials, number: instructor.number })}</p>
      </div>
      {instructor.signature && (
        <img src={instructor.signature} alt={t("instructorSummary.firmaAlt")} className="h-9 w-16 shrink-0 rounded border border-gray-100 bg-white object-contain" />
      )}
    </div>
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

// Fecha en la MISMA fila que el checkbox (rediseño 2026-09-03, pedido
// explícito: "quiero algo más pequeño para que cada item del progreso del
// curso esté en una fila y no en dos como hasta ahora") — antes el
// DatePicker (w-full de por sí) se pintaba debajo, en una segunda línea.
// Envolverlo en un contenedor de ancho fijo basta para que quepa junto al
// checkbox sin tocar el componente compartido (DatePicker sigue siendo
// w-full de su propio contenedor, igual que en cualquier otro formulario).
function ProgressRowToggle({ label, checked, onChange, dateValue, onDateChange, dateError, dateLabel }) {
  const { t } = useTranslation("trainingRecords");
  return (
    <div className="rounded-md border border-gray-200 px-3 py-2">
      <div className="flex min-h-11 items-center gap-2.5">
        <label className="flex min-w-0 flex-1 items-center gap-2.5 text-sm text-gray-700">
          <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 shrink-0 rounded border-gray-300" style={{ accentColor: TEAL }} />
          <span className="min-w-0 flex-1 truncate">{label}</span>
        </label>
        {checked && onDateChange && (
          <div className="w-36 shrink-0">
            {/* placeholder corto porque el campo ya va pegado a su propia
                etiqueta (checked && onDateChange) — el texto completo
                sigue disponible para lectores de pantalla vía ariaLabel */}
            <DatePicker value={dateValue} onChange={onDateChange} placeholder={t("studentSheet.elegirFechaCorta")} ariaLabel={dateLabel} />
          </div>
        )}
      </div>
      {checked && onDateChange && <FieldError message={dateError} />}
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

// Tarjeta de acción en lote (rediseño 2026-09-03, pedido explícito:
// "dale una vuelta a la parte de Todo el listado... para que sea todo
// mucho más visual") — sustituye los 3 botones planos de contorno por
// tarjetas icono+etiqueta, mismo lenguaje visual que la lista de
// plantillas de arriba (icono en badge de color).
function BatchActionTile({ icon: Icon, label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-3 text-center disabled:opacity-50"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "#F0FDFA", color: TEAL }}>
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className="px-1 text-xs font-medium text-gray-700">{label}</span>
    </button>
  );
}

function StudentRow({ student, hasError, locale, onEdit, onDelete, onDownloadPdf, onDownloadJpg, onShare, onRegenerate, regenerating }) {
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
      {/* Editar ya vive en el menú "⋯" (RowMenu, abajo) — este icono deja
          de duplicarlo (rediseño 2026-09-03) y pasa a ser la acción
          "Regenerar TR" individual, para volver a generar SOLO este
          alumno sin repetir "Generar para todos los alumnos". */}
      <button
        onClick={() => onRegenerate(student)}
        disabled={hasError || regenerating}
        aria-label={t("roster.regenerarTr")}
        title={t("roster.regenerarTr")}
        className="-m-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center p-2 disabled:opacity-30"
        style={{ color: TEAL }}
      >
        {regenerating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
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
  const [regeneratingId, setRegeneratingId] = useState(null);

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
        // Cada PDF depende del anterior solo por orden de descarga, no hay
        // independencia real que paralelizar aquí.
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

  // Regenera SOLO este alumno (rediseño 2026-09-03) — mismo cálculo que un
  // paso del bucle de generateAll, pero sin repetir el resto del listado.
  // La configuración compartida debe seguir siendo válida (no se puede
  // regenerar un alumno con fechas de progreso a medias), aunque el resto
  // de alumnos no se toquen ni se revaliden.
  const regenerateStudent = async (student) => {
    if (!templateCode) return;
    const { valid: configValid, errors } = validateRecordConfig(templateMap, config);
    setConfigErrors(errors);
    const { valid: studentValid } = validateStudentFields(student);
    if (!configValid || !studentValid) {
      toast?.error(t("studentSheet.faltanCampos"));
      return;
    }
    setRegeneratingId(student.id);
    try {
      const templateBytes = await getTemplateBytes(templateCode);
      const data = buildFillData(templateMap, student, config, instructor);
      const pdfBytes = await fillTrainingRecordPdf(templateBytes, templateMap, data);
      setSession((s) => ({ ...s, students: s.students.map((x) => (x.id === student.id ? { ...x, pdfBytes, generatedAt: Date.now() } : x)) }));
      toast?.success(t("roster.regeneradoCorrectamente"));
    } catch (err) {
      console.error(err);
      toast?.error(t("studentSheet.noSePudoGenerar"));
    } finally {
      setRegeneratingId(null);
    }
  };

  const downloadAllAs = async (format) => {
    setBatchWorking(true);
    try {
      for (const student of generatedStudents) {
        // Descargas secuenciales a propósito: varias descargas simultáneas
        // se bloquean en algunos navegadores.
        if (format === "pdf") downloadPdf(student);
        else await downloadJpg(student);
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
      <InstructorCard profile={profile} instructor={instructor} />

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentForm.plantilla")}</h3>
          {templateCode && (
            <button onClick={requestTemplateChange} className="flex min-h-9 shrink-0 items-center gap-1 text-xs font-medium" style={{ color: TEAL }}>
              {t("studentForm.cambiarPlantilla")}
            </button>
          )}
        </div>
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
                    onRegenerate={regenerateStudent}
                    regenerating={regeneratingId === student.id}
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
            <section className="space-y-2.5 rounded-lg border border-gray-200 bg-white p-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("roster.enLote")}</h3>
                <span className="text-xs text-gray-400">{t("roster.enLoteCount", { count: generatedStudents.length })}</span>
              </div>
              <div className={`grid gap-2 ${shareAllSupported ? "grid-cols-3" : "grid-cols-2"}`}>
                <BatchActionTile icon={FileText} label={t("roster.descargarTodoPdf")} onClick={() => downloadAllAs("pdf")} disabled={batchWorking} />
                <BatchActionTile icon={ImageDown} label={t("roster.descargarTodoJpg")} onClick={() => downloadAllAs("jpg")} disabled={batchWorking} />
                {shareAllSupported && <BatchActionTile icon={Share2} label={t("roster.compartirTodo")} onClick={shareAll} />}
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
