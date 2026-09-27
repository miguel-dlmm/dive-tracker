# Informe de robustez de la suite de tests — Ocean Flow (2026-09)

> Auditoría de solo lectura sobre código fuente, sin cambios de código,
> encargada como parte del lote nocturno del 2026-09-26 (ver
> `docs/LOTE-2026-09-26-PROGRESS.md`). Cobertura medida con
> `@vitest/coverage-v8` instalado temporalmente vía `npm install
> --no-save` (revertible, sin tocar `package.json`/`package-lock.json` —
> confirmado limpio al terminar).

## 1. Cobertura real medida

Ejecutado con `npx vitest run --coverage` (motor v8).

**Hallazgo importante primero**: con cobertura activada, 6 tests de
`src/ProfileTab.test.jsx` fallaron de forma no determinista (un campo
`professional_level` apareciendo en llamadas a un mock que no lo
esperaba; timeouts en un selector de fecha), mientras que la suite
completa sin cobertura pasa en limpio. Esto apunta a un aislamiento
imperfecto entre tests de ese fichero (estado compartido o dependencia
del orden/tiempos de ejecución) que la ejecución normal enmascara, pero
que otra condición de carga (más lenta, o con otro orden) podría destapar
en CI — ver tarea de seguimiento 1 más abajo. También hay relación con
`src/HomeTab.test.jsx`, donde un test cronometrado (`testTimeout` de
5000ms) hace timeout solo bajo la carga extra de instrumentación de
cobertura — ese sí parece un timeout ajustado con poco margen, no un
problema de aislamiento.

Para obtener un número de cobertura utilizable, la medición se repitió
excluyendo esos dos ficheros de test (no el resto de la suite). Cobertura
real medida sobre las 60 suites restantes (925 tests):

| Métrica | % |
|---|---|
| Statements | **85.93%** (6397/7444) |
| Branches | **74.27%** (3165/4261) |
| Functions | **75.11%** (1144/1523) |
| Lines | **89.47%** (5782/6462) |

**Importante**: como `ProfileTab.test.jsx` y `HomeTab.test.jsx` quedaron
fuera de esta ejecución, `ProfileTab.jsx` (36.82% stmts) y `HomeTab.jsx`
(69.62% stmts, 37.83% funcs) aparecen aquí con cobertura mucho más baja
de la real — su cobertura de verdad, con su propio test file corriendo,
es sensiblemente mayor. No se estima como si fuera un dato medido, dado
que no se pudo medir de forma fiable por el hallazgo de arriba.

### Desglose por zona (statements)

| Zona | % Stmts | Nota |
|---|---|---|
| `server/` (users, email, notifications) | 92-100% | Excelente — la lógica de servidor (creación/borrado de usuarios, roles, emails) está muy bien cubierta |
| `src/monthlyReport/` | 90% | Sólido, incluye el fix de cabeceras huérfanas de esta misma noche |
| `src/trainingRecords/` | 79.5% | Razonable; `TrainingRecordsTab.jsx` (68.65%) y `pdfToJpg.js` (65.9%) son los puntos más flojos |
| `src/` (pantallas) | 78.13% | Ver huecos concretos abajo |
| `src/i18n`, `src/legal`, `src/auth` | 88-100% | Bien |

### Ficheros de lógica de negocio real con cobertura baja/nula

- **`src/InstallAppTab.jsx` — 0%** (sin test alguno). Bajo riesgo (UI de
  instalación PWA, no maneja dinero), pero es un 0% real.
- **`src/ConfigTab.jsx` — 72.68% stmts, 63.21% funcs.** Es el fichero más
  grande y con más ramas de negocio real (tarifas, monedas, colores de
  sección, gestión de usuarios admin) — un 63% de funciones sin ejercitar
  en un fichero así es la brecha de mayor riesgo real del proyecto.
- **`src/trainingRecords/TrainingRecordsTab.jsx` — 68.65% stmts, 61.16%
  funcs.** Pantalla que orquesta la generación de los PDF entregables al
  usuario final.
- **`src/trainingRecords/pdfToJpg.js` — 65.9% stmts, 50% funcs.**
  Conversión de imagen usada en el propio flujo de Training Records.
- **`src/App.jsx` — 76.14% stmts, 68.33% funcs.** Es el shell de
  navegación — cobertura razonable pero con ramas sin cubrir.

