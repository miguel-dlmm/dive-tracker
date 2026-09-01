import React, { useEffect, useState } from "react";
import { Pencil, Eye, EyeOff, Loader2, Trash2, Check } from "lucide-react";
import { NAVY, TEAL, CORAL } from "./colors";
import { Field, inputCls, EditActions, Avatar, useToast, ConfirmDialog, Select, getFavoriteCurrency, setFavoriteCurrency, useEscapeClose, useBodyScrollLock } from "./shared";
import { AVATAR_ICONS, AVATAR_COLORS, resolveAvatar } from "./avatarCatalog";
import { supabase } from "./supabaseClient";

// Pantalla "Mi perfil" (Bloque 5, 2026-09-01) — pantalla secundaria como
// Configuración/Ayuda (ver App.jsx, SECONDARY_TITLES), no un modal Sheet:
// la cabecera "‹ Mi perfil" + "X" ya la pone AppShell, este componente
// empieza directo en el contenido, mismo patrón que ConfigTab.jsx/HelpTab.jsx.
//
// Escribe en `profiles` directamente vía supabase.from() (no hay
// server/api de por medio, a diferencia de alta/borrado de OTRAS cuentas):
// la policy "update own or admin updates any" (schema.sql) ya permite a
// cualquier usuario editar su propia fila, y protect_profile_roles_trigger
// solo protege is_admin/is_superadmin, columnas que esta pantalla nunca
// toca. onProfileUpdated (useSession.updateProfile) mantiene el resto de
// la app (cabecera, avatar) sincronizado sin recargar la página.

function friendlyProfileError(err) {
  if (err?.code === "23505" || err?.message?.includes("profiles_nickname_lower_key")) return "Ese nickname ya está en uso.";
  if (err?.message?.includes("profiles_nickname_no_at")) return 'El nickname no puede contener "@".';
  return "No se pudo guardar. Inténtalo de nuevo.";
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold" style={{ color: NAVY }}>{title}</h3>
      {children}
    </div>
  );
}

function AvatarPicker({ profile, onProfileUpdated }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const saved = resolveAvatar(profile);
  // Corrección 5/7 (2026-09-01): antes, pulsar cualquier icono/color
  // guardaba al instante y cerraba el selector — no dejaba probar
  // combinaciones. Ahora el selector trabaja sobre un borrador local
  // (draftIcon/draftColor) que solo se escribe en Supabase al pulsar
  // "Guardar" (EditActions, mismo patrón que el resto de ediciones de la
  // app); "Cancelar" descarta el borrador y no toca nada. Se reinicializa
  // desde `saved` cada vez que se abre, así que reabrir tras cancelar
  // siempre parte del valor real guardado, nunca de un borrador viejo.
  const [draftIcon, setDraftIcon] = useState(saved.icon);
  const [draftColor, setDraftColor] = useState(saved.color);

  const openPicker = () => {
    setDraftIcon(saved.icon);
    setDraftColor(saved.color);
    setOpen(true);
  };

  const cancel = () => setOpen(false);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ avatar_icon: draftIcon, avatar_color: draftColor }).eq("user_id", profile.user_id);
      if (error) throw error;
      onProfileUpdated?.({ avatar_icon: draftIcon, avatar_color: draftColor });
      toast?.success("Avatar actualizado");
      setOpen(false);
    } catch {
      toast?.error("No se pudo guardar el avatar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // El avatar grande de arriba refleja el borrador mientras el selector
  // está abierto (para poder ver el resultado de lo que se está probando)
  // y el valor guardado en cualquier otro momento — nunca un estado a
  // medias tras cancelar.
  const preview = open ? { icon: draftIcon, color: draftColor } : saved;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={() => (open ? cancel() : openPicker())}
        aria-label={open ? "Cerrar selector de avatar" : "Cambiar avatar"}
        className="relative -m-1 flex min-h-11 min-w-11 items-center justify-center rounded-full p-1"
      >
        <Avatar icon={preview.icon} color={preview.color} size={72} />
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-white"
          style={{ backgroundColor: TEAL }}
        >
          <Pencil size={12} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div className="w-full space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex flex-wrap justify-center gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => setDraftColor(c.value)}
                aria-label={`Color ${c.name}`}
                aria-pressed={draftColor === c.value}
                disabled={saving}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full disabled:opacity-50"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: c.value, outline: draftColor === c.value ? `2px solid ${NAVY}` : "none", outlineOffset: 2 }}
                >
                  {draftColor === c.value && <Check size={14} className="text-white" aria-hidden="true" />}
                </span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {AVATAR_ICONS.map(({ name, Icon }) => (
              <button
                key={name}
                onClick={() => setDraftIcon(name)}
                aria-label={`Icono ${name}`}
                aria-pressed={draftIcon === name}
                disabled={saving}
                className="flex min-h-11 items-center justify-center rounded-md border disabled:opacity-50"
                style={{ borderColor: draftIcon === name ? draftColor : "#E5E7EB", backgroundColor: draftIcon === name ? `${draftColor}1A` : "white" }}
              >
                <Icon size={18} style={{ color: draftIcon === name ? draftColor : "#9CA3AF" }} aria-hidden="true" />
              </button>
            ))}
          </div>
          <EditActions onSave={save} onCancel={cancel} saveLabel={saving ? "Guardando…" : "Guardar"} />
        </div>
      )}
    </div>
  );
}

