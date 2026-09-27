# Informe de oportunidades de refactorización — Ocean Flow (2026-09)

> Auditoría de solo lectura, sin cambios de código, sobre arquitectura y
> diseño de código. No repite los hallazgos ya cubiertos en
> `docs/INFORME-DEUDA-TECNICA-2026-09.md` (tamaño de ficheros a alto nivel,
> `shared.jsx` como "bolsa" de exports, mezcla config/administración en
> `ConfigTab.jsx` a nivel de fichero, dependencias, límite de Serverless
> Functions, i18n) ni en `docs/INFORME-ROBUSTEZ-TESTS-2026-09.md`
> (cobertura de tests). El foco aquí es exclusivamente duplicación real de
> lógica, responsabilidades mezcladas dentro de funciones/componentes
> concretos, prop drilling, patrones de datos/Supabase repetidos y
> acoplamiento entre pantallas — con evidencia de fichero:línea, no
> intuición. Sigue el criterio explícito de `CLAUDE.md`: nunca proponer una
> refactorización especulativa "por si acaso" cuando el disparador real
> todavía no existe.

## Resumen ejecutivo

El proyecto sigue, en general, sus propias convenciones con disciplina
(confirmado también por el informe de deuda técnica). Las oportunidades
reales encontradas en esta pasada no son de "código sucio" difuso, sino
tres focos concretos y accionables:

1. **Una llamada autenticada a los endpoints de administración
   (`/api/*.js`) con el mismo esqueleto exacto, escrita a mano 10 veces**
   entre `ConfigTab.jsx` y `ProfileTab.jsx` — el caso de duplicación más
   claro y de menor coste de arreglo de todo el informe.
2. **Una resolución de "valor por defecto de una tabla de catálogo"
   (`is_default`) repetida 6 veces**, casi siempre como el mismo
   one-liner literal, en 5 ficheros distintos.
3. **`UsersDirectory` (`ConfigTab.jsx`, ~742 líneas) es una única función
   de React que acumula 5 mini-máquinas de estado casi idénticas** (una
   por acción de administración: rol, borrar, activar/desactivar,
   regenerar enlace, regenerar contraseña), además de la carga de datos
   del propio directorio.

Un cuarto hallazgo, `AuthGate` (`App.jsx`) como cadena de `if` que
codifica un orden de prioridad entre 9 pantallas de autenticación, es real
y tiene precedente concreto (dos bugs históricos documentados en el propio
código), pero su severidad actual está atenuada por una suite de tests de
integración ya bastante exhaustiva sobre esa lógica — se documenta como
hallazgo de riesgo latente, no de urgencia.

## 1. Duplicación real de lógica

### 1.1 Llamada autenticada a `/api/*` — mismo esqueleto, 10 sitios

Patrón repetido exacto: obtener el token de la sesión actual, hacer
`fetch` a un endpoint propio con `Authorization: Bearer <token>`,
parsear el JSON de la respuesta y comprobar `res.ok`:

```js
const { data: sessionData } = await supabase.auth.getSession();
const token = sessionData?.session?.access_token;
const res = await fetch("/api/algo", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ ... }),
});
const payload = await res.json().catch(() => ({}));
if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: ..., fallback: ... }));
```

Aparece, letra por letra, en:

- `src/ConfigTab.jsx:1217-1225` (`create-user`, dentro de `CreateUserSheet`)
- `src/ConfigTab.jsx:1401-1409` (`list-user-status`, resumen de actividad bajo demanda)
- `src/ConfigTab.jsx:1470-1488` (`list-user-status`, carga inicial del directorio)
- `src/ConfigTab.jsx:1559-1579` (`update-admin-status`, `confirmAdminToggle`)
- `src/ConfigTab.jsx:1595-1619` (`delete-user`, `confirmDelete`)
- `src/ConfigTab.jsx:1636-1654` (`set-user-active`, `confirmToggleActive`)
- `src/ConfigTab.jsx:1671-1701` (`regenerate-activation-link`, `confirmRegenerateLink`)
- `src/ConfigTab.jsx:1718-1740` aprox. (`regenerate-password`, `confirmRegeneratePassword`)
- `src/ConfigTab.jsx:1758-1772` aprox. (`generate-invitation-link`)
- `src/ProfileTab.jsx:884-894` (`delete-own-account`, `PrivacySection.handleDelete`)