## 2. Casos de uso probados vs. documentación funcional (Ayuda)

La Ayuda real de la app (`src/help/content.js`, 11 artículos) documenta
estos flujos para el usuario final:

| Flujo documentado en Ayuda | ¿Cubierto por test de comportamiento real? |
|---|---|
| `quiero-crear-movimiento` (crear un movimiento) | ✅ `MiTrabajoTab.test.jsx` (87.7% del fichero) |
| `quiero-cobrar` (marcar como cobrado) | ✅ cubierto dentro de `MiTrabajoTab.test.jsx`/`MovementSheet` (sin test file propio, pero sí ejercitado) |
| `quiero-consultar-generado` (consultar lo ganado) | ✅ `SummaryTab.test.jsx` (88.98%), `HomeTab.test.jsx` (KPIs) |
| `quiero-generar-tr` (generar Training Record) | ✅ `TrainingRecordsTab.test.jsx` + `pdfFill.test.js` (22 tests, robusto) — aunque `TrainingRecordsTab.jsx` en sí solo al 68.65% |
| `quiero-configurar` (configurar la app) | 🟡 Parcial — `ConfigTab.test.jsx` existe pero el fichero real solo cubre 63% de sus funciones |
| `func-perfil` (Mi perfil) | 🟡 Parcial — test existe pero es el fichero con **menor cobertura de todo el proyecto** (36.82%) y con los 6 fallos no deterministas descritos arriba |
| `func-filtros` (filtros de listados) | 🟡 Sin test dedicado — se ejercita indirectamente a través de otras pantallas, sin un test que valide `applyListFilters` (`shared.jsx`) de forma aislada |
| `bienvenida` (onboarding) | ⚪ No aplica a test de comportamiento (contenido estático) |

**Nota de documentación**: `CLAUDE.md` describe la estructura como "un
archivo por pantalla: `WorkLogTab.jsx`, `ComisionesTab.jsx`,
`CompanerosTab.jsx`, `PaymentsTab.jsx`..." — esos ficheros ya no existen,
se consolidaron en `MiTrabajoTab.jsx`. Es una discrepancia de
documentación, no de tests; queda anotada aquí porque se descubrió
comparando tests reales contra la documentación, pero corregirla no es
alcance de este informe — es una decisión para una fase de
documentación/deuda técnica.

## 3. Categorización de los tests (pirámide de CLAUDE.md)

869 `it()`/`test()` en total. Estimación razonada por muestreo de los
ficheros más grandes:

- **Unitarios (funciones puras/cálculo): ~30%** — `rateCalc.test.js`,
  `pdfFill.test.js`, `dateFormat.test.js`, `computeInitials.test.js`,
  `generatedCounter.test.js`, `passwordPolicy.test.js`, gran parte de
  `buildExportReportData.test.js`.
- **Integración ligera (componentes React, interacción de usuario):
  ~55%** — la mayoría de `*.test.jsx`, incluidos los flujos de creación/
  edición/borrado con `userEvent`.
- **Seguridad/permisos: ~10%** — concentrados casi todos en
  `server/users/*.test.js` (roles admin/superadmin bien cubiertos:
  create/delete/update-admin-status/set-active).
- **Otros (rendering básico/smoke): ~5%.**

El reparto es razonable y coherente con el orden de prioridad que pide
CLAUDE.md — no está desequilibrado hacia UI trivial. El punto débil no es
la proporción, es la concentración: la seguridad está bien cubierta en el
**servidor**, pero no hay ningún test que verifique en el **cliente** que
un usuario no-admin nunca ve ni puede activar acciones de admin en
`ConfigTab.jsx` (el filtrado existe en código — no se ha verificado si
tiene test propio de "no-admin no ve esto").

## 4. Tests frágiles

No se encontró ningún `toMatchSnapshot`/snapshot testing en todo el
proyecto — coherente con la regla de CLAUDE.md.

Un único caso real de selector CSS frágil, justo el patrón que CLAUDE.md
prohíbe explícitamente:

- **`src/WhatsNew.test.jsx:15`** — `container.querySelector(".touch-pan-y")`.
  Si esa clase de Tailwind cambia por refactor visual (sin cambiar el
  comportamiento), el test rompe sin motivo real.

El resto de usos de `container.querySelector` (`AppLoading.test.jsx`,
`HelpTab.test.jsx`) son selectores por atributo (`img[src="..."]`), no
por estructura/clase — aceptables, ya que no hay otra forma accesible de
verificar qué imagen se está mostrando.