function PersonalDataSection({ profile, onProfileUpdated }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(profile.first_name || "");
  const [lastName, setLastName] = useState(profile.last_name || "");
  const [nickname, setNickname] = useState(profile.nickname || "");

  const startEdit = () => {
    setFirstName(profile.first_name || "");
    setLastName(profile.last_name || "");
    setNickname(profile.nickname || "");
    setEditing(true);
  };

  const save = async () => {
    if (!nickname.trim() || nickname.includes("@")) return;
    setSaving(true);
    try {
      const patch = { first_name: firstName.trim() || null, last_name: lastName.trim() || null, nickname: nickname.trim() };
      const { error } = await supabase.from("profiles").update(patch).eq("user_id", profile.user_id);
      if (error) throw error;
      onProfileUpdated?.(patch);
      toast?.success("Perfil actualizado");
      setEditing(false);
    } catch (err) {
      toast?.error(friendlyProfileError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <SectionCard title="Datos personales">
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-400">Nombre:</span> {profile.first_name || "—"} {profile.last_name || ""}</p>
          <p><span className="text-gray-400">Nickname:</span> {profile.nickname}</p>
        </div>
        <button onClick={startEdit} className="mt-3 flex min-h-11 items-center gap-1.5 text-sm font-medium" style={{ color: TEAL }}>
          <Pencil size={14} aria-hidden="true" /> Editar
        </button>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Datos personales">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Nombre"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`${inputCls} w-full`} /></Field>
        <Field label="Apellidos"><input value={lastName} onChange={(e) => setLastName(e.target.value)} className={`${inputCls} w-full`} /></Field>
      </div>
      <Field label="Nickname">
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} className={`${inputCls} w-full`} />
      </Field>
      {nickname.includes("@") && <p role="alert" className="-mt-2 text-xs text-red-600">No puede contener "@".</p>}
      <div className="mt-3">
        <EditActions onSave={save} onCancel={() => setEditing(false)} saveLabel={saving ? "Guardando…" : "Guardar"} />
      </div>
    </SectionCard>
  );
}

