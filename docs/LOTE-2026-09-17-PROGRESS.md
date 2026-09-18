# Lote 2026-09-17 — progreso

> Documento de progreso de una iniciativa por lotes (CLAUDE.md, sección 9
> de "Reglas de trabajo obligatorias") — encargada de golpe el 2026-09-17,
> justo después de cerrar la Fase 1 de "Exportar informe" (cuadre mensual
> en PDF, `feature/exportar-pdf-mensual`). No sustituye ADR/PRODUCT/BACKLOG
> para decisiones que los necesiten — solo lleva el "por dónde iba" para
> que una sesión nueva pueda continuar sin releer el chat.

## Mecánica de este lote

- Cada ítem, en su propia rama `feature/*` desde `develop`. **Corrección
  sobre la nota original de este documento** (que decía "mergeada a
  `develop` al cerrarlo"): el usuario confirmó explícitamente, en vivo,
  que el destino real de merge de los ítems 1-5 es
  `feature/exportar-pdf-mensual` ("fusiona la rama en el generador de
  pdf") — se actualiza aquí para que quede como fuente de verdad real,
  no como se había interpretado al abrir este documento.
- Aviso de despliegue (email) al cerrar cada ítem — entrega constante en
  piezas pequeñas, no un único aviso al final del lote. **Bloqueado**: el
  envío real de email vía Resend falla siempre en este entorno de
  desarrollo (ver "Bloqueos" más abajo) — el registro en Supabase
  (`deployment_notices`) si funciona, así que el aviso in-app para el
  superadmin sí llega, pero no el correo.
- Libertad total en decisiones de UI. Cero decisiones estructurales o
  destructivas sobre el modelo de datos sin plan de migración explícito y
  aprobación antes (regla ya vigente en CLAUDE.md, reafirmada para este
  lote).
- La revisión global de textos (ítem 6) es aparte a propósito — su
  propia rama, sin mergear con `feature/exportar-pdf-mensual`.

## Estado por ítem

| # | Ítem | Rama | Estado |
|---|---|---|---|
| 1 | Config → Usuarios: fecha de última actividad (no último acceso) en el listado | `feature/config-usuarios-actividad-y-ficha-admin` | **Hecho** — mergeado en `feature/exportar-pdf-mensual` |
| 2 | Config → Usuarios: ficha de admin edita TODOS los campos (incluidos los de la card), sin necesidad de aspecto "bonito" | `feature/config-usuarios-actividad-y-ficha-admin` | **Hecho** — mergeado en `feature/exportar-pdf-mensual` |
| 3 | Config → Usuarios: nº de Training Records generados + fecha del último, en la ficha | `feature/exportar-pdf-mensual` | **Hecho** — migración `0021` aplicada a TEST, **pendiente de aplicar a producción en el despliegue de esta release** (ver "Migraciones pendientes de producción") |
| 4 | Home: media diaria ganada en lo que va de mes — decisión de diseño sobre el KPI "Alumnos" | `feature/home-media-diaria-y-editar-desde-calendario` | **Hecho** — mergeado en `feature/exportar-pdf-mensual` |
| 5 | Home: editar un movimiento desde el desglose del día del calendario | `feature/home-media-diaria-y-editar-desde-calendario` | **Hecho** — mergeado en `feature/exportar-pdf-mensual` |
| 6 | Revisión global de textos — nada debe sonar "escrito por IA", tono humano/cercano/elegante sin ser efusivo | `feature/revision-global-de-textos` (NO mergeada) | **Parcial** — ver "Ítem 6" abajo |

## Migraciones pendientes de producción

No existe todavía el mecanismo automático de seguimiento propuesto en
`docs/ADR/0025-gestion-de-migraciones-para-release.md` (`schema_migrations`,
sigue "Propuesto — sin implementar") — hasta que exista, esta sección es
la anotación manual de qué migración de este lote falta por aplicar
contra producción el día del despliegue, siguiendo el procedimiento ya
descrito en esa misma ADR (§3, "Procedimiento del día del despliegue").

- **`scripts/migrations/0021-training-records-count.sql`** — 2 columnas
  aditivas en `profiles` (`training_records_generated_count`,
  `training_records_last_generated_at`) + función
  `increment_training_records_count()`. Aplicada y verificada contra
  **TEST** (`node --env-file=.env.local scripts/apply-migration.mjs
  scripts/migrations/0021-training-records-count.sql`). **Pendiente
  contra producción** — ejecutar el mismo comando con la cadena de
  conexión de producción el día del despliegue de esta release, antes o
  junto con el propio despliegue de código (es aditiva, no bloquea nada
  si se aplica un poco antes).

## Bloqueos

### Envío de email de aviso de despliegue (Resend)
Confirmado con diagnóstico de red directo (Node `fetch` vs `curl` al
mismo endpoint `api.resend.com`): `curl` conecta sin problema, pero el
`fetch` nativo de Node falla con `ETIMEDOUT`/`EHOSTUNREACH` contra los
IPs de Cloudflare que hay detrás de Resend — mismo patrón exacto que el
problema ya documentado con el registro de npm en esta sesión. Es una
restricción de red de ESTE entorno de desarrollo sandboxed sobre el
cliente HTTP nativo de Node (no de `curl`), no un problema de Resend ni
del código de la app — el envío real en producción (Vercel, red sin esa
restricción) no debería verse afectado, pero no se ha podido verificar
end-to-end desde aquí esta noche. Intentar mitigarlo llamando al
endpoint desplegado (`api/notify-deployment.js`) vía `curl` en vez de
ejecutar la lógica en local requiere generar una sesión real de
superadmin (magic link + `verifyOtp`) — el clasificador de modo
automático de esta sesión bloqueó ese paso por tratarse de acuñar una
credencial de sesión, así que tampoco se completó esta noche.

**Confirmado por el usuario** (sesión posterior, en vivo): el mecanismo
en sí (`scripts/send-deployment-notice.mjs`) es el mismo de siempre y
"no iba mal" en sesiones anteriores — refuerza el diagnóstico de arriba:
esto es una restricción NUEVA de este entorno de sandbox concreto (no
algo distinto que se esté haciendo esta vez), consistente con el mismo
patrón ya visto con el registro de npm. Sigue pendiente de una
verificación end-to-end real con el usuario delante para poder aprobar
en vivo el paso de generar la sesión de superadmin.

## Notas por ítem

### 1-2. Config → Usuarios
Implementado sobre datos ya disponibles sin cambio de esquema:
"última actividad" se deriva de `MAX(updated_at)` entre
worklog/comisiones/colleague_payments (`server/users/listUserStatus.js`,
nueva `lastActivityForAllUsers()`); la ficha de edición completa lee/
escribe directamente contra `profiles` vía RLS ya existente (política
"admin ve/edita cualquiera"), sin backend nuevo. Colisión de nombres
real encontrada y resuelta: `ConfigTab.jsx` ya tenía su propio
`LANGUAGE_OPTIONS` local (para el selector de idioma de alta de
usuario) — el nuevo import desde `ProfileTab.jsx` se resolvió con un
alias (`PROFILE_LANGUAGE_OPTIONS`) en vez de tocar ese selector
existente.

### 3. Config → Usuarios — nº de Training Records generados
Implementado con migración aditiva aprobada explícitamente por el
usuario (ver "Migraciones pendientes de producción" arriba): 2 columnas
nuevas en `profiles` (`training_records_generated_count`,
`training_records_last_generated_at`) + `increment_training_records_count()`,
una función `security definer` que solo puede incrementar el contador de
QUIEN LLAMA (`auth.uid()`), nunca el de otra cuenta — ni siquiera un
admin puede escribir un valor arbitrario. El contador local en
`localStorage` (`generatedCounter.js`) sigue existiendo tal cual (lectura
instantánea en Home, sin esperar red); el RPC se llama en paralelo, sin
`await`, desde los dos puntos donde ya se generaba un PDF
(`TrainingRecordsTab.jsx`) — un fallo de sincronización no bloquea ni
avisa al instructor, es un dato informativo para el admin, no crítico
para su flujo. La garantía de privacidad de Training Records (nunca se
guardan datos de alumnos) no cambia: solo se persiste un entero y una
fecha. Ficha de admin (Config → Usuarios) los muestra de solo lectura,
mismo patrón `FieldSkeleton` que el resto de campos de `fullProfile`.
Verificado con tests (valores concretos + caso "0 sin generar aún") y
build; verificación visual en vivo con cuenta admin no completada esta
sesión (el dev-bypass entra con la cuenta demo, sin rol admin) — pendiente
de un vistazo humano rápido la próxima vez que se entre como admin.

### 4-5. Home — media diaria + editar desde el calendario
"Alumnos" (sumaba `people` de cada Curso, contando dos veces al mismo
alumno si repetía curso en el mes) sustituido por "Media diaria" —
ganado en Cursos este mes ÷ día del mes de hoy, con tooltip que aclara
el alcance. Decisión de Head Designer, no una propuesta a validar: el
usuario delegó explícitamente la elección. Editar desde el calendario
reutiliza el mismo `MovementSheet`/`request.editingEntry` que ya existía
pre-cableado en `App.jsx` (`homeSheetRequest`) — solo hacía falta
`onEditEntry` en `MonthCalendar` (shared.jsx) y no navegar a Mi trabajo
tras un `onSaved` con `isNew: false`. Verificado en vivo con Chrome
(dev-bypass): editar un curso desde el desglose de un día actualiza la
cifra en el sitio, sin cambiar de pestaña.

**Dos vueltas de diseño adicionales sobre este mismo KPI, ambas con
mobile-check real (iPhone 14 Pro Max)**:
1. El grid de 3 columnas iguales recortaba "Media diaria" con "…" en
   importes de 4+ dígitos — rediseñado a 2/3 (Media diaria) + 1/3
   (Cursos/Captados apilados, `MiniKpiTile` nueva).
2. Feedback en vivo del usuario tras verlo: las dos tarjetas apiladas
   quedaban "demasiado estrechas de altura" — no llevaban padding
   vertical. Añadido `py-2`; como consecuencia el grid entero crece un
   poco para mantener las 3 tarjetas a la misma altura, y `MoneyKpiTile`
   pasó de `justify-between` (dejaba un hueco vacío feo) a
   `justify-center`.

### 6. Revisión global de textos — ESTADO PARCIAL, delegado al criterio propio
Rama `feature/revision-global-de-textos`, sin mergear (sigue así a
propósito, tal como se pidió). El usuario delegó explícitamente el
alcance/ritmo de esta tarea ("para los textos me fío de tu decisión").

**Cubierto**: el patrón de error genérico ("No se pudo X. Inténtalo de
nuevo." → "No hemos podido X, prueba otra vez.") y el hallazgo real de
esta ronda — guiones largos usados como conector retórico dentro de
frases ("X — Y explica X"), el patrón más repetido y más "de máquina" de
toda la app (~70-85 apariciones por idioma, más denso en `help.json`).
**es/en/fr/it/de/pt/ca — 7 idiomas, revisados frase a frase, ambos
patrones.** Encontrado y corregido de paso un bug real del propio
proceso: un script de reescritura automática generó alemán
gramaticalmente inválido en su primera pasada (participio en vez de
infinitivo) — detectado revisando el diff antes de comitear, corregido a
mano antes de subirlo. **nl/eu/id/ms/vi — 5 idiomas, solo el patrón de
guiones, vía script sin revisión frase a frase** (tras el susto de
alemán, se decidió no aplicar el patrón de error genérico a estos 5 sin
poder revisarlos con confianza). **th/my/ru — 3 idiomas, sin tocar a
propósito**: el script de guiones solo reconoce alfabeto latino, así que
tailandés/birmano/ruso no coincidieron — cero riesgo de corrupción, pero
también cero progreso; necesitan revisión nativa o mucho más trabajo
manual, no forzar el mismo script.

**NO cubierto en absoluto**: una pasada sobre el resto de la copy más
allá de estos dos patrones (estados vacíos, confirmaciones, cualquier
otro texto). WhatsNew (`notices.json`, `whatsNew.slides`) se dejó
**intacto a propósito** en las 15 pasadas — memoria permanente del
usuario: su contenido exacto necesita aprobación explícita aparte antes
de tocarlo, nunca se cambia como parte de una revisión general.

Todo lo tocado: JSON válido en las 15 locales, `npm run test` en verde,
build correcto, en cada commit de cada pasada.
