# ADR 0007 — Preferencias personales del instructor: localStorage por defecto, `profiles` solo si hace falta sincronizar

**Fecha:** 2026-08-28
**Estado:** Aprobado. Primer caso implementado: moneda favorita en "Mi
trabajo" → Ajuste de curso.

## Contexto

Durante el rediseño del formulario de creación/edición de movimientos
(ver el propio historial de "Mi trabajo") surgió la primera preferencia
personal real: la moneda con la que un instructor cobra sus Ajustes de
curso casi siempre es la misma, y hoy el valor por defecto es el global
de Configuración (`currencies.is_default`), no el suyo. Se evaluó
explícitamente si este patrón debía extenderse a otros campos
(escuela favorita, actividad más frecuente, valores recientes) — la
decisión de este documento no es solo "dónde guardar la moneda", sino
qué regla seguir la próxima vez que aparezca una preferencia personal
nueva, para no volver a evaluarlo desde cero cada vez.

## Problema

¿Dónde debe vivir una preferencia personal de un instructor (un valor que
sirve para prefijar un campo, no un dato de negocio) — en Supabase
(`profiles`, con su propia migración y sincronización real entre
dispositivos) o en el propio dispositivo (`localStorage`, sin tocar el
backend)?

## Decisión

**Regla general — localStorage por defecto, `profiles` solo si se
demuestra necesidad real de sincronizar entre dispositivos:**

- Una preferencia personal simple (un valor que solo sirve para prefijar
  un campo del propio instructor) se guarda en `localStorage`, sin
  ninguna migración de esquema.
- Se sube a una columna de `profiles` (con su propia migración,
  incremental, según la regla ya existente del proyecto para cambios de
  esquema) únicamente cuando aparece una necesidad real y concreta de que
  esa preferencia esté disponible en más de un dispositivo del mismo
  instructor — no de forma preventiva.

### Primer caso: moneda favorita

Implementada en `src/MiTrabajoTab.jsx`, clave
`oceanpulse:favoriteCurrency:<user_id>`. Comportamiento:

- Al abrir el formulario de Ajuste de curso, la moneda se preselecciona
  con la favorita guardada; si no hay ninguna, con la moneda global de
  Configuración (comportamiento previo, sin regresión).
- Si el instructor cambia la moneda **de forma activa** en esa sesión del
  formulario, aparece "Usar X como moneda favorita" — un enlace de texto,
  no un diálogo ni una pantalla de configuración.
- La sugerencia **nunca aparece sobre el valor preseleccionado sin
  tocar** — solo tras un cambio explícito. Se detectó y corrigió este
  matiz durante la implementación: sin él, la sugerencia aparecía en
  cada apertura del formulario aunque el instructor no hubiera hecho
  nada, generando ruido en vez de ayuda.

## Alternativas consideradas

- **Columna nueva en `profiles`** (p. ej. `favorite_currency`) —
  descartada como primera opción. Exige una migración de esquema, que
  las reglas del proyecto ya obligan a proponer aparte antes de tocar
  código; para una preferencia de un solo campo, de un instructor que
  usa mayoritariamente un único dispositivo, el coste de la migración no
  se justifica todavía. Sigue siendo la opción correcta el día que sí
  haga falta sincronizar entre dispositivos — ver más abajo.
- **Nueva sección "Preferencias" en Configuración** — descartada. Añadir
  una pantalla de configuración dedicada para una sola preferencia es
  más pesado que el propio problema que resuelve; el flujo contextual
  ("cambia la moneda → te ofrezco guardarla") ya cubre por completo cómo
  se establece y se corrige, sin superficie de UI adicional.
- **Mostrar la sugerencia siempre que el valor actual difiera de la
  favorita guardada** (incluyendo el valor preseleccionado sin tocar) —
  descartada tras detectarla como ruido real durante la propia
  implementación (ver "Primer caso" arriba). Se sustituyó por exigir un
  cambio activo del campo en la sesión actual del formulario.

## Cuándo migrar a `profiles`

Señal concreta, no intuición: un instructor reporta (o se detecta en uso
real) que su preferencia no se mantiene al cambiar de dispositivo o de
navegador. En ese momento, la migración es sencilla y acotada — una
columna nueva, nullable, en `profiles`, con su propio plan incremental
según la regla ya existente del proyecto para cambios de esquema.

## Ideas evaluadas y diferidas (candidatas futuras, no compromisos)

- **Actividad más frecuente/reciente por escuela** como valor por
  defecto del campo Curso, en vez del `is_default` global actual. Buena
  idea con justificación clara, pero cambia una regla de qué se prefija
  por defecto — merece su propia decisión, no mezclarse con este cambio.
- **Acción primaria directa en el FAB** para "Curso impartido" (el tipo
  de movimiento más frecuente), saltando el selector de tipo. Cambiaría
  un patrón de interacción ya documentado y usado en toda la app
  (convención de "crear = FAB + hoja inferior", `CLAUDE.md`), no solo
  este formulario — necesita confirmación explícita antes de
  implementarse, no es una extensión menor de esta decisión.

Ninguna de las dos se implementa como parte de este ADR.