function CurrencySection({ profile, currencies }) {
  const toast = useToast();
  const [favorite, setFavoriteState] = useState(() => getFavoriteCurrency(profile.user_id));

  // Inicializa la moneda favorita de un usuario que todavía no ha elegido
  // ninguna con la moneda favorita global de la app (currencies.is_default)
  // — mismo respaldo que ya usaba "Ajuste de curso" (ADR-0007), pero ahora
  // se fija de verdad la primera vez que abre Mi perfil, en vez de quedar
  // en blanco pese a que el resto de la app ya la estuviera usando de
  // facto. No es una segunda fuente de verdad: sigue derivándose de
  // currencies.is_default, solo que ahora se persiste como punto de
  // partida real. Espera a que currencies esté cargada (evita fijar "" en
  // el primer render, antes de que lleguen las filas).
  useEffect(() => {
    if (favorite || !currencies.loaded) return;
    const globalDefault = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code;
    if (!globalDefault) return;
    setFavoriteCurrency(profile.user_id, globalDefault);
    setFavoriteState(globalDefault);
  }, [favorite, currencies.loaded, currencies.rows, profile.user_id]);

  const choose = (code) => {
    setFavoriteCurrency(profile.user_id, code);
    setFavoriteState(code);
    toast?.success("Moneda favorita actualizada");
  };

  // Select (shared.jsx) trabaja con opciones-string planas, no {value,label}
  // — "EUR — Euro (€)" es tanto lo que se ve como lo que se guarda; el
  // código se extrae de los 3 primeros caracteres al elegir.
  const labelFor = (c) => `${c.code} — ${c.name} (${c.symbol})`;
  const options = currencies.rows.map(labelFor);
  const currentLabel = currencies.rows.find((c) => c.code === favorite);

  return (
    <SectionCard title="Moneda favorita">
      <p className="mb-3 text-xs text-gray-400">
        Se usa como moneda por defecto en Ajuste de curso, cuando no hay una tarifa que la determine. El resto de movimientos siempre usan la moneda de su tarifa.
      </p>
      <Select
        value={currentLabel ? labelFor(currentLabel) : ""}
        onChange={(label) => choose(label ? label.slice(0, label.indexOf(" —")) : "")}
        options={options}
        placeholder="Sin elegir — usa la moneda por defecto de la app"
      />
    </SectionCard>
  );
}

