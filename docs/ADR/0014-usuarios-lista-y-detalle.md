# ADR 0014 — Usuarios: lista + hoja de detalle en vez de tabla con scroll lateral

**Fecha:** 2026-08-29
**Estado:** Aprobado e implementado (sesión larga autónoma, ver
`docs/SESSION-2026-08-28-rediseno-global.md`).

## Contexto

Encargo explícito: la pantalla de gestión de usuarios seguía siendo una
`<table>` de 9 columnas (Nombre, Apellidos, Nickname, Email, Admin,
Superadmin, Estado, Alta, Eliminar) con scroll lateral en móvil — "muy
poco móvil". Pedido explícitamente un rediseño con el mismo criterio ya
consolidado en el resto de la app: lista clara arriba, detalle aparte,
acciones en el lugar correcto.

## Decisión

**Lista** (`UserListRow`): solo lo mínimo para reconocer y localizar a
alguien de un vistazo — nickname (identificador), un `StatusBadge` de
solo lectura (Activa/Desactivada), nombre completo o email como
subtítulo, y la fecha de alta. Tocar la fila abre el detalle. Ninguna
acción vive ya en la fila misma.

**Detalle** (`UserDetailSheet`): la misma hoja inferior que usa el resto
de la app para crear/editar (ver ADR-0013), abierta al tocar una fila en
vez de al pulsar un botón de creación — aquí muestra información
completa (nombre, email, alta) y la gestión completa (Estado con toggle,
Admin con checkbox editable, Superadmin de solo lectura, y "Eliminar
usuario" al final). `editable` sigue el mismo criterio que ya tenía la
tabla: solo superadmin, nunca sobre la propia cuenta ni sobre otro
superadmin.

Eliminar desde el detalle cierra la hoja automáticamente al confirmar
(la cuenta ya no existe, no hay nada que seguir mostrando); activar/
desactivar y cambiar el rol de Admin la dejan abierta, mostrando el
estado ya actualizado tras el `reload()` — `openUserId` (no un snapshot
del usuario) se resuelve contra `rows` en cada render, así el detalle
nunca se queda con datos obsoletos.

## "Fecha de baja" — pedida explícitamente, NO implementada todavía

El encargo pedía ver también la fecha de baja en la lista. No existe
hoy ninguna columna que la registre: `auth.users.banned_until`
(Supabase Auth, usado para "activo/desactivado") guarda **cuándo
terminaría** el baneo (una fecha ~100 años en el futuro para una
desactivación "permanente"), no cuándo empezó — no sirve para
derivarla.

Añadirla requeriría una migración real: una columna nueva
(`profiles.deactivated_at timestamptz`, escrita por
`server/users/setUserActive.js` al desactivar, limpiada al reactivar).
Las reglas de este proyecto piden proponer un plan de migración antes
de tocar el esquema, no implementarlo de paso dentro de un rediseño de
UI — así que esta pieza concreta queda **propuesta, no implementada**,
y se traslada a `docs/BACKLOG.md` para decidirse aparte con el usuario.

## Alternativas descartadas

- **Tabla responsive con columnas ocultas en móvil (`hidden md:table-cell`)**
  — habría resuelto el scroll lateral sin cambiar de patrón, pero
  mantiene dos experiencias distintas de la misma pantalla (compacta en
  móvil, tabla completa en escritorio) y no acerca Usuarios al resto de
  la app, que es justamente el objetivo del encargo ("que aprender una
  parte de la app facilite usar las demás").
- **Acciones inline en la fila con `RowMenu`** (el patrón de Mi trabajo/
  Tarifas/catálogos) — válido para acciones simples de una fila, pero
  aquí hay bastante más que mostrar por usuario (nombre, email, alta,
  3 controles de rol/estado) para caber cómodo en una fila de lista;
  un detalle aparte encaja mejor con la cantidad de información real.

## Consecuencias

- Cero scroll lateral en Usuarios, en cualquier ancho de pantalla.
- Mismo modelo mental que Escuelas/Cursos/Tarifas/Mi trabajo: lista con
  lo esencial, hoja inferior para todo lo demás.
- `docs/BACKLOG.md` gana la propuesta de "fecha de baja"
  (`profiles.deactivated_at`) como migración pendiente de decidir.
