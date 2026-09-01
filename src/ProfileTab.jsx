import React, { useEffect, useState } from "react";
import { Pencil, Eye, EyeOff, Loader2, Trash2, Check } from "lucide-react";
import { NAVY, TEAL, CORAL } from "./colors";
import { Field, inputCls, EditActions, Avatar, useToast, ConfirmDialog, Select, getFavoriteCurrency, setFavoriteCurrency } from "./shared";
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
  const current = resolveAvatar(profile);

  const choose = async (icon, color) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ avatar_icon: icon, avatar_color: color }).eq("user_id", profile.user_id);
      if (error) throw error;
      onProfileUpdated?.({ avatar_icon: icon, avatar_color: color });
      toast?.success("Avatar actualizado");
      setOpen(false);
    } catch {
      toast?.error("No se pudo guardar el avatar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Cambiar avatar"
        className="relative -m-1 flex min-h-11 min-w-11 items-center justify-center rounded-full p-1"
      >
        <Avatar icon={current.icon} color={current.color} size={72} />
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
                onClick={() => choose(current.icon, c.value)}
                aria-label={`Color ${c.name}`}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-50"
                style={{ backgroundColor: c.value, outline: current.color === c.value ? `2px solid ${NAVY}` : "none", outlineOffset: 2 }}
              >
                {current.color === c.value && <Check size={14} className="text-white" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {AVATAR_ICONS.map(({ name, Icon }) => (
              <button
                key={name}
                onClick={() => choose(name, current.color)}
                aria-label={`Icono ${name}`}
                disabled={saving}
                className="flex min-h-11 items-center justify-center rounded-md border disabled:opacity-50"
                style={{ borderColor: current.icon === name ? current.color : "#E5E7EB", backgroundColor: current.icon === name ? `${current.color}1A` : "white" }}
              >
                <Icon size={18} style={{ color: current.icon === name ? current.color : "#9CA3AF" }} aria-hidden="true" />
              </button>
            ))}
          </div>
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

function PasswordSection() {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const lengthOk = password.length >= 8;
  const matchOk = confirm.length > 0 && password === confirm;
  const canSave = lengthOk && matchOk && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error && error.code !== "same_password") throw error;
      toast?.success("Contraseña actualizada");
      setPassword(""); setConfirm("");
    } catch {
      toast?.error("No se pudo cambiar la contraseña. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Seguridad">
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
      <div className="-mt-1 mb-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
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
      <button
        onClick={save} disabled={!canSave}
        className="mt-1 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: TEAL }}
      >
        {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />} Cambiar contraseña
      </button>
    </SectionCard>
  );
}

function PrivacySection({ profile, onAccountDeleted }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-1.5 rounded-md border border-red-200 px-3 text-sm font-medium text-red-600"
      >
        <Trash2 size={14} aria-hidden="true" /> Eliminar mi cuenta
      </button>
      <ConfirmDialog
        open={open}
        title="¿Eliminar tu cuenta?"
        message={`Vas a eliminar la cuenta "${profile.nickname}" y todos sus datos de forma permanente. No podrás deshacer esta acción.`}
        confirmLabel={loading ? "Eliminando…" : "Eliminar cuenta"}
        onConfirm={handleDelete}
        onCancel={() => { setOpen(false); setError(""); }}
        loading={loading}
      />
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
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
