import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Eye, EyeOff, Loader2, Trash2, Check, LogOut, Waves } from "lucide-react";
import * as Icons from "lucide-react";
import { NAVY, TEAL, AQUA, CORAL } from "./colors";
import { Field, inputCls, EditActions, Avatar, useToast, ConfirmDialog, Select, getFavoriteCurrency, setFavoriteCurrency, useEscapeClose, useBodyScrollLock } from "./shared";
import { AVATAR_ICONS, AVATAR_COLORS, resolveAvatar } from "./avatarCatalog";
import { supabase } from "./supabaseClient";
import i18n, { setStoredLanguage } from "./i18n";
import { computeInitials } from "./computeInitials";
import SignatureCapture from "./SignatureCapture";

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
//
// i18n (Release V1, Fase 2): namespace "profile" — un t() por sección, ya
// que cada sección es su propio componente. friendlyProfileError recibe
// `t` como parámetro porque vive fuera de cualquier componente (no puede
// llamar a useTranslation()).

function friendlyProfileError(err, t) {
  if (err?.code === "23505" || err?.message?.includes("profiles_nickname_lower_key")) return t("personalData.errors.nicknameTaken");
  if (err?.message?.includes("profiles_nickname_no_at")) return t("personalData.errors.nicknameAt");
  return t("personalData.errors.generic");
}

function SectionCard({ title, children, id }) {
  return (
    <div id={id} className="rounded-lg border border-gray-200 bg-white p-4 scroll-mt-20">
      <h3 className="mb-3 text-sm font-semibold" style={{ color: NAVY }}>{title}</h3>
      {children}
    </div>
  );
}

function AvatarPicker({ profile, onProfileUpdated }) {
  const { t } = useTranslation("profile");
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
      toast?.success(t("avatar.toastSuccess"));
      setOpen(false);
    } catch {
      toast?.error(t("avatar.toastError"));
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
        aria-label={open ? t("avatar.closeAvatarPicker") : t("avatar.changeAvatar")}
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
                aria-label={t("avatar.colorLabel", { name: c.name })}
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
          <div className="grid grid-cols-3 gap-2">
            {AVATAR_ICONS.map(({ name, Icon }) => (
              <button
                key={name}
                onClick={() => setDraftIcon(name)}
                aria-label={t("avatar.iconLabel", { name })}
                aria-pressed={draftIcon === name}
                disabled={saving}
                className="flex min-h-11 items-center justify-center rounded-md border disabled:opacity-50"
                style={{ borderColor: draftIcon === name ? draftColor : "#E5E7EB", backgroundColor: draftIcon === name ? `${draftColor}1A` : "white" }}
              >
                <Icon size={18} style={{ color: draftIcon === name ? draftColor : "#9CA3AF" }} aria-hidden="true" />
              </button>
            ))}
          </div>
          <EditActions onSave={save} onCancel={cancel} saveLabel={saving ? t("avatar.saving") : t("avatar.save")} />
        </div>
      )}
    </div>
  );
}

// Nivel profesional de buceo (2026-09-03, pedido explícito del usuario) —
// código guardado, no la etiqueta (mismo criterio que LANGUAGE_OPTIONS más
// abajo): taxonomía fija del sector, no configuración de negocio propia de
// cada cuenta (por eso no es una tabla catálogo editable por admin como
// Escuelas/Cursos). "Divemaster"/"Instructor" son términos de uso
// internacional en buceo, sin traducción real en contexto — mismo motivo
// por el que LANGUAGE_OPTIONS tampoco pasa "Español"/"English" por t().
const PROFESSIONAL_LEVEL_OPTIONS = [
  { code: "divemaster", label: "Divemaster" },
  { code: "instructor", label: "Instructor" },
];

