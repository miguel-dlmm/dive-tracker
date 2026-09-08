import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { GraduationCap, Award, Handshake, ChevronRight, Building2 } from "lucide-react";
import { TEAL, SUN, GREEN, BRAND_NAVY, BRAND_OCEAN } from "./App";
import { MonthCalendar, colorFor, isPendingStatus, MOVEMENT_TYPE_META } from "./shared";
import { buildEntriesBySource, buildIncomeEntries } from "./rateCalc";
import { DURATION, EASE, usePrefersReducedMotion, useCountUp } from "./motion";
import PendingCollectionCard from "./PendingCollectionCard";
import { getGeneratedCount } from "./trainingRecords/generatedCounter";

// worklog / rates / comisiones / commissionRates / colleaguePayments / activities /
// schools / currencies / paymentStatuses: hooks de useSupabaseTable
// onQuickCreate: (type, date?) => abre MovementSheet SIN cambiar de
// pestaña (Home sigue visible mientras se rellena) — solo al guardar con
// éxito se navega a Mi trabajo, ver App.jsx/startHomeCreate. date opcional
// preselecciona esa fecha en vez de la de hoy (la usa el calendario de
// abajo). type es directamente "ganado"/"comision"/"companeros" — ya no
// hace falta el id de pestaña antiguo ("log"), ver docs/ADR/0005 addendum.
// onOpenPending: () => navega a Mi trabajo (tarjeta "Pendiente de cobrar")
// — Mi trabajo abre ya en su pestaña "Pendientes" por defecto, así que no
// hace falta pasarle ningún filtro explícito.
// onOpenSummary: () => navega a Resumen — puente táctil desde "Generado
// este mes" (ver comentario junto a esa tarjeta más abajo). Resumen se
// monta de cero al entrar (no queda en el DOM mientras se ve otra pestaña,
// ver App.jsx), así que ya abre por defecto en "Mes"/mes actual sin
// necesidad de pasarle ningún estado de periodo.
// "YYYY-MM" de un Date construido con componentes locales — nunca
// toISOString() ni new Date(e.date).getMonth(): un string de fecha sin
// hora ("2026-08-01") se parsea como medianoche UTC (ECMA-262), y
// .getMonth()/.getFullYear() lo leen de vuelta en la zona horaria LOCAL —
// en cualquier huso negativo (América, incluida cualquier escuela en
// México/Caribe), esa medianoche UTC cae la noche anterior en local, así
// que un movimiento del día 1 de un mes podía contarse en el mes
// ANTERIOR. Comparar "YYYY-MM" como string evita el problema de raíz: ni
// el mes actual ni la fecha del movimiento pasan nunca por ese parseo.
// Mismo bug, mismo tipo de corrección que en SummaryTab.jsx (ver nota
// junto a withinRange ahí).
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Curso/Comisión/Ajuste traducidos una única vez (common:movementTypes,
// fuente única compartida con SummaryTab/MiTrabajoTab/RatesTab, pedido
// explícito del usuario 2026-09-01 para no repetir esta traducción por
// pantalla) — MOVEMENT_TYPE_META (shared.jsx) sigue siendo la fuente de
// los colores, solo el label se resuelve aquí con t().
function useTranslatedMovementTypeMeta(t) {
  return {
    ganado: { ...MOVEMENT_TYPE_META.ganado, label: t("common:movementTypes.ganado") },
    comision: { ...MOVEMENT_TYPE_META.comision, label: t("common:movementTypes.comision") },
    companeros: { ...MOVEMENT_TYPE_META.companeros, label: t("common:movementTypes.companeros") },
  };
}

// Tarjeta de KPI animada (Fase 3, Release V1 — "algún KPI interesante en
// formato animado y chulo"). Entra con fade+slide-up escalonado (index*80ms
// de retraso entre las tres) y la cifra hace un conteo ascendente
// (useCountUp, motion.js) — mismo vocabulario EASE.enter/DURATION.md que
// usa el resto de la app para lo que ENTRA en pantalla, no un cuarto
// sistema de animación aparte.
// Compactada (rediseño estructural 2026-09-06, pedido explícito: "los KPI
// ocupan 3 filas, ¿más compacta?") — icono+cifra pasan a una sola fila en
// vez de icono/cifra/etiqueta apiladas y centradas; la etiqueta se queda
// en su propia fila, a todo el ancho, para no perder espacio de lectura
// frente a etiquetas más largas (mismo motivo que en MoneyKpiTile,
// MiTrabajoTab.jsx — las dos comparten ahora este mismo patrón).
// Segunda vuelta de diseño (2026-09-07, feedback explícito: "no acaban de
// gustarme, dales otra vuelta" tras la primera compactación) — mismo
// patrón de 2 filas (icono+cifra / etiqueta), pero con más presencia:
// insignia de 32px (antes 24px) e icono de 18px (antes 13px), cifra en
// text-xl (antes text-lg) y algo más de aire interno (px-3 py-3 en vez de
// px-2.5). Pedido explícito de mantener la altura a raya ("que no robe
// mucho espacio") — sigue siendo 2 filas, no 3; solo crecen los elementos
// dentro de esas 2 filas, no el número de filas.
function KpiTile({ icon: Icon, color, value, label, index, reduced }) {
  const count = useCountUp(value, { reduced });
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: reduced ? 0.01 : DURATION.md, ease: EASE.enter, delay: reduced ? 0 : index * 0.08 } }}
      className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-3"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1A` }}>
          <Icon size={18} style={{ color }} aria-hidden="true" />
        </span>
        <span className="text-xl font-bold leading-none tabular-nums" style={{ color: BRAND_NAVY }}>{count}</span>
      </div>
      <span className="text-[11px] font-medium leading-tight text-gray-500">{label}</span>
    </motion.div>
  );
}

