# Propuesta conceptual — Home + Resumen

**Fecha:** 2026-08-29
**Estado:** Propuesta para aprobación — análisis únicamente, sin implementación.
**Autor:** Agente B (Head of Product/UX/UI de esta sesión), trabajando en
paralelo al Agente A (Usuarios). No se ha tocado ningún archivo de código.

## 1. Resumen ejecutivo

Home y Resumen ya están, en gran medida, bien repartidos: Home responde
"¿tengo algo pendiente o algo que hacer ahora mismo?" sin decisiones ni
navegación; Resumen responde "¿cómo va cualquier periodo que yo elija,
comparado, desglosado?" — ver ADR-0004 y ADR-0009. La sesión anterior ya
añadió lo que le faltaba a Resumen para el perfil "obsesionado con los
números" (`TrendBars`, una franja de tendencia de 6 periodos). El
problema real que queda no es de estructura, es de **puente entre las
dos pantallas**: Home no ofrece ningún indicio de tendencia (ni una
línea), y su única cifra reflexiva ("Generado este mes") no lleva a
ningún sitio si el usuario quiere profundizar. Además, el widget "Los
más antiguos por cobrar" duplica una función que Mi trabajo ya cubre
mejor, sin aportar una pregunta nueva. La propuesta: **quitar ese
widget, añadir un indicio de tendencia de una sola línea a Home, y
convertir "Generado este mes" en un puente táctil hacia Resumen** — sin
tocar la arquitectura de ninguna de las dos pantallas.

## 2. Problemas detectados (con evidencia del código actual)

1. **Home no tiene ningún indicio de tendencia.** `HomeTab.jsx` muestra
   `monthTotals` como una cifra absoluta, sin comparación — ni con el mes
   anterior ni con nada. El perfil "vistazo rápido" (el que usa
   principalmente Home) es exactamente a quien más le sirve un "+12% vs
   julio" de una línea, sin tener que navegar a Resumen a leerlo. Hoy esa
   comparación SOLO existe en `HeroTotal` (`SummaryTab.jsx`), detrás de
   un cambio de pestaña.
2. **"Generado este mes" es un callejón sin salida.** Es la única tarjeta
   de Home que no lleva a ningún sitio al tocarla (`PendingCollectionCard`
   sí navega a Mi trabajo vía `onOpenPending`). Un usuario que ve la
   cifra y quiere saber "¿por qué, de dónde viene?" no tiene ningún
   camino directo — tiene que cambiar de pestaña y volver a elegir "Mes"
   en Resumen (que además ya suele estar así por defecto, pero el
   usuario no lo sabe sin probarlo).
3. **El widget "Los más antiguos por cobrar" (`HomeTab.jsx`, líneas
   ~212-250) duplica una función que Mi trabajo ya hace mejor.** Muestra
   hasta 3 filas con un botón "Cobrar" — la MISMA acción que Mi trabajo
   ofrece con: animación de salida coherente (recién corregida esta
   sesión), "Deshacer", filtros, y visión completa en vez de solo 3
   filas. La tarjeta "Pendiente de cobrar", justo encima, YA navega a Mi
   trabajo con un toque. El widget no responde a una pregunta nueva —
   responde la MISMA pregunta ("¿qué cobro primero?") con una versión
   deliberadamente más pobre de una pantalla que ya existe. El propio
   usuario lo señala en su mensaje: "no me parece que aporte demasiado
   valor" — de acuerdo, con evidencia de código que lo respalda, no solo
   intuición.
4. **El calendario de Resumen sigue limitado a "Mes"** (`SummaryTab.jsx`,
   `granularity === "mensual"` condiciona toda la tarjeta) — ya
   documentado como decisión consciente en el addendum de ADR-0009, no
   es un bug, pero sigue siendo una limitación real para quien navega en
   Trimestre/Semestre/Año y pierde el calendario.
5. **No hay comparación de tendencia por escuela o curso**, solo del
   total (`TrendBars` usa `withTotals`, ya filtrado por el segmentado
   Total/Curso/Comisión/Ajuste, pero nunca por escuela). "Por escuela"
   (`RankedList`) ordena por magnitud absoluta del periodo actual, nunca
   por crecimiento — un instructor con 3 escuelas no puede ver "¿cuál
   está creciendo y cuál cayendo?" sin comparar periodos a mano, entrando
   y saliendo del desglose repetidamente.

## 3. Benchmark — principios extraídos, no características copiadas

