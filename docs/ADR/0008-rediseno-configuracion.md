# ADR 0008 — Rediseño de Configuración: menú agrupado y creación vía FAB+hoja

**Fecha:** 2026-08-29
**Estado:** Aprobado e implementado (sesión nocturna autónoma, ver
`docs/SESSION-2026-08-28-rediseno-global.md` para el contexto completo de
esa sesión).

## Contexto

Configuración había crecido orgánicamente a 9 secciones (Escuelas,
Actividades, Tarifas, Tipos de pago, Estados de pago, Monedas, Colores de
navegación, Ajustes, Usuarios) mostradas como una única fila de pestañas
horizontales. Dos problemas reales, no hipotéticos:

1. **No cabía en móvil.** 9 pestañas en una fila `flex-wrap` sobre una
   pantalla de ~390px de ancho, sin ningún criterio de agrupación —
   escaneable con dificultad, y sin espacio natural para separar lo que
   ve cualquier usuario de lo que solo ve un admin.
2. **Crear un registro rompía la convención del resto de la app.**
   `CrudTable` (Escuelas, Actividades, Tipos de pago, Estados de pago,
   Monedas) mostraba un formulario fijo siempre visible encima de la
   lista — la única pantalla que no seguía el patrón "FAB + hoja
   inferior" que CLAUDE.md fija como convención #3 desde Mi trabajo,
   Tarifas y MovementSheet.

Además, el producto contempla un futuro sistema de widgets configurables
para Home/Resumen (sin implementarse todavía) que en algún momento
necesitará su propio hueco en Configuración.

## Decisión

### 1. Menú agrupado con drill-down, en vez de pestañas horizontales

Configuración pasa a mostrar una lista de filas (icono + nombre +
descripción corta + chevron), agrupada en dos bloques:

- **Sin título de grupo** (siempre visible): Escuelas, Cursos, Tarifas —
  lo que cualquier usuario necesita mantener para operar.
- **"Administración"** (solo si `is_admin || is_superadmin`): Tipos de
  pago, Estados de pago, Monedas, Colores de navegación, Ajustes
  generales, Usuarios.

Tocar una fila entra en esa sección con un enlace "‹ Configuración"
propio, que vuelve al menú. Este back-navigation es **independiente** del
"✕ Cerrar" de la cabecera exterior (ver `App.jsx`, patrón ya establecido
para Ayuda/Configuración como accesos secundarios): "‹ Configuración"
vuelve al menú interno sin salir de la pantalla; "✕ Cerrar" sale de
Configuración entera hacia la pestaña de origen, desde cualquier nivel.

**Alternativas descartadas:**
- *Pestañas horizontales con scroll* — resuelve el desbordamiento pero no
  la agrupación por rol, y el scroll horizontal está explícitamente
  desaconsejado en CLAUDE.md ("Nunca scroll lateral").
- *Acordeón (expandir/colapsar en la misma página)* — con Tarifas y
  Usuarios siendo subpantallas con bastante contenido propio (filtros,
  búsqueda, tabla), un acordeón habría acabado pareciendo una página
  larga con secciones que se estorban entre sí en vez de un menú limpio.

**Por qué este patrón y no uno propio:** un menú de ajustes agrupado con
drill-down es el patrón estándar de Configuración/Ajustes en iOS y
Android — no una invención de esta sesión. Reduce la carga cognitiva
(el usuario ya conoce el patrón de cualquier app del sistema) y dejó
listo, sin coste adicional, un lugar natural para un futuro grupo
"Personalización" (widgets de Home/Resumen, ver `docs/BACKLOG.md`): se
añadirá como una fila más el día que ese sistema exista, sin rediseñar
esta pantalla otra vez.

### 2. `CrudTable` crea vía FAB + hoja inferior

Se elimina el formulario fijo siempre visible; crear ahora es: botón "+"
flotante (`fixed bottom-24 right-4`, mismo lugar que en Mi trabajo/Tarifas)
que abre una hoja inferior con los mismos campos, un "Guardar" de ancho
completo en el acento de marca (`TEAL`). Afecta a Escuelas, Cursos, Tipos
de pago, Estados de pago y Monedas (las 5 tablas que usan `CrudTable`) de
una sola vez, al ser un componente compartido — no se rediseñó cada
sección por separado. Editar (`EditActions` en línea) y eliminar
(`DeleteButton`) no cambian, ya seguían la convención.

Tarifas (`RatesTab.jsx`) ya usaba este patrón desde antes; se le añadió
además el mismo "Filtrar" colapsable con contador de Mi trabajo (antes
los 3 filtros estaban siempre visibles) — coherencia con la pantalla más
parecida a esta en el resto de la app, no una decisión nueva de diseño.

### 3. "Actividades" se muestra como "Cursos" (fase 1 del rename)

Solo texto de interfaz visible al usuario (label del menú, `CrudTable`,
campos de filtro/formulario en Tarifas y en el detalle del calendario de
Home) — variables, props y nombres de componentes internos
(`activities`, `activityColor`, `ACTIVITIES`...) no se tocan, siguiendo
el plan de 3 fases ya registrado en `docs/BACKLOG.md`. La fase 1 queda
completada en las pantallas tocadas por este ADR (Configuración, Tarifas,
Home); "Por actividad" en Resumen queda pendiente para cuando se rediseñe
esa pantalla (evita tocar el mismo archivo dos veces en una sesión por
motivos distintos).

### 4. Usuarios: eliminar cuenta (implementado); desactivar cuenta (implementado el 2026-08-29, ver addendum)

