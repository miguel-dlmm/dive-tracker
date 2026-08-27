import React, { useState } from "react";
import { Wallet, TrendingUp, CalendarDays, Plus, Search, Star, Pencil, Trash2, Users2 } from "lucide-react";
import {
  BentoCard, KpiCard, Sparkline, ProgressRing, EmptyState, Skeleton, SwipeRow, ContextualFab, StatusChip, formatEUR,
} from "./labComponents";
import {
  mockWorklog, mockComisiones, mockPayments, mockKpis, mockEarningsTrend, mockCalendarDays, mockConfigSections,
} from "./mockData";

// Pantallas mock del laboratorio. Cada una recibe únicamente `tokens`
// (designTokens.js) y pinta con los datos estáticos de mockData.js — no
// hay props de negocio, no hay hooks, no hay Supabase. Son maquetas para
// comparar jerarquía/densidad/componentes entre las 5 direcciones, no
// reimplementaciones funcionales de las pantallas reales.

function SectionLabel({ tokens, children }) {
  return (
    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: tokens.inkMuted }}>
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------- Home ---
export function MockHomeScreen({ tokens }) {
  if (tokens.homeStyle === "bento") {
    return (
      <div className="space-y-4 pb-24">
        <p className="text-sm" style={{ color: tokens.inkMuted }}>Hola, Ada 👋</p>
        <div className="grid grid-cols-2 gap-3">
          <BentoCard tokens={tokens} span="2x1">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <Wallet size={14} style={{ color: tokens.warn }} aria-hidden="true" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: tokens.warn }}>Pendiente de cobrar</span>
                </div>
                <div className="mt-1 text-2xl font-extrabold tabular-nums" style={{ color: tokens.ink }}>{formatEUR(mockKpis.pendingToCollect)}</div>
                <p className="text-xs" style={{ color: tokens.inkMuted }}>{mockKpis.pendingCount} pagos sin marcar</p>
              </div>
              <button type="button" className="min-h-11 shrink-0 rounded-md px-3 text-xs font-semibold text-white" style={{ backgroundColor: tokens.warn, borderRadius: tokens.radius }}>
                Ver quién debe
              </button>
            </div>
          </BentoCard>

          <BentoCard tokens={tokens}>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={13} style={{ color: tokens.inkMuted }} aria-hidden="true" />
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: tokens.inkMuted }}>Ganado este mes</span>
            </div>
            <div className="mt-1 text-xl font-extrabold tabular-nums" style={{ color: tokens.ink }}>{formatEUR(mockKpis.earnedThisMonth)}</div>
            <div className="mt-1"><Sparkline data={mockEarningsTrend} color={tokens.accent} /></div>
          </BentoCard>

          <BentoCard tokens={tokens}>
            <div className="flex flex-col items-center justify-center gap-1 text-center">
              <ProgressRing value={mockKpis.earnedThisMonth} max={900} color={tokens.accent} trackColor={tokens.accentSoft} centerLabel={`${Math.round((mockKpis.earnedThisMonth / 900) * 100)}%`} />
              <span className="text-[11px] font-medium" style={{ color: tokens.inkMuted }}>Objetivo del mes</span>
            </div>
          </BentoCard>

          <BentoCard tokens={tokens} span="2x1">
            <SectionLabel tokens={tokens}>Actividad reciente</SectionLabel>
            <ul className="space-y-1.5">
              {mockWorklog.slice(0, 3).map((w) => (
                <li key={w.id} className="flex items-center justify-between text-sm">
                  <span className="truncate" style={{ color: tokens.ink }}>{w.activity} · {w.school}</span>
                  <span className="shrink-0 font-semibold tabular-nums" style={{ color: tokens.ink }}>{formatEUR(w.amount)}</span>
                </li>
              ))}
            </ul>
          </BentoCard>

          <BentoCard tokens={tokens} span="2x1">
            <div className="mb-2 flex items-center gap-1.5">
              <CalendarDays size={13} style={{ color: tokens.inkMuted }} aria-hidden="true" />
              <SectionLabel tokens={tokens}>Este mes</SectionLabel>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                const active = mockCalendarDays.includes(day);
                return (
                  <span
                    key={day}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium"
                    style={active ? { backgroundColor: tokens.accent, color: "#fff" } : { color: tokens.inkMuted }}
                  >
                    {day}
                  </span>
                );
              })}
            </div>
          </BentoCard>
        </div>
        <ContextualFab tokens={tokens} icon={Plus} label="Registrar" />
      </div>
    );
  }

  if (tokens.homeStyle === "illustrative") {
    return (
      <div className="space-y-4 pb-24">
        <div className="rounded-[var(--r)] p-5" style={{ backgroundImage: tokens.bgImage, borderRadius: tokens.radiusLg }}>
          <p className="text-xs font-medium" style={{ color: tokens.inkMuted }}>Ganado este mes</p>
          <p className="text-3xl font-extrabold tabular-nums" style={{ color: tokens.ink }}>{formatEUR(mockKpis.earnedThisMonth)}</p>
          <div className="mt-2"><Sparkline data={mockEarningsTrend} color={tokens.accent} width={140} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard tokens={tokens} icon={Wallet} label="Pendiente" value={formatEUR(mockKpis.pendingToCollect)} tone="warn" trendLabel={`${mockKpis.pendingCount} por cobrar`} />
          <KpiCard tokens={tokens} icon={CalendarDays} label="Esta semana" value={mockKpis.entriesThisWeek} trendLabel="clases registradas" />
        </div>
        <SectionLabel tokens={tokens}>Actividad reciente</SectionLabel>
        <div className="space-y-2">
          {mockWorklog.slice(0, 3).map((w) => (
            <SwipeRow key={w.id} tokens={tokens} title={w.activity} subtitle={w.school} amount={w.amount} status={w.status} />
          ))}
        </div>
        <ContextualFab tokens={tokens} icon={Plus} label="Registrar clase" />
      </div>
    );
  }

  if (tokens.homeStyle === "dense-list") {
    return (
      <div className="space-y-3 pb-24">
        <div className="flex items-center gap-4 border-b pb-3 text-sm" style={{ borderColor: tokens.border }}>
          <span style={{ color: tokens.ink }}>Ganado: <b className="tabular-nums">{formatEUR(mockKpis.earnedThisMonth)}</b></span>
          <span style={{ color: tokens.warn }}>Pendiente: <b className="tabular-nums">{formatEUR(mockKpis.pendingToCollect)}</b></span>
          <span style={{ color: tokens.inkMuted }}>{mockKpis.entriesThisWeek} esta semana</span>
        </div>
        <SectionLabel tokens={tokens}>Registro</SectionLabel>
        <ul className="divide-y" style={{ borderColor: tokens.border }}>
          {mockWorklog.map((w) => (
            <li key={w.id} className="flex items-center gap-2 py-2 pl-2" style={{ borderLeft: `3px solid ${tokens.accent}` }}>
              <span className="w-16 shrink-0 text-xs tabular-nums" style={{ color: tokens.inkMuted }}>{w.date.slice(5)}</span>
              <span className="flex-1 truncate text-sm" style={{ color: tokens.ink }}>{w.activity} — {w.school}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: tokens.ink }}>{formatEUR(w.amount)}</span>
              <StatusChip tokens={tokens} status={w.status} />
            </li>
          ))}
        </ul>
        <button type="button" className="fixed bottom-20 right-4 z-10 flex h-11 w-11 items-center justify-center text-white shadow" style={{ backgroundColor: tokens.accent, borderRadius: tokens.radius }} aria-label="Registrar clase">
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
    );
  }

  // kpi-stack — "current" y "refinado"
  return (
    <div className="space-y-4 pb-24">
      <KpiCard tokens={tokens} icon={TrendingUp} label="Ganado este mes" value={formatEUR(mockKpis.earnedThisMonth)} />
      <div className="grid grid-cols-2 gap-3">
        <KpiCard tokens={tokens} icon={Wallet} label="Pendiente" value={formatEUR(mockKpis.pendingToCollect)} tone="warn" />
        <KpiCard tokens={tokens} icon={CalendarDays} label="Esta semana" value={mockKpis.entriesThisWeek} />
      </div>
      <SectionLabel tokens={tokens}>Actividad reciente</SectionLabel>
      <ul className="space-y-2">
        {mockWorklog.slice(0, 4).map((w) => (
          <li key={w.id} className="flex items-center justify-between px-3 py-2.5 text-sm" style={{ backgroundColor: tokens.surface, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
            <span style={{ color: tokens.ink }}>{w.activity} · {w.school}</span>
            <span className="font-semibold tabular-nums" style={{ color: tokens.ink }}>{formatEUR(w.amount)}</span>
          </li>
        ))}
      </ul>
      <ContextualFab tokens={tokens} icon={Plus} label="Registrar" />
    </div>
  );
}

// ------------------------------------------------------------- Registro --
export function MockWorkLogScreen({ tokens }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center justify-between">
        <SectionLabel tokens={tokens}>Registro de trabajo</SectionLabel>
        <button
          type="button"
          onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1400); }}
          className="text-[11px] font-medium underline"
          style={{ color: tokens.inkMuted }}
        >
          Simular carga
        </button>
      </div>
      {loading ? (
        <Skeleton tokens={tokens} lines={5} />
      ) : (
        <ul className="space-y-2">
          {mockWorklog.map((w) => (
            <li key={w.id} className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: tokens.surface, borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, boxShadow: tokens.shadow === "none" ? "none" : tokens.shadow }}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: tokens.ink }}>{w.activity}</p>
                <p className="truncate text-xs" style={{ color: tokens.inkMuted }}>{w.school} · {w.date}</p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color: tokens.ink }}>{formatEUR(w.amount)}</span>
              <StatusChip tokens={tokens} status={w.status} />
            </li>
          ))}
        </ul>
      )}
      <ContextualFab tokens={tokens} icon={Plus} label="Registrar clase" />
    </div>
  );
}

