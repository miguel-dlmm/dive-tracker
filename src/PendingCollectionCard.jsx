import React from "react";
import { Wallet, Plus } from "lucide-react";
import { MoneyLine } from "./shared";

// Tarjeta aislada — no lee ningún hook de datos, todo llega por props. No
// está acoplada a HomeTab a propósito: cuando exista una pantalla de Pagos
// (ver docs/ADR/0004-home-dashboard-operativo-instructor.md), se le pasa
// `onPress` y se vuelve interactiva sola, sin tocar este componente. Hasta
// entonces se renderiza como informativa (onPress sin definir).
//
// onQuickAdd (opcional): botón "+" en el lado derecho para añadir un
// movimiento sin salir de la tarjeta — solo lo usa Home (ver ADR-0005,
// addendum: un único acceso "Añadir movimiento", integrado en la tarjeta
// más visible de la pantalla en vez de como fila aparte). Mi trabajo sigue
// usando esta misma tarjeta sin este botón — ya tiene su propio FAB, un
// segundo "+" ahí sería redundante. e.stopPropagation() en el click: si
// `onPress` también está activo (Pagos re-habilitado en el futuro), tocar
// "+" no debe además navegar a Pagos — son dos acciones independientes en
// la misma tarjeta, no una anidada dentro de la otra.
export default function PendingCollectionCard({ totals, count, currencyRows, color, onPress, onQuickAdd }) {
  const hasAmount = Object.keys(totals || {}).length > 0;
  const Wrapper = onPress ? "button" : "div";

  return (
    <Wrapper
      onClick={onPress}
      type={onPress ? "button" : undefined}
      data-testid="pending-collection-card"
      className={`flex w-full items-center gap-3 rounded-xl p-4 text-left text-white ${onPress ? "transition-transform active:scale-[0.98]" : ""}`}
      style={{ backgroundColor: color }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Wallet size={14} aria-hidden="true" />
          <span className="text-xs font-medium opacity-80">Pendiente de cobrar</span>
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums">
          {hasAmount ? <MoneyLine totals={totals} currencyRows={currencyRows} /> : "—"}
        </div>
        <div className="mt-0.5 text-xs opacity-80">
          {count === 0 ? "Nada pendiente" : `${count} ${count === 1 ? "pago pendiente" : "pagos pendientes"}`}
        </div>
      </div>
      {onQuickAdd && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
          aria-label="Añadir movimiento"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white transition-transform active:scale-90"
        >
          <Plus size={22} aria-hidden="true" />
        </button>
      )}
    </Wrapper>
  );
}
