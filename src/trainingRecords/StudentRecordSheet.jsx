import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Loader2, Download, ChevronRight, Award } from "lucide-react";
import { Sheet, Field, inputCls, DatePicker, Select, ConfirmDialog, useToast } from "../shared";
import { TEAL } from "../App";
import { computeInitials } from "../computeInitials";
import SignatureCapture from "../SignatureCapture";
import { fillTrainingRecordPdf } from "./pdfFill";
import { TEMPLATE_FIELD_MAPS } from "./templateFieldMaps";
import { buildDefaultConfig, validateRecordConfig, buildFillData } from "./recordConfig";

// Pestaña única de creación/edición (Release V1, Fase 5, lote 2026-09-02,
// pedido explícito del usuario: "me gusta el modelo planteado con el de
// cómo configurar el PDF") — sustituye a los dos pasos que había antes
// (StudentFormSheet + StudentRecordSheet, ahora fusionados aquí): datos del
// alumno, plantilla y configuración del documento son un único recorrido
// continuo dentro de la misma hoja, no dos hojas separadas. Se reutiliza
// para crear (mode="add") y para editar (mode="edit", initial=entrada del
// roster) — reabrir para editar restaura de verdad lo que ya había,
// alumno + plantilla + configuración completos, no solo el documento.
// dateValue/onDateChange (opcionales): cuando se pasan, la fila marcada
// muestra su propio selector de fecha justo debajo — cada item del
// progreso del curso lleva su fecha asociada, seteable a mano ahí mismo
// (pedido explícito del usuario, corrección 2026-09-02), sin agrupar
// varias filas bajo una fecha compartida de "Día 1"/"Día 2".
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

function FieldError({ message }) {
  if (!message) return null;
  return <p role="alert" className="mt-1 text-xs text-red-600">{message}</p>;
}

const emptyStudent = { firstName: "", lastName: "", guardianName: "", initials: "" };

// Cambiar de plantilla descarta toda la configuración del documento
// (fechas, progreso, firmas) — antes lo hacía sin avisar, un toque
// accidental en "Cambiar plantilla" podía tirar minutos de trabajo ya
// relleno sin posibilidad de deshacerlo (pedido explícito del usuario:
// "el cambiar de plantilla me resulta raro de utilizar"). Solo pide
// confirmación si de verdad hay algo que perder — si la plantilla se
// acaba de elegir y no se ha tocado nada más, cambiarla es gratis.
function configHasData(config) {
  if (!config) return false;
  if (Object.values(config.rowDates || {}).some(Boolean)) return true;
  if (config.examConfirmed || config.examConfirmedDate) return true;
  if (config.signatures?.studentPng || config.signatures?.parentPng) return true;
  if ((config.specialtyDives || []).some((d) => d.adventureId)) return true;
  return false;
}

