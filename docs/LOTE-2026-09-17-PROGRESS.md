# Lote 2026-09-17 — progreso

> Documento de progreso de una iniciativa por lotes (CLAUDE.md, sección 9
> de "Reglas de trabajo obligatorias") — encargada de golpe el 2026-09-17,
> justo después de cerrar la Fase 1 de "Exportar informe" (cuadre mensual
> en PDF, `feature/exportar-pdf-mensual`). No sustituye ADR/PRODUCT/BACKLOG
> para decisiones que los necesiten — solo lleva el "por dónde iba" para
> que una sesión nueva pueda continuar sin releer el chat.

## Mecánica de este lote

- Cada ítem, en su propia rama `feature/*` desde `develop`, mergeada a
  `develop` al cerrarlo — no hay una rama "paraguas" común entre ítems
  (la mención a "la rama del exportador de informe" en el encargo se
  interpreta como contexto temporal — "mientras estás con eso" — no como
  un destino de merge; el exportador de PDF (`feature/exportar-pdf-mensual`)
  sigue su propio camino, sin tocar).
- Aviso de despliegue (email) al cerrar cada ítem — entrega constante en
  piezas pequeñas, no un único aviso al final del lote.
- Libertad total en decisiones de UI. Cero decisiones estructurales o
  destructivas sobre el modelo de datos sin plan de migración explícito y
  aprobación antes (regla ya vigente en CLAUDE.md, reafirmada para este
  lote).
- La revisión global de textos (última fila de la tabla) es aparte a
  propósito — su propia rama, sin mergear con `feature/exportar-pdf-mensual`.

## Estado por ítem

| # | Ítem | Rama | Estado |
|---|---|---|---|
| 1 | Config → Usuarios: fecha de última actividad (no último acceso) en el listado | `feature/config-usuarios-actividad-y-ficha-admin` | En curso |
| 2 | Config → Usuarios: ficha de admin edita TODOS los campos (incluidos los de la card), sin necesidad de aspecto "bonito" | `feature/config-usuarios-actividad-y-ficha-admin` | Pendiente |
| 3 | Config → Usuarios: nº de Training Records generados + fecha del último, en la ficha | `feature/config-usuarios-actividad-y-ficha-admin` | Pendiente |
| 4 | Home: media diaria ganada en lo que va de mes — decisión de diseño sobre el KPI "Alumnos" (no es un dato real, un mismo alumno en varios cursos suma de más) | Rama propia, pendiente de crear | Pendiente — análisis antes de implementar |
| 5 | Home: editar un movimiento desde el desglose del día del calendario (abre el sheet, guarda y refresca en el sitio) | Rama propia, pendiente de crear | Pendiente |
| 6 | Revisión global de textos — nada debe sonar "escrito por IA", tono humano/cercano/elegante sin ser efusivo | Rama propia, pendiente de crear — NO mergear con `feature/exportar-pdf-mensual` | Pendiente |

## Notas por ítem

### 1-3. Config → Usuarios
Sin empezar la exploración de código todavía en el momento de escribir esto
— primer paso real: leer `ConfigTab.jsx` (sección Usuarios: listado +
`UserDetailSheet` o equivalente) y `server/users/listUserStatus.js` (ya
tiene un patrón de "actividad" documentado en CLAUDE.md,
`activitySummaryFor()`) para ver si "última actividad" ya se calcula en
algún sitio o hace falta derivarla de las tablas de movimientos
(worklog/comisiones/colleague_payments, MAX(updated_at) o MAX(date) de la
fila más reciente del usuario).

### 4. Home — media diaria + KPI "Alumnos"
Encargo explícito: decidir yo, como responsable de diseño, qué hacer con
"Alumnos" (hoy cuenta duplicado si un mismo alumno hace varios cursos) —
la corrección de fondo (identificar alumnos únicos) queda fuera de
alcance por ahora ("ya pensaré la manera de solucionar esto"); lo que
toca decidir en este lote es solo si el KPI se queda, se sustituye o se
retira mientras tanto, y cómo encaja la media diaria nueva. Pendiente de
analizar la pantalla Home actual antes de decidir.

### 5. Home — editar movimiento desde el calendario
`MonthCalendar` (shared.jsx) ya tiene `onCreateForDay` para crear; hace
falta un `onEditEntry` (o similar) para el desglose de un día con
actividad, que abra `MovementSheet` en modo edición y refresque el propio
desglose al guardar sin cerrar el calendario.

### 6. Revisión global de textos
Alcance: toda la copy visible de la app (labels, toasts, estados vacíos,
ayuda, emails). Se hace en su propia rama, deliberadamente sin mezclar con
ninguna otra — un cambio transversal así toca casi todas las pantallas y
mezclarlo con features nuevas haría el diff imposible de revisar.
