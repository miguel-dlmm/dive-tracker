# Sesión nocturna 2026-08-28 — Rediseño global (Configuración, Resumen, Release, Ayuda)

> Informe acumulativo de una sesión larga y autónoma. Se actualiza tras
> cada commit para poder retomar sin reconstruir contexto. No es
> documentación permanente del producto (eso vive en ADR/BACKLOG/CLAUDE.md)
> — es el registro de esta sesión concreta. Candidato a borrarse una vez
> el usuario haya revisado todo el trabajo.

## Punto de partida verificado

- Rama: `feature/global-redesign`, creada exactamente desde `feature/mi-trabajo` en `e385dc2` (confirmado con `git merge-base`).
- Antes de empezar esta sesión, working tree tenía cambios sin commitear de la ronda anterior (extracción de `MovementSheet.jsx` + acceso "Añadir movimiento" integrado en la tarjeta de pendientes) — ya validados (tests/build/mobile-check) en la ronda anterior. Se han commiteado como primer paso de esta sesión: `737b4be`.
- Modo de trabajo: autónomo durante la noche, sin consultas de UI/UX normales. Solo se detiene ante bloqueo real de datos/seguridad/arquitectura. Commits sin esperar aprobación cuando la tarea está terminada y validada.

## Orden de trabajo acordado

1. Commit 1 — Rediseño de Configuración
2. Commit 2 — Rediseño de Resumen
3. Commit 3 — Proceso de release/deployment (investigación + simulación, sin push real)
4. Commit 5 — Bug de tarifa inline (si quedan recursos)
5. Commit 6 — Calendario de Home (si quedan recursos)
6. Commit 7 — "Qué hay de nuevo" de release
7. Commit 8 — Rediseño de Ayuda

Bug de la animación de cobro (ver más abajo) se resuelve en el punto que corresponda por alcance — no debe perderse.

## Commits realizados esta sesión

| Commit | Resumen | Estado |
|---|---|---|
| `737b4be` | Home crea sin salir de pantalla + acceso integrado en tarjeta de pendientes (trabajo de la ronda anterior, commiteado al empezar esta sesión) | ✅ hecho, validado antes de esta sesión |
| `317fbc3` | Fix: animación de salida rota al marcar como cobrado (doble rAF) | ✅ hecho, validado |
| `d8104b7` | **Commit 1 — Rediseño de Configuración**: menú agrupado con drill-down, `CrudTable` crea vía FAB+hoja, Tarifas con filtro colapsable (coherencia Mi trabajo), rename texto Actividades→Cursos (fase 1, parcial), eliminar usuario (backend+UI) | ✅ hecho, validado, commiteado |
| (pendiente de commitear) | **Commit 2 — Rediseño de Resumen**: tarjeta principal con comparación al periodo anterior + tarjetas plegables bajo demanda, fusión de "Por escuela"/"Por escuela dedicada" en una sola lista con drill-down inline, un único calendario (antes había dos), rename texto Actividades→Cursos completado | ✅ hecho, validado (206/206 tests, build, mobile-check), a falta de commit |

## Commit 2 — Rediseño de Resumen (detalle)

Ver `docs/ADR/0009-rediseno-resumen.md` para la decisión completa. Resumen:

- `HeroTotal`: tarjeta principal con el total del periodo y comparación
  (▲/▼/=) vs el periodo anterior equivalente — "¿cómo voy?" en 5 segundos.
  Se omite la comparación en "Personalizado" o si alguno de los dos
  totales mezcla más de una moneda (evita un delta engañoso).
- `ExpandableCard` (nuevo, local a SummaryTab.jsx): Por escuela (abierta
  por defecto), Por curso, Calendario, Comisiones, Pagos de compañeros —
  todo colapsado salvo la primera, nada de trabajo/render hasta pedirlo.
  Anima con `listItemVariants` (convención de motion ya existente).
- `RankedList`: lista rankeada (mayor importe primero) reutilizada por
  Por escuela/Por curso/los desgloses de Comisiones; en "Por escuela"
  admite tocar una fila para expandir su desglose por curso EN EL SITIO
  — sustituye a la segunda sección de página completa (total + desglose
  + segundo calendario) que existía solo para la escuela elegida en un
  `<Select>` aparte.
- Cambios de comportamiento (no solo de presentación, documentados en el
  ADR): pagos de compañeros dejan de filtrarse por escuela (ahora todo el
  periodo, por persona); un único calendario en vez de dos casi iguales.
- "Por actividad" → "Por curso" (cierra la fase 1 del rename en toda la
  app — BACKLOG actualizado, fase 2 (renombrar variables internas) queda
  como ítem "Después" aparte, sin urgencia).

**Validado:** 206/206 tests (nuevo `SummaryTab.test.jsx`, 5 tests sobre
HeroTotal + tarjetas plegables + drill-down), build correcto,
`mobile-check` sin errores de consola — capturas revisadas visualmente
(vistazo rápido, escuela expandida mostrando su curso, Calendario y
Comisiones expandidos, scroll).

## Commit 1 — Rediseño de Configuración (detalle)

Ver `docs/ADR/0008-rediseno-configuracion.md` para la decisión completa
con alternativas descartadas. Resumen:

- Menú de Configuración: pestañas horizontales → menú agrupado con
  drill-down (patrón de Ajustes iOS/Android), grupo "Administración"
  separado y solo visible para admin/superadmin. Deja hueco para un
  futuro grupo de personalización (widgets) sin rediseñar de nuevo.
- `CrudTable` (Escuelas, Cursos, Tipos de pago, Estados de pago, Monedas):
  crear pasa de formulario fijo a FAB + hoja inferior, alineado con el
  resto de la app.
- `RatesTab` (Tarifas): filtros pasan a colapsables con contador "Filtrar
  · N", mismo patrón que Mi trabajo. Se eliminó plumbing muerto
  (`autoOpenSheet`/`onAutoOpened`, ya no llamado desde ningún sitio).
- "Actividades" se muestra como "Cursos" en Configuración/Tarifas/Home
  (Resumen queda para cuando se rediseñe esa pantalla, backlog
  actualizado).
