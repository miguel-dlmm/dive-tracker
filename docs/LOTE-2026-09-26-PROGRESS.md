# Lote 2026-09-26 (nocturno) — progreso

> **Cerrado 2026-09-27.** Ítems 1, 2, 3, 6 y 7 en `develop` (aviso de
> despliegue consolidado enviado, `notice_id`
> `abb7607d-af1c-4cb5-8749-e1d6e411b59a`, verificado en navegador real
> contra `https://dive-tracker-three.vercel.app`). Ítem 4
> (`fix/perfil-orden-y-cerrar-sesion`) inicialmente dejado sin fusionar a
> la espera de revisión — **actualización posterior, misma sesión**: el
> usuario pidió consolidar esa rama junto con el rediseño de portada
> (`feature/home-redesign-nav-indicator`) y desplegar todo a producción.
> Hecho: release **v1.5.0** (`main`, tag `v1.5.0`) el 2026-09-27, seguida
> de un hotfix **v1.5.1** con el contenido de "Qué hay de nuevo" (texto
> aprobado explícitamente por el usuario). Ver la sección "Release
> v1.5.0/v1.5.1" al final de este documento para el detalle completo —
> ambas ramas de revisión ya no existen, se borraron tras fusionarse.

> Documento de progreso de una iniciativa por lotes (`CLAUDE.md`, sección
> 9 de "Reglas de trabajo obligatorias"). Encargada de golpe la noche del
> 2026-09-26, justo después de cerrar la release v1.4.0 y el rediseño de
> la portada (`feature/home-redesign-nav-indicator`, en revisión, sin
> mergear a propósito — ver su propia sección más abajo). El usuario se
> fue a dormir y pidió autonomía completa para el resto de la noche: "sé
> autónomo, resuelve... no te pares, intenta acabar todo el trabajo
> posible". No sustituye ADR/PRODUCT/BACKLOG para decisiones que los
> necesiten — solo lleva el "por dónde iba" para que una sesión nueva
> pueda continuar sin releer el chat.

## Mecánica de este lote

- Cada ítem, en su propia rama `feature/*`/`fix/*`/`perf/*` desde
  `develop`, fusionada a `develop` con `--no-ff` al cerrarse (salvo el
  rediseño de portada, explícitamente dejado como rama de revisión sin
  fusionar, por petición directa del usuario).
- Autonomía total en decisiones de UI/UX y en correcciones de bugs de
  alcance acotado — sin pausar a pedir aprobación, dado que el usuario
  no puede contestar. Confirmación previa exigida solo ante un bloqueo
  real (imposible de decidir con lo ya acordado) — ninguno se ha dado
  hasta ahora.
- Validación obligatoria antes de cada push: `npm run lint`, `npm run
  test` (suite completa), `npm run build` — sin excepciones, igual que
  en cualquier otra sesión.
- Aviso de despliegue (email + slide in-app) consolidado al cierre del
  lote completo, no por ítem — para no generar ruido repetido de avisos
  mientras el usuario duerme. Requiere `preview_url` real y verificado
  (navegación real a la URL del alias de rama, no solo `vercel inspect`
  en estado Ready).

## Estado por ítem

