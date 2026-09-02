import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Loader2, Download } from "lucide-react";
import { Sheet, useToast } from "../shared";
import { TEAL } from "../App";
import { fillTrainingRecordPdf } from "./pdfFill";
import SignatureCapture from "./SignatureCapture";

// Valores por defecto de un registro nuevo, sin nada rellenado todavía —
// separado en su propia función porque hace falta tanto al montar (primera
// vez que se abre para este alumno) como para "olvidar" el estado del
// alumno anterior al reabrir la hoja para uno distinto (ver el useEffect
// más abajo).
function buildDefaultConfig(templateMap) {
  return {
    includedRows: (templateMap?.sessionRows || []).map((row) => !row.optional),
    examVersion: null,
    upgrade: templateMap?.upgradeCheckboxes ? "openWaterDiver" : null,
    courseVariant: null,
    examConfirmed: false,
    specialtyDives: (templateMap?.optionalSpecialtyDives || []).map(() => ({ specialtyName: "", poolNeeded: false, completed: false })),
    signatures: { studentPng: null, parentPng: null, instructorPng: null },
  };
}

// Fila de progreso genérica (Sesiones Académicas, Inmersión de Formación en
// Aguas Abiertas 1, Confirmación de Examen Final...) — en vez de pedir
// fecha/iniciales sueltas por fila (no hay fecha todavía, ver pdfFill.js),
// el instructor solo marca "completada": si lo está, la fila se rellena con
// las iniciales del alumno (autogeneradas del roster) y los datos del
// instructor ya configurados arriba, sin tener que volver a teclearlos fila
// a fila. Una fila opcional (curso hecho en menos sesiones de las
// habituales) empieza sin marcar; una obligatoria empieza marcada.
function ProgressRowToggle({ label, checked, onChange }) {
  return (
    <label className="flex min-h-11 items-center gap-2.5 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 shrink-0 rounded border-gray-300" style={{ accentColor: TEAL }} />
      <span className="flex-1">{label}</span>
    </label>
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

// initialConfig (opcional): la configuración que ya se guardó la última vez
// que se generó el registro de ESTE alumno (ver recordConfigByStudent en
// TrainingRecordsTab.jsx) — permite reabrir la hoja para editarla y
// regenerar, en vez de perder todo lo ya marcado/firmado. Sin esto, esta
// hoja nunca se desmonta al cerrarla (Sheet solo oculta su contenido, ver
// shared.jsx), así que su estado local sobrevivía de un alumno al
// siguiente si no se reinicializaba explícitamente al abrir — pedido
// explícito del usuario 2026-09-02, tras encontrarlo confuso en el Preview
// real: "cuando edito, debería poder editar... la configuración del
// documento que me ofreciste justo antes de generar".
export default function StudentRecordSheet({ open, onClose, student, templateMap, templateName, templateBytes, instructor, initialConfig, onGenerated }) {
  const { t } = useTranslation("trainingRecords");
  const toast = useToast();
  // Inicializadores perezosos, no arrays/null vacíos: el useEffect de abajo
  // solo corre DESPUÉS del primer render, pero el JSX de plantillas con
  // inmersiones de especialidad (AOWD) ya lee specialtyDives[i].specialtyName
  // en ese primer render — con un array vacío de partida, eso revienta con
  // "Cannot read properties of undefined" antes de que el efecto llegue a
  // ejecutarse (pantalla en blanco total, sin ningún error visible en UI,
  // detectado con mobile-check-training-records.mjs). Sembrar aquí, en vez
  // de solo en el efecto, cubre ese primer render; el efecto sigue
  // haciendo falta para cuando esta misma instancia (nunca se desmonta al
  // cerrar, ver Sheet en shared.jsx) se reabre para un alumno distinto.
  const [includedRows, setIncludedRows] = useState(() => (initialConfig || buildDefaultConfig(templateMap)).includedRows);
  const [examVersion, setExamVersion] = useState(() => (initialConfig || buildDefaultConfig(templateMap)).examVersion);
  const [upgrade, setUpgrade] = useState(() => (initialConfig || buildDefaultConfig(templateMap)).upgrade);
  const [courseVariant, setCourseVariant] = useState(() => (initialConfig || buildDefaultConfig(templateMap)).courseVariant);
  const [examConfirmed, setExamConfirmed] = useState(() => (initialConfig || buildDefaultConfig(templateMap)).examConfirmed);
  const [specialtyDives, setSpecialtyDives] = useState(() => (initialConfig || buildDefaultConfig(templateMap)).specialtyDives);
  const [signatures, setSignatures] = useState(() => (initialConfig || buildDefaultConfig(templateMap)).signatures);
  const [generating, setGenerating] = useState(false);

  // Se reinicializa cada vez que se abre (y cada vez que cambia el alumno,
  // por si algún día se reabriera sin pasar por "cerrado" de por medio) —
  // desde su configuración ya guardada si existe, o desde los valores por
  // defecto de esta plantilla si es la primera vez para este alumno.
  useEffect(() => {
    if (!open || !templateMap) return;
    const cfg = initialConfig || buildDefaultConfig(templateMap);
    setIncludedRows(cfg.includedRows);
    setExamVersion(cfg.examVersion);
    setUpgrade(cfg.upgrade);
    setCourseVariant(cfg.courseVariant);
    setExamConfirmed(cfg.examConfirmed);
    setSpecialtyDives(cfg.specialtyDives);
    setSignatures(cfg.signatures);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reinicializar al abrir/cambiar de alumno, no en cada tecleo (initialConfig cambiaría de identidad en cada generate())
  }, [open, student?.id]);

  if (!templateMap || !student) return null;

  const toggleRow = (i, checked) => setIncludedRows((rows) => rows.map((v, idx) => (idx === i ? checked : v)));
  const updateDive = (i, patch) => setSpecialtyDives((dives) => dives.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const row = (studentInitials = true) => (studentInitials
    ? { studentInitials: student.initials, instructorInitials: instructor.initials, instructorNumber: instructor.number }
    : null);

  const generate = async () => {
    setGenerating(true);
    try {
      const data = {
        firstName: student.firstName,
        lastName: student.lastName,
        sessionRows: includedRows.map((included) => (included ? row() : null)),
        examVersion,
        upgrade,
        courseVariant,
        examConfirmation: templateMap.examConfirmation && examConfirmed ? row() : null,
        specialtyDives: specialtyDives.map((d) => {
          if (!d.specialtyName && !d.poolNeeded && !d.completed) return null;
          return {
            specialtyName: d.specialtyName,
            poolSession: d.poolNeeded ? row() : null,
            completed: d.completed ? row() : null,
          };
        }),
        instructor: { namePrinted: instructor.namePrinted, number: instructor.number },
        signatures,
      };
      const filledBytes = await fillTrainingRecordPdf(templateBytes, templateMap, data);
      // Config "cruda" tal como está en pantalla (distinta de `data`, que ya
      // trae filas/firmas traducidas al formato que espera pdfFill.js) — es
      // lo que se guarda para poder reabrir esta misma hoja más tarde y
      // seguir editando desde donde se dejó, en vez de perderlo al cerrar.
      onGenerated(filledBytes, { includedRows, examVersion, upgrade, courseVariant, examConfirmed, specialtyDives, signatures });
      toast?.success(t("studentSheet.generadoCorrectamente"));
    } catch (err) {
      console.error(err);
      toast?.error(t("studentSheet.noSePudoGenerar"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{student.firstName} {student.lastName}</h3>
          <p className="text-xs text-gray-400">{templateName}</p>
        </div>
        <button onClick={onClose} aria-label={t("studentSheet.cerrar")} className="text-gray-400"><X size={19} /></button>
      </div>

      <div className="space-y-4">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.progreso")}</h4>
          <div className="space-y-1.5">
            {templateMap.sessionRows.map((r, i) => (
              <ProgressRowToggle key={i} label={r.label} checked={includedRows[i]} onChange={(checked) => toggleRow(i, checked)} />
            ))}
          </div>
        </section>

        {templateMap.optionalSpecialtyDives && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.inmersionesEspecialidad")}</h4>
            <div className="space-y-3">
              {templateMap.optionalSpecialtyDives.map((dive, i) => (
                <div key={i} className="space-y-1.5 rounded-md border border-gray-200 p-2.5">
                  <p className="text-xs font-medium text-gray-500">{dive.label}</p>
                  <input
                    value={specialtyDives[i].specialtyName}
                    onChange={(e) => updateDive(i, { specialtyName: e.target.value })}
                    placeholder={t("studentSheet.nombreEspecialidadPlaceholder")}
                    className="min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                  <ProgressRowToggle label={t("studentSheet.sesionPiscinaNecesaria")} checked={specialtyDives[i].poolNeeded} onChange={(checked) => updateDive(i, { poolNeeded: checked })} />
                  <ProgressRowToggle label={t("studentSheet.inmersionCompletada")} checked={specialtyDives[i].completed} onChange={(checked) => updateDive(i, { completed: checked })} />
                </div>
              ))}
            </div>
          </section>
        )}

        {templateMap.examVersion && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.versionExamen")}</h4>
            <RadioChoice
              value={examVersion}
              onChange={setExamVersion}
              options={[
                { value: "printed", label: t("studentSheet.examenImpreso") },
                { value: "online", label: t("studentSheet.examenOnline") },
              ]}
            />
          </section>
        )}

        {templateMap.upgradeCheckboxes && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.certificacion")}</h4>
            <RadioChoice
              value={upgrade}
              onChange={setUpgrade}
              options={[
                { value: "openWaterDiver", label: t("studentSheet.openWaterDiver") },
                { value: "scubaDiver", label: t("studentSheet.scubaDiver") },
              ]}
            />
          </section>
        )}

        {templateMap.courseVariant && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.varianteCurso")}</h4>
            <RadioChoice
              value={courseVariant}
              onChange={setCourseVariant}
              options={[
                { value: "ean32", label: t("studentSheet.ean32") },
                { value: "ean40", label: t("studentSheet.ean40") },
              ]}
            />
          </section>
        )}

        {templateMap.examConfirmation && (
          <section>
            <ProgressRowToggle label={templateMap.examConfirmation.label} checked={examConfirmed} onChange={setExamConfirmed} />
          </section>
        )}

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.firmas")}</h4>
          <div className="space-y-3">
            <SignatureCapture label={t("studentSheet.firmaAlumno")} value={signatures.studentPng} onChange={(v) => setSignatures((s) => ({ ...s, studentPng: v }))} />
            <SignatureCapture label={t("studentSheet.firmaTutor")} value={signatures.parentPng} onChange={(v) => setSignatures((s) => ({ ...s, parentPng: v }))} optionalHint />
            <SignatureCapture label={t("studentSheet.firmaInstructor")} value={signatures.instructorPng} onChange={(v) => setSignatures((s) => ({ ...s, instructorPng: v }))} />
          </div>
        </section>

        <button
          onClick={generate}
          disabled={generating}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: TEAL }}
        >
          {generating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
          {generating ? t("studentSheet.generando") : t("studentSheet.generarYDescargar")}
        </button>
      </div>
    </Sheet>
  );
}
