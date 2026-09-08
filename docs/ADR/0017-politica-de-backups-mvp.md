# ADR 0017 — Política mínima de copias de seguridad (MVP, plan Free de Supabase)

**Fecha:** 2026-08-30
**Estado:** Aprobado (política) — acción segura ya implementada
(`scripts/backup-db.mjs`); nada que implique coste o cambio de plan se ha
ejecutado, queda como recomendación para decisión del usuario.

## Contexto

Ocean Flow guarda datos financieros reales del instructor (registro de
clases, comisiones, ajustes de curso) en Supabase. El plan actual del
proyecto es **Free** (confirmado por el usuario — no verificable desde
este entorno, no existe ningún token de gestión de Supabase en `.env.local`,
solo las claves de la propia app).

**Hecho documentado por Supabase, no una suposición:** el plan Free no
incluye ninguna copia de seguridad automática — ni backups diarios ni
Point-in-Time Recovery (PITR). Ambos empiezan en el plan Pro (backups
diarios con 7 días de retención incluidos; PITR es un añadido de pago
aparte, incluso en Pro). Hoy, si la base de datos de Supabase sufriera una
pérdida de datos (borrado accidental, corrupción, error humano en una
migración), **no existe ningún mecanismo de recuperación** más allá de lo
que el propio operador haya guardado por su cuenta.

## Decisión

### Política adoptada: copia de seguridad manual periódica vía `pg_dump`

Dado el volumen de datos real (un instructor freelance individual, no un
sistema multiusuario de alto volumen) y la ausencia de presupuesto
asignado a infraestructura, la solución proporcionada es la más simple que
resuelve el riesgo real, no la más completa en abstracto:

- **`scripts/backup-db.mjs`** (nuevo, ya escrito y probado sin credenciales
  reales — la validación de que falla de forma clara sin
  `SUPABASE_DB_URL` es lo único verificable desde aquí, sin acceso a la
  base de datos real): usa `pg_dump` (herramienta estándar de PostgreSQL)
  contra la cadena de conexión directa de Supabase, en formato `custom`
  (comprimido, restaurable con `pg_restore`). Alias `npm run backup:db`.
  Requiere `SUPABASE_DB_URL` — la contraseña de base de datos real
  (Dashboard → Project Settings → Database), **no** las claves anon/
  service_role que ya usa la app — nunca se comitea, nunca se imprime por
  consola.
- **Cadencia recomendada:** semanal, ejecutado a mano por el usuario
  (`npm run backup:db`). No se automatiza con un cron/GitHub Action en
  este bloque — requeriría guardar la contraseña de base de datos en un
  sitio con acceso a internet (secret de CI, servidor propio) que hoy no
  existe para este proyecto de un solo desarrollador; automatizarlo sin
  esa pieza ya resuelta sería la sobreingeniería que este proyecto evita
  a propósito (ver `docs/ADR/0006`).
- **Dónde guardar el fichero resultante:** `backups/` (en `.gitignore` —
  nunca al repositorio, son datos financieros reales). Al vivir este
  proyecto ya dentro de iCloud Drive (`~/.../Mobile Documents/com~apple~
  CloudDocs/...`), guardar ahí el `.dump` le da automáticamente una copia
  fuera de la máquina sin contratar nada nuevo — pero eso significa
  replicar datos financieros en texto plano en la infraestructura de
  Apple, una superficie de confianza que hoy no formaba parte del
  perímetro de este proyecto. **Decisión pendiente del usuario, no
  asumida aquí:** aceptar ese trade-off tal cual, o cifrar el `.dump`
  antes de dejarlo ahí (p. ej. `age` o `gpg -c`, una contraseña/clave que
  el propio usuario gestione) a cambio de un paso manual más en cada
  backup y en cada restauración.

### RPO / RTO realistas con esta política

- **RPO (cuánto se puede llegar a perder):** hasta 7 días, si el fallo
  ocurre justo antes del siguiente backup semanal. Aceptable hoy dado el
  volumen de uso real (un instructor registrando su propia actividad, no
  un negocio con decenas de movimientos diarios) — cuantificado aquí para
  que sea una decisión informada del usuario, no un supuesto.
- **RTO (cuánto se tarda en recuperar):** minutos — `pg_restore` contra un
  proyecto Supabase nuevo o vacío, sin dependencias externas. No hay
  automatización de despliegue del restore: es un procedimiento manual
  documentado, ejecutado por el operador cuando haga falta.

