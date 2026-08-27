import React, { useState } from "react";
import { Inbox } from "lucide-react";

// Componentes mock reutilizables del laboratorio visual. Todos son
// puramente presentacionales: reciben `tokens` (ver designTokens.js) y
// datos ya calculados por prop, nunca leen Supabase ni ningún hook de la
// app real. Viven fuera de shared.jsx a propósito — mezclar primitivos de
// producción con maqueta experimental es justo lo que "aislado y
// eliminable sin impacto" pide evitar.

export function formatEUR(amount) {
  return `${amount.toLocaleString("es-ES", { maximumFractionDigits: 0 })} €`;
}

export function StatusChip({ tokens, status }) {
  const paid = status === "Pagado";
  const color = paid ? tokens.good : tokens.warn;
  const bg = paid ? `${tokens.good}1A` : tokens.warnSoft;
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ color, backgroundColor: bg }}
    >
      {status}
    </span>
  );
}

export function Sparkline({ data, color, height = 32, width = 96 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendencia">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProgressRing({ value, max, color, trackColor, size = 56, strokeWidth = 7, centerLabel }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const offset = circumference * (1 - pct);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(pct * 100)}%`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {centerLabel && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold" style={{ color }}>
          {centerLabel}
        </div>
      )}
    </div>
  );
}

export function KpiCard({ tokens, icon: Icon, label, value, trendLabel, tone = "ink" }) {
  const toneColor = tone === "warn" ? tokens.warn : tone === "good" ? tokens.good : tokens.ink;
  return (
    <div
      className="flex min-h-24 flex-col justify-between p-4"
      style={{ backgroundColor: tokens.surface, borderRadius: tokens.radius, boxShadow: tokens.shadow, border: tokens.shadow === "none" ? `1px solid ${tokens.border}` : "none" }}
    >
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={14} style={{ color: tokens.inkMuted }} aria-hidden="true" />}
        <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: tokens.inkMuted }}>{label}</span>
      </div>
      <div className="text-2xl font-extrabold tabular-nums" style={{ color: toneColor }}>{value}</div>
      {trendLabel && <div className="text-[11px] font-medium" style={{ color: tokens.inkMuted }}>{trendLabel}</div>}
    </div>
  );
}

// span: "1x1" | "2x1" | "2x2" — controla cuántas columnas/filas ocupa
// dentro del grid bento de 2 columnas que arma la pantalla Home.
export function BentoCard({ tokens, span = "1x1", children, className = "" }) {
  const spanCls = span === "2x1" ? "col-span-2" : span === "2x2" ? "col-span-2 row-span-2" : "";
  return (
    <div
      className={`p-4 ${spanCls} ${className}`}
      style={{ backgroundColor: tokens.surface, borderRadius: tokens.radiusLg, boxShadow: tokens.shadow, border: tokens.shadow === "none" ? `1px solid ${tokens.border}` : "none" }}
    >
      {children}
    </div>
  );
}

export function EmptyState({ tokens, icon: Icon = Inbox, title, message, ctaLabel }) {
  return (
    <div
      className="flex flex-col items-center gap-2 px-6 py-10 text-center"
      style={{ backgroundColor: tokens.surface, borderRadius: tokens.radiusLg, border: `1px dashed ${tokens.border}` }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: tokens.accentSoft }}>
        <Icon size={20} style={{ color: tokens.accent }} aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold" style={{ color: tokens.ink }}>{title}</p>
      <p className="max-w-[26ch] text-xs" style={{ color: tokens.inkMuted }}>{message}</p>
      {ctaLabel && (
        <button
          type="button"
          className="mt-1 min-h-11 rounded-md px-4 text-xs font-semibold text-white"
          style={{ backgroundColor: tokens.accent, borderRadius: tokens.radius }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

export function Skeleton({ tokens, lines = 3 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-11 animate-pulse"
          style={{ backgroundColor: tokens.border, borderRadius: tokens.radius, opacity: 0.5, width: i === lines - 1 ? "70%" : "100%" }}
        />
      ))}
    </div>
  );
}

// Simulación visual de "deslizar para actuar" — sin librería de gestos:
// un toque revela la acción tras la fila, con transición suave. Suficiente
// para evaluar el patrón sin construir el gesto real (eso es trabajo de la
// fase de implementación, no del laboratorio).
export function SwipeRow({ tokens, title, subtitle, amount, status, actionLabel = "Marcar pagado" }) {
  const [revealed, setRevealed] = useState(false);
  const paid = status === "Pagado";
  return (
    <div className="relative overflow-hidden" style={{ borderRadius: tokens.radius }}>
      {!paid && (
        <div
          className="absolute inset-y-0 right-0 flex w-28 items-center justify-center text-xs font-semibold text-white"
          style={{ backgroundColor: tokens.good }}
        >
          {actionLabel}
        </div>
      )}
      <button
        type="button"
        onClick={() => !paid && setRevealed((r) => !r)}
        aria-label={paid ? title : `${title} — ${revealed ? "ocultar" : "mostrar"} acción de marcar pagado`}
        className="relative flex w-full min-h-11 items-center justify-between gap-2 px-3 py-2.5 text-left transition-transform duration-200"
        style={{
          backgroundColor: tokens.surface,
          transform: revealed && !paid ? "translateX(-7rem)" : "translateX(0)",
          border: `1px solid ${tokens.border}`,
          borderRadius: tokens.radius,
        }}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium" style={{ color: tokens.ink }}>{title}</span>
          <span className="block truncate text-xs" style={{ color: tokens.inkMuted }}>{subtitle}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-bold tabular-nums" style={{ color: tokens.ink }}>{formatEUR(amount)}</span>
          <StatusChip tokens={tokens} status={status} />
        </span>
      </button>
    </div>
  );
}

export function ContextualFab({ tokens, icon: Icon, label }) {
  const glass = !!tokens.glassChrome;
  return (
    <button
      type="button"
      className="fixed bottom-20 right-4 z-10 flex min-h-12 items-center gap-2 px-4 text-sm font-semibold text-white shadow-lg backdrop-blur"
      style={{
        backgroundColor: glass ? tokens.glassChrome : tokens.accent,
        color: glass ? tokens.accent : "#FFFFFF",
        borderRadius: tokens.radiusLg,
        border: glass ? `1px solid ${tokens.accent}33` : "none",
      }}
    >
      <Icon size={17} aria-hidden="true" />
      {label}
    </button>
  );
}
