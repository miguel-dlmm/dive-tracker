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
| (pendiente de commitear) | Fix: animación de salida rota al marcar como cobrado — ver diagnóstico abajo | ✅ corregido y validado, a falta de commit |

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

## Siguiente paso

Investigar y (si el alcance es acotado y seguro) corregir el bug de animación al cobrar, en `MiTrabajoTab.jsx` / `EntryRow`, comparando el camino de "cobrar" con el de "deshacer" para ver dónde diverge. Después, empezar Commit 1 (Configuración).