export default function StudentRecordSheet({ open, onClose, mode, initial, templates, adventures, instructor, getTemplateBytes, onSaved }) {
  const { t } = useTranslation("trainingRecords");
  const toast = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [initials, setInitials] = useState("");
  const [initialsTouched, setInitialsTouched] = useState(false);
  const [studentErrors, setStudentErrors] = useState({});

  const [templateCode, setTemplateCode] = useState(null);
  const [config, setConfig] = useState(null);
  const [configErrors, setConfigErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const [confirmingTemplateChange, setConfirmingTemplateChange] = useState(false);

  // Se reinicializa cada vez que se abre — esta hoja nunca se desmonta
  // entre aperturas (Sheet solo oculta su contenido), así que sin esto el
  // estado de un alumno sobreviviría al siguiente.
  useEffect(() => {
    if (!open) return;
    const student = mode === "edit" && initial ? initial : emptyStudent;
    setFirstName(student.firstName || "");
    setLastName(student.lastName || "");
    setGuardianName(student.guardianName || "");
    setInitials(student.initials || "");
    setInitialsTouched(mode === "edit" && !!student.initials);
    setStudentErrors({});
    setTemplateCode(student.templateCode || null);
    setConfig(student.templateCode ? (student.config || buildDefaultConfig(TEMPLATE_FIELD_MAPS[student.templateCode])) : null);
    setConfigErrors({});
    setConfirmingTemplateChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir/cambiar de alumno
  }, [open, initial?.id, mode]);

  useEffect(() => {
    if (!initialsTouched) setInitials(computeInitials(firstName, lastName));
  }, [firstName, lastName, initialsTouched]);

  const templateMap = templateCode ? TEMPLATE_FIELD_MAPS[templateCode] : null;

  const selectTemplate = (code) => {
    setTemplateCode(code);
    setConfig(buildDefaultConfig(TEMPLATE_FIELD_MAPS[code]));
    setConfigErrors({});
  };

  const clearTemplate = () => {
    setTemplateCode(null);
    setConfig(null);
    setConfigErrors({});
  };

  const requestTemplateChange = () => {
    if (configHasData(config)) setConfirmingTemplateChange(true);
    else clearTemplate();
  };

  const updateConfig = (patch) => setConfig((c) => ({ ...c, ...patch }));
  const toggleRow = (i, checked) => setConfig((c) => ({ ...c, includedRows: c.includedRows.map((v, idx) => (idx === i ? checked : v)) }));
  const setRowDate = (i, value) => setConfig((c) => ({ ...c, rowDates: { ...c.rowDates, [i]: value } }));
  const updateDive = (i, patch) => setConfig((c) => ({ ...c, specialtyDives: c.specialtyDives.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) }));
  // Forma funcional a propósito, nunca "{ ...config.signatures, [key]: v }"
  // leyendo `config` del cierre externo: SignatureCapture solo suscribe su
  // "endStroke" una vez al montar (ver SignatureCapture.jsx), así que su
  // `onChange` queda fijado al `config` de ese primer render. Con dos
  // instancias (alumno y tutor) en la misma hoja, firmar la segunda con un
  // `onChange` que lea `config` del cierre pisaba la firma ya guardada de
  // la primera con el `null` que tenía en el momento de montar — bug real
  // reportado por el usuario ("la firma del tutor no sale"). Leer `c` (el
  // estado real en el momento de aplicar el cambio) en vez de `config`
  // evita el problema sea cual sea el orden en que se firme.
  const setSignature = (key) => (v) => setConfig((c) => ({ ...c, signatures: { ...c.signatures, [key]: v } }));

  const validateStudent = () => {
    const errors = {};
    if (!firstName.trim()) errors.firstName = t("studentForm.errores.nombre");
    if (!lastName.trim()) errors.lastName = t("studentForm.errores.apellidos");
    if (!initials.trim()) errors.initials = t("studentForm.errores.iniciales");
    setStudentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generate = async () => {
    // Las dos validaciones se lanzan juntas, no en cascada — con
    // validateStudent() cortando el paso antes de llegar a
    // validateRecordConfig(), corregir el nombre y volver a pulsar
    // "Generar" revelaba una tanda nueva de avisos que no se habían visto
    // la primera vez ("los mensajes de error... salen raros", pedido
    // explícito del usuario). Así se ven todos a la vez, de una sola vez.
    const studentValid = validateStudent();
    if (!templateCode) return;
    const { valid: configValid, errors } = validateRecordConfig(templateMap, config);
    setConfigErrors(errors);
    if (!studentValid || !configValid) {
      toast?.error(t("studentSheet.faltanCampos"));
      return;
    }
    setGenerating(true);
    try {
      const templateBytes = await getTemplateBytes(templateCode);
      const student = { firstName: firstName.trim(), lastName: lastName.trim(), initials: initials.trim() };
      const data = buildFillData(templateMap, student, config, instructor);
      const pdfBytes = await fillTrainingRecordPdf(templateBytes, templateMap, data);
      onSaved({
        id: mode === "edit" ? initial.id : crypto.randomUUID(),
        firstName: student.firstName,
        lastName: student.lastName,
        guardianName: guardianName.trim(),
        initials: student.initials,
        templateCode,
        config,
        pdfBytes,
        generatedAt: Date.now(),
      });
      toast?.success(t("studentSheet.generadoCorrectamente"));
    } catch (err) {
      console.error(err);
      toast?.error(t("studentSheet.noSePudoGenerar"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
    <Sheet open={open} onClose={onClose}>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{mode === "edit" ? t("studentForm.editarAlumno") : t("studentForm.nuevoAlumno")}</h3>
        <button onClick={onClose} aria-label={t("studentSheet.cerrar")} className="text-gray-400"><X size={19} /></button>
      </div>

      <div className="space-y-5">
        <section className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Field label={t("studentForm.nombre")}>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`${inputCls} w-full`} />
              </Field>
              <FieldError message={studentErrors.firstName} />
            </div>
            <div>
              <Field label={t("studentForm.apellidos")}>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={`${inputCls} w-full`} />
              </Field>
              <FieldError message={studentErrors.lastName} />
            </div>
          </div>
          <Field label={t("studentForm.tutor")} hint={t("studentForm.tutorHint")}>
            <input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className={`${inputCls} w-full`} />
          </Field>
          <div>
            <Field label={t("studentForm.iniciales")} hint={t("studentForm.inicialesHint")}>
              <input
                value={initials}
                onChange={(e) => { setInitialsTouched(true); setInitials(e.target.value.toUpperCase()); }}
                className={`${inputCls} w-full`}
              />
            </Field>
            <FieldError message={studentErrors.initials} />
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentForm.plantilla")}</h4>
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
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.progreso")}</h4>
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
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.inmersionesEspecialidad")}</h4>
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
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.versionExamen")}</h4>
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
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.certificacion")}</h4>
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
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.varianteCurso")}</h4>
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
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.firmas")}</h4>
              <div className="space-y-3">
                <div>
                  <SignatureCapture label={t("studentSheet.firmaAlumno")} value={config.signatures.studentPng} onChange={setSignature("studentPng")} />
                  <FieldError message={configErrors.studentSignature} />
                </div>
                <SignatureCapture label={t("studentSheet.firmaTutor")} value={config.signatures.parentPng} onChange={setSignature("parentPng")} optionalHint />
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
          </>
        )}
      </div>
    </Sheet>
    <ConfirmDialog
      open={confirmingTemplateChange}
      title={t("studentForm.confirmarCambioPlantilla.titulo")}
      message={t("studentForm.confirmarCambioPlantilla.mensaje")}
      confirmLabel={t("studentForm.confirmarCambioPlantilla.confirmar")}
      onCancel={() => setConfirmingTemplateChange(false)}
      onConfirm={() => { setConfirmingTemplateChange(false); clearTemplate(); }}
    />
    </>
  );
}