// ------------------------------------------------------------ Comisiones -
export function MockComisionesScreen({ tokens }) {
  const [showEmpty, setShowEmpty] = useState(false);
  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center justify-between">
        <SectionLabel tokens={tokens}>Comisiones</SectionLabel>
        <button type="button" onClick={() => setShowEmpty((v) => !v)} className="text-[11px] font-medium underline" style={{ color: tokens.inkMuted }}>
          {showEmpty ? "Ver con datos" : "Ver estado vacío"}
        </button>
      </div>
      {showEmpty ? (
        <EmptyState
          tokens={tokens}
          icon={Search}
          title="No hay comisiones con ese filtro"
          message="Prueba a limpiar los filtros o cambia el rango de fechas."
          ctaLabel="Limpiar filtros"
        />
      ) : (
        <div className="space-y-2">
          {mockComisiones.map((c) => (
            <SwipeRow key={c.id} tokens={tokens} title={c.client} subtitle={`${c.school} · ${c.date}`} amount={c.amount} status={c.status} actionLabel="Marcar pagada" />
          ))}
        </div>
      )}
      <ContextualFab tokens={tokens} icon={Plus} label="Nueva comisión" />
    </div>
  );
}

// ----------------------------------------------------------------- Pagos -
export function MockPaymentsScreen({ tokens }) {
  const paidCount = mockPayments.filter((p) => p.status === "Pagado").length;
  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-3 px-3 py-3" style={{ backgroundColor: tokens.surface, borderRadius: tokens.radiusLg, border: tokens.shadow === "none" ? `1px solid ${tokens.border}` : "none", boxShadow: tokens.shadow }}>
        <ProgressRing value={paidCount} max={mockPayments.length} color={tokens.good} trackColor={tokens.warnSoft} centerLabel={`${paidCount}/${mockPayments.length}`} size={52} strokeWidth={6} />
        <div>
          <p className="text-sm font-semibold" style={{ color: tokens.ink }}>Pagos a compañeros liquidados</p>
          <p className="text-xs" style={{ color: tokens.inkMuted }}>este mes</p>
        </div>
      </div>
      <SectionLabel tokens={tokens}>Pagos</SectionLabel>
      <div className="space-y-2">
        {mockPayments.map((p) => (
          <SwipeRow key={p.id} tokens={tokens} title={p.colleague} subtitle={p.concept} amount={p.amount} status={p.status} actionLabel="Marcar pagado" />
        ))}
      </div>
      <ContextualFab tokens={tokens} icon={Users2} label="Nuevo pago" />
    </div>
  );
}