function PersonalDataSection({ profile, onProfileUpdated }) {
  const { t } = useTranslation("profile");
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(profile.first_name || "");
  const [lastName, setLastName] = useState(profile.last_name || "");
  const [nickname, setNickname] = useState(profile.nickname || "");
  const [professionalLevel, setProfessionalLevel] = useState(profile.professional_level || "");

  const startEdit = () => {
    setFirstName(profile.first_name || "");
    setLastName(profile.last_name || "");
    setNickname(profile.nickname || "");
    setProfessionalLevel(profile.professional_level || "");
    setEditing(true);
  };

  const save = async () => {
    if (!nickname.trim() || nickname.includes("@")) return;
    setSaving(true);
    try {
      const patch = { first_name: firstName.trim() || null, last_name: lastName.trim() || null, nickname: nickname.trim(), professional_level: professionalLevel || null };
      // Iniciales de instructor autogeneradas desde nombre/apellidos al
      // guardar — pedido explícito del usuario, 2026-09-02 — pero solo si
      // todavía no hay ninguna guardada: que ya tengan un valor es la
      // señal de que el instructor las editó a mano, y esa edición nunca
      // se sobrescribe sola.
      if (!profile.instructor_initials && firstName.trim() && lastName.trim()) {
        patch.instructor_initials = computeInitials(firstName, lastName);
      }
      const { error } = await supabase.from("profiles").update(patch).eq("user_id", profile.user_id);
      if (error) throw error;
      onProfileUpdated?.(patch);
      toast?.success(t("personalData.toastSuccess"));
      setEditing(false);
    } catch (err) {
      toast?.error(friendlyProfileError(err, t));
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <SectionCard title={t("sections.personalData")}>
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-400">{t("personalData.nameLine")}</span> {profile.first_name || "—"} {profile.last_name || ""}</p>
          <p><span className="text-gray-400">{t("personalData.nicknameLine")}</span> {profile.nickname}</p>
          <p><span className="text-gray-400">{t("personalData.professionalLine")}</span> {PROFESSIONAL_LEVEL_OPTIONS.find((o) => o.code === profile.professional_level)?.label || "—"}</p>
        </div>
        <button onClick={startEdit} className="mt-3 flex min-h-11 items-center gap-1.5 text-sm font-medium" style={{ color: TEAL }}>
          <Pencil size={14} aria-hidden="true" /> {t("personalData.edit")}
        </button>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={t("sections.personalData")}>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("personalData.nameLabel")}><input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`${inputCls} w-full`} /></Field>
        <Field label={t("personalData.lastNameLabel")}><input value={lastName} onChange={(e) => setLastName(e.target.value)} className={`${inputCls} w-full`} /></Field>
      </div>
      <Field label={t("personalData.nicknameLabel")}>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} className={`${inputCls} w-full`} />
      </Field>
      {nickname.includes("@") && <p role="alert" className="-mt-2 text-xs text-red-600">{t("personalData.nicknameAtError")}</p>}
      <Field label={t("personalData.professionalLabel")}>
        <Select
          value={PROFESSIONAL_LEVEL_OPTIONS.find((o) => o.code === professionalLevel)?.label || ""}
          onChange={(label) => setProfessionalLevel(PROFESSIONAL_LEVEL_OPTIONS.find((o) => o.label === label)?.code || "")}
          options={PROFESSIONAL_LEVEL_OPTIONS.map((o) => o.label)}
          placeholder={t("personalData.professionalPlaceholder")}
        />
      </Field>
      <div className="mt-3">
        <EditActions onSave={save} onCancel={() => setEditing(false)} saveLabel={saving ? t("personalData.saving") : t("personalData.save")} />
      </div>
    </SectionCard>
  );
}