La parte de mapear la respuesta de error a un mensaje de usuario **ya
está centralizada** (`actionErrorMessage`, `src/ConfigTab.jsx:57-60`, con
7 de los 10 sitios llamándola) — es exactamente la señal de que el
proyecto ya reconoce que este es un patrón compartido, solo que se ha
centralizado la mitad de él (el mapeo de error) y no la otra mitad (cómo
se obtiene el token y se hace la llamada). Un `callAdminApi(endpoint,
body)` que devuelva `payload` o lance el error ya mapeado colapsaría cada
bloque de ~10-15 líneas a 2-3, eliminando del orden de 70-90 líneas
repetidas y — más importante que las líneas — dejando en un único sitio
la forma en que la app autentica sus llamadas a `api/*`. Hoy, si cambiara
algo transversal (por ejemplo, refrescar el token si ha caducado, o
añadir una cabecera nueva a todas las llamadas admin), habría que
editarlo 10 veces sin equivocarse en ninguna.

**Coste de no tocarlo**: bajo hoy — funciona, cada sitio está bien
comentado y probado indirectamente por los tests de `server/users/*`. El
riesgo es de deriva futura: una 11ª llamada nueva (cuando se añada la
próxima acción de administración) copiará el mismo bloque a mano una vez
más, o — peor — lo copiará con un pequeño detalle distinto sin que nadie
lo note.
**Coste de refactorizar**: bajo. Es una extracción mecánica de una
función pura/asíncrona sin cambiar ningún comportamiento visible; los
tests existentes de `ConfigTab.test.jsx`/`ProfileTab.test.jsx` (que
mockean `fetch`/`supabase`) deberían seguir pasando sin cambios si la
firma de red no cambia.
**Disparador**: ya existe hoy — 10 ocurrencias reales, no una proyección.
Es el hallazgo de mejor relación coste/beneficio de todo el informe.

### 1.2 Resolución de "valor por defecto de catálogo" (`is_default`) — 6 sitios

El mismo one-liner (u una variación mínima del fallback) aparece repetido:

- `src/MovementSheet.jsx:75` — `currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR"`
- `src/MovementSheet.jsx:79` — la misma expresión, con fallback `""` en vez de `"EUR"` (inconsistencia menor entre dos líneas del mismo fichero)
- `src/MovementSheet.jsx:76-78` — la misma idea aplicada a `paymentStatuses`, `schools`, `activities`
- `src/MiTrabajoTab.jsx:508`
- `src/HomeTab.jsx:259`
- `src/RatesTab.jsx:79` (fallback `""`)
- `src/ProfileTab.jsx:665`, dentro de `CurrencySection` — misma expresión, para inicializar la moneda favorita de un usuario nuevo

El proyecto ya tiene el sitio natural para esto: `shared.jsx` ya expone
`getFavoriteCurrency`/`setFavoriteCurrency` (`src/shared.jsx:421-427`)
para el concepto hermano ("moneda favorita del usuario en localStorage",
ADR-0007). Falta el equivalente para "moneda/estado/escuela/actividad por
defecto de la tabla de catálogo" — hoy cada pantalla la vuelve a escribir
a mano. Un helper `getDefaultCurrency(currencies)` (y, si compensa,
`getDefaultOf(rows)` genérico reutilizable para paymentStatuses/schools/
activities) al lado de esos dos, con **un único fallback consistente**,
eliminaría las 6 copias y de paso la inconsistencia real ya presente
(`"EUR"` vs `""` según el sitio, aunque hoy no se ha observado que cause
un bug visible porque `MoneyInput`/`Money` ya tienen su propio respaldo
de símbolo).