| # | Ítem | Rama | Estado |
|---|---|---|---|
| 1 | PDF mensual: cabecera de día/curso/comisión huérfana al saltar de página | `feature/exportar-pdf-mensual` (o equivalente de esa iniciativa) → `develop` | **Hecho** — bloques `unbreakable` por día en `groupedActivityTable()`, 9/9 tests, lint/build en verde. Mergeado y pusheado a `develop`. |
| 2 | Informe de deuda técnica + patrón de arquitectura (solo análisis, sin cambios de código) | — (documento) | **Hecho** — `docs/INFORME-DEUDA-TECNICA-2026-09.md` |
| 3 | Informe de robustez de la suite de tests (cobertura %, casos vs. documentación funcional, seguimiento priorizado) | — (documento) | **Hecho** — `docs/INFORME-ROBUSTEZ-TESTS-2026-09.md` |
| 4 | Auditoría UX de "Mi perfil" y posible rediseño | `fix/perfil-orden-y-cerrar-sesion` (fusionada y borrada) | **Hecho — en producción (v1.5.0)** |
| 5 | Cierre del lote: aviso de despliegue consolidado + resumen final | — | **Hecho** |
| 6 | Bug: no se podían introducir cantidades negativas en Ajuste de curso | `fix/ajuste-importe-negativo` → `develop` | **Hecho** — no se encontró bug real (funcionaba tecleando "-" y con el botón, en crear y editar); se mejoró la insignia +/- para que se lea como control pulsable (antes era un carácter suelto gris, poco visible sobre todo en iOS). 3 tests nuevos, lint/build en verde. Mergeado y pusheado a `develop`. |
| 7 | Peso de los PDF de Training Records | `perf/optimizar-peso-pdf-training-records` → `develop` | **Hecho** — commit `8c147e4`, merge `35002d2`. Ver detalle abajo. |

> El rediseño de portada (`feature/home-redesign-nav-indicator`) es
> anterior a este lote nocturno — nació como rama de revisión, sin
> fusionar a propósito, y no formaba parte del alcance original de este
> documento. **Actualización 2026-09-27**: el usuario pidió consolidarla
> junto con el ítem 4 y desplegar todo — ver "Release v1.5.0/v1.5.1" al
> final de este documento.

## Ítem 7 — Peso de los PDF de Training Records (detalle)

Investigación empírica sobre los dos PDF de ejemplo reales en
`scripts/mobile-check-output/` (`tr-generado-Marta_Test_Apellido_AOWD.pdf`,
239.0 KB; `..._OWD.pdf`, 454.3 KB), inspeccionando los objetos internos
del PDF (`pdf-lib`, `context.enumerateIndirectObjects()`) en vez de
adivinar. Dos causas reales encontradas:

1. **`removePage()` dejaba recursos huérfanos** de las páginas
   descartadas de la plantilla original (imágenes, fuentes) — el PDF
   final los seguía incluyendo aunque ninguna página visible los
   referenciara. Sustituido por `PDFDocument.copyPages()`, que solo
   copia lo realmente alcanzable desde las páginas copiadas. Efecto:
   -38.8% en la plantilla OWD (multipágina, la más afectada).
2. **`pdf-lib` nunca comprime el content stream de la página al
   guardar** (confirmado: `SaveOptions` no tiene ninguna opción de
   compresión) — un content stream de 162.7 KB (68% del peso total del
   AOWD) viajaba sin comprimir. Añadida compresión FlateDecode manual
   vía `CompressionStream("deflate")` nativo (Web Streams API, sin
   dependencia nueva, disponible en Node 24 y en navegadores desde
   2023). Verificado sin pérdida: se descomprime el resultado final y se
   compara byte a byte contra el contenido original. Efecto: -65.1%
   adicional.

Efecto combinado verificado sobre los dos PDF de ejemplo: 239.0 KB →
81.7 KB (-65.8%) y 454.3 KB → 84.2 KB (-81.5%). Implementado en
`src/trainingRecords/pdfFill.js` (`deflate()`,
`compressPageContentStreams()`, y el cierre de `fillTrainingRecordPdf()`
reescrito para usar `copyPages()` en vez del bucle `removePage()`
anterior). 22/22 tests de `pdfFill.test.js` en verde (1 nuevo), suite
completa 931/931, lint 0 errores, build correcto.

## Ítem 4 — Auditoría UX de "Mi perfil" (detalle)

Diagnóstico concreto, no un rediseño completo (MVP primero — el resto de
la pantalla ya sigue un patrón coherente y no pedía revisión estructural):

- **"Cerrar sesión" era el único bloque de toda la pantalla sin cabecera
  ni tarjeta propia** — rompía el patrón "una `SectionCard` con título
  por bloque" que sigue el resto (Datos personales, Instructor, Moneda,
  Idioma, Seguridad...). Quien recorre la pantalla buscando títulos de
  sección no tenía ningún "Sesión" al que enganchar la vista; tenía que
  leer el texto de cada botón suelto uno a uno. Coincide con el feedback
  real del usuario ("me cuesta encontrar Cerrar sesión"). Solución:
  envuelto en su propia `SectionCard` con título "Sesión" (traducido a
  los 15 idiomas).
