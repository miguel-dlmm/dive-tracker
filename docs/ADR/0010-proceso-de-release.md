# ADR 0010 — Proceso mínimo viable de release: crear → validar → desplegar

**Fecha:** 2026-08-29
**Estado:** Aprobado (proceso) y **ejecutado por primera vez**. La
release `v0.2.0` — candidato descrito en
`docs/SESSION-2026-08-28-rediseno-global.md` — se completó el
2026-08-30: merge `--ff-only` de `feature/global-redesign` a `develop`,
commit `chore: prepare release v0.2.0`, tag anotado `v0.2.0` (commit
`91b9986`) y push de `develop` + tag. Pendiente únicamente el paso 7 de
este proceso (`gh release create`, réplica en GitHub Releases) — no
ejecutado por no disponer de `gh` CLI en el entorno de esta sesión; no
bloquea nada, es solo visibilidad adicional sobre el mismo tag ya
publicado.

## Contexto

Ocean Pulse ya tenía las piezas de un proceso de release sin haberlo
documentado como tal: `CHANGELOG.md` en formato Keep a Changelog, un tag
`v0.1.0`, y una decisión de ramas ya cerrada (`docs/ADR/0006-...md`) que
incluso anticipaba la respuesta ("Releases: se mantiene lo ya existente
— CHANGELOG.md + semver + tag vX.Y.Z"). Lo que faltaba no era decidir un
modelo desde cero, sino **formalizar el mínimo proceso ya implícito** y
detectar que llevaba tiempo sin aplicarse: `CHANGELOG.md` tiene su
sección "Unreleased" vacía mientras `develop` ya acumula 5 commits reales
sin registrar desde `v0.1.0`, y la rama de trabajo de esta sesión acumula
22 commits sin publicar en total (ver desglose en el documento de
sesión).

## Investigación (fuentes primarias)

- **[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)** —
  formato ya en uso en este repo: secciones `Added`/`Changed`/
  `Deprecated`/`Removed`/`Fixed`/`Security`, la versión más reciente
  arriba, fecha en ISO 8601, una sección `Unreleased` siempre al
  principio para lo que aún no se ha etiquetado. Principio rector: un
  changelog es "para humanos, no para máquinas" — nunca un volcado de
  `git log`, solo diferencias que le importan a quien actualiza.
- **[Semantic Versioning 2.0.0](https://semver.org/)** —
  `MAJOR.MINOR.PATCH`: `MAJOR` para cambios incompatibles, `MINOR` para
  funcionalidad nueva compatible hacia atrás, `PATCH` para corrección de
  errores compatible. Mientras la versión sea `0.y.z` (desarrollo
  inicial, "anything MAY change at any time"), no aplican las reglas de
  compatibilidad estrictas de la v1 — Ocean Pulse sigue en `0.y.z`
  (`CHANGELOG.md` ya la describe como "MVP funcional"), así que esta
  release usa un incremento de `MINOR`, reservando `MAJOR` para cuando
  el producto declare una API/superficie estable.
- **[GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)**
  — una release de GitHub se apoya siempre en un tag ya existente; añade
  notas y visibilidad sin sustituir a `CHANGELOG.md`. Se usa aquí como
  espejo del changelog (mismo texto, no generado automáticamente a
  partir de commits — la calidad "para humanos" ya la da el changelog
  curado a mano que este proyecto ya practica).

**No se ha inventado ningún workflow propio**: el proceso descrito abajo
es la aplicación directa de estos tres estándares sobre el modelo de
ramas que `ADR-0006` ya decidió, sin añadir ninguna rama, entorno ni
herramienta nueva.

## Decisión

### Nomenclatura de versión

`vMAJOR.MINOR.PATCH` (SemVer), con el proyecto en fase `0.y.z`
("desarrollo inicial"). Regla práctica para decidir el incremento:

| Cambio | Incremento |
|---|---|
| Funcionalidad nueva o rediseño de una pantalla/flujo (lo habitual en este proyecto hoy) | `MINOR` (`0.1.0` → `0.2.0`) |
| Solo corrección de errores entre releases de `MINOR` | `PATCH` (`0.2.0` → `0.2.1`) |
| El producto declara una superficie/API estable (no aplica todavía) | `MAJOR` (`0.y.z` → `1.0.0`) |

### Changelog

Se mantiene `CHANGELOG.md` exactamente en el formato Keep a Changelog ya
usado en la entrada `[0.1.0]`. Cada commit con impacto de usuario
(`feat`, `fix` — no `chore`/`refactor`/`test` internos sin efecto
visible) añade o actualiza una línea bajo `## Unreleased` en el momento
de mergear a `develop`, agrupada por `Added`/`Changed`/`Fixed`. Al
etiquetar una release, `Unreleased` se renombra a
`## [X.Y.Z] - YYYY-MM-DD` y se abre un `## Unreleased` nuevo, vacío,
encima.

**Cambio de práctica a partir de ahora**: hasta hoy, `Unreleased` se
actualizaba de forma irregular (por eso llevaba 5 commits reales sin
reflejar). A partir de esta decisión, actualizar `CHANGELOG.md` pasa a
ser parte del propio commit que aporta el cambio, no una tarea aparte
para "cuando toque hacer la release" — igual que ya es obligatorio
documentar decisiones relevantes (`CLAUDE.md`, regla 7).

### Rama que prepara la release / rama destino

**No existe una rama `release/*`** — evaluada y descartada por el mismo
motivo que `ADR-0006` ya descartó Git Flow completo: añadiría una fase
de estabilización que el despliegue automático de Vercel por rama ya
resuelve, sin beneficio para un solo desarrollador. La propia `develop`
(hoy única rama de entorno real) es a la vez donde se prepara y donde
vive la release — "preparar" una release es: mergear ahí las ramas
`feature/*`/`fix/*` ya validadas individualmente, ejecutar la validación
de release (ver abajo) sobre `develop` ya actualizada, y etiquetar ese
commit exacto.

### Cómo se promueve y se etiqueta

**Addendum 2026-09-04 (release `v1.0.0`):** los pasos 5-8 de abajo daban
por hecho que `develop` es la producción real — cierto cuando se escribió
esta ADR, ya no desde que `ADR-0006` creó `main` como producción pública
separada (2026-08-30) y, sobre todo, desde que esa misma ADR añadió la
rama `release/*` obligatoria para llegar a `main` (2026-09-04, ver
"Rama `release/*`" en `ADR-0006`). Corregido aquí para que el próximo
release lo siga bien, sin tener que releer el historial de chat:

- **El tag `vX.Y.Z` marca el commit que de verdad queda desplegado en
  producción — hoy eso es `main`, no `develop`.** Taguear sobre
  `develop` (paso 5 original) apuntaría a un commit que nunca es el que
  sirve `oceanflow`/`dive-tracker-exgg.vercel.app`.
- **Pasos 3-4 (mover el CHANGELOG, bump de versión) viven en la rama
  `release/vX.Y.Z`** (`ADR-0006`), no directamente sobre `develop` —
  excepción real, no una regla nueva: `v1.0.0` los hizo directamente
  sobre `develop` porque `ADR-0006` todavía no exigía `release/*` en ese
  momento del proceso; a partir de ahora sí.
- **El tag (paso 5) y el `gh release create` (paso 7) se mueven a
  después de fusionar `release/vX.Y.Z` sobre `main` y verificar el
  despliegue real** — nunca antes, para no marcar como "v1.0.0" un
  commit que ni siquiera ha llegado a producción todavía si algo falla
  en la verificación.
- **El paso 8 ("Vercel despliega solo") ya no es automático sin más**:
  desde el mismo `v1.0.0` (`ADR-0006`, `vercel.json`/`git.deploymentEnabled`),
  solo `develop`/`main` disparan build automático al hacer push — el
  push a `main` sigue desplegando solo, sin acción manual, pero
  cualquier rama de trabajo (incluida `release/*` mientras se prepara)
  ya no genera un Preview por sí sola; si hace falta revisarla antes de
  fusionar, se dispara a mano con `vercel deploy`.

Secuencia corregida:

1. Fusionar cada `feature/*`/`fix/*` ya lista a `develop` (flujo normal
   de `ADR-0006`, sin cambios).
2. Crear `release/vX.Y.Z` desde `develop` actualizado (`ADR-0006`).
3. Sobre `release/vX.Y.Z`: mover `## Unreleased` de `CHANGELOG.md` a
   `## [X.Y.Z] - YYYY-MM-DD` (`X.Y.Z` según la tabla de arriba), bump de
   versión, `npm run test && npm run build` (y `npm run mobile-check` si
   hubo cambios de UI — CLAUDE.md, regla 8). Commit
   `chore: preparar release vX.Y.Z`.
4. Fusionar `release/vX.Y.Z` sobre `main` (`ADR-0006`), `npm run test &&
   npm run build` sobre `main` ya fusionada, `git push origin main` →
   despliegue automático.
5. Verificar el despliegue real (navegador headless contra la URL de
   producción, sin errores de consola).
6. **Solo si el paso 5 sale limpio**: `git tag -a vX.Y.Z -m "vX.Y.Z"`
   sobre el commit de `main` recién desplegado, `git push origin main
   --tags`.
7. `gh release create vX.Y.Z --notes-file <extracto del CHANGELOG>` —
   espejo en GitHub del mismo texto, no notas autogeneradas.
8. Borrar `release/vX.Y.Z` (local y remoto) una vez fusionada — rama
   efímera, no queda colgada (`ADR-0006`).

### Validaciones mínimas obligatorias antes de etiquetar

- `npm run test` — 0 fallos.
- `npm run build` — sin errores.
- `npm run mobile-check` — sin errores/avisos de consola, si la release
  incluye cambios de UI (todas las de este proyecto, hasta ahora).
- Working tree limpio (`git status`) y `CHANGELOG.md` actualizado.
- El tag `vX.Y.Z` no debe existir ya (`git tag -l vX.Y.Z` vacío).

No se añade ningún pipeline de CI nuevo — no existe infraestructura de CI
en el proyecto hoy, y montarla solo para gatear releases sería
desproporcionado para un solo desarrollador con despliegue automático ya
resuelto por Vercel (mismo razonamiento que descarta Trunk-Based
Development en `ADR-0006`).

### Cómo revertir si algo sale mal

1. **Más rápido — rollback de plataforma**: Vercel conserva cada
   deployment anterior; "Instant Rollback" permite promover un
   deployment previo a producción sin tocar Git ni esperar un build
   nuevo. Es la primera opción mientras se decide la causa raíz.
2. **A nivel de Git**: `git revert` del/de los commit(s) problemáticos
   sobre `develop` (nunca `reset --hard` sobre una rama compartida/
   desplegada) + push — dispara un nuevo deploy automático con el estado
   revertido.
3. Se etiqueta la reversión como una `PATCH` nueva (p. ej. si falló
   `v0.2.0`, la reversión es `v0.2.1`) con una entrada `Fixed` o nota en
   el changelog explicando qué se revirtió y por qué. **Nunca** se borra
   ni se mueve un tag ya publicado — es un puntero histórico, no un
   estado mutable.

### Qué "qué hay de nuevo" pasa a formar parte del proceso

A partir de esta decisión, decidir el contenido de la pequeña experiencia
"Qué hay de nuevo" (ver Commit 7 de la sesión que motiva este ADR) es un
paso más de "preparar la release" (punto 3 de arriba), no una tarea
aparte — se escribe a la vez que se redacta la entrada del changelog, de
la misma fuente de verdad.

## Alternativas descartadas

- **Rama `release/*` con periodo de estabilización** — mismo motivo que
  Git Flow completo en `ADR-0006`: coste sin beneficio real hoy.
- **CI/CD con gates automáticos (GitHub Actions, etc.)** — infraestructura
  que no existe y no se justifica todavía; las validaciones ya se
  ejecutan en local antes de cada commit/push, per CLAUDE.md.
- **Notas de "GitHub Releases" autogeneradas desde commits** — más
  rápido, pero peor calidad ("para humanos, no máquinas"); ya existe un
  hábito de changelog curado a mano en este proyecto, no hay motivo para
  sustituirlo por algo peor.

## Consecuencias

- El primer uso real de este proceso fue la release `v0.2.0`
  (2026-08-30) — ver el documento de sesión para el candidato original
  y `CHANGELOG.md` para el contenido final publicado.
- `CHANGELOG.md` deja de quedarse desactualizado entre releases: pasa a
  actualizarse en el mismo commit que introduce el cambio.
- Ninguna rama, entorno ni herramienta nueva — el proceso vive
  enteramente dentro del modelo que `ADR-0006` ya aprobó.

## Condiciones que reactivarían esta decisión

Si aparece un segundo desarrollador (necesitaría revisión de PR antes de
mergear a `develop`, hoy no aplica con un solo desarrollador), o si
`docs/ADR/0006-...md` activa `main`/`test` (el tag pasaría a marcar
`main`, ya previsto en ese mismo documento, sin cambiar nada de este
proceso más allá de qué rama se etiqueta).