### Cómo verificar que un backup es realmente utilizable

Un backup nunca comprobado no es una garantía, es una suposición. Simulacro
recomendado (no automatizado esta noche, procedimiento documentado):
1. Crear un proyecto Supabase temporal nuevo (plan Free vale para el
   simulacro).
2. `pg_restore --no-owner --no-privileges -d <conexión del proyecto
   temporal> backups/ocean-flow-<fecha>.dump`.
3. Comprobar recuento de filas de las tablas clave (`worklog`,
   `comisiones`, `colleague_payments`, `rates`) contra lo esperado.
4. Borrar el proyecto temporal al terminar (evitar coste/superficie
   innecesaria).

## Alternativa considerada y no adoptada hoy: subir a Supabase Pro

Pro ($25/mes al cierre de esta sesión — verificar precio vigente antes de
decidir) da backups diarios automáticos con 7 días de retención sin
mantener ningún script, más PITR opcional para RPO casi cero. Es
objetivamente la solución más robusta, pero implica un coste recurrente
que es una decisión de negocio del usuario, no una que deba tomarse por
él — se documenta como opción preparada, no se activa.

**Condición que reactivaría esta decisión:** el negocio deja de ser "datos
que se pueden re-teclear a mano en un caso extremo" (más instructores
usando la cuenta, dependencia real de la app para facturación con
terceros, o el propio usuario decidiendo que 7 días de RPO no le parece
aceptable).

## Consecuencias

- Acción seguida hoy mismo: `scripts/backup-db.mjs` + `npm run backup:db`
  ya existen, listos para usarse en cuanto el usuario tenga a mano
  `SUPABASE_DB_URL`. Cero coste, cero cambio de plan.
- Ninguna automatización ni gasto nuevo sin que el usuario lo decida
  explícitamente (subir a Pro, cifrar los backups, montar un cron).
- `backups/` añadido a `.gitignore` — ya activo, ningún dump puede acabar
  en el historial de git por accidente.

## Addendum 2026-09-09 — respuesta directa a "¿merece la pena, con qué periodicidad, dónde?"

El usuario volvió a plantear la pregunta de fondo una vez la app ya está
en producción real (v1.1.0/v1.2.x, `oceanflow-web.vercel.app`). La
política de arriba **sigue vigente sin cambios** — el volumen real (un
instructor freelance, no un negocio multiusuario) no ha cambiado desde
que se decidió, y el mecanismo ya se usó de verdad el 2026-09-08 (backup
real de 368 KB antes de la migración de la release v1.1.0, ver
`docs/REDISENO-V2-PROGRESS.md`). Recomendación concreta, sin abrir de
nuevo el análisis completo:

- **¿Merece la pena?** Sí, la copia manual semanal (coste cero) — no
  hace falta pasar a Supabase Pro todavía. La condición que lo
  reactivaría (arriba) no se ha cumplido: sigue siendo una sola cuenta
  real, sin dependencia de terceros para facturación.
- **¿Con qué periodicidad?** Semanal (`npm run backup:db`, a mano) sigue
  siendo razonable — RPO de hasta 7 días, aceptado como suficiente para
  el volumen real de movimientos de un instructor. Si se quiere bajar
  ese RPO sin pagar Pro, la única palanca real es aumentar la frecuencia
  manual (p. ej. tras cada sesión de trabajo real con la app), no hay
  automatización barata intermedia sin resolver antes dónde vive el
  secreto `SUPABASE_DB_URL` fuera de esta máquina.
- **¿Dónde guardarlos?** `backups/` (ya en iCloud, gitignored) sigue
  siendo razonable como copia fuera de la máquina sin coste ni servicio
  nuevo. La única pregunta que quedaba genuinamente abierta en la
  decisión original — cifrar el `.dump` antes de dejarlo en iCloud — se
  resuelve aquí con una recomendación concreta: **sí, cifrarlo**
  (`age` o `gpg -c`, un paso más al backupear/restaurar) — son datos
  financieros reales y el perímetro de confianza de iCloud nunca fue
  parte del diseño original de este proyecto. No implementado esta
  noche (decisión de una clave/contraseña que debe elegir y guardar el
  propio usuario, no algo que se pueda decidir en su ausencia) — queda
  como recomendación explícita para la próxima vez que se toque este
  script.