**Coste de no tocarlo**: bajo-medio. No es un bug hoy, pero es exactamente
el tipo de lógica de negocio (convención 9 de `CLAUDE.md`: "nunca dejar
el símbolo en blanco") que un cambio futuro en el criterio de "moneda por
defecto" (p. ej. si se decide que el respaldo ya no sea `is_default` sino
otra cosa) obligaría a tocar en 6 sitios a mano, con alto riesgo de
olvidar uno.
**Coste de refactorizar**: bajo. Es una función pura de 1-2 líneas, sin
estado ni efectos — trivial de testear de forma aislada (hoy no tiene
test propio en ningún sitio, se ejercita solo indirectamente).
**Disparador**: ya existe hoy — 6 ocurrencias reales en 5 ficheros.

## 2. Responsabilidades mezcladas dentro de una función/componente concreto

### 2.1 `UsersDirectory` (`src/ConfigTab.jsx:1354-2095`, ~742 líneas) — una función que hace 6 cosas

El informe de deuda técnica ya señaló que ~1500 líneas de `ConfigTab.jsx`
son en realidad la feature de administración de usuarios y que deberían
vivir en su propio módulo cuando llegue el disparador. Este informe añade
un nivel más de detalle: **dentro de ese bloque, `UsersDirectory` por sí
sola (no el fichero, la función) ya es un componente sobrecargado**,
antes incluso de moverla de sitio:

- Carga y estado del propio listado: `rows`, `query`, `loading`,
  `loadError`, `filteredRows` (`src/ConfigTab.jsx:1356-1540`).
- Dos cargas de datos "bajo demanda" independientes al abrir la ficha de
  un usuario: `activitySummary` (`:1394-1416`) y `fullProfile`
  (`:1427-1437`), cada una con su propio `useEffect`+`cancelled` guard.
- **5 mini-máquinas de estado casi idénticas**, una por acción de
  administración, cada una con su propio trío `pendingX`/`cancelX`/
  `confirmX` y su propia llamada de red (ver duplicación de la sección
  1.1): rol (`:1438,1546-1579`), borrar (`:1442,1584-1619`), activar/
  desactivar (`:1439,1625-1654`), regenerar enlace de activación
  (`:1440,1660-1701`), regenerar contraseña (`:1441,1707-` y siguientes).

Las 5 confirmaciones sí reutilizan correctamente el componente compartido
`ConfirmDialog` (5 instancias, `src/ConfigTab.jsx:1931-2004+`) — el
problema no es la UI (ya resuelta con el componente correcto), es que la
lógica de "pedir confirmación → confirmar → llamar a la API → toast →
recargar/actualizar estado local" se ha escrito 5 veces a mano dentro de
la misma función en lugar de una vez, parametrizada por endpoint/cuerpo/
mensaje.

Esto no es solo "el fichero es grande" (ya cubierto en el otro informe):
es que **una sola función de React concentra 8 piezas de estado
`useState` propias del directorio + 5 flujos de confirmación completos +
2 efectos de carga bajo demanda**, lo que hace que entender o modificar
una sola acción (p. ej. "regenerar contraseña") obligue a leer una
función de 742 líneas para localizar las ~30 relevantes.

