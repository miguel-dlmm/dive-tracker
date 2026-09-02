import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Check, Plus } from "lucide-react";
import { Sheet, Field, inputCls } from "../shared";
import { TEAL } from "../App";
import { computeInitials } from "./computeInitials";

// Alta/edición de un alumno del roster — nunca se persiste (ver
// TrainingRecordsTab.jsx), solo vive en memoria mientras dura la sesión de
// generación. Las iniciales se autocalculan mientras el instructor no las
// haya tocado a mano — en cuanto edita el campo, dejan de recalcularse
// solas (mismo criterio que un slug editable junto a un título).
export default function StudentFormSheet({ open, onClose, initial, onSave }) {
  const { t } = useTranslation("trainingRecords");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [initials, setInitials] = useState("");
  const [initialsTouched, setInitialsTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName(initial?.firstName || "");
    setLastName(initial?.lastName || "");
    setInitials(initial?.initials || "");
    setInitialsTouched(!!initial?.initials);
  }, [open, initial]);

  useEffect(() => {
    if (!initialsTouched) setInitials(computeInitials(firstName, lastName));
  }, [firstName, lastName, initialsTouched]);

  const save = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    onSave({ firstName: firstName.trim(), lastName: lastName.trim(), initials: (initials || computeInitials(firstName, lastName)).trim() });
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{initial ? t("studentForm.editarAlumno") : t("studentForm.nuevoAlumno")}</h3>
        <button onClick={onClose} aria-label={t("studentForm.cerrar")} className="text-gray-400"><X size={19} /></button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Field label={t("studentForm.nombre")}>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`${inputCls} w-full`} onKeyDown={(e) => e.key === "Enter" && save()} />
        </Field>
        <Field label={t("studentForm.apellidos")}>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={`${inputCls} w-full`} onKeyDown={(e) => e.key === "Enter" && save()} />
        </Field>
        <div className="col-span-2">
          <Field label={t("studentForm.iniciales")} hint={t("studentForm.inicialesHint")}>
            <input
              value={initials}
              onChange={(e) => { setInitialsTouched(true); setInitials(e.target.value.toUpperCase()); }}
              className={`${inputCls} w-full`}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </Field>
        </div>
      </div>
      <button
        onClick={save}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white"
        style={{ backgroundColor: TEAL }}
      >
        {initial ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />} {t("studentForm.guardar")}
      </button>
    </Sheet>
  );
}
