import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft, Award, UserPlus, Download, ImageDown, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useToast, Fab, RowMenu } from "../shared";
import { TEAL, NAVY } from "../App";
import { TEMPLATE_FIELD_MAPS } from "./templateFieldMaps";
import StudentFormSheet from "./StudentFormSheet";
import StudentRecordSheet from "./StudentRecordSheet";

// Generador de Training Records (Release V1, Fase 5). Todo lo que entra
// aquí — roster de alumnos, firmas — es efímero: vive solo en el estado de
// este componente mientras dura la sesión de trabajo, nunca se persiste en
// Supabase ni en localStorage (decisión de arquitectura ya documentada en
// docs/RELEASE-V1-PROGRESS.md — evita cualquier riesgo de fuga de datos de
// alumnos/firmas).
//
// Los datos del instructor (nombre, iniciales, número SSI Pro) YA NO se
// piden ni se editan aquí — pedido explícito del usuario 2026-09-02: viven
// en el perfil real (profiles.first_name/last_name/instructor_initials/
// ssi_pro_number, ver ProfileTab.jsx → "Datos de instructor"), para que se
// rellenen una vez y sirvan en cualquier dispositivo, no por
// localStorage/sesión como antes. Si faltan al entrar en una plantilla, la
// pantalla bloquea el generador con un aviso y un botón directo a "Mi
// perfil" — generar un documento de certificación real sin nombre/iniciales
// de instructor no es un estado válido, mejor no dejar ni empezar el roster.
//
// MVP explícito (pedido del usuario, 2026-09-02): solo se ofrecen las
// plantillas que son de verdad formularios PDF rellenables (status=active
// en training_record_templates — hoy OWD/AOWD/SC-DD/SC-EAN). Las plantillas
// sin campos de formulario necesitan otro enfoque técnico (superponer texto
// en coordenadas fijas) y quedan fuera de este generador por ahora. Tampoco
// se rellena ninguna fecha todavía (pedido explícito, misma fecha) — se
// decidirá más adelante de dónde sale cada una.

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

// Bloquea el generador cuando al perfil le falta cualquiera de los datos de
// instructor (nombre/apellidos, iniciales, número SSI Pro) — pedido
// explícito del usuario 2026-09-02: mejor no dejar ni empezar un roster que
// llegar al final y no poder generar el documento.
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

