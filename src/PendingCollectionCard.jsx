import React from "react";
import { Wallet } from "lucide-react";
import { MoneyLine } from "./shared";

// Tarjeta aislada — no lee ningún hook de datos, todo llega por props. No
// está acoplada a HomeTab a propósito: cuando exista una pantalla de Pagos
// (ver docs/ADR/0004-home-dashboard-operativo-instructor.md), se le pasa
// `onPress` y se vuelve interactiva sola, sin tocar este componente. Hasta
// entonces se renderiza como informativa (onPress sin definir).
export default function PendingCollectionCard({ totals, count, currencyRows, color, onPress }) {
  const hasAmount = Object.keys(totals || {}).length > 0;
  const Wrapper = onPress ? "button" : "div";

  return (
    <Wrapper
      onClick={onPress}
      type={onPress ? "button" : undefined}
      data-testid="pending-collection-card"
      className={`w-full rounded-lg p-4 text-left text-white ${onPress ? "transition-transform active:scale-[0.98]" : ""}`}
      style={{ backgroundColor: color }}
    >
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
    </Wrapper>
  );
}