## 5. Seguridad/permisos

Los endpoints sensibles de `server/users/` (crear, borrar, activar/
desactivar, cambiar rol admin, regenerar contraseña/enlace) tienen test
dedicado y cubren explícitamente casos de rol (`deleteUser.test.js`,
`createUser.test.js`, `updateAdminStatus.test.js`, `setUserActive.test.js`,
`regeneratePassword.test.js`, `regenerateActivationLink.test.js`,
`deleteOwnAccount.test.js`) — cobertura de esta zona 92-100%, la mejor
del proyecto.

La Ayuda (`HelpTab.jsx`) ya no recibe siquiera el rol del usuario — el
filtrado `adminOnly`/`superadminOnly` se eliminó del código el
2026-09-01 junto con el contenido que filtraba (comentario explícito en
el fichero), así que hoy es estructuralmente imposible que la Ayuda
muestre contenido de admin — más fuerte que un filtro con test, aunque
`CLAUDE.md` sigue describiendo el mecanismo de filtro como si existiera
(otra pequeña discrepancia de documentación, anotada por completitud).

Punto sin cubrir: no hay test de cliente que verifique que `ConfigTab.jsx`
oculta/deshabilita de verdad las acciones de admin/superadmin para un
usuario sin ese rol — el servidor rechazaría la petición igualmente
(defensa en profundidad ya existe), pero un fallo de UI ahí sería una
mala experiencia (botón que parece funcionar y falla) sin que ningún test
lo detecte hoy.

## 6. Tareas de seguimiento priorizadas

1. **(Alta — integridad de la suite) Investigar la no-determinismo de
   `ProfileTab.test.jsx` bajo carga/instrumentación distinta.** Si CI
   alguna vez corre con más carga o paralelismo distinto, esta suite
   podría fallar en rojo sin que el código real esté roto — el tipo de
   fallo que la gente aprende a ignorar ("total, ya sabemos que ese test
   falla a veces"), lo cual es peligroso porque esconde fallos reales
   futuros en el mismo fichero.
2. **(Alta — dinero/config) Subir cobertura de funciones en
   `ConfigTab.jsx`** (63.21% hoy): es el fichero con más lógica de
   negocio real (tarifas, monedas, colores) y la cobertura de funciones
   más baja de las pantallas grandes — si algo se rompe aquí, se rompe la
   fuente de verdad de configuración de toda la app.
3. **(Alta — entregable al usuario) Subir cobertura de
   `TrainingRecordsTab.jsx`** (61.16% funcs): orquesta la generación del
   PDF que el usuario entrega a terceros (alumnos/organismos) — un fallo
   aquí es visible fuera de la app, no solo interno.
4. **(Media — seguridad en cliente) Añadir un test que verifique que un
   usuario no-admin no ve/no puede activar las acciones de admin en
   `ConfigTab.jsx`.** El servidor ya rechaza la petición, pero hoy nada
   prueba que la UI se comporte bien en ese caso.
5. **(Media) Test dedicado para `applyListFilters` (`shared.jsx`)** — es
   lógica pura de filtrado reutilizada en varias pantallas (Escuela/
   Estado/Tipo de pago/Actividad), y hoy solo se ejercita indirectamente.
6. **(Baja) Sustituir el selector `.touch-pan-y` de
   `src/WhatsNew.test.jsx:15`** por una consulta basada en comportamiento/
   rol accesible, para no violar la regla de tests frágiles de CLAUDE.md.
7. **(Baja) `InstallAppTab.jsx` a 0%** — bajo riesgo real, pero un test
   mínimo de "se muestra/se oculta según condición" cerraría el único 0%
   del proyecto.
8. **(Muy baja, informativo) Actualizar `CLAUDE.md`** para reflejar la
   consolidación real de pantallas (`MiTrabajoTab.jsx` sustituye a los 4
   ficheros que el documento sigue nombrando) y el filtro de Ayuda ya
   eliminado — no es un hueco de test, es deuda de documentación
   descubierta al hacer esta comparación.

---

*Confirmación final de la investigación: `git status`/`git diff` sobre
`package.json` y `package-lock.json` sin ningún cambio tras toda la
auditoría — la instalación temporal de `@vitest/coverage-v8` no dejó
ningún rastro en el árbol de trabajo.*