**Eliminar** (`server/users/deleteUser.js` + `api/delete-user.js` +
`netlify/functions/delete-user.js`, mismo patrón que `create-user`/
`update-admin-status`): exclusivo de superadmin, no permite eliminarse a
sí mismo ni a otro superadmin, confirmación mediante `ConfirmDialog` en
modo `danger`. Usa `auth.admin.deleteUser()` de Supabase — el `on delete
cascade` de `profiles.user_id → auth.users(id)` ya definido en
`schema.sql` se encarga de borrar el perfil y todo lo que cuelga de él.
No requiere ningún cambio de esquema.

**Desactivar** (revocar acceso conservando los datos) **no se ha
implementado esta sesión.** La opción de menor riesgo real —usar el
`banned_until` ya existente de Supabase Auth vía
`auth.admin.updateUserById(id, { ban_duration })`, sin añadir ninguna
columna nueva— seguiría necesitando exponer ese estado a través de
`admin_list_profiles()` (la función RPC de solo lectura que alimenta el
directorio) para poder distinguir visualmente una cuenta desactivada en
la lista. Modificar esa función es un cambio de superficie de
autenticación/permisos, y CLAUDE.md fija sin excepciones: *"Never
implement authentication, permissions or schema changes in a single
step... Always propose a migration plan first."* Esta regla no queda
suspendida por el modo de trabajo autónomo de la sesión (que solo exime
de consultar decisiones normales de UI/UX) — así que se documenta aquí
como propuesta concreta a aprobar, no se implementa a ciegas:

1. Extender `admin_list_profiles()` para devolver también si la cuenta
   está baneada (derivado de `auth.users.banned_until`), sin añadir
   ninguna tabla ni columna nueva.
2. Nuevo endpoint `server/users/setUserActive.js` (mismo patrón que
   `deleteUser.js`/`updateAdminStatus.js`): superadmin, no sobre uno
   mismo ni sobre otro superadmin, llama a
   `auth.admin.updateUserById(id, { ban_duration: "876000h" })` para
   desactivar y a `ban_duration: "none"` para reactivar.
3. UI: en `UsersTable`, un control claramente distinto del de eliminar
   (p. ej. un toggle o badge de estado "Activa/Desactivada", nunca un
   segundo icono de papelera) — para que "eliminar" (irreversible, borra
   datos) y "desactivar" (reversible, conserva todo) no se puedan
   confundir al pulsar.

## Consecuencias

- Un usuario nuevo o poco frecuente reconoce el patrón de navegación
  (menú de Ajustes de plataforma) sin tener que aprenderlo de cero.
- Añadir una sección futura (p. ej. "Personalización" para widgets) es
  una fila más en `BUSINESS_SECTIONS`/`ADMIN_SECTIONS`, no un rediseño.
- `CrudTable` queda alineado con el resto de la app; cualquier mejora
  futura al patrón de creación (p. ej. validación en línea) se hace una
  vez y beneficia a las 5 tablas que lo usan.
- Queda una funcionalidad explícitamente pedida ("desactivar usuario")
  sin implementar, con un plan de migración concreto a la espera de
  aprobación — no se ha simulado ni ocultado, se deja registrado aquí y
  en `docs/BACKLOG.md`.

## Addendum (2026-08-29) — "Desactivar usuario" implementado sin el cambio de esquema previsto

El usuario aprobó explícitamente implementar "Desactivar" en la sesión
siguiente. Revisando el plan de tres pasos de arriba antes de ejecutarlo,
se encontró una vía que **no necesita ningún cambio de esquema en
absoluto** — mejor que la propuesta original, no solo una alternativa:

`auth.admin.listUsers()` (el mismo Admin API de Supabase que ya usan
`createUser.js`/`deleteUser.js`) devuelve `banned_until` directamente
desde Supabase Auth, sin pasar por ninguna función SQL propia. No hacía
falta extender `admin_list_profiles()` — bastaba con un endpoint de
solo lectura nuevo (`server/users/listUserStatus.js`) que llama a
`listUsers()` una vez y devuelve `{ [user_id]: activo }` para todo el
directorio. Verificado además en vivo (baneo + desbaneo de una cuenta de
prueba desechable, revertido de inmediato) que `ban_duration: "876000h"`
/ `"none"` funciona exactamente como se esperaba, sin tocar ninguna
tabla de datos.

Implementado tal cual el resto del plan:
- `server/users/setUserActive.js` (+ adaptadores Vercel/Netlify) —
  superadmin, no sobre uno mismo ni sobre otro superadmin, mismo patrón
  que `deleteUser.js`.
- `UsersTable`: columna "Estado" con un badge Activa/Desactivada — botón
  interactivo (con confirmación no-`danger`, reversible) para superadmin,
  badge de solo lectura para el resto de admins. Visualmente distinto
  del icono de papelera de "Eliminar", tal como pedía el plan original.

Este addendum sustituye el punto 1 del plan original (extender
`admin_list_profiles()`) — los puntos 2 y 3 se ejecutaron sin cambios.
`docs/BACKLOG.md` cierra el ítem "Implementar Desactivar usuario".

### Efecto colateral encontrado y corregido: `/api/*` no funcionaba bajo `vite dev`

Validando este flujo se confirmó el reporte "no puedo eliminar
usuarios: me da error" — causa raíz: bajo `vite dev` puro (sin runtime
de Vercel/Netlify) cualquier `fetch("/api/...")` devuelve 404, así que
`create-user`, `update-admin-status` y `delete-user` nunca funcionaron
en local, solo en el sitio desplegado. Corregido con un tercer
adaptador, `localApiRoutes()` en `vite.config.js` (activo solo bajo
`configureServer`, nunca en `vite build`), que monta los mismos
handlers de `server/users/*.js` para el propio servidor de desarrollo.
No es un bug de ninguno de los endpoints — los cinco (`create-user`,
`update-admin-status`, `delete-user`, `set-user-active`,
`list-user-status`) ya estaban bien, les faltaba una vía de acceso
local.
