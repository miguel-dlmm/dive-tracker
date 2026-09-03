import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Sheet, Field, inputCls } from "../shared";
import { TEAL } from "../App";
import { computeInitials } from "../computeInitials";
import SignatureCapture from "../SignatureCapture";
import { validateStudentFields } from "./recordConfig";

// Hoja de alumno — pedido explícito del usuario (rediseño 2026-09-03,
// "no es una configuración de Training Record por alumno, es una
// configuración de Training Record para un listado de alumnos"): la
// plantilla, el progreso del curso, las fechas y la versión de examen ya
// no se piden aquí — son la configuración COMPARTIDA de todo el listado
// (ver TrainingRecordsTab.jsx). Esta hoja solo pide lo que de verdad varía
// de un alumno a otro: nombre, apellidos, iniciales (calculadas) y firma
// (+ tutor, opcional). Sustituye a StudentRecordSheet.jsx.
const emptyStudent = { firstName: "", lastName: "", initials: "", studentSignature: null, isMinor: false, guardianName: "", guardianSignature: null };

function FieldError({ message }) {
  if (!message) return null;
  return <p role="alert" className="mt-1 text-xs text-red-600">{message}</p>;
}

export default function StudentQuickEntrySheet({ open, onClose, mode, initial, onSaved }) {
  const { t } = useTranslation("trainingRecords");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [initials, setInitials] = useState("");
  const [initialsTouched, setInitialsTouched] = useState(false);
  const [studentSignature, setStudentSignature] = useState(null);
  // "Menor de edad" (2026-09-04, pedido explícito de OW, aplicado a
  // cualquier plantilla): los datos del padre/madre/tutor solo se piden y
  // se muestran cuando esta casilla está marcada — antes eran un campo
  // "opcional" siempre visible, lo que no distinguía "no aplica" de
  // "se me olvidó rellenarlo". Al editar un alumno ya guardado ANTES de
  // este cambio (con guardianName/guardianSignature ya rellenos pero sin
  // isMinor todavía), se deriva isMinor de que ya hubiera algún dato de
  // tutor, para no "perder" esos datos de vista.
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianSignature, setGuardianSignature] = useState(null);
  const [errors, setErrors] = useState({});

  // Se reinicializa cada vez que se abre — esta hoja nunca se desmonta
  // entre aperturas (Sheet solo oculta su contenido), así que sin esto el
  // estado de un alumno sobreviviría al siguiente.
  useEffect(() => {
    if (!open) return;
    const student = mode === "edit" && initial ? initial : emptyStudent;
    setFirstName(student.firstName || "");
    setLastName(student.lastName || "");
    setInitials(student.initials || "");
    setInitialsTouched(mode === "edit" && !!student.initials);
    setStudentSignature(student.studentSignature || null);
    setIsMinor(student.isMinor ?? !!(student.guardianName || student.guardianSignature));
    setGuardianName(student.guardianName || "");
    setGuardianSignature(student.guardianSignature || null);
    setErrors({});
  }, [open, initial?.id, mode]);

  useEffect(() => {
    if (!initialsTouched) setInitials(computeInitials(firstName, lastName));
  }, [firstName, lastName, initialsTouched]);

  const save = () => {
    const student = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      initials: initials.trim(),
      studentSignature,
      isMinor,
      guardianName: isMinor ? guardianName.trim() : "",
      guardianSignature: isMinor ? guardianSignature : null,
    };
    const { valid, errors: validationErrors } = validateStudentFields(student);
    setErrors(validationErrors);
    if (!valid) return;
    onSaved({ id: mode === "edit" ? initial.id : crypto.randomUUID(), ...student });
  };

  return (
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
              <FieldError message={errors.firstName} />
            </div>
            <div>
              <Field label={t("studentForm.apellidos")}>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={`${inputCls} w-full`} />
              </Field>
              <FieldError message={errors.lastName} />
            </div>
          </div>
          <div>
            <Field label={t("studentForm.iniciales")} hint={t("studentForm.inicialesHint")}>
              <input
                value={initials}
                onChange={(e) => { setInitialsTouched(true); setInitials(e.target.value.toUpperCase()); }}
                className={`${inputCls} w-full`}
              />
            </Field>
            <FieldError message={errors.initials} />
          </div>
          <label className="flex min-h-11 items-center gap-2.5 text-sm text-gray-700">
            <input type="checkbox" checked={isMinor} onChange={(e) => setIsMinor(e.target.checked)} className="h-4 w-4 shrink-0 rounded border-gray-300" style={{ accentColor: TEAL }} />
            {t("studentForm.menorDeEdad")}
          </label>
          {isMinor && (
            <div>
              <Field label={t("studentForm.tutor")}>
                <input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className={`${inputCls} w-full`} />
              </Field>
              <FieldError message={errors.guardianName} />
            </div>
          )}
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("studentSheet.firmas")}</h4>
          <div className="space-y-3">
            <div>
              <SignatureCapture label={t("studentSheet.firmaAlumno")} value={studentSignature} onChange={setStudentSignature} />
              <FieldError message={errors.studentSignature} />
            </div>
            {isMinor && (
              <div>
                <SignatureCapture label={t("studentSheet.firmaTutor")} value={guardianSignature} onChange={setGuardianSignature} />
                <FieldError message={errors.guardianSignature} />
              </div>
            )}
          </div>
        </section>

        <button
          onClick={save}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: TEAL }}
        >
          {t("studentForm.guardarAlumno")}
        </button>
      </div>
    </Sheet>
  );
}