**Coste de no tocarlo**: medio. Funciona hoy y cada bloque está bien
comentado, pero cualquier cambio en el flujo de confirmación de
administración (p. ej. añadir una 6ª acción, o cambiar el criterio de
"quién puede hacer esto") tiene que replicarse una vez más a mano dentro
de una función ya al límite de lo navegable, con alto riesgo de que la
6ª copia diverja sutilmente de las 5 anteriores (mismo riesgo que ya
materializó el proyecto una vez con los iconos de `MOVEMENT_TYPE_META`,
ver sección 4).
**Coste de refactorizar**: medio-alto si se hace aislado (hay que separar
con cuidado la carga inicial de datos del resto sin romper `reload()`,
que varias acciones invocan). Bajo-medio si se hace **a la vez** que la
extracción ya recomendada por el informe de deuda técnica de mover el
bloque de administración de usuarios a su propio módulo — es el momento
natural de decidir también su forma interna (p. ej. un hook
`useAdminAction(endpoint, ...)` reutilizado 5 veces, apoyado en el
`callAdminApi` de la sección 1.1), en vez de mover 1500 líneas tal cual y
dejar la sobrecarga interna intacta.
**Disparador**: el mismo que ya identificó el informe de deuda técnica
para el fichero completo — "el próximo cambio real en la administración
de usuarios", no antes. Se documenta aquí para que, cuando llegue ese
momento, la extracción se haga bien (separando también las 5
mini-máquinas de estado) y no solo se traslade el problema de fichero.

### 2.2 `AuthGate` (`src/App.jsx:742-937`) — cadena de `if` con orden de prioridad implícito

