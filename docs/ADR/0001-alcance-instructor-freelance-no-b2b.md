# ADR 0001 — Ocean Pulse optimiza para el instructor freelance, no para organizaciones

**Fecha:** 2026-08-27
**Estado:** Aprobado

## Contexto

El documento de revisión de producto "Ocean Pulse 2.0" (27/08) detectó que
el código ya implementa infraestructura propia de un SaaS multi-tenant:
autenticación completa, roles `is_admin`/`is_superadmin` con protección a
nivel de trigger, un directorio de usuarios administrable, y una función
`clone_setup_dataset` pensada para dar de alta cuentas nuevas con
configuración precargada. `CLAUDE.md` describía la app como "single-user,
sin auth todavía" — desactualizado frente al código real.

Esa infraestructura planteaba una pregunta abierta: ¿debe Ocean Pulse
empezar a diseñarse como una herramienta para centros de buceo con varios
instructores, equipos y permisos entre ellos?

## Problema evaluado

¿Debe Ocean Pulse empezar a diseñarse ya como una herramienta para centros
de buceo con varios instructores, equipos y permisos entre ellos —
aprovechando que la infraestructura de auth/roles ya existe — o debe
seguir optimizándose exclusivamente para el instructor freelance
individual?

## Decisión

**No.** Ocean Pulse se sigue diseñando y optimizando para **un instructor
freelance individual** como usuario del producto. La infraestructura de
auth/roles/aprovisionamiento existe y se mantiene porque el **operador**
del producto (una sola persona) la necesita para dar de alta cuentas de
instructores independientes — cada cuenta sigue siendo de un solo
instructor, sin usuarios compartidos, equipos ni jerarquías dentro de ella.

No se construye ahora:

- Gestión de varios instructores dentro de una misma cuenta.
- Roles/permisos entre usuarios de una organización.
- Cualquier concepto de "centro de buceo" como entidad con miembros.

Se mantiene abierta la posibilidad de revisitar esto en el futuro, pero
como una decisión de producto nueva y explícita (con su propio ADR), no
como una consecuencia automática de que ya existan roles en la base de
datos.

## Alternativas consideradas

- **A. Diseñar ya hacia B2B/organizaciones**, aprovechando que la base de
  auth/roles ya existe. Descartada: añade complejidad de permisos y de
  navegación (separar "mis ajustes" de "administración de la
  organización") para un caso de uso que no tiene todavía usuarios reales
  ni validación de negocio.
- **B. Quitar/ocultar la infraestructura de roles** por no encajar con
  "single-user". Descartada: el operador la usa hoy de verdad para dar de
  alta instructores; quitarla sería resolver una confusión de
  documentación rompiendo una función que funciona.
- **C. (elegida) Mantener la infraestructura tal cual, declarar
  explícitamente el alcance actual como instructor-freelance-first**, y
  actualizar `CLAUDE.md`/`docs/PRODUCT.md` para que dejen de describir un
  producto que no es el que se está construyendo.

## Consecuencias

### Positivas

- Mantiene la complejidad de navegación y de permisos al mínimo necesario
  para el usuario real de hoy — un instructor, una cuenta, sin conceptos
  de organización que aprender.
- El operador conserva la capacidad de dar de alta instructores sin
  ningún coste de desarrollo adicional — la infraestructura ya sirve para
  ese uso real.
- Evita construir permisos/jerarquías especulativas que podrían no
  encajar con la primera necesidad real de "varios instructores" cuando
  aparezca — mejor diseñarlo entonces, con un caso real delante, que
  adivinarlo ahora.

### Negativas (trade-offs aceptados conscientemente)

- Las secciones de administración (Usuarios, Experimental, datasets de
  configuración inicial) siguen conviviendo con la configuración propia
  del instructor en la misma navegación de `ConfigTab`, en vez de tener
  un espacio propio — aceptable mientras el único administrador sea el
  operador del producto, no necesariamente si empieza a haber varios.
- `CLAUDE.md` describía (antes de esta sesión) la app como "single-user,
  sin auth" — desalineado con el código real; esta decisión obliga a
  mantener la documentación de alcance al día, no solo el código.
- Si en el futuro sí hace falta multi-instructor, parte del trabajo de
  navegación/`ConfigTab` de hoy probablemente se rehaga en vez de
  extenderse — es un coste diferido, no evitado.

## Condiciones que justificarían revisar esta decisión

Revisar esta ADR si ocurre alguna de estas señales concretas — no basta
con "parece que podría hacer falta":

- Un centro de buceo (no un instructor individual) pide gestionar a más
  de un instructor bajo la misma cuenta, con catálogos propios
  compartidos o separados.
- El operador empieza a dar de alta cuentas de terceros de forma
  recurrente como modelo de negocio (no puntual, como hoy), y el volumen
  hace que la gestión manual actual (alta a mano, datasets iniciales)
  deje de ser viable.
- Dos usuarios necesitan ver o editar los mismos datos (misma escuela,
  mismas tarifas) sin ser la misma persona.

Ninguna de estas condiciones se cumple a fecha de este documento.

## Consecuencias sobre la documentación

- `docs/PRODUCT.md` recoge esta decisión como la definición de usuario
  objetivo y alcance.
- Cualquier propuesta futura de funcionalidad multi-instructor/equipo debe
  justificarse con necesidad real de negocio, no con "ya tenemos la
  infraestructura", y debe registrarse como un ADR nuevo que referencie
  este documento.