// Firma recortada a su contenido real — display-only, no toca lo que se
// guarda en Supabase (SignatureCapture sigue exportando el canvas
// COMPLETO tal cual, lo sigue usando igual el generador de Training
// Records). El canvas de captura es ancho y bajo (h-28 w-full,
// SignatureCapture.jsx) y exporta ese lienzo entero como PNG, margen
// transparente incluido — una firma pequeña centrada se veía diminuta
// dentro del hueco del carnet aunque ese hueco ya la mostrara "lo más
// grande posible": el problema era el margen en blanco ya horneado en
// la propia imagen, no el tamaño del hueco. Se recalcula una vez por
// firma (no en cada render) escaneando el canal alfa para encontrar el
// rectángulo real del trazo.
function useTrimmedSignature(dataUrl) {
  const [trimmed, setTrimmed] = useState(null);
  useEffect(() => {
    if (!dataUrl) { setTrimmed(null); return undefined; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0, found = false;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            if (data[(y * canvas.width + x) * 4 + 3] > 10) {
              found = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (!found) { setTrimmed(dataUrl); return; }
        const pad = 6;
        minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
        maxX = Math.min(canvas.width, maxX + pad); maxY = Math.min(canvas.height, maxY + pad);
        const w = maxX - minX, h = maxY - minY;
        const out = document.createElement("canvas");
        out.width = w; out.height = h;
        out.getContext("2d").drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
        setTrimmed(out.toDataURL("image/png"));
      } catch {
        setTrimmed(dataUrl);
      }
    };
    img.onerror = () => setTrimmed(dataUrl);
    img.src = dataUrl;
    return () => { cancelled = true; };
  }, [dataUrl]);
  return trimmed;
}