- **El nivel profesional (Divemaster/Instructor) vivía en "Datos
  personales", lejos de donde se ve su efecto real**: el carnet de la
  sección "Instructor", justo debajo, ya muestra ese dato (`roleText`,
  p. ej. "SSI Divemaster") — el control de edición y su resultado visible
  quedaban en dos secciones distintas de la pantalla. Trasladado al
  formulario de edición de "Datos de instructor", junto a iniciales/
  número SSI/firma.
- 37 tests de `ProfileTab.test.jsx` actualizados/añadidos, lint 0
  errores, suite completa 932/932, build correcto. Verificado
  visualmente en navegador real (dev-bypass, TEST) antes de cerrar la
  fase.
- Commit `aeb1eee` en `fix/perfil-orden-y-cerrar-sesion`, **pusheada sin
  fusionar a propósito** (mismo criterio que el rediseño de portada): el
  usuario pidió explícitamente dejarla "preparada en una rama con su url
  de preview" para revisarla él antes de fusionar.

## Ítem 5 — Cierre del lote (detalle)

- Aviso de despliegue consolidado enviado (email real + slide in-app,
  `scripts/send-deployment-notice.mjs`) cubriendo los 3 cambios
  mergeados a `develop` esta noche (cabeceras de PDF, insignia +/- de
  Ajuste, peso de Training Records) y mencionando explícitamente las dos
  ramas de revisión sin fusionar y sus URLs de preview.
- `https://dive-tracker-three.vercel.app` (alias estable de TEST/develop)
  verificado en navegador real tras el último push: sirve 200, título
  `[TEST] Ocean Flow...`, sin errores de consola — no solo `vercel
  inspect` en Ready.
- `https://dive-tracker-git-fix-perfil-orden-y-cerrar-sesion-ocean-pulse1.vercel.app`
  verificado igual: sirve, sin errores de consola.
- No se localizó una preview activa reciente de
  `feature/home-redesign-nav-indicator` en los últimos 100 deployments
  del proyecto — es una rama anterior a este lote nocturno, probablemente
  fuera de la ventana de despliegues recientes por la actividad de esta
  noche. Su URL ya se le compartió al usuario en vivo antes de empezar
  este lote; si hiciera falta reconfirmarla, un nuevo push a esa rama
  (sin fusionar) regenera el preview.
- `coverage/` añadido a `.gitignore` (quick win del propio informe de
  deuda técnica, ítem de coste cero): quedaba como carpeta suelta sin
  versionar tras la medición de cobertura del ítem 3.

## Release v1.5.0 / v1.5.1 (2026-09-27, misma sesión)

Tras cerrar el lote, el usuario pidió consolidar las dos ramas de
revisión pendientes (rediseño de portada + Mi perfil) en una sola y
desplegarlas a producción — proceso seguido exactamente como marca
`docs/ADR/0010-proceso-de-release.md` (con el addendum de `release/*`
de `docs/ADR/0006-estrategia-de-ramas-y-entornos.md`), sin inventar
ningún paso nuevo.