`AuthGate` decide, entre 9 condiciones (`loading`, `DEV_AUTH_BYPASS`,
`accountBanned`, `session`, `activating`, `hasActivationLink`,
`isRecoveryFlow`, `showForgotPassword`, `showRegister`/`hasInviteLink`,
`forcedPasswordUpdate`, `pendingLegalConsents`, `profile.activated_at`),
cuál de 8 pantallas distintas renderizar (`LoginScreen`,
`ForgotPasswordScreen`, `RegisterScreen`, `CreatePasswordScreen`,
`ResetPasswordScreen`, `ForcedPasswordUpdateScreen`, `AcceptLegalScreen`,
`AppShell`) — sin router, por decisión de arquitectura del proyecto
(`CLAUDE.md`, "Sin router"), así que esta cadena de `if` es en la práctica
la tabla de rutas de toda la app pre-login. Cada `if`
(`src/App.jsx:881-936`) codifica una regla de prioridad frente a las
demás, documentada con comentarios extensos y cuidadosos ("se comprueba
ANTES que... a propósito").

Esto no es hipotético: **el propio código documenta dos bugs reales ya
ocurridos por la complejidad exacta de esta zona** — el bloqueo
permanente de `bypassPending` tras un logout (comentario en
`src/App.jsx:776-784`) y la pantalla de registro "congelada" por un
`setState` a un valor idéntico al limpiar `?invite=` (comentario en
`src/App.jsx:844-852`). Ambos son precisamente la clase de error que un
if-chain de banderas booleanas invita: un caso nuevo se añade correcto en
aislamiento, pero interactúa mal con el orden ya existente.

**Mitigante real, no solo teórico**: `src/App.test.jsx` ya cubre esta
lógica con bastante profundidad (>25 tests solo sobre `AuthGate`,
incluidas combinaciones de prioridad como "accountBanned prevalece sobre
enlace de activación" o "forcedPasswordUpdate prevalece sobre
consentimientos legales pendientes") — el riesgo de regresión silenciosa
es menor que en un código sin cobertura, precisamente porque las dos
bugs históricas ya dejaron su propio test de regresión.

**Coste de no tocarlo**: bajo-medio hoy, gracias a la cobertura de tests
ya existente. Sube cada vez que se añade una pantalla/condición nueva:
insertarla en el punto correcto de la cadena exige releer las 9
condiciones existentes para no romper una prioridad ya fijada, y solo los
tests (no el compilador ni la estructura del código) lo detectarían si se
equivoca.
**Coste de refactorizar**: medio. La opción proporcionada (sin introducir
un router, que violaría la convención explícita del proyecto) es extraer
la decisión a una función pura `resolveAuthScreen(state)` que devuelva un
identificador de pantalla + props, dejando `AuthGate` solo como el
componente que llama a esa función y renderiza. Eso permite un test de
tabla (una fila por combinación) sobre la función pura, sin montar
componentes — más rápido y más exhaustivo que los tests de integración
actuales, aunque no los sustituye del todo (algunos de esos tests
verifican también la interacción real, no solo qué pantalla sale).
**Disparador**: no ha llegado todavía — hoy la cobertura de tests ya
mitiga el riesgo real, y el equipo no ha reportado un tercer bug de esta
zona. Se documenta como riesgo latente a vigilar: si aparece una tercera
pantalla/condición nueva relacionada con autenticación (por ejemplo, un
futuro MFA o un nuevo tipo de invitación), ese sería el momento natural
de hacer esta extracción, no antes.

## 3. Prop drilling y ubicación del estado

No se ha encontrado prop drilling real en el sentido estricto (props que
atraviesan 3+ niveles de componentes sin transformarse). `App.jsx` reparte
las tablas de `useSupabaseTable` directamente a cada pantalla en un único
nivel (`App.jsx` → `HomeTab`/`MiTrabajoTab`/`ConfigTab`/`SummaryTab`), y
cada pantalla que a su vez monta `MovementSheet` (`MiTrabajoTab.jsx`,
`HomeTab.jsx` vía `App.jsx`) lo hace en un segundo nivel como máximo — es
el patrón esperable sin router ni Context adicional, no un antipatrón.

Nota menor, no accionable por sí sola: el mismo conjunto de ~9-10 props
(`schools`, `activities`, `paymentStatuses`, `currencies`, `rates`,
`commissionRates`, `worklog`, `comisiones`, `colleaguePayments`) se
escribe a mano en cada sitio de montaje de `MovementSheet`
(`src/App.jsx:664-667` y `src/MiTrabajoTab.jsx:1103-1105+`) y de las
pantallas principales (`src/App.jsx:523-548,579`). Ya está documentado
por qué existen dos instancias de `MovementSheet` (comentario extenso en
`src/App.jsx:644-659`) — es una decisión deliberada, no un descuido — así
que esto no es un hallazgo de "hay que arreglarlo", solo una observación:
si en el futuro se añade una 3ª tabla de negocio a la app, haría falta
tocar 3-4 sitios de montaje a mano para pasarla. No justifica introducir
Context hoy (sería más complejidad que el problema que resuelve, con solo
2-3 puntos de montaje reales) — encaja en el principio explícito del
proyecto de "nunca construir complejidad antes de que exista la necesidad
real".

## 4. Acoplamiento entre pantallas — un caso ya resuelto, como referencia

`MOVEMENT_TYPE_META` (`shared.jsx`) es un ejemplo real, ya corregido, de
qué pasa cuando el mismo mapeo (tipo de movimiento → icono) se mantenía
por separado en `MiTrabajoTab.jsx`/`RatesTab.jsx`/`MovementSheet.jsx`: el
comentario junto a `CREATE_TYPES` en `src/MovementSheet.jsx:21-27`
confirma que "esta lista y la de RatesTab.jsx... llegaron a
desincronizarse en el pasado (Ajuste con un icono distinto en cada
sitio)". Se cita aquí no como hallazgo nuevo (ya está resuelto,
centralizado en `shared.jsx`), sino como precedente real dentro de este
mismo proyecto de exactamente el tipo de deriva que las secciones 1.1,
1.2 y 2.1 de este informe advierten que podría repetirse si no se
centralizan también esos patrones.

Aparte de esto, no se ha encontrado acoplamiento problemático nuevo entre
pantallas: `rateCalc.js` (`buildActivityEntries`/`buildIncomeEntries`)
está correctamente centralizado y reutilizado por `MiTrabajoTab.jsx`,
`HomeTab.jsx`, `MovementSheet.jsx` y `monthlyReport/buildExportReportData.js`
sin que cada uno reimplemente el cálculo — solo el "empaquetado" de los
argumentos (`{ worklog: worklog.rows, rates: rates.rows, ... }`) se repite
literalmente 4 veces con la misma forma. Es duplicación real pero de
coste y riesgo mínimos (un objeto de configuración, no lógica de
negocio); no se prioriza una extracción (p. ej. un hook
`useEntries(tables, fallbackCurrency)`) por sí sola — el beneficio es
marginal frente al coste de otra abstracción a mantener, salvo que se
haga como efecto colateral de tocar alguno de esos 3 ficheros por otro
motivo.

## Priorización final

1. **Extraer `callAdminApi(endpoint, body)` para las 10 llamadas
   autenticadas a `/api/*` repetidas en `ConfigTab.jsx`/`ProfileTab.jsx`
   (sección 1.1).** Prioridad más alta del informe: es duplicación real
   ya hoy (10 sitios, no una proyección), toca código sensible
   (autenticación de acciones de administración) donde una única fuente
   de verdad reduce riesgo real, y el coste es bajo (extracción mecánica,
   sin cambiar comportamiento observable, `actionErrorMessage` ya sienta
   el precedente de centralizar la mitad de este mismo patrón). Coste:
   bajo. Disparador: ya existe hoy.
2. **Añadir `getDefaultCurrency(currencies)` (y, si compensa, un
   equivalente genérico para `paymentStatuses`/`schools`/`activities`) en
   `shared.jsx`, junto a `getFavoriteCurrency`/`setFavoriteCurrency`, y
   sustituir las 6 copias del one-liner `is_default` (sección 1.2).**
   Prioridad alta: coste trivial, resuelve además la inconsistencia real
   ya presente (`"EUR"` vs `""` de fallback según el sitio) antes de que
   llegue a importar. Coste: bajo. Disparador: ya existe hoy.
3. **Cuando llegue el disparador ya identificado por el informe de deuda
   técnica para mover la administración de usuarios a su propio módulo,
   descomponer también `UsersDirectory` en ese momento** — separar la
   carga del listado, las dos cargas bajo demanda, y las 5
   mini-máquinas de confirmación (apoyándose en el `callAdminApi` del
   punto 1) en piezas independientes en vez de trasladar el bloque de
   1500 líneas tal cual (sección 2.1). Prioridad media-alta, pero
   **condicionada**: no vale la pena aislarlo de la extracción de módulo
   ya planeada — hacerlo dos veces (mover, y luego descomponer) costaría
   más que hacerlo una vez bien. Coste: medio si se hace junto con esa
   extracción; alto si se hace por separado. Disparador: el mismo que ya
   señaló el informe de deuda técnica — el próximo cambio real en
   administración de usuarios — todavía no ha llegado.
4. **Vigilar `AuthGate` (`App.jsx`) como riesgo latente, sin actuar
   todavía.** Es un if-chain real con dos precedentes de bug documentados
   en el propio código, pero hoy está razonablemente cubierto por tests
   de integración. Extraer `resolveAuthScreen(state)` como función pura
   testable en tabla sería la vía natural si aparece una pantalla o
   condición de autenticación nueva (p. ej. MFA) — no antes. Coste:
   medio. Disparador: no existe todavía.
5. **(Muy baja, informativo) Unificar el empaquetado de argumentos de
   `buildActivityEntries`/`buildIncomeEntries`** repetido 4 veces entre
   `MiTrabajoTab.jsx`, `HomeTab.jsx` y `MovementSheet.jsx` (sección 4) —
   solo si se toca alguno de esos ficheros por otro motivo; el beneficio
   aislado no compensa el coste de otra abstracción. Coste: bajo.
   Disparador: no existe (duplicación de forma, no de lógica).

---

*Informe generado en una auditoría de solo lectura; no se hizo ningún
cambio de código como parte de esta fase.*
