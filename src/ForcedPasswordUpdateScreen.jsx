import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Waves, Loader2 } from "lucide-react";
import { NAVY, TEAL, BG, BODY_FONT } from "./App";
import { PasswordField, RequirementRow } from "./auth/PasswordFields";
import { PASSWORD_MIN_LENGTH, hasUppercase, hasSymbol } from "./passwordPolicy";

// Pantalla de "actualiza tu contraseña" para cuentas YA EXISTENTES cuya
// contraseña actual no cumple la política reforzada (1 mayúscula + 1
// símbolo, ver passwordPolicy.js) — pedido explícito del usuario
// 2026-09-02: "para las cuentas ya creadas, la primera vez que entren si
// la contraseña no cumple, debería ir a la pantalla de crear contraseña,
// sin bases legales y explicando claramente que tienen que crear la
// contraseña porque se ha reforzado la seguridad de la aplicación".
//
// Deliberadamente SEPARADA de CreatePasswordScreen (primer acceso, con
// bases legales) y de ResetPasswordScreen (recuperación autoservicio, sin
// enlace de activación de por medio): esta pantalla aparece DESPUÉS de un
// login normal con credenciales correctas — la sesión ya existe, así que
// onSubmit es completePasswordChange() de useSession.js directamente
// (supabase.auth.updateUser), no activateAccount ni resetPassword. Nunca
// pide bases legales (ya se aceptaron en su momento) ni un enlace de un
// solo uso (no hace falta, la persona ya demostró conocer su contraseña
// actual al iniciar sesión).
//
// Limitación real, documentada aquí porque no es evidente desde fuera:
// solo se puede comprobar la política contra la contraseña en texto plano
// que la persona ACABA de escribir en el login (ver signIn en
// useSession.js) — Supabase Auth nunca expone la contraseña de una cuenta
// ya creada para comprobarla fuera de ese instante. Una sesión ya
// restaurada de una recarga anterior no vuelve a pasar por esta
// comprobación hasta el siguiente login explícito.
export default function ForcedPasswordUpdateScreen({ onSubmit }) {
  const { t } = useTranslation("auth");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lengthOk = password.length >= PASSWORD_MIN_LENGTH;
  const uppercaseOk = hasUppercase(password);
  const symbolOk = hasSymbol(password);
  const matchOk = confirm.length > 0 && password === confirm;
  const canSubmit = lengthOk && uppercaseOk && symbolOk && matchOk && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await onSubmit(password);
    } catch (err) {
      setError(err.message || t("forcedPasswordUpdate.genericError"));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-start justify-center px-5 py-10" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${TEAL}1A` }}>
            <Waves size={22} style={{ color: TEAL }} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="text-center leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEAL }}>{t("forcedPasswordUpdate.eyebrow")}</p>
            <h1 className="mt-1 text-lg font-bold tracking-tight" style={{ color: NAVY }}>{t("forcedPasswordUpdate.title")}</h1>
          </div>
        </div>

        <p className="mb-6 text-center text-sm text-gray-500">
          {t("forcedPasswordUpdate.description")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <PasswordField
            label={t("forcedPasswordUpdate.newPasswordLabel")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
          />

          <div className="space-y-1 rounded-md bg-gray-50 px-3 py-2.5">
            <RequirementRow met={lengthOk}>{t("password.lengthRequirement")}</RequirementRow>
            <RequirementRow met={uppercaseOk}>{t("password.uppercaseRequirement")}</RequirementRow>
            <RequirementRow met={symbolOk}>{t("password.symbolRequirement")}</RequirementRow>
            <RequirementRow met={matchOk}>{t("password.matchRequirement")}</RequirementRow>
          </div>

          <PasswordField
            label={t("forcedPasswordUpdate.confirmPasswordLabel")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            visible={showConfirm}
            onToggleVisible={() => setShowConfirm((v) => !v)}
          />

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: TEAL }}
          >
            {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {t("forcedPasswordUpdate.submit")}
          </button>

          <p className="text-center text-[11px] text-gray-400">
            {t("forcedPasswordUpdate.footNote")}
          </p>
        </form>
      </div>
    </div>
  );
}