**v1.5.0** (tag, `main`, [GitHub Release](https://github.com/miguel-dlmm/dive-tracker/releases/tag/v1.5.0)):
1. `feature/home-redesign-nav-indicator` ← merge de `develop` (traía los
   3 fixes de esta noche) ← merge de `fix/perfil-orden-y-cerrar-sesion`
   — todo en una sola rama, como pidió el usuario.
2. Merge de esa rama consolidada en `develop`.
3. **Bug real encontrado y corregido en el camino**: `npm run
   mobile-check` fallaba — el script seguía buscando el antiguo botón
   "Añadir movimiento" integrado en la tarjeta de Pendiente de cobrar,
   sustituido por "Nuevo movimiento" como tile propia del bento en el
   rediseño. Corregido en `fix/mobile-check-nuevo-movimiento` →
   `develop` antes de seguir (bloqueaba la validación obligatoria de UI,
   CLAUDE.md regla 8).
4. `release/v1.5.0` desde `develop` → `CHANGELOG.md` movido de
   `Unreleased` a `[1.5.0]` → `npm run test && npm run build` → merge
   sobre `main` → `npm run test && npm run build` de nuevo → push
   `main` (despliegue automático) → verificado en navegador real contra
   `https://oceanflow-web.vercel.app` (200, sin errores de consola) →
   tag `v1.5.0` → `gh release create` → `release/v1.5.0` borrada → merge
   `main` de vuelta a `develop`.
5. `APP_VERSION` (`src/version.js`) se queda deliberadamente en `1.3.1`
   en esta release — mismo criterio que v1.4.0: no hay texto de
   WhatsNew aprobado todavía para el rediseño de portada.
6. Un test (`HomeTab.test.jsx`, bajo la suite completa) parpadeó dos
   veces esta noche (aquí y ya antes, durante el informe de robustez de
   tests) — confirmado como flakiness ya conocida y documentada como
   tarea de seguimiento nº 1 de `docs/INFORME-ROBUSTEZ-TESTS-2026-09.md`,
   no una regresión real: aislado y en limpio siempre pasa.

**v1.5.1** (hotfix directo sobre `main`, [GitHub Release](https://github.com/miguel-dlmm/dive-tracker/releases/tag/v1.5.1)):
petición explícita del usuario, inmediatamente después de v1.5.0: "Qué
hay de nuevo" con 4 diapositivas nuevas (generador de informe PDF,
Training Records más ligeros, portada renovada, Mi perfil
reestructurado) — texto exacto aprobado por el usuario en el chat antes
de comitear (regla de `docs/ADR/0010-proceso-de-release.md`, addendum
2026-09-09), traducido a los 15 idiomas.
- **Segundo bug real encontrado y corregido antes de comitear**:
  `SLIDE_ICONS` (`src/WhatsNew.jsx`) era un array de 6 entradas fijas
  (icono+color por índice) heredado del deck anterior de 6
  diapositivas; con solo 4 diapositivas nuevas en el JSON, `mobile-check`
  mostraba 6 puntos de progreso y 2 diapositivas fantasma sin
  título/cuerpo real. Corregido: `SLIDE_ICONS` a 5 entradas (4 nuevas +
  la meta-diapositiva "Repásalo cuando quieras" de siempre, cuyo texto
  no cambia de release a release y no necesitaba nueva aprobación),
  icono propio y con sentido por diapositiva (`FileDown`,
  `GraduationCap`, `LayoutGrid`, `IdCard`, `Sparkles`).
- `APP_VERSION` sincronizado a `1.5.1` por primera vez desde v1.3.1 — se
  le vuelve a mostrar el "Qué hay de nuevo" a todos los usuarios,
  incluidos los que ya vieron el de v1.4.0.
- Mismo proceso completo (branch `hotfix/whatsnew-v1.5` desde `main`,
  test+build, merge sobre `main`, test+build, push, verificado en
  navegador real contra producción sin errores, tag, GitHub Release,
  rama borrada, merge de vuelta a `develop`).

**Limpieza final**: `feature/home-redesign-nav-indicator`,
`fix/perfil-orden-y-cerrar-sesion`, `fix/mobile-check-nuevo-movimiento`
y `hotfix/whatsnew-v1.5` — las 4 ya fusionadas y sin motivo para seguir
vivas — borradas local y remotamente (la última solo local, nunca se
pusheó suelta).

## Próximo paso

Lote y release cerrados, todo en producción. Pendiente de decisión del
usuario: priorizar las tareas de seguimiento de los dos informes
(`docs/INFORME-DEUDA-TECNICA-2026-09.md`,
`docs/INFORME-ROBUSTEZ-TESTS-2026-09.md`) — ninguna aplicada todavía.
