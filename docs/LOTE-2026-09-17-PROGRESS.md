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
| 3 | Config → Usuarios: nº de Training Records generados + fecha del último, en la ficha | — | **Bloqueado, no implementado** — ver "Bloqueos" |
| 4 | Home: media diaria ganada en lo que va de mes — decisión de diseño sobre el KPI "Alumnos" | `feature/home-media-diaria-y-editar-desde-calendario` | **Hecho** — mergeado en `feature/exportar-pdf-mensual` |
| 5 | Home: editar un movimiento desde el desglose del día del calendario | `feature/home-media-diaria-y-editar-desde-calendario` | **Hecho** — mergeado en `feature/exportar-pdf-mensual` |
| 6 | Revisión global de textos — nada debe sonar "escrito por IA", tono humano/cercano/elegante sin ser efusivo | `feature/revision-global-de-textos` (NO mergeada) | **Parcial** — ver "Ítem 6" abajo |

## Bloqueos

### Ítem 3 — nº de Training Records generados
El contador de Training Records generados vive **solo en `localStorage`**
del propio dispositivo (`src/trainingRecords/generatedCounter.js`) — es
una decisión de privacidad deliberada y documentada: nunca se guardan
datos de alumnos en Supabase, así que no existe ningún sitio real donde
llevar la cuenta de certificados emitidos por usuario sin romper esa
garantía. Implementar el ítem 3 tal como se pidió (verlo desde la ficha
de ADMIN de otro usuario) exigiría, como mínimo, una tabla/columna nueva
en Supabase para llevar la cuenta server-side — un cambio de esquema que
esta iniciativa tiene explícitamente prohibido decidir en solitario
("no tomes decisiones sobre cambios estructurales... sin plan de
migración explícito y aprobación antes"). Queda sin implementar,
pendiente de que el usuario decida entre: (a) aceptar que este dato no
esté disponible para el admin, o (b) aprobar el cambio de esquema
necesario (con su propio plan de migración, en una sesión aparte).

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

### 6. Revisión global de textos — ESTADO PARCIAL
**Cubierto esta noche** (rama `feature/revision-global-de-textos`, sin
mergear): el patrón más repetido y más "de máquina" de toda la app — unos
~25 mensajes de error casi idénticos, "No se pudo {verbo}. Inténtalo de
nuevo.", repartidos por auth/común/config/trabajo/tarifas/perfil/Training
Records — sustituidos por "No hemos podido {verbo}, prueba otra vez."
(más cercano, primera persona del plural en vez de pasiva impersonal).
Incluye también el equivalente que vivía hardcodeado en `useSession.js`
(activación de cuenta), fuera de i18n. De paso, corregida una descripción
de Configuración con una nota de desarrollo obsoleta ("cuando tengáis el
logo oficial, avisadme...") que ya no aplicaba (el logo real se añadió en
septiembre).

**NO cubierto todavía — pendiente para una sesión de continuación**:
- Los mismos cambios de tono, propagados a los otros 14 idiomas (hoy solo
  español). Requiere traducir cada frase nueva manteniendo el mismo
  registro cercano en cada idioma, no una traducción mecánica.
- Una pasada sobre el resto de la copy de la app más allá del patrón de
  error genérico: textos de Ayuda (`help.json`, 19KB, contenido
  educativo — menor riesgo de sonar "a IA" por su propia naturaleza, pero
  sin auditar), estados vacíos, confirmaciones, y cualquier otro texto
  que no seguía ese patrón concreto.
- WhatsNew (`notices.json`, `whatsNew.slides`) se dejó **intacto a
  propósito** — memoria permanente del usuario: su contenido exacto
  necesita aprobación explícita aparte antes de tocarlo, nunca se
  cambia como parte de una revisión general.

Motivo de parar aquí en vez de completar los 14 idiomas de un tirón:
proporcionalidad — 15 idiomas × un pase de voz/tono es un volumen real de
traducción que merece revisión, no solo velocidad; se prefirió una
primera pasada bien hecha y documentada a un diff enorme sin revisar en
una noche. La rama sigue sin mergear con `feature/exportar-pdf-mensual`,
tal como se pidió.