- **Eliminar usuario**: implementado completo (server/API/UI,
  superadmin-only, con confirmación danger, mismo patrón que
  create-user/update-admin-status).
- **Desactivar usuario**: NO implementado — requiere tocar
  `admin_list_profiles()` (exposición de estado de autenticación), lo que
  CLAUDE.md exige proponer como plan de migración antes de tocar en un
  solo paso. Plan completo dejado en el ADR y en BACKLOG, pendiente de
  aprobación explícita del usuario.

**Validado:** 201/201 tests (incluye 2 archivos de test nuevos:
`ConfigTab.test.jsx`, `server/users/deleteUser.test.js`, más
`RatesTab.test.jsx` actualizado), build correcto, `mobile-check` sin
errores de consola — capturas revisadas visualmente (menú, drill-down,
hoja de creación). No se pudo verificar visualmente el grupo
"Administración"/Usuarios con `mobile-check` porque la cuenta
`dev-bypass` no tiene rol admin/superadmin; cubierto en su lugar por
`ConfigTab.test.jsx` (verifica que el grupo aparece/desaparece según
`profile.is_admin`).

## Bugs

### Prioritario: animación de salida al marcar como cobrado — RESUELTO

- **Causa raíz confirmada empíricamente** (no supuesta): se instrumentó un
  muestreo por `requestAnimationFrame` de `getComputedStyle(...).maxHeight`
  fotograma a fotograma durante el toggle de "Confirmar cobro". Antes del
  fix, `maxHeight` saltaba de `"none"` a `"0px"` en un único fotograma
  (~17ms), sin ningún valor intermedio — la altura de la fila colapsaba de
  golpe mientras solo el contenido interior (opacidad/transform) sí se
  desvanecía con su transición normal, produciendo el "salto" visual que
  describía el bug. `handleDelete` (borrar) no tenía este problema porque
  mide la altura de forma síncrona dentro del propio manejador de clic; el
  toggle de estado la mide dentro de un `useEffect` que reacciona a un
  cambio de prop (`animPhase`, ver `changeStatus` en `MiTrabajoTab.jsx`) —
  un único `requestAnimationFrame` ahí no garantiza que el navegador llegue
  a *pintar* el fotograma con la altura real medida antes de que se dispare
  el colapso a 0; el "Deshacer" (entrada) no sufría esto porque su valor de
  partida (colapsado) ya está pintado desde el primer render, sin depender
  de que un efecto pinte nada intermedio.
- **Fix aplicado:** `src/MiTrabajoTab.jsx`, efecto de `toggleExiting` en
  `EntryRow` — doble `requestAnimationFrame` anidado en vez de uno solo,
  patrón estándar para garantizar un repintado real entre "medir" y
  "colapsar" (el mismo problema que resuelve el truco FLIP de animación de
  layout). No se tocó el mecanismo de entrada (`entering`) ni el de borrar
  — ya funcionaban correctamente, no había motivo para tocarlos.
- **Validado:** mismo muestreo por rAF repetido tras el fix — ahora
  `maxHeight` interpola de forma continua (107px → 0px en ~220ms, con
  valores intermedios reales en cada fotograma). Además: 184/184 tests,
  build correcto, `mobile-check` sin errores de consola.
- Cobrar / marcar pendiente / deshacer / eliminar comparten ahora la misma
  coreografía de movimiento con un colapso de altura realmente animado en
  los cuatro casos.

### Ya conocido, pospuesto (ver `docs/BACKLOG.md`)

- Bloqueo de pantalla al añadir tarifa inline en el formulario de Mi trabajo — se investigará en Commit 5 si hay recursos, con causa raíz (no workaround).

## Commit 3 — Proceso de release (detalle + candidato pendiente de aprobación)

Ver `docs/ADR/0010-proceso-de-release.md` para el proceso general
(investigado sobre Keep a Changelog, SemVer y GitHub Releases —
fuentes primarias). Esta sección es la **simulación concreta** pedida:
ramas reales confirmadas, changelog preparado, versión decidida — nada
de esto se ha ejecutado (ni merge, ni tag, ni push).

### Ramas reales confirmadas (`git fetch` + `git log`/`git merge-base`)

- `develop` (remoto y local en `0cf625e`) — única rama de entorno real,
  producción actual.
- `feature/global-redesign` (esta rama, en `27f482d`) contiene **todos**
  los commits de `develop` como ancestros (`merge-base(develop,
  feature/global-redesign) == develop` exactamente) — no hay divergencia,
  solo commits de más.
- `v0.1.0` es ancestro tanto de `develop` como de `feature/global-redesign`.
- Entre `v0.1.0` y `feature/global-redesign` hay **22 commits** sin
  publicar (5 ya fusionados en `develop` — Payments/Home dashboard/fix de
  tarifas — y 17 más solo en esta rama de trabajo — Mi trabajo, Motion,
  navegación, Configuración, Resumen...).
- `feature/mi-trabajo` local está 9 commits por delante de su remoto
  (`origin/feature/mi-trabajo` en `3439056`) — esos 9 commits ya están
  también en `feature/global-redesign`, así que no hace falta tocar esa
  rama aparte.
- `feature/design-lab-preview` — sandbox experimental sin intención de
  merge (excepción ya reconocida en `ADR-0006`), no participa en esta
  release.

### Changelog preparado

`CHANGELOG.md` → sección `## Unreleased` ya redactada con los 22 commits
agrupados en `Added`/`Changed`/`Fixed` (formato Keep a Changelog). Commit
de este cambio + el propio `ADR-0010` ya hechos en esta rama.

### Versión propuesta: `v0.2.0`

Por la tabla de `ADR-0010`: la mayor parte del contenido es
funcionalidad nueva o rediseño (Mi trabajo, Configuración, Resumen,
Motion, navegación), no solo corrección de errores → `MINOR`. El
proyecto sigue en `0.y.z` (MVP, sin API/superficie estable declarada),
así que no aplica `MAJOR`.

