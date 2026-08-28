# ADR 0004 — Home como dashboard operativo del instructor

**Fecha:** 2026-08-27
**Estado:** Aprobado

## Contexto

Home es hoy una pantalla de resumen pasivo: un KPI ("Ganado este mes"), un
calendario de solo lectura, y dos accesos rápidos de creación (Registro,
Comisiones). El backlog tenía dos ítems sueltos y relacionados sin
resolver: unificar la vista de "qué me deben" (hoy "Pagos" solo cubre
Registro, no Comisiones ni Compañeros) y dar acceso rápido a Pagos desde
Home. Evaluar dónde debía vivir esa vista unificada llevó a una pregunta
más amplia: qué papel debe jugar Home en el uso diario del instructor.

## Problema evaluado

¿Debe la vista unificada de "qué me deben" vivir dentro de Home, como
pantalla/pestaña propia, o en otro sitio — y qué implica esa elección
para el propósito general de Home?

## Decisión

**Home deja de ser una pantalla de resumen pasivo y pasa a ser el centro
de acción diaria del instructor freelance — un dashboard operativo, no
un vistazo decorativo.**

Jerarquía de contenido del dashboard:
1. **"Pendiente de cobrar"** — información financiera principal, la más
   visible de la pantalla.
2. **"Generado este mes"** (antes "Ganado este mes") — información
   secundaria, ya no la protagonista.
3. **Acciones frecuentes** (crear Registro/Comisión) — siguen formando
   parte del dashboard.
4. **Calendario del mes** — sigue formando parte del dashboard.

### Las dos métricas comparten una única base de datos

"Generado este mes" y "Pendiente de cobrar" parten del mismo conjunto de
datos — `incomeEntries` en `HomeTab.jsx`: Registro + Comisiones + pagos de
compañeros con importe positivo (los que TE pagan a ti; los que tú pagas a
un compañero son un concepto distinto — "lo que debo yo" — y no cuentan en
ninguna de las dos). No son dos cálculos independientes que puedan
divergir en qué cuentan como ingreso; solo difieren en el filtro que le
aplican a esa misma base:

- **Generado este mes** — filtro de fecha (mes actual), sin filtro de
  estado. Ya generaste ese dinero, aunque no te lo hayan pagado todavía.
- **Pendiente de cobrar** — sin filtro de fecha (una deuda de hace 2 meses
  sigue siendo una deuda), solo estado pendiente.

### Por qué "Generado" y no "Ganado" ni "Ingresos"

"Ganado" implica dinero obtenido por impartir tú la actividad — una vez la
cifra incluye comisiones por referir clientes y pagos de compañeros que te
reembolsan, esa palabra deja de describir con precisión el total. Se
descartó "Ingresos"/"Ingresado" por sugerir que el dinero ya ha llegado,
que es justamente falso para la parte pendiente que la cifra sigue
incluyendo — "Generado" no implica cobro, solo que el hecho económico ya
ocurrió.

Se mantiene una separación de responsabilidad clara entre las dos
pantallas:
- **Home responde "¿tengo algo pendiente o algo que hacer?"** — vista
  agregada, de un vistazo, sin gestión de detalle.
- **Pagos responde "¿qué elementos concretos están pendientes y cómo los
  gestiono?"** — la lista accionable (marcar como cobrado, filtrar,
  invertir estado en bloque), ahora cubriendo las 3 fuentes (Registro +
  Comisiones + Compañeros), promovida a pantalla secundaria propia (fuera
  de Configuración), alcanzable desde la tarjeta de Home.

El rediseño visual completo de Home (jerarquía tipográfica, densidad,
estilo "bento" u otro, inspirado en la exploración ya iniciada en
`src/lab/`) queda explícitamente **fuera de esta decisión** — es una fase
posterior y separada, para no mezclar una decisión funcional con una
decisión estética.

## Alternativas consideradas

- **A. Pantalla/pestaña propia en la barra inferior** para "qué me
  deben". Descartada — rompería el límite de 5 destinos ya señalado en
  la revisión de navegación, para una pregunta que se contesta con un
  vistazo, no con una sesión de navegación propia.
