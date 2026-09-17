import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileDown, X, Check, Loader2 } from "lucide-react";
import { Sheet, Field, Select, DateRangePicker, BooleanToggle, ChipGroup, formatMoney, useToast } from "../shared";
import { BRAND_NAVY, BRAND_SLATE } from "../App";
import { buildExportReportData, listAdjustmentCandidates } from "./buildExportReportData";

const pad2 = (n) => String(n).padStart(2, "0");
const dstr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function currentMonthRange() {
  const now = new Date();
  return { from: dstr(new Date(now.getFullYear(), now.getMonth(), 1)), to: dstr(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}

// Hoja de "Exportar informe" — Resumen la abre con la escuela que tuviera
// expandida en "Por escuela" (defaultSchool), o la única que exista. Todo
// el estado del formulario vive aquí (no en SummaryTab): es una
// configuración de un único uso, se descarta al cerrar la hoja, nunca hace
// falta recordarla entre aperturas — ver el informe de diseño de la sesión
// que encargó esta pantalla para el porqué de cada campo.
export default function ExportReportSheet({
  open, onClose, schools, currencies, paymentStatuses,
  worklog, comisiones, colleaguePayments, rates, commissionRates,
  fallbackCurrency, instructorName, defaultSchool,
}) {
  const { t } = useTranslation("summary");
  const toast = useToast();
  const hasMultipleSchools = schools.rows.length > 1;

  const [school, setSchool] = useState(() => defaultSchool || schools.rows.find((s) => s.is_default)?.name || schools.rows[0]?.name || "");
  const [range, setRange] = useState(currentMonthRange);
  const [includeAdjustments, setIncludeAdjustments] = useState(false);
  const [adjustmentMode, setAdjustmentMode] = useState(t("export.adjustmentsAll"));
  const [selectedIds, setSelectedIds] = useState([]);
  const [sumAdjustments, setSumAdjustments] = useState(t("export.apart"));
  const [showCollected, setShowCollected] = useState(false);
  const [generating, setGenerating] = useState(false);

  const candidates = useMemo(
    () => (includeAdjustments ? listAdjustmentCandidates({ school, from: range.from, to: range.to, colleaguePayments: colleaguePayments.rows, fallbackCurrency }) : []),
    [includeAdjustments, school, range.from, range.to, colleaguePayments.rows, fallbackCurrency]
  );
  const toggleId = (id) => setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const data = useMemo(
    () => buildExportReportData({
      school, from: range.from, to: range.to,
      worklog: worklog.rows, rates: rates.rows, comisiones: comisiones.rows, commissionRates: commissionRates.rows, colleaguePayments: colleaguePayments.rows,
      fallbackCurrency, paymentStatuses: paymentStatuses.rows,
      showCollected, includeAdjustments,
      adjustmentMode: adjustmentMode === t("export.adjustmentsChoose") ? "choose" : "all",
      selectedAdjustmentIds: selectedIds,
      sumAdjustments: sumAdjustments === t("export.sumToTotal"),
    }),
    [school, range.from, range.to, worklog.rows, rates.rows, comisiones.rows, commissionRates.rows, colleaguePayments.rows, fallbackCurrency, paymentStatuses.rows, showCollected, includeAdjustments, adjustmentMode, selectedIds, sumAdjustments, t]
  );

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { generateExportReportPdf } = await import("./generateExportReportPdf");
      await generateExportReportPdf({
        school, from: range.from, to: range.to, data,
        paymentStatusRows: paymentStatuses.rows, instructorName,
        showCollected, includeAdjustments: includeAdjustments && data.adjustments.length > 0,
        sumAdjustments: sumAdjustments === t("export.sumToTotal"),
        t,
      });
      toast.success(t("export.success"));
      onClose();
    } catch {
      toast.error(t("export.genericError"));
    } finally {
      setGenerating(false);
    }
  };

  const previewParts = [
    t("export.previewCourses", { count: data.counts.courses }),
    t("export.previewCommissions", { count: data.counts.commissions }),
    includeAdjustments && data.counts.adjustments > 0 ? t("export.previewAdjustments", { count: data.counts.adjustments }) : null,
  ].filter(Boolean);

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${BRAND_NAVY}1A` }}>
            <FileDown size={14} style={{ color: BRAND_NAVY }} aria-hidden="true" />
          </span>
          <h3 className="text-sm font-semibold text-gray-800">{t("export.sheetTitle")}</h3>
        </div>
        <button onClick={onClose} className="text-gray-400" aria-label={t("sheet.close", { ns: "common" })}><X size={19} /></button>
      </div>

      <div className="flex flex-col gap-3">
        {hasMultipleSchools && (
          <Field label={t("export.school")}>
            <Select value={school} onChange={setSchool} options={schools.rows.map((s) => s.name)} />
          </Field>
        )}

        <Field label={t("export.range")}>
          <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
        </Field>

        <div className="flex items-center justify-between gap-3 py-1">
          <div>
            <p className="text-sm font-medium text-gray-800">{t("export.includeAdjustments")}</p>
            <p className="mt-0.5 text-xs text-gray-400">{t("export.includeAdjustmentsHint")}</p>
          </div>
          <BooleanToggle checked={includeAdjustments} onChange={() => setIncludeAdjustments((v) => !v)} ariaLabel={t("export.includeAdjustments")} color={BRAND_SLATE} />
        </div>

        {includeAdjustments && (
          <div className="ml-0.5 flex flex-col gap-3 border-l-2 border-gray-100 pl-3">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{t("export.adjustmentsWhich")}</p>
              <ChipGroup value={adjustmentMode} onChange={setAdjustmentMode} options={[t("export.adjustmentsAll"), t("export.adjustmentsChoose")]} />
              {adjustmentMode === t("export.adjustmentsChoose") && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-100">
                  {candidates.length === 0 ? (
                    <p className="p-3 text-xs text-gray-400">{t("export.noAdjustments")}</p>
                  ) : candidates.map((c) => {
                    const checked = selectedIds.includes(c.id);
                    return (
                      <button
                        key={c.id} type="button" onClick={() => toggleId(c.id)}
                        className="flex w-full min-h-11 items-center gap-2.5 border-b border-gray-50 px-2.5 py-1.5 text-left last:border-b-0"
                      >
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                          style={checked ? { backgroundColor: BRAND_NAVY } : { border: "1.5px solid #D2DAE1" }}
                        >
                          {checked && <Check size={11} className="text-white" aria-hidden="true" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-gray-800">{c.colleague_name}</span>
                          <span className="text-[11px] text-gray-400">{c.date}</span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: BRAND_NAVY }}>
                          {formatMoney(c.total, c.currency, currencies.rows)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{t("export.adjustmentsHow")}</p>
              <ChipGroup value={sumAdjustments} onChange={setSumAdjustments} options={[t("export.sumToTotal"), t("export.apart")]} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 py-1">
          <div>
            <p className="text-sm font-medium text-gray-800">{t("export.showCollected")}</p>
            <p className="mt-0.5 text-xs text-gray-400">{t("export.showCollectedHint")}</p>
          </div>
          <BooleanToggle checked={showCollected} onChange={() => setShowCollected((v) => !v)} ariaLabel={t("export.showCollected")} />
        </div>
      </div>

      <div className="mt-3 rounded-lg p-2.5 text-center text-xs font-medium" style={{ backgroundColor: "#F1F6FA", color: BRAND_NAVY }}>
        {previewParts.join(" · ")}
        {" · "}
        {t("export.previewPending", { amount: formatMoney(Object.values(data.pendingTotal)[0] || 0, Object.keys(data.pendingTotal)[0] || fallbackCurrency, currencies.rows) })}
      </div>

      <button
        onClick={handleGenerate}
        disabled={data.isEmpty || generating}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white disabled:opacity-40"
        style={{ backgroundColor: BRAND_NAVY }}
      >
        {generating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <FileDown size={16} aria-hidden="true" />}
        {generating ? t("export.generating") : t("export.generate")}
      </button>
      {data.isEmpty && <p className="mt-2 text-center text-xs text-gray-400">{t("export.emptyError")}</p>}
    </Sheet>
  );
}