// Mini carnet del instructor (2026-09-03, pedido explícito del usuario):
// sustituye las 3 líneas de texto plano del modo visualización por algo
// que se parezca a un carnet real — inspirado en el carnet de SSI (fondo
// oscuro, avatar+nombre a la izquierda, un panel claro a la derecha),
// pero con identidad propia, no una copia: en vez de un QR (que no
// tenemos nada que codificar en él), ese hueco lo ocupa la firma real del
// instructor — es la pieza que de verdad autentica el carnet. Puramente
// presentacional — "Editar" vive fuera de este componente, en
// InstructorSection (mismo link con texto de siempre, ver más abajo): un
// icono superpuesto en la esquina del carnet se probó primero, pero el
// usuario lo encontró poco descubrible ("no me gusta ahí colocado,
// parece difícil de encontrar") y se volvió al patrón ya establecido en
// el resto de "Mi perfil".
function InstructorCard({ profile, initials, ssiProNumber, signature }) {
  const { t } = useTranslation("profile");
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.nickname;
  const avatar = resolveAvatar(profile);
  const AvatarIcon = Icons[avatar.icon] || Icons.Waves;
  const trimmedSignature = useTrimmedSignature(signature);
  // Nivel profesional real (Divemaster/Instructor, ver "Datos
  // personales") en vez del texto fijo "Instructor SSI" de antes —
  // pedido explícito del usuario: "refléjalo en el carnet". Sin nivel
  // elegido, se mantiene el genérico de siempre en vez de dejar la fila
  // en blanco.
  const professionalLabel = PROFESSIONAL_LEVEL_OPTIONS.find((o) => o.code === profile.professional_level)?.label;
  const roleText = professionalLabel ? t("instructor.card.roleWithLevel", { level: professionalLabel }) : t("instructor.card.role");

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 shadow-md"
      style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 65%, ${AQUA} 100%)` }}
    >
      {/* Barrido diagonal sutil — la única concesión "decorativa" a
          parecer un carnet físico (efecto laminado/holograma), sin
          imágenes ni dependencias nuevas: un solo gradiente radial
          semitransparente encima del fondo. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 60% at 15% 0%, rgba(255,255,255,0.16), transparent 60%)" }}
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-white/10">
            <AvatarIcon size={26} style={{ color: avatar.color }} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="line-clamp-2 text-base font-bold leading-tight text-white">{fullName}</p>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/70">{roleText}</p>
          </div>
        </div>
        {/* Firma en vez de QR — pedido explícito del usuario. */}
        <div className="flex h-16 w-24 shrink-0 flex-col items-center justify-center rounded-lg bg-white/95 p-1.5">
          {trimmedSignature ? (
            <img src={trimmedSignature} alt={t("instructor.card.signatureAlt", { name: fullName })} className="h-full w-full object-contain" />
          ) : (
            <span className="px-1 text-center text-[9px] font-medium leading-tight text-gray-400">{t("instructor.card.noSignature")}</span>
          )}
        </div>
      </div>
      <div className="relative mt-4 flex items-end justify-between border-t border-white/15 pt-3">
        <div className="flex gap-5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/55">{t("instructor.card.initialsLabel")}</p>
            <p className="text-sm font-bold tabular-nums text-white">{initials || "—"}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/55">{t("instructor.card.numberLabel")}</p>
            <p className="text-sm font-bold tabular-nums text-white">{ssiProNumber || "—"}</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-white/40" aria-hidden="true">
          <Waves size={16} />
        </span>
      </div>
    </div>
  );
}

// Datos de instructor para el generador de Training Records (Release V1,
// Fase 5, pedido explícito del usuario 2026-09-02): antes vivían en
// localStorage dentro de la propia pantalla de Training Records (por
// dispositivo); ahora viven en el perfil, mismo patrón de guardado que
// PersonalDataSection. El nombre impreso no se pide aquí — se deriva de
// first_name/last_name, que ya tiene su propia sección arriba, evita
// pedir el mismo dato dos veces.
function InstructorSection({ profile, onProfileUpdated }) {
  const { t } = useTranslation("profile");
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initials, setInitials] = useState(profile.instructor_initials || "");
  const [ssiProNumber, setSsiProNumber] = useState(profile.ssi_pro_number || "");
  const [signature, setSignature] = useState(profile.instructor_signature || null);

  const startEdit = () => {
    setInitials(profile.instructor_initials || "");
    setSsiProNumber(profile.ssi_pro_number || "");
    setSignature(profile.instructor_signature || null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const patch = { instructor_initials: initials.trim() || null, ssi_pro_number: ssiProNumber.trim() || null, instructor_signature: signature };
      const { error } = await supabase.from("profiles").update(patch).eq("user_id", profile.user_id);
      if (error) throw error;
      onProfileUpdated?.(patch);
      toast?.success(t("instructor.toastSuccess"));
      setEditing(false);
    } catch {
      toast?.error(t("instructor.toastError"));
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <SectionCard id="instructor-section" title={t("sections.instructor")}>
        <p className="mb-3 text-xs text-gray-400">{t("instructor.hint")}</p>
        <InstructorCard
          profile={profile}
          initials={profile.instructor_initials}
          ssiProNumber={profile.ssi_pro_number}
          signature={profile.instructor_signature}
        />
        {/* Editar vuelve a ser un link con texto debajo del carnet, no un
            icono superpuesto — pedido explícito del usuario tras probarlo:
            "no me gusta ahí colocado, parece difícil de encontrar". Mismo
            patrón exacto que el resto de "Mi perfil" (Datos personales,
            Idioma...), así que ahora es donde ya se espera encontrarlo. */}
        <button onClick={startEdit} className="mt-3 flex min-h-11 items-center gap-1.5 text-sm font-medium" style={{ color: TEAL }}>
          <Pencil size={14} aria-hidden="true" /> {t("instructor.edit")}
        </button>
      </SectionCard>
    );
  }

  return (
    <SectionCard id="instructor-section" title={t("sections.instructor")}>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("instructor.initialsLabel")}>
          <input value={initials} onChange={(e) => setInitials(e.target.value.toUpperCase())} className={`${inputCls} w-full`} />
        </Field>
        <Field label={t("instructor.numberLabel")}>
          <input value={ssiProNumber} onChange={(e) => setSsiProNumber(e.target.value)} className={`${inputCls} w-full`} />
        </Field>
      </div>
      <div className="mt-2">
        {/* Firma real del instructor — pedido explícito del usuario
            2026-09-02: se firma una vez aquí y se reutiliza en cada
            Training Record generado después, en vez de volver a firmar
            documento a documento. Editable en cualquier momento; el
            cambio se aplica a partir de la siguiente generación. */}
        <SignatureCapture label={t("instructor.signatureLabel")} value={signature} onChange={setSignature} />
      </div>
      <div className="mt-3">
        <EditActions onSave={save} onCancel={() => setEditing(false)} saveLabel={saving ? t("instructor.saving") : t("instructor.save")} />
      </div>
    </SectionCard>
  );
}

function CurrencySection({ profile, currencies }) {
  const { t } = useTranslation("profile");
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
    toast?.success(t("currency.toastSuccess"));
  };

  // Select (shared.jsx) trabaja con opciones-string planas, no {value,label}
  // — "EUR — Euro (€)" es tanto lo que se ve como lo que se guarda; el
  // código se extrae de los 3 primeros caracteres al elegir.
  const labelFor = (c) => `${c.code} — ${c.name} (${c.symbol})`;
  const options = currencies.rows.map(labelFor);
  const currentLabel = currencies.rows.find((c) => c.code === favorite);

  return (
    <SectionCard title={t("sections.favoriteCurrency")}>
      <p className="mb-3 text-xs text-gray-400">
        {t("currency.hint")}
      </p>
      <Select
        value={currentLabel ? labelFor(currentLabel) : ""}
        onChange={(label) => choose(label ? label.slice(0, label.indexOf(" —")) : "")}
        options={options}
        placeholder={t("currency.placeholder")}
      />
    </SectionCard>
  );
}

// Idioma preferido (Release V1, Fase 2 — multidioma): "se configurará en
// el perfil" es requisito explícito del documento maestro. Escribe
// profiles.language directamente (mismo patrón que el resto de esta
// pantalla) y, a diferencia de cualquier otro campo de aquí, además
// cambia el idioma de la interfaz al instante (i18n.changeLanguage) y
// actualiza el respaldo de localStorage que usan las pantallas sin
// sesión — no hace falta recargar para ver el cambio.
const LANGUAGE_OPTIONS = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

function LanguageSection({ profile, onProfileUpdated }) {
  const { t } = useTranslation("profile");
  const toast = useToast();
  const current = LANGUAGE_OPTIONS.find((o) => o.code === profile.language) || LANGUAGE_OPTIONS[0];

  const choose = async (label) => {
    const option = LANGUAGE_OPTIONS.find((o) => o.label === label);
    if (!option || option.code === profile.language) return;
    try {
      const { error } = await supabase.from("profiles").update({ language: option.code }).eq("user_id", profile.user_id);
      if (error) throw error;
      onProfileUpdated?.({ language: option.code });
      await i18n.changeLanguage(option.code);
      setStoredLanguage(option.code);
      toast?.success(t("language.toastSuccess"));
    } catch {
      toast?.error(t("language.toastError"));
    }
  };

  return (
    <SectionCard title={t("sections.language")}>
      <Select
        value={current.label}
        onChange={choose}
        options={LANGUAGE_OPTIONS.map((o) => o.label)}
        placeholder={t("language.placeholder")}
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
  const { t } = useTranslation("profile");
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
        setError(t("password.wrongCurrent"));
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError && updateError.code !== "same_password") throw updateError;
      toast?.success(t("password.toastSuccess"));
      setCurrentPassword(""); setPassword(""); setConfirm("");
    } catch {
      toast?.error(t("password.toastError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title={t("sections.security")}>
      <div className="space-y-3">
      <Field label={t("password.currentLabel")}>
        <div className="relative">
          <input
            type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password" className={`${inputCls} w-full pr-11`}
          />
          <button type="button" onClick={() => setShowCurrent((v) => !v)} aria-label={showCurrent ? t("password.hideCurrent") : t("password.showCurrent")}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400">
            {showCurrent ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      </Field>
      <Field label={t("password.newLabel")}>
        <div className="relative">
          <input
            type={visible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password" className={`${inputCls} w-full pr-11`}
          />
          <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? t("password.hide") : t("password.show")}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400">
            {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      </Field>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1" style={{ color: lengthOk ? TEAL : "#9CA3AF" }}>
          {lengthOk && <Check size={12} aria-hidden="true" />} {t("password.minLength")}
        </span>
        <span className="flex items-center gap-1" style={{ color: matchOk ? TEAL : "#9CA3AF" }}>
          {matchOk && <Check size={12} aria-hidden="true" />} {t("password.matches")}
        </span>
      </div>
      <Field label={t("password.confirmLabel")}>
        <input type={visible ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={`${inputCls} w-full`} />
      </Field>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button
        onClick={save} disabled={!canSave}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: TEAL }}
      >
        {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />} {t("password.submit")}
      </button>
      </div>
    </SectionCard>
  );
}

function PrivacySection({ profile, onAccountDeleted }) {
  const { t } = useTranslation("profile");
  const toast = useToast();
  const confirmWord = t("deleteAccount.confirmWord");
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
        setError(payload.error || t("deleteAccount.genericError"));
        setLoading(false);
        return;
      }
      toast?.success(t("deleteAccount.toastSuccess"));
      onAccountDeleted?.();
    } catch {
      setError(t("deleteAccount.networkError"));
      setLoading(false);
    }
  };

  return (
    <SectionCard title={t("sections.privacy")}>
      <p className="mb-3 text-xs text-gray-500">
        {t("deleteAccount.description")}
      </p>
      <button
        onClick={() => setStep("confirm")}
        className="flex min-h-11 items-center gap-1.5 rounded-md border border-red-200 px-3 text-sm font-medium text-red-600"
      >
        <Trash2 size={14} aria-hidden="true" /> {t("deleteAccount.button")}
      </button>
      <ConfirmDialog
        open={step === "confirm"}
        title={t("deleteAccount.confirmTitle")}
        message={t("deleteAccount.confirmMessage", { nickname: profile.nickname })}
        confirmLabel={t("deleteAccount.continue")}
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
            <h3 id="delete-word-title" className="mb-1 text-sm font-semibold text-gray-800">{t("deleteAccount.finalCheckTitle")}</h3>
            <p className="mb-3 text-sm text-gray-500">
              {t("deleteAccount.typeWordPrefix")} <strong>{confirmWord}</strong> {t("deleteAccount.typeWordSuffix")}
            </p>
            <input
              type="text"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              aria-label={t("deleteAccount.typeWordAriaLabel", { word: confirmWord })}
              placeholder={confirmWord}
              className={`${inputCls} mb-4 w-full`}
            />
            {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={reset} disabled={loading} className="min-h-11 rounded-md border border-gray-200 px-3.5 text-sm font-medium text-gray-600 disabled:opacity-50">
                {t("deleteAccount.back")}
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || wordInput !== confirmWord}
                className="flex min-h-11 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: CORAL }}
              >
                {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                {t("deleteAccount.deleteButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// Cerrar sesión — Fase 4, Release V1 (rediseño de cabecera). Antes vivía
// como icono suelto en la cabecera de App.jsx, junto a Ayuda/Configuración/
// Avatar; movido aquí tras revisar patrones de navegación móvil
// (docs/RELEASE-V1-PROGRESS.md, Fase 4, con fuentes): cerrar sesión es una
// tarea infrecuente (como mucho una vez por sesión), justo el tipo de
// acción que la investigación de UX recomienda sacar del nivel superior de
// navegación en vez de competir por espacio con tareas frecuentes como
// Ayuda/Configuración. Mismo patrón visual que "Eliminar mi cuenta" (botón
// con borde, no una tarjeta llena) pero en gris neutro, no en rojo — no es
// una acción destructiva, así que no debe leerse como una.
function SignOutSection({ onSignOut }) {
  const { t } = useTranslation("profile");
  if (!onSignOut) return null;
  return (
    <button
      onClick={onSignOut}
      className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600"
    >
      <LogOut size={15} aria-hidden="true" /> {t("signOut.button")}
    </button>
  );
}

export default function ProfileTab({ profile, currencies, onProfileUpdated, onAccountDeleted, onSignOut }) {
  if (!profile) return null;
  return (
    <div className="space-y-4 pb-16">
      <AvatarPicker profile={profile} onProfileUpdated={onProfileUpdated} />
      <PersonalDataSection profile={profile} onProfileUpdated={onProfileUpdated} />
      <InstructorSection profile={profile} onProfileUpdated={onProfileUpdated} />
      <CurrencySection profile={profile} currencies={currencies} />
      <LanguageSection profile={profile} onProfileUpdated={onProfileUpdated} />
      <PasswordSection />
      <SignOutSection onSignOut={onSignOut} />
      <PrivacySection profile={profile} onAccountDeleted={onAccountDeleted} />
    </div>
  );
}