- **B. (elegida) Home como dashboard operativo**, con Pagos promovida a
  pantalla secundaria alcanzable desde ahí.
- **C. Dejar "qué me deben" donde está hoy** (Configuración → Pagos),
  solo ampliando qué fuentes cubre. Descartada — resuelve el dato pero
  no el acceso: seguiría a varios toques de distancia de la pregunta más
  frecuente de la app.

## Consecuencias

### Positivas

- Resuelve de raíz, en una sola decisión coherente, el gap funcional ya
  detectado (Pagos solo cubre Registro) y el problema de acceso
  (Tarifas/Pagos enterrados en Configuración), en vez de dos parches
  sueltos.
- No añade superficie de navegación nueva — la barra inferior se
  mantiene en 5 destinos.
- Sigue el patrón de la categoría (QuickBooks Self-Employed, Wave,
  FreshBooks priorizan "pendiente de cobrar" sobre el total ganado en su
  pantalla de inicio) sin copiar features que no aplican al instructor
  freelance.
- Es coherente con la exploración visual ya iniciada en `src/lab/`
  (dirección "bento"), sin comprometerse todavía a adoptarla tal cual.

### Negativas (trade-offs aceptados conscientemente)

- Home dejará de parecerse a la Home actual — el KPI que antes era
  "Ganado este mes" pierde protagonismo y cambia de nombre a "Generado
  este mes"; es deliberado, no un descuido, pero es un cambio visible que
  el usuario notará.
- Pagos deja de vivir dentro de Configuración, lo que requiere tocar
  `App.jsx` (patrón de pantalla secundaria, igual que Configuración/
  Ayuda hoy) además de `ConfigTab.jsx` — más superficie de cambio que un
  ajuste puramente visual.
- El rediseño visual completo queda pendiente como fase aparte — Home
  tendrá, durante un tiempo, la nueva jerarquía de contenido sin el
  pulido estético completo.

## Arquitectura de la pantalla Pagos

Ejecuta la parte de esta decisión que dejaba Pagos como pantalla
secundaria pendiente de rediseñar. No es una decisión nueva — es la
arquitectura concreta de lo que este documento ya anticipaba.

**Estado anterior:** lista plana de `worklog` (solo Registro) ordenada por
fecha, con filtros de fecha/escuela/actividad/estado siempre visibles y
una única acción destacada ("Invertir todos", pensada para edición masiva,
no para el uso diario de marcar un pago como cobrado).