### Pasos pendientes de tu aprobación (ninguno ejecutado)

1. Revisar y fusionar `feature/global-redesign` → `develop` (fast-forward
   o merge commit, a decidir en el momento — no hay conflictos previstos
   porque `develop` es un ancestro directo).
2. Sobre `develop` ya actualizada: `npm run test && npm run build` (y
   `npm run mobile-check` si quieres una última pasada) — ya validado en
   cada commit individual de esta rama, pero repetirlo sobre `develop`
   tras el merge es la validación de release, no redundante.
3. Renombrar `## Unreleased` a `## [0.2.0] - <fecha del día que se
   ejecute>` en `CHANGELOG.md`.
4. Commit `chore: preparar release v0.2.0`.
5. `git tag -a v0.2.0 -m "v0.2.0"` sobre ese commit.
6. `git push origin develop --tags`.
7. `gh release create v0.2.0 --notes-file <extracto del CHANGELOG>`
   (opcional, espejo en GitHub).
8. Ningún paso de despliegue manual — Vercel despliega automáticamente
   el push a `develop`.

No se ha tocado `develop` ni se ha creado ningún tag todavía. En cuanto
des el OK, estos 8 pasos son mecánicos y no requieren volver a redecidir
nada.

## Commit 5 — Bug de tarifa inline (investigado, no reproducido; sin commit de código)

Investigación a fondo con la misma técnica que resolvió el bug de
animación de cobro (heartbeat de `requestAnimationFrame` para detectar
bloqueo real del hilo principal), en dos escenarios (moneda por defecto,
y usando activamente el selector de moneda — la sospecha explícita del
usuario). **No se reprodujo en ningún caso** — sin huecos entre
fotogramas significativos, hoja responsiva tras guardar. Se revisó
también `useFloatingDropdown` (sin fugas de listeners) y
`useSupabaseTable.insertRow` (sin bucles ni suscripciones). Detalle
completo en `docs/BACKLOG.md`. Conclusión: probablemente específico de
WebKit/Safari real o del teclado virtual de iOS — la misma clase de
limitación ya documentada y confirmada en este proyecto para las
herramientas disponibles aquí. No se ha tocado código (no había nada que
arreglar sin causa confirmada, y el usuario pidió explícitamente no
aplicar workarounds). Sin commit de código; solo la nota de BACKLOG
(incluida en el commit de documentación de este bloque).

También evaluado (a petición explícita, sin implementar nada): el campo
de nombre de compañero en "Ajuste de curso" usa `<datalist>` nativo, sin
relación de código con el bug de tarifa ni impacto de rendimiento — el
"nunca funcionó bien" percibido encaja con el soporte pobre conocido de
`<datalist>` en iOS Safari, no con un bug propio. Nota dejada en BACKLOG,
sin roadmap de explotación de datos por compañero (confirmado fuera de
alcance).

## Commit 6 — Calendario de Home (reordenado)