| Referencia | Qué hace | Principio aplicable aquí |
|---|---|---|
| **Apple Salud / Tiempo de uso** | Pantalla semanal: barra por día + un "+X% vs semana pasada" arriba del todo, tocar un día abre su detalle | Exactamente el patrón que `HeroTotal` + `TrendBars` ya implementan en Resumen — **valida** la decisión ya tomada, no hace falta reinventar nada ahí. Confirma que barras + un delta textual es suficiente sin gráfico de líneas (ya descartado en ADR-0009 por el mismo motivo). |
| **Apps de finanzas personales tipo Mint/YNAB** | Pantalla de inicio: UN número (a gastar / patrimonio) + comparación mínima; el desglose por categoría/tendencia detallada vive en una pantalla de "Informes" separada, con su propio selector de rango | Valida la separación Home (una cifra) / Resumen (informe filtrable) que este proyecto ya tiene — el error a evitar es que la pantalla rápida intente ser también la analítica. Principio que SÍ falta aplicar aquí: en esas apps, tocar el número de la pantalla rápida SIEMPRE lleva al informe filtrado por ese mismo periodo — aquí "Generado este mes" no lo hace todavía. |
| **Apps de gasto tipo Wise/Revolut "insights"** | Junto al saldo, un mini-indicador de tendencia (flecha + %), sin gráfico | Justifica añadir un indicio de UNA LÍNEA a "Generado este mes" en Home, no una franja de barras completa — la franja completa ya vive en Resumen, en Home basta la flecha+porcentaje. |
| **Stripe Dashboard** | KPI + comparación arriba, gráfico de tendencia justo debajo, UN selector de rango que gobierna todo lo de debajo (KPI + tablas) | Valida el control fusionado de granularidad+periodo de Resumen (ya implementado, addendum de ADR-0009) — un único selector de "cuándo" para toda la pantalla, no un selector por tarjeta. |
| **Linear/Notion (vistas guardadas, no finanzas)** | Paneles configurables por el usuario (mostrar/ocultar/reordenar) | Valida la dirección de "widgets configurables" que el usuario pide para el futuro — pero con una advertencia real: esas herramientas tienen años de ingeniería detrás de un sistema genérico. Para el tamaño de Ocean Pulse, un conjunto CURADO de tarjetas con mostrar/ocultar (no un canvas libre reordenable con drag-and-drop) es proporcional; ver sección 9. |
| **Apps de fitness con progreso semanal (Strava/Apple Fitness)** | "Esta semana" (rápido) vs. pestaña "Progreso" (profundo), separadas | Mismo patrón de dos pantallas con trabajos distintos, tercera confirmación independiente de que la separación Home/Resumen ya es la correcta. |

**Conclusión del benchmark:** ningún patrón de referencia sugiere fusionar
Home y Resumen, ni sustituir las barras por un gráfico más complejo, ni
construir un sistema de widgets genérico ahora. El único principio real
que falta aplicar aquí es el **puente entre pantallas** (tocar el número
rápido lleva al informe filtrado por ese mismo periodo) — el resto ya
está bien resuelto o es, con razón, deliberadamente distinto (el
"informe" de Resumen ya es más rico que cualquiera de estas referencias
porque el negocio lo pide: desglose por escuela con drill-down a curso,
comisiones, pagos de compañeros).

## 4. Propuesta conceptual de Home

**Se mantiene la jerarquía actual** (Pendiente de cobrar → Calendario →
Generado este mes), ya revisada dos veces esta sesión (ver ADR-0004,
ambos addenda) y coherente con el benchmark (una cifra accionable
arriba, una vista operativa en medio, una cifra reflexiva al cierre).

**Qué vive en Home:** solo lo que no requiere ninguna decisión previa
del usuario — cifras del mes en curso, calendario del mes en curso,
creación rápida. Cero selectores, cero navegación interna.

**Qué NO debe vivir en Home:** cualquier cosa que necesite elegir un
periodo, una escuela o un curso — eso es, por definición, la pregunta
de Resumen. Esto descarta explícitamente llevar `TrendBars` completo a
Home (6 barras + eje ya es "modo informe", no "vistazo").

**Qué se añade:**
- Un indicio de tendencia de una línea bajo "Generado este mes" (p. ej.
  "↑ 12% vs julio"), reutilizando el mismo cálculo de `HeroTotal`
  (`singleCurrencyAmount` + delta), no una reinvención.
- "Generado este mes" pasa a ser táctil y navega a Resumen, igual que
  "Pendiente de cobrar" ya navega a Mi trabajo — cierra el único hueco
  real de "puente" que detectó el benchmark.

**Qué se elimina:** el widget "Los más antiguos por cobrar" completo
(ver sección 8).