**Estructura nueva:**
1. **Cabecera-resumen** — mismo dato que la tarjeta de Home ("Pendiente de
   cobrar", importe + nº de pagos), para no perder el ancla numérica al
   entrar desde ahí.
2. **Filtro de fuente + filtros avanzados en una sola fila** — un `Select`
   compacto ("Todas las fuentes" / Registro / Comisiones / Compañeros) en
   vez de un selector de chips: con las 4 etiquetas reales, los chips no
   entrían en una fila en pantallas de 375px sin scroll lateral, que
   `CLAUDE.md` ya prohíbe para filtros. Los filtros avanzados (fecha,
   escuela, actividad) quedan detrás de un botón "Filtrar", colapsados por
   defecto — no son el caso de uso principal.
3. **Un único listado, sin bloques separados**, con un filtro de estado de
   dos posiciones (**Pendientes / Cobrados**, por defecto "Pendientes").
   Revisado dos veces tras probar el flujo real:
   - Primero se descartaron los dos bloques fijos originales ("Pendiente"
     siempre expandido, "Cobrado recientemente" colapsado): marcar un pago
     como cobrado lo hacía desaparecer de un bloque y reaparecer en otro
     colapsado, dando sensación de pérdida.
   - El reemplazo inicial (segmented control de 3 posiciones, Pendientes/
     Cobrados/Todos, con el mismo estilo en caja que usa `RatesTab` para
     Instructor/Comisión) funcionaba pero se descartó también: leía como
     un panel de filtros administrativo, y "Todos" resultó ser la opción
     menos necesaria de las tres — la pregunta real del instructor es
     binaria ("¿qué me deben?" / "¿qué ya cobré?"), no de tres estados.
   - **Diseño final: pestañas de texto subrayadas** (sin caja ni borde,
     peso e infrarrayado en vez de relleno), **solo Pendientes/Cobrados**,
     con el número de pendientes en la propia pestaña ("Pendientes · 4")
     para que la pantalla comunique la respuesta antes incluso de leer la
     lista. Menos opciones y menos chrome visual — más cercano a una
     pestaña de contenido (como las de perfil en apps de consumo) que a un
     control de un panel de ajustes.
   - **Pendientes**: nunca se recorta, ordenado de fecha más antigua a más
     reciente (lo más urgente arriba).
   - **Cobrados**: **limitado a los últimos 10** (por fecha). No es un
     histórico: si hay más, un aviso redirige a los filtros de fecha ya
     existentes, en vez de construir paginación.
4. **Confirmar una acción sin que parezca que el pago desaparece.** Si el
   filtro activo es "Pendientes", marcar un pago como cobrado lo saca de la
   vista (es correcto: ya no cumple el filtro) — pero el toast de
   confirmación lo dice explícitamente y explica dónde encontrarlo
   ("cámbialo a 'Cobrados' para verlo"), en vez de dejar que parezca un
   fallo. Se descartó mantenerlo visible con una animación o un resaltado
   temporal (una versión intermedia de este documento sí lo proponía) por
   ser más complejidad de la necesaria para lo que el toast ya resuelve
   con claridad.
5. **Botón "Filtrar" con estado visual propio** — relleno sólido cuando el
   panel de filtros avanzados está abierto, borde neutro cuando está
   cerrado (además de `aria-expanded`), siguiendo el patrón mobile de
   invertir el color de un icono de filtro activo.
6. **Estados vacíos diferenciados por pestaña y por si hay filtros
   activos** — "Estás al día" solo en Pendientes sin filtros; mensajes
   neutros ("Sin pagos... con estos filtros", "Todavía no has marcado
   ningún pago como cobrado") en el resto de combinaciones, para no dar
   una falsa sensación de estar al día por culpa de un filtro.

**Cobertura de las 3 fuentes sin triplicar pantalla ni modelo de datos:**
`buildIncomeEntries` (nueva función en `rateCalc.js`) es ahora la única
fuente de verdad de "qué cuenta como ingreso" — la usan tanto `HomeTab`
como `PaymentsTab`, así que las dos pantallas no pueden divergir entre sí
en qué consideran pendiente o generado. Sigue siendo una combinación en la
capa de presentación de tres tablas separadas (`worklog`, `comisiones`,
`colleague_payments`) — **no** el modelo "Movimiento" unificado que sigue
como hipótesis sin validar en `docs/BACKLOG.md`.

**Estado interno vs. lenguaje de la UI:** `StatusSwitch`/`oppositeStatus`
se retiran de esta pantalla, pero el estado en sí (Pending/Paid vía
`is_default`) no cambia — la UI habla en acciones, no en un control
genérico de estado, sobre la misma lógica de negocio de siempre. El texto
pasó por tres iteraciones: "Marcar cobrado" (demasiado administrativo) →
"Confirmar" (más claro, pero genérico — confirmar ¿qué?) →
**"Confirmar cobro"**, final: nombra el objeto de la acción sin ser tan
largo como "Marcar como cobrado", y no colisiona con ningún estado o
etiqueta visible en la pantalla. Lo mismo para deshacer: "Deshacer" no
decía qué se deshacía (¿el filtro? ¿la última acción?) — se sustituyó por
**"Marcar pendiente"**, que nombra el estado resultante igual que hace
"Confirmar cobro" en la otra dirección. Se descartó "Registrar cobro" por
chocar con "Registro", el nombre ya establecido en la app para la fuente
Work Log (aparece en el propio selector de fuente de esta pantalla).

**Sin marcador delante del título de cada fila.** La versión anterior
usaba un punto de color (mismo patrón que `EntryTitle` en `shared.jsx`).
Aquí se sustituye por jerarquía tipográfica pura (peso, tamaño, contraste)
— cambio acotado a `PaymentsTab.jsx`, no a `EntryTitle`, que sigue
usándose con su punto de color en Registro/Comisiones/Compañeros/Tarifas
sin cambios.

**Qué se elimina y dónde queda cubierto:**
- Los dos bloques fijos "Pendiente"/"Cobrado recientemente" — sustituidos
  por un único listado con filtro de estado (ver punto 3 de la estructura).
- El aviso "Estados distintos en la selección" antes de invertir en
  bloque — no puede ocurrir: todo lo pendiente comparte el mismo estado
  por construcción (`isPendingStatus` se basa en `is_default`, y solo
  puede haber un estado `is_default` a la vez).

**Trade-offs aceptados:** cambiar de fuente pasa de 1 toque (chip) a 2
(abrir el Select y elegir) — aceptable porque no es algo que se cambie
varias veces en la misma sesión. El límite de 10 en "Cobrados" es una
cifra fija, no configurable — si en el futuro un instructor de alto
volumen la encuentra corta, es una revisión de ese número, no de la
arquitectura. Confiar la continuidad de la acción a un toast (en vez de
una animación) asume que el usuario lee el toast — si en uso real
resultara insuficiente, es una revisión de este punto, no de toda la
pantalla.

## Condiciones que justificarían revisar esta decisión

- Si en el uso real "Pendiente de cobrar" no resulta ser la pregunta más
  frecuente al abrir la app.
- Si aparece una cuarta fuente de dinero (p. ej. gastos) que no encaje en
  la jerarquía Home/Pagos tal como está definida aquí.

## Consecuencias sobre la documentación

- `docs/BACKLOG.md` sustituye los ítems "¿Cuánto me deben? unificado" y
  "Atajo a Pagos desde Home" por la secuencia de entregables de esta
  decisión.
- El rediseño visual completo (fase posterior) se registra como su
  propio ítem de backlog, sin ADR propio salvo que implique una decisión
  con alternativas reales — hoy es "inspirarse en `src/lab/`", no una
  decisión cerrada.

## Addendum (2026-08-28) — revisión de la jerarquía en la fase de rediseño global

Al ejecutar el "rediseño visual completo" que este ADR dejaba pendiente
como fase aparte, se revisó también el orden de la jerarquía original
(Pendiente de cobrar → Generado este mes → Acciones frecuentes →
Calendario), no solo su estilo — el encargo de esa fase pedía
explícitamente no tratar el orden aquí fijado como una limitación de
diseño absoluta si aparecía una razón de peso para cambiarlo.

**Cambio:** las acciones frecuentes (crear Curso/Comisión) pasan a la
posición 2, por delante de "Generado este mes" (que baja a la posición
3). Pendiente de cobrar se mantiene en la posición 1 — la investigación
de categoría citada en este documento (QuickBooks Self-Employed, Wave,
FreshBooks) sigue siendo el argumento más fuerte para esa cabecera, y
nada en el rediseño la contradice.

**Por qué:** "Generado este mes" es información puramente reflexiva —
se consulta, no se actúa sobre ella. Crear un Curso/Comisión es, en
cambio, la acción más repetida de toda la app (es la razón por la que el
FAB de Mi trabajo entra directo a "Curso impartido" sin hoja
intermedia, ver ADR-0005) y suele dispararse justo al abrir la app
("acabo de terminar una clase, la registro ahora"). Un dato de solo
lectura no debería anteponerse a la acción que de verdad justifica
abrir la app en ese momento — este documento no argumentaba esta
posición relativa cuando se escribió, así que no se contradice una
decisión ya razonada, se completa un hueco que quedó abierto.

**Qué no cambia:** el resto de las decisiones de este ADR sigue vigente
tal cual — "Generado" no vuelve a llamarse "Ganado", las dos métricas
siguen partiendo de la misma base (`buildIncomeEntries`), y Pagos sigue
sin punto de entrada en la UI (ADR-0005).
