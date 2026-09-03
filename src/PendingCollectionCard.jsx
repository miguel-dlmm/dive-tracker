import { useTranslation } from "react-i18next";
import { Wallet, Plus } from "lucide-react";
import { MoneyLine } from "./shared";

// Tarjeta aislada — no lee ningún hook de datos, todo llega por props. No
// está acoplada a HomeTab a propósito: `onPress` es opcional — sin él (Mi
// trabajo) se renderiza como informativa; con él (Home, desde 2026-08-29
// navega a Mi trabajo) el bloque de información se vuelve un botón.
//
// onQuickAdd (opcional): botón "+" en el lado derecho para añadir un
// movimiento sin salir de la tarjeta — solo lo usa Home (ver ADR-0005,
// addendum: un único acceso "Añadir movimiento", integrado en la tarjeta
// más visible de la pantalla en vez de como fila aparte). Mi trabajo sigue
// usando esta misma tarjeta sin este botón — ya tiene su propio FAB, un
// segundo "+" ahí sería redundante. Es un HERMANO del bloque de
// información, no un descendiente: con onPress y onQuickAdd presentes a
// la vez, anidar un <button> dentro de otro <button> es HTML inválido
// (detectado con mobile-check al activar onPress por primera vez en
// Home) — así ambos son pulsables de forma independiente sin necesitar
// stopPropagation.
export default function PendingCollectionCard({ totals, count, currencyRows, color, onPress, onQuickAdd }) {
  const { t } = useTranslation("common");
  const hasAmount = Object.keys(totals || {}).length > 0;
  // Wrapper cubre solo el bloque de información, nunca la tarjeta entera:
  // con onQuickAdd presente, el botón "+" es un HERMANO suyo, no un
  // descendiente — un <button> dentro de otro <button> es HTML inválido
  // (el navegador lo repara solapando el árbol de foco/accesibilidad de
  // forma impredecible) y solo se detectó al activar onPress de verdad por
  // primera vez en Home, vía mobile-check (los tests con jsdom no validan
  // anidamiento de HTML, así que no lo habían detectado).
  const Wrapper = onPress ? "button" : "div";

  return (
    <div
      className="flex w-full items-center gap-3 rounded-xl p-4 text-white"
      style={{ backgroundColor: color }}
    >
      <Wrapper
        onClick={onPress}
        type={onPress ? "button" : undefined}
        data-testid="pending-collection-card"
        className={`min-w-0 flex-1 text-left ${onPress ? "transition-transform active:scale-[0.98]" : ""}`}
      >
        <div className="flex items-center gap-1.5">
          <Wallet size={14} aria-hidden="true" />
          <span className="text-xs font-medium opacity-80">{t("pendingCollectionCard.pendingLabel")}</span>
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums">
          {hasAmount ? <MoneyLine totals={totals} currencyRows={currencyRows} /> : "—"}
        </div>
        <div className="mt-0.5 text-xs opacity-80">
          {count === 0 ? t("pendingCollectionCard.empty") : t("pendingCollectionCard.count", { count })}
        </div>
      </Wrapper>
      {onQuickAdd && (
        <button
          type="button"
          onClick={onQuickAdd}
          aria-label={t("pendingCollectionCard.addMovement")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white transition-transform active:scale-90"
        >
          <Plus size={22} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
