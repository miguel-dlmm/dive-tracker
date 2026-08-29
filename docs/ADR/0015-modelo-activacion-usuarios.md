# ADR 0015 — Modelo de activación de usuarios: tri-estado y reactivación sin acceso instantáneo

**Fecha:** 2026-08-29
**Estado:** Aprobado e implementado (sesión larga autónoma, agente
"Usuarios" en paralelo con el rediseño de Home/Resumen — ver
`docs/SESSION-2026-08-28-rediseno-global.md`).

## Contexto

ADR-0014 sustituyó la tabla de Usuarios por lista + detalle, pero
mantuvo el modelo binario heredado: una cuenta era "Activa" o
"Desactivada" según `banned_until` (Supabase Auth), sin más matices. Eso
escondía un problema real: una cuenta recién creada (`createUser.js`
nunca fija contraseña) no está baneada, así que aparecía como "Activa"
aunque nadie hubiera completado el alta todavía — "Activa" no
significaba "puede entrar", solo "no está bloqueada".

Encargo explícito de esta sesión: distinguir de verdad "nunca activada /
pendiente de un enlace nuevo" de "activa de verdad", sustituir el
botón-pastilla de Activar/Desactivar por un switch, y añadir dos
acciones que faltaban por completo: regenerar el enlace de activación
(para una cuenta pendiente o recién desactivada) y regenerar la
contraseña de una cuenta (invalidar la actual sin que el superadmin
llegue a conocerla).

## Decisión

### 1. Estado tri-estado, derivado, no almacenado

`userStatus(active, activatedAt)` (`src/ConfigTab.jsx`) deriva un string
puro a partir de dos señales que ya existían, sin ninguna columna nueva:

- `active` = `!banned_until` en el futuro (ya expuesto por
  `server/users/listUserStatus.js`).
- `activatedAt` = `profiles.activated_at` (ya existía, puesto por
  `markAccountActivated()` en `useSession.js` al completar el primer
  acceso — hasta ahora sin ningún consumidor en Usuarios).

| `active` | `activated_at` | Estado |
|---|---|---|
| false | — | **Desactivado** |
| true | `null` | **Pendiente** |
| true | valor | **Activo** |

`activated_at` no lo devuelve `admin_list_profiles()` — se lee aparte
con una consulta directa (`supabase.from("profiles").select("user_id,
activated_at")`, permitida por la policy de RLS ya existente de
`profiles` para admins) y se cruza por `user_id` en el cliente. Evita
tocar `schema.sql`/la función RPC para este requisito.

### 2. Reactivar nunca concede acceso al instante

Antes, `/api/set-user-active` aceptaba `active: true` y simplemente
quitaba el baneo (`ban_duration: "none"`) — la cuenta volvía a poder
entrar con la contraseña que ya tuviera. Eso ya no es aceptable con el
tri-estado: una cuenta desactivada tenía una contraseña que el
superadmin no controla y que pudo haberse compartido. Reactivar debe
pasar siempre por un enlace de activación nuevo.

Cambios:

- **`/api/set-user-active` se estrecha a "solo desactivar".** Pedir
  `active: true` devuelve **400** señalando el endpoint correcto
  (`/api/regenerate-activation-link`) — cierra por completo la vía de
  reactivación instantánea, no la deja como código muerto alcanzable.
  Al desactivar, además de banear, limpia `profiles.activated_at` (best
  effort — un fallo aquí no impide que el baneo, la parte que de verdad
  bloquea el acceso, se aplique).
- **`/api/regenerate-activation-link`** (nuevo): quita el baneo si lo
  hay y genera un enlace de un solo uso (`auth.admin.generateLink`,
  tipo `recovery` — mismo mecanismo que el alta, nunca el
  `action_link` propio de `createUser()`, por los motivos ya
  documentados en `server/users/activationLink.js` sobre escáneres de
  vista previa de email). No toca `activated_at` — sigue en `null`
  hasta que la persona complete el enlace.
- **`/api/regenerate-password`** (nuevo): sobrescribe la contraseña
  actual con una aleatoria de 64 caracteres hex (`crypto.randomBytes`)
  que nunca se muestra, guarda ni transmite — su único propósito es
  invalidar la que hubiera. Quita el baneo si lo hay, limpia
  `activated_at` a `null` (fuerza pasar otra vez por "pendiente") y
  genera un enlace nuevo. Nunca repite la aceptación legal:
  `legal_consents` es una tabla independiente de `activated_at`, no se
  toca en ningún punto de este flujo.