Decisión (libertad total, ver `docs/ADR/0004-...md` addendum
2026-08-29): el calendario sube al segundo lugar (justo tras "Pendiente
de cobrar"), por delante de "Generado este mes" — antes era el último
elemento de la pantalla. Motivo: un día normal casi nunca acumula más de
1-2 movimientos, así que no justifica quedar "escondido" al fondo; el
calendario además permite crear (tocar un día vacío) y da una lectura
del mes día a día que una cifra agregada no da. Sin funcionalidad nueva
— solo reordenar dos bloques ya existentes en `HomeTab.jsx`. BACKLOG.md
cierra el ítem correspondiente.

**Validado:** 206/206 tests, build correcto, `mobile-check` sin errores
— captura de Home revisada visualmente, calendario visible sin scroll
tras la tarjeta de pendientes.

## Commit 7 — "Qué hay de nuevo"

Nuevo componente `WhatsNew.jsx`: píldora de 4 diapositivas (icono +
título + una frase), navegable con "Siguiente"/"Atrás" y puntos de
progreso, animada con un fade+slide horizontal entre diapositivas usando
los mismos tokens `DURATION`/`EASE` de `src/motion.js` (no los variants
de lista ya existentes, pensados para filas que entran/salen de una
lista, no para pasar de una diapositiva a otra — pero sí la misma
convención de duración/curva, no una animación inventada aparte). Se
muestra una vez por cuenta al entrar en una versión nueva
(`localStorage`, mismo patrón que la moneda favorita — ver ADR-0007),
comparando contra `APP_VERSION` en el nuevo `src/version.js` (hoy
`"0.2.0"`, a la espera de que se ejecute la release candidata de Commit
3 — **si el número de versión final cambia al aprobarla, actualizar
`src/version.js` a la vez que `CHANGELOG.md`/`package.json`, no por
separado**).

**Decisión — sin capturas de pantalla:** se evaluaron capturas reales
generadas esta misma sesión (Home, Mi trabajo, Resumen) pero ninguna era
presentable — mostraban el nombre de la cuenta de desarrollo
("dev-bypass") y datos de prueba repetidos acumulados esta noche.
Iconografía + color (ya coherente con el resto de la app) cumple igual
"muy visual" sin ese riesgo. Documentado en el propio código de
`WhatsNew.jsx` para que quede claro que fue una decisión, no un olvido.

Contenido de las 4 diapositivas (fuente: la propia redacción de
`CHANGELOG.md` de esta sesión): bienvenida/contexto del rediseño, un
único botón para crear un movimiento, unificación Registro+Comisiones+
Compañeros → Mi trabajo, y Resumen (vistazo rápido + profundidad bajo
demanda). Nota: el encargo original decía "Movimientos" para el punto de
unificación — se ha usado el nombre real y ya decidido de esa pantalla,
"Mi trabajo" (`docs/ADR/0005-...md` rechazó explícitamente "Movimientos"
como nombre de producto), para no contradecir esa decisión ya tomada.

`mobile-check.mjs` actualizado para reconocer y cerrar esta píldora al
principio del recorrido (antes bloqueaba toda interacción posterior).

**Validado:** 210/210 tests (4 nuevos en `WhatsNew.test.jsx`: avanzar,
retroceder, terminar con "Empezar", cerrar con "Cerrar"), build correcto,
`mobile-check` sin errores — las 2 diapositivas capturadas (primera y
última) revisadas visualmente.

## Commit 8 — Rediseño de Ayuda

`src/help/content.js` reescrito por completo — describía una versión de
la app que ya no existe (Registro/Comisiones/Compañeros/Pagos
separados, "Ganado este mes", pestañas en Configuración). Mismo formato
de artículo de siempre (`whatYouCanDo`/`whenToUseIt`/`steps`/`tips`/
`expectedResult`, sin cambios en `HelpArticleView.jsx`) — lo que cambia
es el contenido, no la plantilla.

`HELP_CATEGORIES` gana un campo `group` opcional; `HelpCategoryList.jsx`
agrupa en **"Quiero..."** (Registrar un movimiento, Cobrar pendientes,
Consultar cuánto has generado, Configurar tu aplicación) y
**"Funcionalidades"** (Mi trabajo, Resumen, Configuración, Filtros y
búsqueda) — mismo patrón visual que el menú de Configuración
(ADR-0008), reutilizado en vez de inventado. "Primeros pasos" queda
suelta, sin cabecera, siempre primera. Ver `docs/ADR/0011-rediseno-ayuda.md`.

Sin capturas de pantalla, misma decisión y mismo motivo que en Commit 7
(las generadas esta sesión mostraban la cuenta "dev-bypass" y datos de
prueba repetidos).

**Efecto colateral encontrado y corregido:** verificando el menú
agrupado con `mobile-check`, "Primeros pasos" y la cabecera "Quiero..."
no aparecían en la primera captura — no un fallo del contenido, sino que
`AppShell` nunca reiniciaba el scroll de la página al cambiar de
pestaña (heredaba la posición de scroll de Resumen tras haber hecho
scroll ahí). Corregido con un `useEffect(() => window.scrollTo(0, 0),
[tab])` en `App.jsx` — beneficia a toda la navegación entre pestañas,
no solo a Ayuda.

**Validado:** 211/211 tests (`HelpTab.test.jsx` actualizado al nuevo
contenido/agrupación), build correcto, `mobile-check` sin errores —
menú agrupado, lista de artículos y vista de artículo revisados
visualmente, confirmando que el fix de scroll resuelve lo observado.

## Siguiente paso

Los 7 commits del orden acordado están completos (1, 2, 3, 5, 6, 7, 8).
Pendiente: informe final acumulativo para el usuario y propuesta de
commit — no se ha hecho ningún push, y la release v0.2.0 sigue sin
ejecutarse, a la espera de aprobación explícita (ver Commit 3).

---

# Segunda tanda 2026-08-29 (mañana) — nueva ronda de encargos

Mismo modo autónomo. Nuevo bloque de 8 áreas de trabajo (Configuración,
Resumen, login/bypass, Home, Qué hay de nuevo, Ayuda, calidad
transversal) — ver el mensaje completo del usuario para el detalle
exacto de cada punto, no repetido aquí.

## Punto de partida verificado (segunda tanda)

- Rama: `feature/global-redesign`, sin cambios respecto al cierre de la
  tanda anterior — 11 commits por delante de `e385dc2`, working tree
  limpio salvo dos elementos nuevos del propio usuario: `vite.config.js`
  modificado (añade `server.host: true` y
  `allowedHosts: ['.trycloudflare.com']`) y `cloudflared.tgz` sin
  trackear — indican que el usuario está montando su propio túnel
  Cloudflare hacia el `npm run dev` estable en el puerto 5173. Ninguno
  de los dos se ha tocado ni commiteado por mí.
- `origin/develop` sigue en `0cf625e`, sin cambios — confirma que no ha
  habido push desde la tanda anterior.

## Infraestructura de pruebas — servidor propio en puerto 5180

Petición explícita: no interferir con el `npm run dev` estable del
usuario (puerto 5173, confirmado vivo con `lsof` al iniciar, PID
`83940`). Se ha levantado una instancia de Vite propia y aislada en el
puerto 5180 (`npm run dev -- --port 5180 --strictPort`, en segundo
plano) para todo el trabajo de esta tanda. `mobile-check.mjs` ya
soportaba `MOBILE_CHECK_URL` como variable de entorno — se usa
`MOBILE_CHECK_URL=http://localhost:5180 npm run mobile-check` en vez de
tocar el valor por defecto del script. Verificado: ambos puertos
responden 200 simultáneamente antes y después de una ejecución completa
de `mobile-check`. No se ha tocado `cloudflared.tgz` ni ningún proceso
del túnel del usuario.

**Nota para retomar**: si esta sesión termina y se retoma más tarde,
comprobar con `lsof -nP -iTCP -sTCP:LISTEN | grep 518` si el servidor de
pruebas en 5180 sigue vivo antes de asumir que hay que levantarlo de
nuevo — y comprobar 5173 con `curl` antes de cualquier acción, nunca
asumir que se puede reiniciar.

**Nota:** `cloudflared.tgz` (21MB, en la raíz del repo) es del propio
usuario, no se ha tocado ni se debe commitear — sigue sin trackear a
propósito, excluido de todo `git add` de esta sesión.

## Bloque — "No puedo eliminar usuarios" (causa raíz) + Desactivar usuario (implementado)

### Investigación: por qué fallaba "Eliminar usuario"

Reproducido con `curl` directo contra el servidor de pruebas: `POST
/api/delete-user` devolvía **404** bajo `npm run dev` puro. Causa raíz:
`/api/*.js` (Vercel) y `netlify/functions/*.js` (Netlify) son rutas de
un runtime de funciones serverless que **no existe** bajo Vite solo —
`create-user`, `update-admin-status` y `delete-user` nunca funcionaron
en local, solo en el sitio ya desplegado. No era un bug de
`deleteUser.js` (que ya tenía 13 tests unitarios pasando).

**Fix**: `localApiRoutes()`, un plugin de Vite nuevo en `vite.config.js`
(activo solo bajo `configureServer`, nunca en `vite build`) que monta
los mismos handlers de `server/users/*.js` para el propio servidor de
desarrollo — un tercer adaptador, sin lógica nueva que mantener.
Encontrado y corregido en el camino: `supabaseAdmin.js` lee
`SUPABASE_SERVICE_ROLE_KEY` en una constante de módulo evaluada al
importar — un `import` estático se resuelve antes que cualquier código
del archivo (hoisting), así que se resolvía con `process.env` aún sin
rellenar. Solucionado con `import()` dinámico dentro de
`configureServer`, después de `Object.assign(process.env,
loadEnv(...))`. Verificado con `curl` tras cada paso hasta confirmar
progresión completa (404 → "config incompleta" → "falta token" — la
respuesta correcta para una petición sin autenticar).

### Desactivar usuario — implementado (ver addendum de ADR-0008)

Aprobado explícitamente por el usuario. Al revisar el plan de 3 pasos ya
escrito en ADR-0008 antes de ejecutarlo, se encontró que
`auth.admin.listUsers()` ya expone `banned_until` directamente — **no
hacía falta el cambio de esquema previsto** (extender
`admin_list_profiles()`). Implementado en su lugar:
- `server/users/setUserActive.js` (+ tests, + adaptadores Vercel/Netlify) —
  desactivar/reactivar, superadmin-only, mismas protecciones que
  `deleteUser.js` (no uno mismo, no otro superadmin).
- `server/users/listUserStatus.js` (+ tests) — lectura de estado para
  todo el directorio en una sola llamada a `listUsers()`, disponible
  para cualquier admin (no solo superadmin), igual que
  `admin_list_profiles()`.
- `isAdmin(userId)` añadido a `server/supabaseAdmin.js` (+ tests) — el
  helper que su propio comentario ya anticipaba.
- `UsersTable`: columna "Estado" con badge Activa/Desactivada — botón
  interactivo con confirmación (no-`danger`, reversible) para
  superadmin, solo lectura para el resto de admins.

**Verificado en vivo, no solo con tests**: baneo + desbaneo real de una
cuenta de prueba desechable (nickname "c", de un solo carácter, sin
relación con las cuentas reales) vía `auth.admin.updateUserById`,
confirmando `banned_until` se fija/limpia como se esperaba — revertido
de inmediato, cuenta intacta. Verificación visual del directorio
completo: se elevó temporalmente `is_admin` (nunca `is_superadmin` —
bloqueado por trigger de base de datos, ver `protect_profile_roles()`)
de la cuenta `dev-bypass` para ver el grupo "Administración" y la
columna "Estado" renderizar correctamente en modo solo lectura: revertido
a `is_admin: false` inmediatamente después.

**Validado:** 241/241 tests (16 nuevos: `isAdmin` en
`supabaseAdmin.test.js`, `setUserActive.test.js`,
`listUserStatus.test.js`, y 3 nuevos en `ConfigTab.test.jsx` cubriendo
desactivar/eliminar con `supabase`/`fetch` mockeados), build correcto,
`mobile-check` sin errores (contra el puerto 5180 propio, servidor del
usuario en 5173 verificado vivo antes y después).

## Bloque — "El botón de crear en Home se queda pillado" (investigado, no reproducido)

Reproducido a fondo contra el servidor de pruebas (5180), con las
mismas herramientas que ya sirvieron esta sesión: tanto el "+" de la
tarjeta "Pendiente de cobrar" como tocar un día vacío del calendario
abren correctamente `MovementSheet` sobre Home (sin cambiar de
pestaña), con el formulario pre-rellenado y usable; guardar navega a Mi
trabajo; cerrar sin guardar deja en Home sin ningún rastro de hoja
"pillada". Confirmado además que el servidor en el puerto 5173 (mismo
directorio de trabajo que este, mismo checkout) sirve exactamente este
mismo código — no hay una versión distinta desplegada ahí que pudiera
explicar la diferencia.

No reproducido en Chromium con las herramientas disponibles aquí — el
patrón se repite del bug de tarifa inline de la sesión anterior:
coherente con ser específico de WebKit/Safari real en el iPhone del
usuario (probado ahora también vía el túnel de Cloudflare que está
montando), no de la lógica de la app. No se ha aplicado ningún cambio
de código sobre este flujo — nada que arreglar sin causa confirmada.
Pendiente de que el usuario lo vuelva a probar en su iPhone físico
ahora que el fix de login (bloque de arriba) y el de `/api/*` en local
ya están aplicados, por si alguno de los dos era la causa real
percibida como "otro formulario".

## Bloque — Login/bypass: pantallas de activación reabriéndose sin motivo

### Causa raíz confirmada (no solo teórica)

En `useSession.js`, tanto la carga inicial como `onAuthStateChange`
hacían `setSession(...)`, luego `setProfile(await loadProfile(...))`,
luego `setConsents(await loadConsents(...))` — tres `setState`
separados por un `await` cada uno. El batching automático de React 18
solo agrupa actualizaciones síncronas consecutivas; con un `await` de
por medio, cada `setState` dispara su propio render. Entre el primero y
el segundo, `session` ya era la nueva sesión pero `profile` seguía
siendo el de ANTES de iniciar sesión (`null` en un login normal desde
`LoginScreen`) — `AuthGate` interpretaba ese instante exacto como
"sesión sin perfil activado" y mostraba `CreatePasswordScreen` (o
`AcceptLegalScreen`, según el timing) un instante de más, **incluso
para una cuenta ya completamente activada, sin consentimientos
pendientes**. Coincide exactamente con la queja del usuario.

### Fix

`Promise.all([loadProfile(userId), loadConsents(userId)])` antes de
llamar a ningún `setState` — los tres (`session`, `profile`,
`consents`) cambian juntos, en el mismo render, tanto en la carga
inicial como en `onAuthStateChange`. Aplica igual de bien al login
manual que al auto-login del bypass de desarrollo (mismo código,
ninguna rama especial).

### Verificación real, no solo razonamiento

Escrita una prueba de regresión en `useSession.test.js` con una promesa
de `loadProfile` controlada a mano (no resuelta hasta que el test lo
decide), para poder inspeccionar el estado exactamente en el instante
intermedio. **Confirmado el proceso completo**: con el fix revertido a
propósito (`git stash` temporal), la prueba nueva falla exactamente
como se esperaba (`session` ya puesto, se esperaba `null`); con el fix
restaurado, pasa. Es la misma disciplina de "verificar que el test
detecta el bug de verdad" que ya se aplicó esta sesión con el bug de
animación de cobro.

**Validado:** 242/242 tests (1 nuevo, el de regresión descrito arriba),
build correcto, `mobile-check` sin errores.

## Bloque — Tarifas: coherencia con Mi trabajo (RowMenu compartido)

Petición explícita del usuario: "quiero que Tarifas se parezca todo lo
posible a Movimientos... si puedes reutilizar patrones, mejor." Última
pieza de la coherencia Tarifas↔Mi trabajo que aún faltaba tras
`ADR-0008` (creación FAB+hoja y filtro colapsable, ya resueltos): las
filas de Tarifas mostraban dos iconos sueltos (lápiz + papelera) donde
Mi trabajo ya usaba un único menú "⋯" (`RowMenu`).

`RowMenu` extraído de `MiTrabajoTab.jsx` a `shared.jsx` (pura
extracción, mismo comportamiento) y reutilizado en `RatesTab.jsx`; la
fila de tarifa se reestructura para calcar la forma exacta de
`EntryRow` (título+importe arriba, metadato+acciones abajo). Ver
`docs/ADR/0012-tarifas-coherencia-mi-trabajo.md` para el detalle,
incluida una nota sobre un efecto de comportamiento aceptado (no un
bug): el borrado pasa a ser optimista, igual que en Mi trabajo.

`mobile-check.mjs` gana su primer recorrido de Tarifas (antes no tenía
ninguno) — abre el menú "⋯" de una fila real (9 tarifas ya existentes
en la cuenta demo) y confirma Editar/Eliminar.

**Validado:** 242/242 tests (sin regresiones — los tests existentes de
`MiTrabajoTab.test.jsx` siguen pasando igual tras la extracción, y
`RatesTab.test.jsx` no ejercita el flujo de borrado), build correcto,
`mobile-check` sin errores — captura del menú abierto revisada
visualmente.

## Bloque — Resumen: filtros superiores fusionados (petición explícita: "poco usables")

Granularidad (5 pastillas, ya envolvían a 2 líneas en móvil) + navegación
de periodo (fila aparte "‹ Agosto 2026 ›") se fusionan en un único
control: un `Select` compacto ("Mes"/"Trimestre"/"Semestre"/"Año"/
"Rango") a la izquierda, navegación `‹ periodo ›` a la derecha, misma
fila. "Rango" muestra el rango en texto en vez de flechas sin sentido
(no hay "periodo siguiente" para un rango arbitrario); los `DatePicker`
Desde/Hasta siguen debajo sin cambios. De 3 filas de controles antes del
contenido a 2. Ver `docs/ADR/0009-rediseno-resumen.md` (addendum). El
segmentado Total/Curso/Comisión/Ajuste no se tocó — ya cabía bien en una
fila.

`mobile-check.mjs` gana un paso que cambia a "Rango" y confirma que
aparecen Desde/Hasta, luego vuelve a "Mes" para el resto del recorrido.

**Validado:** 242/242 tests, build correcto, `mobile-check` sin errores
(incluida una comprobación puntual, fuera de la suite, de que "Rango"
muestra el par de fechas por defecto correctamente) — capturas de
"Mes" y "Rango" revisadas visualmente.

## Bloque — "Qué hay de nuevo": swipe lateral + contenido de las diapositivas 2-3 sin solapar + nueva diapositiva de Configuración

Petición explícita: poder moverse entre diapositivas deslizando
lateralmente (no solo con "Siguiente"/"Atrás"); la diapositiva 2
("Registro/Comisiones/Compañeros ahora es Mi trabajo") y la 3 repetían
casi la misma idea; faltaba una diapositiva sobre Configuración y el
cambio de diseño.

**Contenido, 5 diapositivas ahora, cada una cubriendo un concepto
distinto sin solaparse:**
1. Crear un movimiento (un único botón, sin acertar antes el correcto).
2. La unificación conceptual: Registro/Comisiones/Compañeros → Mi
   trabajo — el "antes tres pantallas, ahora una", sin entrar en qué se
   puede hacer dentro.
3. **Nueva** — qué se puede HACER dentro de Mi trabajo: crear, editar,
   cobrar/marcar pendiente y eliminar sin salir de la lista, moneda
   recordada, alta de tarifa sin salir del formulario. Antes esto vivía
   mezclado con la diapositiva 2, haciendo que ambas dijeran casi lo
   mismo — separarlas en "qué cambió de nombre" vs. "qué puedes hacer
   ahora" es lo que resuelve el solapamiento, no solo acortar texto.
4. **Nueva** — Configuración: mismo patrón de creación (botón flotante)
   que Mi trabajo, y desactivar/eliminar usuario.
5. Resumen (sin cambios de contenido respecto a antes).

**Swipe lateral:** el contenedor de cada diapositiva (`motion.div` ya
usado para la transición de entrada/salida) gana `drag="x"` con
`dragConstraints={{left:0, right:0}}` y `dragElastic` — un tirón elástico
al arrastrar, y en `onDragEnd`, si el desplazamiento supera un umbral
(60px), se cambia de paso igual que al pulsar "Siguiente"/"Atrás". Se
desactiva (`drag={false}`) con `prefers-reduced-motion`, igual que el
resto de animaciones de esta pantalla — coherente con la regla
transversal de motion (accesibilidad no negociable). Es un uso
justificado y explícitamente pedido de gestos de arrastre (no
drag-to-dismiss, que sigue evaluándose caso a caso): aquí el gesto ES la
funcionalidad pedida, no una animación añadida por decisión propia.

`mobile-check.mjs` gana un paso que arrastra con el ratón (emulando
touch) sobre la diapositiva, comprueba que el título cambia al deslizar
a la izquierda y vuelve a cambiar al deslizar a la derecha.

**Validado:** 242/242 tests (el test existente ya era agnóstico al
contenido/número de diapositivas, no necesitó cambios), build correcto,
`mobile-check` sin errores — captura de la diapositiva 2 tras el swipe
revisada visualmente, indicador de puntos avanza correctamente.

## Bloque — Home "otra vuelta": widget "Los más antiguos por cobrar"

Petición explícita: Home "todavía me parece demasiado sencilla... quiero
que sea una Home que empuje el uso de la app, no solo una tarjeta
bonita". Antes de este bloque, Home era puramente informativa/de
creación (cifras + calendario + acceso de alta) — ninguna acción posible
sobre lo que YA existía en la base de datos.

**Decisión:** un nuevo widget, justo debajo de la tarjeta "Pendiente de
cobrar", con las hasta 3 deudas pendientes de fecha más antigua (las que
más vale la pena resolver primero, más fáciles de olvidar cuanto más
lejos queda la fecha) y un botón "Cobrar" por fila que actualiza el
estado sin salir de Home, con el mismo criterio de feedback por toast
que el resto de la app (try/catch + `useToast`). Reutiliza
`buildIncomeEntries` (ya usado por "Pendiente de cobrar"/"Generado este
mes"), así que nunca puede divergir en qué cuenta como pendiente. Se
mantiene deliberadamente MÁS SIMPLE que `EntryRow` de Mi trabajo (sin la
coreografía de entrada/salida animada): al cobrar aquí, la fila deja de
cumplir el filtro y desaparece del array en el siguiente render sin
necesitar animar su propia salida — este widget es un acceso rápido, no
la lista completa donde sí vale la pena esa inversión (criterio de
"extraer/invertir solo cuando hay necesidad real").

De paso, la propia tarjeta "Pendiente de cobrar" se vuelve accionable
por primera vez: tocarla navega a Mi trabajo (que ya abre por defecto en
su pestaña "Pendientes"). Antes recibía un prop `onOpenPayments` que
nunca llegó a pasarse desde `App.jsx` — la tarjeta llevaba toda la vida
renderizándose como informativa a propósito, a la espera de una pantalla
de Pagos que ya no existe (Mi trabajo la sustituyó). Se renombra a
`onOpenPending` para reflejar el destino real.

**Bug real encontrado al activar esto por primera vez:** con `onPress` Y
`onQuickAdd` presentes a la vez, `PendingCollectionCard` anidaba un
`<button>` (el "+" de añadir movimiento) dentro de otro `<button>` (la
tarjeta completa) — HTML inválido (error de consola "cannot be a
descendant of", con aviso de hidratación). Nunca se había manifestado
porque `onOpenPayments` siempre había sido `undefined` en las dos
pantallas que usan este componente, así que `Wrapper` era siempre `<div>`
— la primera vez que `onPress` se activa de verdad en la historia de
este componente es este mismo cambio. Los tests con jsdom no lo habían
detectado porque no validan anidamiento de HTML — solo mobile-check, en
un navegador real, lo sacó a la luz. Corregido separando el bloque de
información (ahora el único `<button>` cuando hay `onPress`) del botón
"+" como hermano, no descendiente — ya no hace falta `stopPropagation`.

**Validado:** 246/246 tests (+8 nuevos: 4 del widget en `HomeTab.test.jsx`
cubriendo que no aparece sin pendientes, el orden por fecha, que "Cobrar"
llama a `updateRow` con el estado opuesto, y el enlace "Ver todos"), build
correcto, `mobile-check` sin errores tras el fix del anidamiento —
captura de Home con el widget y captura tras pulsar "Cobrar" (toast
"Marcado como cobrado", contador de pendientes y total bajan, el widget
se refresca con la siguiente deuda más antigua) revisadas visualmente.

## Bloque — Ayuda: orden por flujo real + cobertura de los 3 tipos de movimiento

Encargo explícito: revisar Ayuda contra caminos de usuario concretos, no
contra la lista de pantallas — configurar primero (escuelas/cursos/
tarifas) → crear un movimiento de cada tipo → cobrar uno → cobrar en
bloque → entender el flujo general de uso.

Cambios en `src/help/content.js` (solo contenido, sin tocar código de
producto):
- Reorden de "Quiero...": Configurar tu aplicación pasa a ser la primera
  categoría del grupo (antes era la última) — sigue el orden real en que
  un usuario nuevo necesita las cosas, no el orden en que se rediseñaron
  las pantallas.
- "Crear un movimiento" gana un paso explícito por cada uno de los 3
  tipos (Curso depende de tarifa de curso, Comisión de tarifa de
  comisión para un cliente referido, Ajuste no depende de ninguna
  tarifa y puede ser negativo) — antes los trataba como una única
  mecánica, sin explicar qué distingue a cada uno.
- "Cobrar movimientos pendientes" separa explícitamente "cobrar uno" de
  "cobrar en bloque" (antes una mención breve dentro de la misma lista
  de pasos) y añade el widget de Home de este mismo bloque de sesión
  como tercera vía para cobrar uno.
- "Primeros pasos" gana una guía explícita de 3 pasos (configurar →
  crear → cobrar) en sus tips, remitiendo a las categorías "Quiero..."
  correspondientes — antes no existía ningún sitio que narrara el
  "flujo general de uso" como secuencia.

Ver `docs/ADR/0011-rediseno-ayuda.md` (addendum) para el detalle
completo.

**Validado:** 246/246 tests (sin cambios de test necesarios — ningún
test depende del contenido exacto ni del orden del array), build
correcto, `mobile-check` sin errores — captura del menú de Ayuda
revisada visualmente, confirma que "Configurar tu aplicación" encabeza
ahora el grupo "Quiero...".

## Siguiente paso

Bloques completados esta sesión (mañana): túnel/puerto de pruebas
aislado, causa raíz + fix de "no puedo eliminar usuarios" (rutas
`/api/*` en local), Desactivar usuario, causa raíz + fix del flash de
activación en login, investigación (no reproducida) del botón de crear
en Home, Tarifas↔Mi trabajo (RowMenu compartido), Resumen (filtros
fusionados), Qué hay de nuevo (swipe + contenido reestructurado +
diapositiva de Configuración), Home (widget "Los más antiguos por
cobrar" + tarjeta "Pendiente de cobrar" navegable + fix de anidamiento
de botones), Ayuda (orden por flujo real + cobertura de los 3 tipos de
movimiento).

Trabajo pendiente del encargo de esta mañana: resto de Resumen
(jerarquía/look&feel, si hace falta más allá de lo ya hecho — sin nueva
queja explícita del usuario más allá de los filtros, ya resueltos), y
una pasada de calidad visual transversal antes del resumen final de
sesión.

# Tercera tanda 2026-08-29 (tarde/noche) — rediseño profundo + release process

Sesión larga, deliberadamente autónoma (el usuario deja el ordenador
varias horas, sin poder responder preguntas). Instrucciones explícitas
de continuidad ante interrupción: documentar tras cada bloque relevante,
commit en cuanto un bloque quede cerrado, generar un
"=== PROMPT PARA CONTINUAR ===" completo si el margen de créditos/contexto
se vuelve limitado.

## Punto de partida verificado (tercera tanda)

- Rama: `feature/global-redesign` (working tree limpio salvo
  `cloudflared.tgz`, no versionado, no es mío).
- HEAD: `bdfd7f4` (fin de la segunda tanda de esta mañana).
- `origin/develop` sin cambios respecto a la comprobación de la mañana.
- Servidor del usuario (5173) y servidor de pruebas propio (5180) vivos.

## Orden de trabajo (prioridad del propio encargo, con libertad de reordenar si hay motivo)

1. Bug de animación al cobrar (acotado, si es seguro corregirlo ya).
2. Configuración — rediseño completo (commit propio).
3. Resumen — rediseño completo (commit propio).
4. Línea visual transversal (continua, no un bloque aislado).
5. Release + Deployment — investigación de estándares + proceso mínimo
   viable + SIMULACIÓN únicamente (nada de push/merge real/tag remoto/
   release publicada/deploy sin aprobación explícita).
6. Bug de tarifa inline (si queda margen).
7. Calendario de Home (si queda margen).
8. Qué hay de nuevo (si queda margen).
9. Ayuda (si queda margen).

## Bloque 1 — Bug de animación al cobrar (causa raíz real, no el fix anterior)

El commit `317fbc3` de la sesión anterior ya había diagnosticado
correctamente el síntoma (maxHeight saltaba de "none" a "0px" en un
único fotograma) y aplicó un "doble rAF" como fix, con el razonamiento
de que un único rAF no garantiza que el navegador pinte el fotograma
intermedio antes de colapsar. **Ese fix nunca se reverificó
empíricamente tras aplicarlo** — solo se había muestreado el bug
original, no el resultado del propio fix.

Reproducido con un script Playwright desechable
(`scripts/_diag-cobrar-anim.mjs`, eliminado tras el uso) que muestrea
`maxHeight`/opacidad/transform del wrapper de la fila cada pocos ms tras
pulsar "Confirmar cobro": **el doble rAF seguía sin funcionar** —
`maxHeight` seguía saltando a `0px` casi instantáneamente, mientras el
contenido (opacidad/transform) sí se desvanecía correctamente durante
~200ms — pero quedaba invisible, recortado dentro de un contenedor ya
colapsado a 0 de altura (`overflow-hidden`). Esto explica exactamente la
asimetría que describió el usuario: "Deshacer" sí anima porque el estado
inicial de una fila que "entra" arranca YA colapsado desde el primer
render (`useState(animPhase === "entering")`), sin ninguna carrera de
temporización — nunca pasa por "none". "Cobrar"/"Marcar pendiente" en
cambio miden la altura dentro de un `useEffect` normal (efecto pasivo,
corre después de que el navegador ya pueda haber pintado), así que ni un
rAF ni dos garantizan que ese valor numérico llegue a pintarse antes de
que se dispare el colapso.

**Fix real:** sustituir el `useEffect` por `useLayoutEffect` (sí
garantiza, por contrato de React, ejecutarse de forma síncrona tras la
mutación del DOM y antes de que el navegador pinte) — con esa garantía,
un único rAF vuelve a bastar, igual que ya hacía `handleDelete` (que
nunca tuvo este problema porque mide la altura de forma síncrona dentro
del propio manejador de clic). Reverificado con el mismo script de
muestreo: ahora `maxHeight` se mantiene en el valor real (107px) mientras
el contenido se desvanece, y solo después empieza a colapsar de forma
visible y gradual (107 → 104.8 → 89.5 → 65 → 34 → 0), exactamente la
coreografía que el código ya pretendía tener.

Cobrar, marcar pendiente, deshacer y eliminar comparten ahora el mismo
comportamiento visual coherente (deshacer y eliminar no se tocaron —
nunca tuvieron el bug).

**Validado:** 246/246 tests (sin test nuevo — un bug de temporización de
`requestAnimationFrame`/pintado real del navegador no es verificable de
forma fiable en jsdom, que no pinta layout real; ya le pasaba lo mismo al
fix anterior. La verificación es el propio script de muestreo Playwright,
ejecutado y confirmado en este bloque, más revisión visual), build
correcto, `mobile-check` sin errores tras un hipo transitorio de JWT ya
conocido (reintento inmediato, servidores 5173/5180 verificados vivos
antes y después).

**Lección para el futuro:** cuando un fix se basa en razonamiento sobre
garantías de temporización de React/el navegador (no en un patrón ya
usado y probado en el propio código), reverificar el resultado con la
misma técnica de medición que diagnosticó el problema, no dar el
razonamiento por bueno solo porque suena correcto.

## Siguiente paso

Bloque 1 cerrado. Continuando con el bloque 2 (rediseño de
Configuración).