## 5. Propuesta conceptual de Resumen

**Se mantiene la estructura actual** (control fusionado de
granularidad+periodo, segmentado Total/Curso/Comisión/Ajuste, `HeroTotal`
con delta, `TrendBars`, tarjetas plegables Por escuela/Por curso/
Calendario/Comisiones/Pagos de compañeros) — es, contrastada con el
benchmark, una estructura ya madura y correcta para el tamaño de este
producto.

**Qué se añade (documentado como candidato, ver sección 11):** un modo
de ordenación por **crecimiento** dentro de "Por escuela" (además del
orden actual por magnitud absoluta) — comparar el total de cada escuela
en el periodo actual contra el mismo periodo anterior, mostrando qué
escuela crece y cuál cae. Es la extensión natural de "me interesa la
comparativa de ingresos a lo largo de periodos anteriores" que el
usuario señala, llevada del total (ya cubierto por `TrendBars`) a la
dimensión por escuela (todavía sin cubrir). Necesita su propio diseño
de casos límite (escuela nueva sin periodo anterior, monedas mixtas)
antes de implementarse — no es trivial, no se dimensiona aquí más allá
de señalarlo.

**Qué NO se añade:** un calendario multi-mes para granularidades no
mensuales (ya evaluado y descartado en el addendum de ADR-0009 por el
mismo motivo: `MonthCalendar` es de un único mes por diseño, extenderlo
es un proyecto de componente aparte, no una mejora de Resumen). Sigue
sin justificarse el coste frente al beneficio.

## 6. Reparto funcional Home ↔ Resumen

| Pregunta del instructor | Vive en | Por qué no es duplicación |
|---|---|---|
| "¿Tengo algo pendiente de cobrar ahora?" | Home (Pendiente de cobrar) | Cifra siempre visible, cero decisiones; el toque lleva a la acción real (Mi trabajo) |
| "¿Qué pasó hoy / este mes, día a día?" | Home (calendario, mes actual) | Vista operativa — también es la vía de creación (tocar un día) |
| "¿Cómo va este mes, en una cifra, comparado al anterior?" | Home (Generado este mes + indicio de tendencia) | Reflexivo, cero navegación — la versión "de un vistazo" de lo que Resumen hace en profundidad |
| "¿Cómo va CUALQUIER periodo que yo elija, comparado, con tendencia?" | Resumen (HeroTotal + TrendBars) | Requiere elegir un periodo — ya es "modo informe" |
| "¿De qué escuela/curso viene el dinero, y cómo evoluciona cada una?" | Resumen (Por escuela/Por curso) | Drill-down, no es una pregunta de un vistazo |
| "¿Qué pasó un día de OTRO mes/periodo?" | Resumen (Calendario, solo en Mes) | Exploratorio, no operativo |
| "Quiero cobrar/editar/eliminar un movimiento concreto" | Mi trabajo (alcanzable desde Home) | Es una acción de gestión, no una pregunta de dashboard |

Ninguna fila aparece en ambas pantallas con el mismo nivel de detalle —
donde coincide el TEMA (p. ej. "cuánto he generado"), el nivel de
profundidad es deliberadamente distinto (una cifra vs. un informe
filtrable), que es precisamente lo que separa "vistazo rápido" de
"obsesionado con los números".

## 7. Papel del calendario

Home y Resumen ya comparten el mismo componente (`MonthCalendar`,
`shared.jsx`) — la duplicación de CÓDIGO ya se resolvió en ADR-0009
(antes Resumen tenía DOS calendarios propios; ahora tiene uno, y
comparte el componente con Home). Lo que queda son dos INSTANCIAS con
props distintas, y eso es correcto, no un problema pendiente:

- **Home:** siempre el mes actual, con `onCreateForDay` (es una vía de
  creación, no solo de consulta) — modo operativo.
- **Resumen:** el mes que esté navegando el usuario (solo si
  granularidad = Mes), sin creación — modo analítico/exploratorio.

Fusionar estas dos instancias en un único "estado de calendario
compartido" entre pantallas exigiría routing o estado global que este
proyecto no tiene (navegación por `tab` en `App.jsx`, sin URLs por
pantalla — ver `CLAUDE.md`), y el beneficio sería mínimo: son usos
legítimamente distintos. **Recomendación: no tocar nada aquí.** La nota
de `docs/BACKLOG.md` sobre "reutilizar componente entre Home y Resumen"
ya está resuelta en la parte que importa (el componente); la parte que
queda (dos instancias con props distintas) no es deuda, es la
arquitectura correcta.

## 8. Papel de los widgets