Los tres endpoints comparten `generateActivationLink(email)`, extraído
a `server/users/activationLink.js` (antes vivía solo dentro de
`createUser.js`) — 3 consumidores reales ya justifican la extracción,
sin ser prematura.

### 3. El switch de Activar/Desactivar refleja "no baneado", no "activo del todo"

`BooleanToggle` (`src/ConfigTab.jsx`) sustituye el botón-pastilla
anterior. Su `checked` es literalmente "no está baneado" — cubre tanto
"Activo" como "Pendiente". Encenderlo desde "Desactivado" no muestra
"Activo" al instante: dispara el flujo de regenerar enlace (confirma,
genera, muestra el enlace en un panel para copiar/compartir) y el
`StatusBadge` de al lado sigue en "Pendiente" hasta que la persona
complete el proceso. No es una contradicción: un usuario no baneado
pendiente de activación sigue sin poder entrar — el switch refleja el
baneo, el badge matiza el resto. Apagarlo es una acción directa (pide
confirmación no-danger y desactiva de inmediato), reflejando la
asimetría real entre las dos direcciones.

### 4. Último login real, sin coste de esquema

`auth.users.last_sign_in_at` ya viene en la misma llamada a
`auth.admin.listUsers()` que `listUserStatus.js` ya hacía para calcular
`active` — se añade tal cual a la respuesta (`lastSignInAt`), sin
transformarlo ni derivarlo de ninguna otra tabla de actividad de la
app. Se muestra en el detalle como fecha+hora, o "Nunca" si es `null`.

### 5. Editar nombre/apellidos/nickname, sin endpoint nuevo

La policy de RLS de `profiles` (`"update own or admin updates any"`) ya
permite a un admin actualizar cualquier fila salvo `is_admin`/
`is_superadmin` (protegidos aparte por `protect_profile_roles_trigger`,
ver ADR-0014 y el propio trigger en `schema.sql`). Editar estos tres
campos desde `UserDetailSheet` es un `supabase.from("profiles")
.update(...)` directo desde el cliente, con `EditActions` (convención
#4 de `CLAUDE.md`) — no hace falta ningún endpoint de servidor.

## Alternativas descartadas

- **Guardar `activated_at` (o un booleano derivado) en la respuesta de
  `admin_list_profiles()`.** Habría evitado la consulta aparte, pero es
  un cambio de `schema.sql` (función SQL) para un dato que ya es
  legible por RLS desde el cliente sin tocar nada — desproporcionado
  para lo que resuelve.
- **Dejar que `/api/set-user-active` siguiera aceptando `active: true`**
  pero con una advertencia en el frontend de "vas a dar acceso
  instantáneo". Descartado: dejar la ruta insegura viva y confiar en
  que la UI la use bien es justo el tipo de superficie de ataque que el
  encargo pedía cerrar de raíz.
- **Endpoint único `/api/reactivate-user` con un parámetro que decida
  entre "solo enlace" o "enlace + contraseña nueva".** Se prefirieron
  dos endpoints separados (`regenerate-activation-link`,
  `regenerate-password`) porque son dos decisiones de negocio
  distintas con permisos y mensajes de error propios — un único
  endpoint con una rama interna habría sido más difícil de testear y de
  razonar sobre qué hace cada llamada.

## Consecuencias

- Una cuenta nueva o recién desactivada nunca vuelve a mostrarse como
  "Activa" sin que la persona haya completado un enlace de verdad.
- Ningún camino de la app puede ya dar acceso instantáneo a una cuenta
  desactivada — `/api/set-user-active` lo rechaza expresamente.
- `docs/BACKLOG.md` ya recogía (desde ADR-0014) la propuesta de
  `profiles.deactivated_at` para registrar CUÁNDO se desactivó una
  cuenta — sigue sin implementarse, es un campo distinto de
  `activated_at` (que sí se gestiona en esta sesión) y esta ADR no
  cambia esa decisión ni su prioridad.
- Tests: `server/users/regenerateActivationLink.test.js` (14),
  `server/users/regeneratePassword.test.js` (12), más los ajustes de
  `createUser.test.js`, `setUserActive.test.js` y
  `listUserStatus.test.js` — 137/137 en `server/`. Client:
  `src/ConfigTab.test.jsx` cubre tri-estado en lista/detalle,
  desactivar, regenerar enlace, regenerar contraseña y eliminar —
  13/13.