export default function HomeTab({ worklog, rates, comisiones, commissionRates, colleaguePayments, activities, currencies, paymentStatuses, onQuickCreate, onOpenPending, onOpenSummary, onOpenTrainingRecords, onOpenInstallApp, userId }) {
  const { t } = useTranslation("home");
  // Oculta el punto de entrada de "Instalar la app" si la propia app ya
  // corre instalada (display-mode: standalone en Chromium/Android,
  // navigator.standalone en iOS Safari — ningún estándar cubre ambos con
  // la misma propiedad): no tiene sentido ofrecer instalar algo que ya
  // está instalado.
  const alreadyInstalled = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone === true);
  const translatedTypeMeta = useTranslatedMovementTypeMeta(t);
  const reducedMotion = usePrefersReducedMotion();
  // Contador decorativo de la tarjeta de Training Records (2026-09-08,
  // "otra manera dinámica y atractiva de integrarlo en la home") — ver
  // generatedCounter.js para el porqué de vivir solo en localStorage
  // (nunca se guardan datos de alumnos, así que no hay ningún sitio real
  // donde llevar la cuenta de certificados emitidos sin romper esa
  // garantía). Leído una vez al montar Home — TrainingRecordsTab.jsx es
  // una pestaña hermana que se desmonta al salir de ella, así que no
  // hace falta sincronización en vivo entre las dos, solo que Home lea
  // el valor actual cada vez que se vuelve a montar.
  // Por CUENTA (`userId`), no por dispositivo — bug real reportado
  // 2026-09-08: con el bypass de login/varias cuentas de prueba en el
  // mismo navegador, una cuenta demo recién entrada mostraba los
  // Training Records ya generados por la cuenta admin usada antes en ese
  // mismo dispositivo. Ver generatedCounter.js, mismo criterio que
  // whatsNewSeenKey (App.jsx).
  const [generatedCount] = useState(() => getGeneratedCount(userId));
  const animatedGeneratedCount = useCountUp(generatedCount, { reduced: reducedMotion });
  const now = new Date();
  const currentMonthKey = monthKey(now);
  const activityColor = (name) => colorFor(activities.rows, name, "#94A3B8");

  // Corrección 7/7 (2026-09-01): navegación de meses en el calendario de
  // Home — antes fijo siempre al mes actual (now.getFullYear()/getMonth()
  // pasados directos a MonthCalendar). Estado propio de Home, no de
  // MonthCalendar (que sigue siendo controlado, ver shared.jsx): solo
  // afecta a qué mes se ve en el calendario, nunca a "Generado este mes" /
  // "Pendiente de cobrar" (arriba), que siguen ancladas al mes real de
  // hoy — son cifras de "ahora mismo", no de lo que se esté navegando.
  const [calendarCursor, setCalendarCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const isCurrentCalendarMonth = calendarCursor.year === now.getFullYear() && calendarCursor.month === now.getMonth();
  const goToPrevMonth = () => setCalendarCursor(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  const goToNextMonth = () => setCalendarCursor(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));
  const goToCurrentMonth = () => setCalendarCursor({ year: now.getFullYear(), month: now.getMonth() });

  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";

  // ganado/comision/companeros: se mantienen separadas porque el calendario
  // de abajo necesita distinguir la fuente de cada apunte del día (incluye
  // pagos de compañeros en cualquier sentido, también los que tú pagas).
  // buildEntriesBySource (rateCalc.js): antes duplicado byte a byte aquí y
  // en SummaryTab.jsx — ver docs/BACKLOG.md, "Reutilizar componente entre
  // Home y Resumen".
  const entriesBySource = useMemo(
    () => buildEntriesBySource({ worklog: worklog.rows, rates: rates.rows, comisiones: comisiones.rows, commissionRates: commissionRates.rows, colleaguePayments: colleaguePayments.rows, fallbackCurrency }),
    [worklog.rows, rates.rows, comisiones.rows, commissionRates.rows, colleaguePayments.rows, fallbackCurrency]
  );
  const { ganado: ganadoEntries, comision: comisionEntries, companeros: companerosEntries } = entriesBySource;

  // Sin filtrar por mes aquí: MonthCalendar (shared.jsx) ya filtra por su
  // propio year/month internamente (byDay) — pre-filtrar al mes actual
  // aquí impedía navegar a cualquier otro mes (los datos ya habrían
  // desaparecido del array antes de llegar al calendario).
  const calendarEntries = useMemo(() => [...ganadoEntries, ...comisionEntries, ...companerosEntries],
    [ganadoEntries, comisionEntries, companerosEntries]);

  // Dato secundario de "Generado este mes" — personas formadas, no comisión
  // ni ajustes: son clientes que TÚ has impartido este mes, un dato humano y
  // sin ambigüedad de alcance (no cuenta clientes referidos que forma otro
  // instructor, ni ajustes económicos, que no representan formación). Da a
  // la tarjeta un segundo dato con el mismo peso visual que "N pagos
  // pendientes" en la tarjeta de al lado.
  const peopleTrainedThisMonth = useMemo(() => ganadoEntries
    .filter((e) => e.date.slice(0, 7) === currentMonthKey)
    .reduce((sum, e) => sum + (e.people || 0), 0), [ganadoEntries, currentMonthKey]);

  // KPIs de Fase 3 (Release V1) — tres ángulos distintos de "cómo me está
  // yendo", deliberadamente no financieros (eso ya lo cubren "Pendiente de
  // cobrar" y "Generado este mes" arriba): alumnos este mes ya se calculaba
  // (peopleTrainedThisMonth, se reutiliza tal cual). Cursos impartidos era
  // al principio un total histórico (sensación de trayectoria) — cambiado
  // a mensual (pedido explícito del usuario 2026-09-03: "TU IMPACTO ESTE
  // MES" como título único, los 3 KPIs deben ser del mes, no mezclar un
  // total de siempre con dos del mes actual). Personas captadas: mismo
  // criterio que people trained pero sobre comisionEntries (aclaración
  // explícita del usuario: "personas por las que he comisionado" —
  // clientes referidos, no formados por ti).
  const coursesTotal = useMemo(() => worklog.rows
    .filter((e) => e.date.slice(0, 7) === currentMonthKey).length, [worklog.rows, currentMonthKey]);
  const referredThisMonth = useMemo(() => comisionEntries
    .filter((e) => e.date.slice(0, 7) === currentMonthKey)
    .reduce((sum, e) => sum + (e.people || 0), 0), [comisionEntries, currentMonthKey]);

  // Base común de las dos métricas financieras del dashboard — ver
  // buildIncomeEntries en rateCalc.js y docs/ADR/0004-home-dashboard-operativo-instructor.md.
  // "Generado este mes" y "Pendiente de cobrar" parten de este mismo array
  // (también lo usa PaymentsTab), solo cambia el filtro que le aplican.
  const incomeEntries = useMemo(
    () => buildIncomeEntries({ worklog: worklog.rows, rates: rates.rows, comisiones: comisiones.rows, commissionRates: commissionRates.rows, colleaguePayments: colleaguePayments.rows, fallbackCurrency }),
    [worklog.rows, rates.rows, comisiones.rows, commissionRates.rows, colleaguePayments.rows, fallbackCurrency]
  );

  // "Pendiente de cobrar": sin filtro de fecha (una deuda de hace 2 meses
  // sigue siendo una deuda), solo estado pendiente.
  const pendingSummary = useMemo(() => {
    const pendingEntries = incomeEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows));
    const totals = {};
    pendingEntries.forEach((e) => { totals[e.currency] = (totals[e.currency] || 0) + e.total; });
    return { totals, count: pendingEntries.length };
  }, [incomeEntries, paymentStatuses.rows]);

  // Escuela más activa este mes (2026-09-07, pedido explícito: "el módulo
  // 'generado este mes' duplica información ya disponible en la cabecera
  // de movimientos [Mi trabajo] — piensa algo de menos valor que combine
  // con el diseño de la home"). Sustituye la cifra financiera (ya
  // duplicada con el KPI "Generado este mes" de Mi trabajo) por un ángulo
  // nuevo — CON QUIÉN trabajas, no CUÁNTO generas — de menor peso
  // informativo a propósito (no decide nada, solo da contexto) pero
  // coherente con el resto de la pantalla: reutiliza `incomeEntries`
  // (ya calculado arriba, `.school` viene directo de worklog/comisiones,
  // convención #1 de CLAUDE.md) en vez de una fuente de datos nueva.
  // Se cuentan MOVIMIENTOS (cuántas veces aparece esa escuela este mes),
  // no personas — "más activa" se lee mejor como frecuencia de trabajo
  // que como volumen de alumnos, que ya cubre el KPI "Alumnos" de arriba.
  const schoolActivityThisMonth = useMemo(() => {
    const counts = {};
    incomeEntries
      .filter((e) => e.date.slice(0, 7) === currentMonthKey)
      .forEach((e) => { counts[e.school] = (counts[e.school] || 0) + 1; });
    const bySchool = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (bySchool.length === 0) return null;
    return { school: bySchool[0][0], count: bySchool[0][1], schoolCount: bySchool.length };
  }, [incomeEntries, currentMonthKey]);

  return (
    <div className="space-y-4">
      {/* 1. KPIs — Fase 3, Release V1 ("algún KPI interesante en formato
          animado y chulo"). Movido a primera posición (job nocturno,
          Bloque 9, pedido explícito del usuario) — antes cerraba la
          pantalla; tres ángulos no financieros de "cómo me está yendo"
          (financiero lo cubren las dos tarjetas de más abajo). Conteo
          ascendente + entrada escalonada (KpiTile, arriba) en vez de
          aparecer estáticas de golpe. */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t("kpis.sectionTitle")}
          </h2>
          {/* Instalar la app (2026-09-08, tercera vuelta): el banner
              descartable de antes "no convencía" — pedido explícito de
              moverlo a un sitio integrado que siempre esté disponible y
              no moleste (ver el enlace fijo en Ayuda, HelpTab.jsx). El
              usuario pidió además un punto de entrada en Home
              ("botón, pastilla... innova"), primero como icono solo;
              después, pedido explícito de cambiarlo por texto pequeño
              ("Descargar app"). Nunca se cierra ni se recuerda como
              "descartado" — solo se oculta cuando ya no aplica (la app
              ya corre instalada). Mismo truco de margen negativo que ya
              usan los botones de navegación del calendario (más abajo)
              para que el objetivo táctil llegue a 44px de alto sin que
              la fila crezca visualmente con él. */}
          {onOpenInstallApp && !alreadyInstalled && (
            <button
              type="button"
              onClick={onOpenInstallApp}
              className="-my-3 flex min-h-11 shrink-0 items-center rounded-md px-1 text-[11px] font-semibold active:opacity-70"
              style={{ color: BRAND_OCEAN }}
            >
              {t("installApp")}
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <KpiTile icon={GraduationCap} color={TEAL} value={peopleTrainedThisMonth} label={t("kpis.studentsThisMonth")} index={0} reduced={reducedMotion} />
          <KpiTile icon={Award} color={SUN} value={coursesTotal} label={t("kpis.coursesTotal")} index={1} reduced={reducedMotion} />
          <KpiTile icon={Handshake} color={GREEN} value={referredThisMonth} label={t("kpis.referredThisMonth")} index={2} reduced={reducedMotion} />
        </div>
      </div>

      {/* 2. Training Records — tercera vuelta de diseño (2026-09-08).
          Historial: nació como tarjeta grande con borde y degradado
          (2026-09-04); feedback directo "es muy grande y queda como
          pegada, no lo veo muy integrado" llevó a explorar mockups
          (Artifact, 3 direcciones) — elegida "Opción A" (fila fina, sin
          tarjeta propia, mismo espíritu que el enlace "Descargar app" de
          arriba). Segunda vuelta de mockups sobre esa misma opción,
          pidiendo "dinamismo, texto, call to action, Generados" — elegida
          la combinación de dos ideas:
          (1) "Generados" como cuarta palabra del mismo vocabulario que ya
              usan los KPI de arriba (Alumnos/Cursos/Captados) — mismo
              patrón número-en-grande + etiqueta-pequeña, no un contador
              inventado aparte.
          (2) el texto CAMBIA según haya actividad real: sin ningún
              documento generado todavía, es una invitación de verdad
              ("Genera tu primer Training Record", en azul océano — nunca
              un "0 Generados" desangelado); en cuanto hay alguno, pasa a
              contar lo ya hecho.
          Insignia rounded-lg (no circular, para no confundirse con los
          badges redondos de los KPI) con la misma respiración sutil en
          bucle que ya tenía, apagada con prefers-reduced-motion.
          `px-3` (2026-09-08, bug real reportado: "queda todo muy en el
          lado izquierdo") — el `px-1` original dejaba el icono/texto de
          esta fila varios píxeles más a la izquierda que el resto de
          elementos de Home (las KPI tiles tienen su propio `p-[9px]`
          interno, la tarjeta "Pendiente de cobrar" `p-4`): sin ningún
          borde/fondo propio que lo compense, el contenido se veía pegado
          al borde en vez de guardar el mismo ritmo horizontal que sus
          vecinos. */}
      {onOpenTrainingRecords && (
        <button
          type="button"
          onClick={onOpenTrainingRecords}
          className="flex items-center gap-2.5 border-b border-t border-gray-100 px-3 py-2.5 text-left"
        >
          <motion.span
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: generatedCount > 0 ? BRAND_NAVY : `${BRAND_OCEAN}1A` }}
            animate={reducedMotion ? undefined : { scale: [1, 1.06, 1] }}
            transition={reducedMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Award size={13} style={{ color: generatedCount > 0 ? "#fff" : BRAND_OCEAN }} aria-hidden="true" />
          </motion.span>
          <span className="min-w-0 flex-1">
            {generatedCount > 0 ? (
              <>
                <span className="block text-[11.5px] font-bold leading-tight" style={{ color: BRAND_NAVY }}>{t("trainingRecordsCard.title")}</span>
                <span className="flex items-baseline gap-1">
                  <span className="text-xs font-extrabold leading-none tabular-nums" style={{ color: BRAND_OCEAN }}>{animatedGeneratedCount}</span>
                  <span className="text-[9.5px] font-semibold uppercase leading-none tracking-wide text-gray-400">{t("trainingRecordsCard.generatedLabel")}</span>
                </span>
              </>
            ) : (
              <span className="block text-[11.5px] font-bold leading-tight" style={{ color: BRAND_OCEAN }}>{t("trainingRecordsCard.ctaFirstTime")}</span>
            )}
          </span>
          <ChevronRight size={16} className="shrink-0" style={{ color: generatedCount > 0 ? "#CBD5E1" : BRAND_OCEAN }} aria-hidden="true" />
        </button>
      )}


      {/* 3. Pendiente de cobrar — información financiera principal, la más
          visible de la pantalla. Integra también el acceso rápido de
          creación (botón "+" a la derecha, onQuickAdd): antes era una fila
          aparte debajo de esta tarjeta, con el mismo ancho y casi el mismo
          peso visual, compitiendo por atención con la propia cifra
          pendiente. Vive aquí en vez de eso porque un único acceso
          "Añadir movimiento" (no un botón por tipo — el propio formulario
          resuelve el tipo con su selector, mismo criterio ya validado en
          Mi trabajo, ADR-0005) no necesita una fila propia si cabe, claro
          y con buen tamaño táctil, en el espacio libre de la tarjeta más
          consultada de Home. onQuickAdd usa e.stopPropagation() dentro de
          PendingCollectionCard para no interferir con onPress (ahora
          navega a Mi trabajo, ver comentario de onOpenPending arriba). */}
      <PendingCollectionCard
        totals={pendingSummary.totals}
        count={pendingSummary.count}
        currencyRows={currencies.rows}
        color={SUN}
        onPress={onOpenPending}
        onQuickAdd={() => onQuickCreate("ganado")}
      />

      {/* 4. Calendario del mes — revisión de jerarquía 2026-08-29 (ver
          docs/ADR/0004, addendum): antes iba en tercer y último lugar,
          después de "Generado este mes", cuando en la práctica un día
          normal no acumula demasiados movimientos distintos (el propio
          desglose del día lo confirma: casi siempre 1-2 líneas) — no
          hacía falta "reservarle" el fondo de la pantalla. El calendario
          es también la vía más directa para crear (tocar un día vacío) y
          para entender el mes de un vistazo (qué días hubo actividad, de
          qué tipo), así que sube justo debajo de la cifra financiera
          principal. sourceMeta viene de useTranslatedMovementTypeMeta,
          sobre MOVEMENT_TYPE_META (shared.jsx) con el label ya traducido
          desde common:movementTypes — única fuente para Home/Resumen/Mi
          trabajo/Tarifas. onCreateForDay solo
          se pasa aquí, no en Resumen: tocar un día vacío inicia un
          movimiento para esa fecha; uno con datos conserva su desglose y
          gana un "+" para añadir otro.
          Segunda revisión (misma fecha, más tarde): un widget "Los más
          antiguos por cobrar" (ya retirado, ver comentario junto a
          "Generado este mes" más abajo) se probó brevemente entre la
          tarjeta principal y el calendario — este último conserva el
          segundo lugar por el mismo motivo de siempre: responde "¿qué
          pasó este mes?", la pregunta más frecuente al entrar en Home. */}
      <div>
        <MonthCalendar
          year={calendarCursor.year}
          month={calendarCursor.month}
          entries={calendarEntries}
          dotColor={BRAND_NAVY}
          currencyRows={currencies.rows}
          activityColor={activityColor}
          caption={t("calendarCaption")}
          autoSelectFirstDay
          detailed
          groupBySource
          sourceMeta={translatedTypeMeta}
          onCreateForDay={(dateStr) => onQuickCreate("ganado", dateStr)}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          onGoToday={goToCurrentMonth}
          isCurrentMonth={isCurrentCalendarMonth}
        />
      </div>

      {/* 5. Escuela más activa este mes — información secundaria de cierre,
          no la protagonista (2026-09-07, pedido explícito: "el módulo
          'generado este mes' duplica información ya disponible en la
          cabecera de movimientos [el KPI "Generado este mes" de Mi
          trabajo] — piensa algo de menos valor que combine con el diseño
          de la home"). Antes esta tarjeta mostraba la misma cifra
          financiera que ya se ve al entrar en Mi trabajo — sustituida por
          un ángulo distinto y deliberadamente de menor peso informativo:
          CON QUIÉN trabajas este mes, no CUÁNTO generas (eso ya lo cubren
          los KPIs financieros de Mi trabajo). Mismo patrón visual que
          antes (tarjeta táctil, icono+etiqueta / cifra grande / caption),
          así que sigue combinando con el resto de la pantalla sin
          introducir un cuarto lenguaje visual — solo cambia el contenido.
          Sigue navegando a Resumen (onOpenSummary) — "Por escuela" ya
          vive ahí como desglose completo, así que el puente sigue
          teniendo sentido: esta tarjeta es el adelanto, Resumen es el
          detalle. */}
      <button
        type="button"
        onClick={onOpenSummary}
        data-testid="active-school-this-month-card"
        className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Building2 size={14} style={{ color: TEAL }} aria-hidden="true" />
          {t("activeSchoolThisMonth")}
        </div>
        <div className="mt-1 truncate text-2xl font-bold" style={{ color: BRAND_NAVY }}>
          {schoolActivityThisMonth ? schoolActivityThisMonth.school : "—"}
        </div>
        <div className="mt-0.5 text-xs text-gray-400">
          {schoolActivityThisMonth ? (
            schoolActivityThisMonth.schoolCount > 1
              ? t("activeSchoolCountAndOthers", { count: schoolActivityThisMonth.count, schools: schoolActivityThisMonth.schoolCount })
              : t("activeSchoolCount", { count: schoolActivityThisMonth.count })
          ) : (
            t("noActivityThisMonth")
          )}
        </div>
      </button>
    </div>
  );
}