**"Los más antiguos por cobrar" — recomendación: ELIMINAR.** Ver
evidencia en la sección 2, punto 3. No sustituye por nada — su única
función (cobrar rápido) ya la cubre "Pendiente de cobrar" → Mi trabajo,
con mejor UX (animación, deshacer, sin límite de 3 filas). Mantenerlo
sería exactamente "mantener por inercia" — el propio usuario ya lo
señaló, y el análisis de código lo confirma de forma independiente.

**`TrendBars` — recomendación: MANTENER tal cual, sin cambios ahora.**
Ya resuelve, con el patrón validado por el benchmark (Apple Salud/
Tiempo de uso, Wise), la pregunta de tendencia del total. La única
evolución con valor real detectada (tendencia POR ESCUELA, no solo
total) se documenta como candidato futuro en la sección 5, no como
carencia del propio `TrendBars` — su trabajo (mostrar la tendencia del
segmentado activo) lo hace bien y no debe crecer para cubrir un trabajo
distinto (comparar entidades, no periodos).

## 9. Preparación conceptual para widgets configurables futuros

**No se diseña ni se implementa el sistema ahora** (fuera de alcance
explícito) — solo se deja constancia de qué necesitaría la arquitectura
actual para llegar ahí sin rehacer las pantallas:

- **Resumen ya está preparado.** Cada sección de profundidad es una
  instancia de `ExpandableCard` (Por escuela, Por curso, Calendario,
  Comisiones, Pagos de compañeros) más `TrendBars`, todas ya
  independientes entre sí — ya lo señalaba ADR-0009. Convertir esto en
  "mostrar/ocultar/reordenar" el día de mañana es, en esencia, envolver
  la lista de tarjetas ya existente en un `.filter()`/`.sort()` sobre una
  preferencia guardada en Configuración — no un rediseño.
- **Home NO está preparado todavía**, y no hace falta que lo esté hoy:
  sus 3 secciones (Pendiente de cobrar, Calendario, Generado este mes)
  están escritas directamente en el JSX de `HomeTab.jsx`, no como una
  lista de configuración recorrida con `.map()`. Antes de construir el
  sistema de widgets de verdad, convendría extraer esas 3 secciones a un
  array ordenado (mismo espíritu que la lista de `ExpandableCard`s de
  Resumen) — un refactor pequeño y de bajo riesgo, pero que debe
  posponerse hasta que Home se toque de nuevo por otro motivo (no
  proactivamente, para no anticipar complejidad sin necesidad real
  todavía — mismo criterio que ya rige otras decisiones de este
  proyecto).
- **Ninguna de las dos pantallas necesita hoy una tabla nueva en
  Supabase** para esto — "qué widgets están activos" podría vivir como
  una preferencia sencilla (p. ej. una fila de configuración por
  usuario), pero diseñar ESA parte pertenece al día en que se apruebe
  construir el sistema, no a esta propuesta.

## 10. Decisión sobre el switch OLD/NEW en la cabecera

**Recomendación: NO implementarlo.** Razones:

1. **Este proyecto no tiene router ni infraestructura de feature flags**
   (navegación por estado simple en `App.jsx`, confirmado en
   `CLAUDE.md`). Un switch real exigiría mantener DOS árboles de
   componentes completos (Home/Resumen viejos y nuevos) cargados a la
   vez, con el riesgo real de que un cambio en una función compartida
   (p. ej. si el indicio de tendencia de Home extrae un cálculo a
   `rateCalc.js`) diverja entre qué versión lo usa — una fuente de bugs
   silenciosa, no una ayuda de QA.
2. **El proyecto ya tiene una disciplina de comparación que funciona sin
   código nuevo:** `scripts/mobile-check.mjs` ya genera capturas
   móviles antes/después de cada cambio de UI (práctica ya establecida
   y usada en toda la sesión), y el propio modelo de ramas
   (`feature/*` sobre `develop`) permite comparar visualmente el estado
   actual desplegado frente a la rama de trabajo sin tocar producción.
   Para un único desarrollador validando su propio rediseño, esto
   YA resuelve "quiero comparar antes de decidir" sin construir nada.
