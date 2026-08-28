# ADR 0010 — Proceso mínimo viable de release: crear → validar → desplegar

**Fecha:** 2026-08-29
**Estado:** Aprobado (proceso). La primera aplicación real de este proceso
(la propia release que motiva este documento) queda **preparada, no
ejecutada** — ver `docs/SESSION-2026-08-28-rediseno-global.md` para el
candidato concreto y los comandos pendientes de aprobación explícita.

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

1. Fusionar cada `feature/*`/`fix/*` ya lista a `develop` (flujo normal
   de `ADR-0006`, sin cambios).
2. Sobre `develop` actualizada: `npm run test && npm run build` (y
   `npm run mobile-check` si hubo cambios de UI — CLAUDE.md, regla 8).
3. Mover el contenido de `## Unreleased` de `CHANGELOG.md` a
   `## [X.Y.Z] - YYYY-MM-DD`, con `X.Y.Z` decidido según la tabla de
   arriba.
4. Commit de ese cambio de changelog (`chore: preparar release vX.Y.Z`,
   mismo patrón que `daab817` en el historial actual).
5. `git tag -a vX.Y.Z -m "vX.Y.Z"` sobre ese commit exacto de `develop`.
6. `git push origin develop --tags`.
7. `gh release create vX.Y.Z --notes-file <extracto del CHANGELOG>` —
   espejo en GitHub del mismo texto, no notas autogeneradas.
8. **Despliegue**: ninguna acción manual — Vercel ya despliega
   automáticamente cualquier push a `develop` (Production Branch hoy).
   El tag marca qué commit corresponde a qué versión desplegada, no
   dispara el despliegue por sí mismo.

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

- El primer uso real de este proceso es la propia release pendiente de
  esta sesión — ver el documento de sesión para el candidato concreto
  (versión propuesta, contenido de changelog, comandos exactos) a la
  espera de aprobación explícita antes de ejecutar el paso 1 (mergear a
  `develop`) en adelante.
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