// ----------------------------------------------------------- Configuración
export function MockConfigScreen({ tokens }) {
  return (
    <div className="space-y-4 pb-24">
      <SectionLabel tokens={tokens}>Configuración</SectionLabel>
      <div className="flex flex-wrap items-center gap-1 p-1" style={{ backgroundColor: tokens.surface, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
        {mockConfigSections.map((s, i) => (
          <span
            key={s}
            className="min-h-9 rounded-md px-3 py-1.5 text-xs font-medium"
            style={i === 0 ? { backgroundColor: tokens.accent, color: "#fff", borderRadius: tokens.radius } : { color: tokens.inkMuted }}
          >
            {s}
          </span>
        ))}
      </div>

      <div className="p-4" style={{ backgroundColor: tokens.surface, borderRadius: tokens.radiusLg, boxShadow: tokens.shadow, border: tokens.shadow === "none" ? `1px solid ${tokens.border}` : "none" }}>
        <SectionLabel tokens={tokens}>Colores de sección (ejemplo)</SectionLabel>
        <div className="flex gap-2">
          {[tokens.accent, tokens.good, tokens.warn].map((c) => (
            <span key={c} className="h-8 w-8 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      <div className="p-4" style={{ backgroundColor: tokens.surface, borderRadius: tokens.radiusLg, boxShadow: tokens.shadow, border: tokens.shadow === "none" ? `1px solid ${tokens.border}` : "none" }}>
        <SectionLabel tokens={tokens}>Usuarios (ejemplo)</SectionLabel>
        <ul className="space-y-1.5">
          {[{ n: "Ada Lovelace", e: "ada@oceanflow.dev", r: "Superadmin" }, { n: "Marco Rossi", e: "marco@oceanflow.dev", r: "Admin" }].map((u) => (
            <li key={u.e} className="flex items-center justify-between gap-2 px-2.5 py-2 text-sm" style={{ backgroundColor: tokens.bg, borderRadius: tokens.radius }}>
              <span className="min-w-0 truncate" style={{ color: tokens.ink }}>{u.n} <span className="text-xs" style={{ color: tokens.inkMuted }}>· {u.e}</span></span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] font-semibold" style={{ color: tokens.accent }}>{u.r}</span>
                <Pencil size={13} style={{ color: tokens.inkMuted }} aria-hidden="true" />
                <Trash2 size={13} style={{ color: tokens.inkMuted }} aria-hidden="true" />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="flex items-center gap-1.5 text-[11px]" style={{ color: tokens.inkMuted }}>
        <Star size={11} aria-hidden="true" /> Maqueta — ninguna acción de esta pantalla escribe en Supabase.
      </p>
    </div>
  );
}