3. **No hay una necesidad real hoy** que active este mecanismo — nadie
   más que el propio usuario necesita comparar las dos versiones, y el
   caso de "varios usuarios reales votando A/B en producción" (que sí
   justificaría una inversión real en feature flags) no está sobre la
   mesa. Construirlo ahora sería exactamente el tipo de complejidad
   anticipada sin necesidad concreta que este proyecto ya evita en otras
   decisiones (ver `docs/ADR/0006` y su mismo criterio de "no crear por
   adelantado").

**Alternativa recomendada:** seguir usando `mobile-check` (capturas
antes/después) + revisión visual manual en la rama de trabajo, igual que
en el resto de esta sesión. Si en el futuro aparece una necesidad real
de comparación en vivo con usuarios reales, es una decisión de
infraestructura que merece su propio ADR en ese momento, no una
implementación rápida ahora.

## 11. Qué eliminar / qué mantener / qué añadir

**Eliminar:**
- Widget "Los más antiguos por cobrar" completo (`HomeTab.jsx`:
  `OldestPendingRow`, `OLDEST_PENDING_LIMIT`, `oldestPending`, el bloque
  JSX y su `data-testid="oldest-pending-widget"`, más los tests que lo
  cubren en `HomeTab.test.jsx` y el paso correspondiente en
  `scripts/mobile-check.mjs`).

**Mantener sin cambios:**
- Toda la estructura de Resumen (control fusionado, segmentado,
  `HeroTotal`, `TrendBars`, las 5 `ExpandableCard`).
- Jerarquía de Home (Pendiente de cobrar → Calendario → Generado este
  mes).
- Las dos instancias separadas de `MonthCalendar`.

**Añadir (documentado, pendiente de implementación futura, no ahora):**
1. Indicio de tendencia de una línea bajo "Generado este mes" en Home
   (bajo riesgo, cálculo ya existente en `HeroTotal`).
2. "Generado este mes" táctil, navega a Resumen (riesgo medio: toca
   `App.jsx`/navegación global — ver riesgos, sección 12).
3. Modo de ordenación por crecimiento en "Por escuela" de Resumen
   (riesgo medio-alto: necesita diseño propio de casos límite).
4. Refactor de Home a array de secciones configurables — solo cuando
   Home se toque de nuevo por otro motivo, no proactivamente.

## 12. Riesgos

- **Eliminar el widget** es de bajo riesgo técnico, pero hay que
  verificar que ningún test o script de `mobile-check` quede huérfano
  apuntando a un elemento que ya no existe — trivial de comprobar al
  implementar, señalado aquí para que quien lo ejecute no lo olvide.
- **El puente "Generado este mes" → Resumen** necesita tocar `App.jsx`
  (la función de navegación entre pestañas) — explícitamente fuera del
  alcance de esta fase de análisis y del Frente A en paralelo (regla de
  aislamiento: "ninguno modifica App.jsx... por comodidad"). Debe
  tratarse como una dependencia cross-cutting documentada, no
  improvisarse dentro de un cambio de Home o de Resumen por separado —
  cuando se apruebe implementar, es un cambio pequeño y localizado
  (misma forma que ya tiene `onOpenPending`), pero sigue siendo
  navegación global y merece su propio commit aislado.
- **Ordenación por crecimiento en "Por escuela"** no es solo UI: define
  qué significa "creció" cuando no hay periodo anterior (escuela nueva)
  o cuando las monedas no coinciden — el mismo tipo de matiz que ya
  resolvió `singleCurrencyAmount` en `HeroTotal`, pero aplicado N veces
  (una por escuela) en vez de una. Dimensionar antes de prometer fecha.

## 13. Trabajo futuro / siguiente paso recomendado

1. Aprobación explícita del usuario sobre esta propuesta, en particular:
   confirmar la eliminación del widget, y confirmar que el puente
   Home→Resumen puede tocar `App.jsx` cuando se implemente (fuera del
   alcance de esta fase de análisis).
2. Orden de implementación recomendado, por valor/riesgo:
   1. Eliminar el widget "Los más antiguos por cobrar" (trivial, riesgo
      cero, valor inmediato: menos ruido visual, menos código que
      mantener).
   2. Indicio de tendencia de una línea en "Generado este mes" (bajo
      riesgo, reutiliza cálculo existente).
   3. Puente táctil Home→Resumen (riesgo medio por tocar navegación
      global — commit propio, aislado).
   4. Ordenación por crecimiento en "Por escuela" de Resumen (necesita
      su propio mini-diseño de casos límite antes de estimarse).
   5. Refactor de Home a array de secciones — posponer hasta que Home se
      toque de nuevo por otro motivo.
   6. Sistema de widgets configurables desde Configuración — posponer
      hasta que el conjunto curado de tarjetas actual demuestre ser
      estable en uso real; no construir la infraestructura por
      anticipado.
3. Ninguno de estos puntos requiere una migración de base de datos ni
   una decisión de seguridad/permisos — son cambios de presentación y de
   una función de cálculo compartida, dentro del modelo de datos ya
   existente.