// Corrección 3/7 (2026-09-01): antes cambiaba la contraseña sin pedir la
// actual — cualquiera con la sesión abierta (p. ej. un móvil desbloqueado
// ajeno) podía cambiarla sin demostrar conocerla. Ahora exige "Contraseña
// actual" y la verifica de verdad antes de aplicar la nueva: supabase-js
// no expone un "verifyPassword" aparte, así que la única forma soportada
// de comprobarla es un signInWithPassword real contra el email de la
// sesión — reautentica a la misma persona, no cambia de cuenta ni de
// sesión de forma insegura. Si falla, error específico junto al campo
// ("Contraseña actual incorrecta"), sin tocar la contraseña nueva.
//
// También corrige el layout: con "Nueva contraseña" como primer campo
// pulsable de la sección, el propio banner de sugerencias de contraseña
// de iOS podía solaparse con él (reportado en prueba real en iPhone) —
// añadir "Contraseña actual" encima le da el espacio que le faltaba, y de
// paso se quita el margen negativo (-mt-1) que apretaba la fila de
// requisitos contra "Confirmar contraseña".
function PasswordSection() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const lengthOk = password.length >= 8;
  const matchOk = confirm.length > 0 && password === confirm;
  const canSave = currentPassword.length > 0 && lengthOk && matchOk && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (!email) throw new Error("no-session");

      const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (reauthError) {
        setError("Contraseña actual incorrecta.");
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError && updateError.code !== "same_password") throw updateError;
      toast?.success("Contraseña actualizada");
      setCurrentPassword(""); setPassword(""); setConfirm("");
    } catch {
      toast?.error("No se pudo cambiar la contraseña. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Seguridad">
      <div className="space-y-3">
      <Field label="Contraseña actual">
        <div className="relative">
          <input
            type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password" className={`${inputCls} w-full pr-11`}
          />
          <button type="button" onClick={() => setShowCurrent((v) => !v)} aria-label={showCurrent ? "Ocultar contraseña actual" : "Mostrar contraseña actual"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400">
            {showCurrent ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      </Field>
      <Field label="Nueva contraseña">
        <div className="relative">
          <input
            type={visible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password" className={`${inputCls} w-full pr-11`}
          />
          <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400">
            {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      </Field>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1" style={{ color: lengthOk ? TEAL : "#9CA3AF" }}>
          {lengthOk && <Check size={12} aria-hidden="true" />} Mínimo 8 caracteres
        </span>
        <span className="flex items-center gap-1" style={{ color: matchOk ? TEAL : "#9CA3AF" }}>
          {matchOk && <Check size={12} aria-hidden="true" />} Las contraseñas coinciden
        </span>
      </div>
      <Field label="Confirmar contraseña">
        <input type={visible ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={`${inputCls} w-full`} />
      </Field>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button
        onClick={save} disabled={!canSave}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: TEAL }}
      >
        {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />} Cambiar contraseña
      </button>
      </div>
    </SectionCard>
  );
}

// Palabra que hay que escribir en el segundo paso para confirmar el
// borrado (Release V1, Fase 1 — encargo explícito del usuario). Segundo
// paso separado del ConfirmDialog habitual (en vez de añadirle un campo de
// texto) a propósito: ConfirmDialog es un componente compartido por todo
// tipo de confirmaciones de borrado sencillas (una fila de una lista) y
// esta es la única eliminación de la app con un paso de más — meterle esta
// lógica encarecería el componente compartido para un único consumidor
// real. El botón para abortar este segundo paso dice "Volver", no
// "Cancelar": con la palabra a escribir siendo literalmente "CANCELAR",
// un botón "Cancelar" justo al lado sería confuso de leer rápido (regla
// permanente de manos mojadas, CLAUDE.md).
const DELETE_ACCOUNT_WORD = "CANCELAR";

function PrivacySection({ profile, onAccountDeleted }) {
  const toast = useToast();
  const [step, setStep] = useState(null); // null | "confirm" | "type-word"
  const [wordInput, setWordInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setStep(null); setWordInput(""); setError(""); };
  useEscapeClose(step === "type-word", loading ? () => {} : reset);
  useBodyScrollLock(step === "type-word");

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/delete-own-account", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || "No se pudo eliminar la cuenta. Inténtalo de nuevo.");
        setLoading(false);
        return;
      }
      toast?.success("Cuenta eliminada");
      onAccountDeleted?.();
    } catch {
      setError("No se pudo eliminar la cuenta. Comprueba tu conexión e inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Privacidad">
      <p className="mb-3 text-xs text-gray-500">
        Eliminar tu cuenta borra tu acceso y todos tus datos de Ocean Flow de forma permanente: escuelas, cursos, tarifas, registro de clases, comisiones y ajustes con compañeros. No se conserva ninguna copia. Esta acción no se puede deshacer.
      </p>
      <button
        onClick={() => setStep("confirm")}
        className="flex min-h-11 items-center gap-1.5 rounded-md border border-red-200 px-3 text-sm font-medium text-red-600"
      >
        <Trash2 size={14} aria-hidden="true" /> Eliminar mi cuenta
      </button>
      <ConfirmDialog
        open={step === "confirm"}
        title="¿Eliminar tu cuenta?"
        message={`Vas a eliminar la cuenta "${profile.nickname}" y todos sus datos de forma permanente. No podrás deshacer esta acción.`}
        confirmLabel="Continuar"
        onConfirm={() => setStep("type-word")}
        onCancel={reset}
      />
      {step === "type-word" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={loading ? undefined : reset}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-word-title"
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-word-title" className="mb-1 text-sm font-semibold text-gray-800">Última comprobación</h3>
            <p className="mb-3 text-sm text-gray-500">
              Escribe <strong>{DELETE_ACCOUNT_WORD}</strong> para confirmar que quieres eliminar tu cuenta de forma permanente.
            </p>
            <input
              type="text"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              aria-label={`Escribe ${DELETE_ACCOUNT_WORD} para confirmar`}
              placeholder={DELETE_ACCOUNT_WORD}
              className={`${inputCls} mb-4 w-full`}
            />
            {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={reset} disabled={loading} className="min-h-11 rounded-md border border-gray-200 px-3.5 text-sm font-medium text-gray-600 disabled:opacity-50">
                Volver
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || wordInput !== DELETE_ACCOUNT_WORD}
                className="flex min-h-11 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: CORAL }}
              >
                {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                Eliminar cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export default function ProfileTab({ profile, currencies, onProfileUpdated, onAccountDeleted }) {
  if (!profile) return null;
  return (
    <div className="space-y-4 pb-16">
      <AvatarPicker profile={profile} onProfileUpdated={onProfileUpdated} />
      <PersonalDataSection profile={profile} onProfileUpdated={onProfileUpdated} />
      <CurrencySection profile={profile} currencies={currencies} />
      <PasswordSection />
      <PrivacySection profile={profile} onAccountDeleted={onAccountDeleted} />
    </div>
  );
}