function TemplatePicker({ templates, onSelect }) {
  const { t } = useTranslation("trainingRecords");
  if (!templates.length) {
    return <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">{t("sinPlantillas")}</p>;
  }
  return (
    <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
      {templates.map((tpl) => (
        <button key={tpl.code} onClick={() => onSelect(tpl)} className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: "#F0FDFA", color: TEAL }}>
            <Award size={18} aria-hidden="true" />
          </span>
          <span className="flex-1 text-sm font-medium text-gray-800">{tpl.name}</span>
          <ChevronRight size={16} className="shrink-0 text-gray-300" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

// Un único modelo de interacción, siempre igual: tocar la fila (avatar +
// nombre) SIEMPRE abre la configuración del documento de ese alumno —
// primera vez para rellenarla, cualquier vez después para revisarla/
// editarla y volver a generar (StudentRecordSheet ya restaura lo que se
// guardó la última vez, ver initialConfig en TrainingRecordsTab). El
// chevron es constante, no aparece/desaparece según el estado — antes
// cambiaba de significado según si ya se había generado o no, y eso es
// justo lo que hacía confusa la pantalla (reportado en vivo, 2026-09-02:
// "ya no hay más botones de acción" tras generar). El único indicador que
// SÍ cambia es el check verde junto al nombre, puramente informativo (no
// es un botón) — dice "ya generado", nada más.
//
// Las acciones secundarias (descargar de nuevo el PDF, exportar a JPG)
// viven en el menú "⋯" en vez de como iconos sueltos en la fila: con 2-3
// iconos sin etiqueta apretados junto al chevron y al propio menú, la fila
// se volvía difícil de leer rápido con el móvil en la mano — el menú ya es
// el sitio que el usuario reconoce de Mi trabajo/Tarifas para "más
// opciones sobre este elemento", así que no hace falta inventar nada.
function RosterRow({ student, hasGenerated, onOpenGenerate, onEdit, onDelete, onRedownload, onDownloadJpg }) {
  const { t } = useTranslation("trainingRecords");
  const extraActions = hasGenerated
    ? [
        { label: t("roster.descargarDeNuevo"), icon: <Download size={14} aria-hidden="true" />, onClick: () => onRedownload(student) },
        { label: t("roster.descargarComoImagen"), icon: <ImageDown size={14} aria-hidden="true" />, onClick: () => onDownloadJpg(student) },
      ]
    : [];
  return (
    <li className="flex items-center gap-2 px-4 py-2.5 text-sm">
      <button onClick={() => onOpenGenerate(student)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">{student.initials}</span>
        <span className="min-w-0 flex-1 truncate font-medium text-gray-800">{student.firstName} {student.lastName}</span>
        {hasGenerated && (
          <CheckCircle2 size={15} className="shrink-0 text-teal-600" role="img" aria-label={t("roster.yaGenerado")} />
        )}
        <ChevronRight size={16} className="shrink-0 text-gray-300" aria-hidden="true" />
      </button>
      <RowMenu onEdit={() => onEdit(student)} onDelete={() => onDelete(student)} itemLabel={`"${student.firstName} ${student.lastName}"`} extraActions={extraActions} />
    </li>
  );
}

export default function TrainingRecordsTab({ profile, accentColor, onOpenProfile }) {
  const { t } = useTranslation("trainingRecords");
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateBytes, setTemplateBytes] = useState(null);
  const [loadingTemplateFile, setLoadingTemplateFile] = useState(false);
  const [roster, setRoster] = useState([]);
  const [studentSheet, setStudentSheet] = useState(null);
  const [generateFor, setGenerateFor] = useState(null);
  const [generatedByStudent, setGeneratedByStudent] = useState({});
  // Lo que ya se marcó/firmó la última vez que se generó el registro de
  // cada alumno — permite reabrir StudentRecordSheet y seguir editando
  // desde ahí en vez de encontrarla en blanco (ver initialConfig más abajo).
  const [recordConfigByStudent, setRecordConfigByStudent] = useState({});

  useEffect(() => {
    let active = true;
    supabase.from("training_record_templates").select("code, name, storage_path").eq("status", "active").order("name")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error(error);
          toast?.error(t("noSePudieronCargarPlantillas"));
        } else {
          setTemplates(data || []);
        }
        setLoadingTemplates(false);
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTemplate = async (tpl) => {
    setSelectedTemplate(tpl);
    setRoster([]);
    setGeneratedByStudent({});
    setRecordConfigByStudent({});
    setLoadingTemplateFile(true);
    try {
      const { data, error } = await supabase.storage.from("training-record-templates").download(tpl.storage_path);
      if (error) throw error;
      setTemplateBytes(new Uint8Array(await data.arrayBuffer()));
    } catch (err) {
      console.error(err);
      toast?.error(t("noSePudoDescargarPlantilla"));
      setSelectedTemplate(null);
    } finally {
      setLoadingTemplateFile(false);
    }
  };

  const backToTemplates = () => {
    setSelectedTemplate(null);
    setTemplateBytes(null);
    setRoster([]);
    setGeneratedByStudent({});
    setRecordConfigByStudent({});
  };

  const addStudent = (values) => setRoster((r) => [...r, { id: crypto.randomUUID(), ...values }]);
  const editStudent = (id, values) => setRoster((r) => r.map((s) => (s.id === id ? { ...s, ...values } : s)));
  const removeStudent = (student) => {
    setRoster((r) => r.filter((s) => s.id !== student.id));
    setGeneratedByStudent((g) => {
      if (!(student.id in g)) return g;
      const next = { ...g };
      delete next[student.id];
      return next;
    });
    setRecordConfigByStudent((c) => {
      if (!(student.id in c)) return c;
      const next = { ...c };
      delete next[student.id];
      return next;
    });
  };

  const filenameFor = (student, ext = "pdf") => `${safeFilePart(student.firstName)}_${safeFilePart(student.lastName)}_${selectedTemplate.code}.${ext}`;

  const handleGenerated = (student, bytes, config) => {
    setGeneratedByStudent((g) => ({ ...g, [student.id]: bytes }));
    setRecordConfigByStudent((c) => ({ ...c, [student.id]: config }));
    downloadBytes(bytes, filenameFor(student));
    setGenerateFor(null);
  };

  const redownload = (student) => {
    const bytes = generatedByStudent[student.id];
    if (bytes) downloadBytes(bytes, filenameFor(student));
  };

  // import() dinámico, no estático: pdfjs-dist (~2MB) usa Promise.withResolvers
  // internamente, disponible solo desde Safari 17.4 (marzo 2024) — con un
  // import estático, ese código se ejecuta al cargar CUALQUIER pantalla de la
  // app (hasta el login) en cuanto entra en el bundle principal, y revienta
  // en Safari más antiguo con una pantalla en blanco total, no solo en
  // Training Records. Cargarlo solo al pulsar este botón aísla el riesgo a
  // quien de verdad usa la exportación a JPG, sin arrastrar al resto de la
  // app ni a un visitante que ni siquiera ha iniciado sesión.
  // El botón que dispara esto vive dentro del menú "⋯" (RowMenu), que se
  // cierra en cuanto se pulsa — sin un toast de éxito aquí, la conversión
  // (que tarda un momento, sobre todo la primera vez que carga pdfjs-dist)
  // no daba ninguna confirmación visible de que había terminado.
  const downloadAsJpg = async (student) => {
    const bytes = generatedByStudent[student.id];
    if (!bytes) return;
    try {
      const { renderPdfToJpgBytes } = await import("./pdfToJpg");
      const jpgBytes = await renderPdfToJpgBytes(bytes);
      downloadBytes(jpgBytes, filenameFor(student, "jpg"), "image/jpeg");
      toast?.success(t("roster.imagenDescargada"));
    } catch (err) {
      console.error(err);
      toast?.error(t("roster.noSePudoExportarImagen"));
    }
  };

  // Descargas secuenciales con una pequeña pausa entre cada una — varios
  // navegadores (Chrome/Safari incluidos) bloquean o preguntan al usuario
  // si una página dispara muchas descargas de golpe sin ninguna interacción
  // de por medio; separar en el tiempo evita ese bloqueo sin necesitar
  // empaquetar todo en un .zip (habría que añadir una librería nueva solo
  // para esto — no compensa para un roster típico de una clase).
  const downloadAllGenerated = async () => {
    const pending = roster.filter((s) => generatedByStudent[s.id]);
    for (const student of pending) {
      downloadBytes(generatedByStudent[student.id], filenameFor(student));
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  const templateMap = selectedTemplate ? TEMPLATE_FIELD_MAPS[selectedTemplate.code] : null;
  const anyGenerated = roster.some((s) => generatedByStudent[s.id]);

  const instructor = {
    namePrinted: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim(),
    initials: profile?.instructor_initials || "",
    number: profile?.ssi_pro_number || "",
  };
  const instructorComplete = Boolean(profile?.first_name?.trim() && profile?.last_name?.trim() && instructor.initials.trim() && instructor.number.trim());

  if (loadingTemplates) return <p className="text-sm text-gray-400">{t("cargandoPlantillas")}</p>;

  if (!selectedTemplate) {
    return (
      <div className="space-y-4 pb-16">
        <p className="text-sm text-gray-500">{t("intro")}</p>
        <TemplatePicker templates={templates} onSelect={selectTemplate} />
      </div>
    );
  }

  if (!instructorComplete) {
    return (
      <div className="space-y-4 pb-16">
        <button onClick={backToTemplates} className="-ml-2 flex min-h-11 items-center gap-1 rounded px-2 text-sm font-medium" style={{ color: TEAL }}>
          <ChevronLeft size={18} aria-hidden="true" /> {t("volverPlantillas")}
        </button>
        <h2 className="-mt-2 text-base font-semibold" style={{ color: NAVY }}>{selectedTemplate.name}</h2>
        <InstructorMissingNotice onOpenProfile={onOpenProfile} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <button onClick={backToTemplates} className="-ml-2 flex min-h-11 items-center gap-1 rounded px-2 text-sm font-medium" style={{ color: TEAL }}>
        <ChevronLeft size={18} aria-hidden="true" /> {t("volverPlantillas")}
      </button>
      <h2 className="-mt-2 text-base font-semibold" style={{ color: NAVY }}>{selectedTemplate.name}</h2>

      <InstructorSummary instructor={instructor} />

      {loadingTemplateFile ? (
        <p className="text-sm text-gray-400">{t("descargandoPlantilla")}</p>
      ) : (
        <>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("roster.titulo")}</h3>
            {roster.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">{t("roster.vacio")}</p>
            ) : (
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
                {roster.map((student) => (
                  <RosterRow
                    key={student.id}
                    student={student}
                    hasGenerated={!!generatedByStudent[student.id]}
                    onOpenGenerate={setGenerateFor}
                    onEdit={(s) => setStudentSheet({ mode: "edit", student: s })}
                    onDelete={removeStudent}
                    onRedownload={redownload}
                    onDownloadJpg={downloadAsJpg}
                  />
                ))}
              </ul>
            )}
          </div>

          {anyGenerated && (
            <button onClick={downloadAllGenerated} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 text-sm font-medium text-gray-600">
              <Download size={15} aria-hidden="true" /> {t("roster.descargarTodosGenerados")}
            </button>
          )}
        </>
      )}

      <Fab onClick={() => setStudentSheet({ mode: "add", student: null })} label={t("roster.anadirAlumno")} color={accentColor || TEAL} icon={UserPlus} />

      <StudentFormSheet
        open={!!studentSheet}
        onClose={() => setStudentSheet(null)}
        initial={studentSheet?.student}
        onSave={(values) => {
          if (studentSheet?.mode === "edit") editStudent(studentSheet.student.id, values);
          else addStudent(values);
          setStudentSheet(null);
        }}
      />

      <StudentRecordSheet
        open={!!generateFor}
        onClose={() => setGenerateFor(null)}
        student={generateFor}
        templateMap={templateMap}
        templateName={selectedTemplate.name}
        templateBytes={templateBytes}
        instructor={instructor}
        initialConfig={generateFor ? recordConfigByStudent[generateFor.id] : undefined}
        onGenerated={(bytes, config) => handleGenerated(generateFor, bytes, config)}
      />
    </div>
  );
}
