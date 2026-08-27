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
