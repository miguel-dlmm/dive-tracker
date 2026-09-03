import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Check } from "lucide-react";
import { TEAL } from "../App";
import { inputCls, Field } from "../shared";

// Extraído aquí (Release V1, 2026-09-02) al añadir el tercer sitio que
// necesitaba exactamente este mismo campo de contraseña con
// mostrar/ocultar y esta misma fila de requisito con feedback en vivo —
// CreatePasswordScreen y ResetPasswordScreen ya lo duplicaban a propósito
// mientras solo eran dos, pero un tercero (ForcedPasswordUpdateScreen, el
// "hemos reforzado la seguridad" que ven las cuentas ya existentes) cruza
// el umbral donde seguir copiando deja de compensar frente a compartirlo.

// Fila de un requisito de contraseña con feedback en vivo: círculo relleno
// con check cuando se cumple, anillo vacío cuando no.
export function RequirementRow({ met, children }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: met ? TEAL : "#9CA3AF" }}>
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${met ? "" : "border border-gray-300"}`}
        style={met ? { backgroundColor: TEAL } : undefined}
        aria-hidden="true"
      >
        {met && <Check size={9} className="text-white" strokeWidth={3} />}
      </span>
      {children}
    </div>
  );
}

// Campo de contraseña con botón de mostrar/ocultar (reduce la ansiedad de
// "¿lo he escrito bien?" sin depender solo del campo de confirmación — ver
// recomendación de NN/g sobre creación de contraseñas).
export function PasswordField({ label, value, onChange, autoComplete, autoFocus, visible, onToggleVisible }) {
  const { t } = useTranslation("auth");
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className={`${inputCls} w-full pr-11`}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? t("password.hidePassword") : t("password.showPassword")}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600"
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
    </Field>
  );
}
