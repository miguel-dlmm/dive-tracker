# ADR 0024 (propuesta, no implementada) — Avisos de despliegue en DEVELOP para el ADMIN

**Fecha:** 2026-08-31
**Estado:** Propuesto — diseño e informe únicamente, pendiente de aprobación explícita antes de implementar (encargo explícito: "diseña #13 con informe").

## Contexto y problema

Hoy, cuando se fusiona un cambio a `develop` (el entorno TEST de facto),
nadie se entera salvo que abra la app y note algo distinto, o revise
Vercel a mano. El encargo pide que el superadmin ("ADMIN") se entere de
cada deploy nuevo: un slide al entrar a la app (mismo patrón que
`WhatsNew.jsx`, ya existente) + un email con el resumen y la URL de
preview.

## Diseño propuesto

### 1. Quién dispara el aviso, y cuándo

Un deploy a `develop` en sí mismo no lleva metadatos de "qué cambió en
términos de producto" — solo un hash de commit. Generar ese resumen a
partir de mensajes de commit en crudo sería poco fiable (mensajes
técnicos, no pensados para un admin no técnico). Se propone que el aviso
lo dispare **explícitamente Claude Code al final de una sesión de
trabajo** (como ahora mismo), no un webhook automático de Vercel — porque
ya soy quien redacta el resumen ejecutivo de cada sesión, y duplicar esa
redacción en un sistema separado sería la abstracción prematura que el
encargo pide evitar en otros puntos.

Concretamente: un nuevo endpoint interno (`/api/notify-deployment`, solo
invocable con el token de sesión del superadmin, igual que el resto de
`server/users/`) que recibe `{ summary, changes[], suggested_tests[],
preview_url }` y hace dos cosas:

1. Inserta una fila en una tabla nueva `deployment_notices` (ver esquema
   abajo).
2. Envía el email al ADMIN reutilizando `EmailService` — nuevo motivo
   `deployment_notice` en `activationEmailTemplate.js` (mismo patrón que
   `password_reset_request`/`external_signup`, layout distinto: sin CTA de
   "un solo uso", con lista de cambios y un botón "Ver preview").

### 2. Qué guarda la tabla nueva

```sql
create table if not exists deployment_notices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  summary text not null,
  changes jsonb not null default '[]',        -- array de strings
  suggested_tests jsonb not null default '[]', -- array de strings
  preview_url text not null,
  -- viewed_by: qué superadmins ya han visto este aviso (normalmente uno
  -- solo, pero no se asume — jsonb en vez de una tabla puente porque el
  -- volumen esperado es mínimo, un puñado de admins como mucho)
  viewed_by jsonb not null default '[]'
);

alter table deployment_notices enable row level security;
-- Lectura restringida a is_superadmin(), NO is_admin() — corrección
-- 2026-09-01. is_admin(uid) (ver schema.sql) devuelve true tanto para
-- is_admin como para is_superadmin ("is_admin OR is_superadmin"), así
-- que una policy de lectura con is_admin() dejaría a un admin normal
-- (no superadmin) leer deployment_notices directamente vía el cliente
-- de Supabase, aunque la UI nunca le muestre el slide — el encargo pide
-- "Solo ADMIN [superadmin] verá" y eso debe cumplirse en el servidor,
-- no solo en el cliente (mismo criterio que ya aplica ADR-0023 a
-- handleExternalRegister: nunca fiarse de que el cliente oculte algo).
create policy "superadmin read" on deployment_notices for select using (public.is_superadmin(auth.uid()));
create policy "superadmin write" on deployment_notices for all using (public.is_superadmin(auth.uid())) with check (public.is_superadmin(auth.uid()));
```

### 3. El slide en el cliente

Se reutiliza `WhatsNew.jsx` tal cual — ya es "una slide al cargar,
solo una vez por versión, con contenido editorial" (confirmar el
mecanismo exacto leyendo ese archivo antes de implementar, no asumido
aquí). La única pieza nueva es la fuente de datos: en vez de una
constante en código, lee la fila más reciente de `deployment_notices`
donde el `user_id` actual no esté en `viewed_by`, y marca visto al
cerrarlo (`viewed_by = viewed_by || [user_id]`).

Se muestra **solo si `profile.is_superadmin`** — nunca a un admin
normal ni a un usuario sin rol, tal como pide el encargo ("Solo ADMIN
verá").

### 4. Contenido del email

Reutiliza el layout de tabla+CSS-inline ya existente
(`activationEmailTemplate.js`), pero sin el CTA de "enlace de un solo
uso" — en su lugar: lista de cambios (`<ul>`), lista de pruebas
sugeridas, y un botón que abre `preview_url` directamente (no un enlace
de recovery de Supabase — es una URL pública de Vercel, no necesita
`generateActivationLink`).

**Destinatarios — corrección 2026-09-01, misma regla que la lectura y el
slide:** el email se envía a todas las cuentas con `is_superadmin = true`
(`select email from auth.users join public.profiles using (user_id)
where profiles.is_superadmin`), nunca a `is_admin` sin más — el diseño ya
anticipaba varios superadmins posibles (`viewed_by` es un array, no un
único id), así que el envío debe cubrir a todos ellos, no a uno fijo. Con
la instalación actual (un único superadmin) es una lista de un elemento,
pero el endpoint no debe asumirlo.

## Nivel de abstracción — deliberadamente mínimo

- Sin sistema de "tipos de notificación" genérico ni cola de eventos.
  Una tabla, un endpoint, un motivo de email nuevo — el mismo patrón que
  ya usa el resto de `server/email/`.
- Sin integración con GitHub/Vercel para generar el resumen
  automáticamente — un humano (o Claude Code al cerrar sesión) lo
  redacta, porque es lo único que hoy puede juzgar qué es relevante
  contarle a un admin no técnico.
- No dispara en cada commit — solo cuando se decide explícitamente que
  hay algo que avisar (mismo criterio que ya usa `WhatsNew.jsx` para
  decidir qué entra en sus slides).

## Por qué no se implementa esta noche

Es una tabla nueva (cambio de esquema) + un flujo de autenticación
interno nuevo — exactamente el tipo de decisión que este proyecto pide
mostrar antes de construir (regla 7 de `CLAUDE.md`). El diseño de arriba
está listo para implementar en cuanto se apruebe; el coste estimado es
bajo (reutiliza EmailService, WhatsNew.jsx y el patrón RLS ya
establecido) — S-M, un bloque de trabajo, no varios días.

## Alternativas descartadas

- **Webhook de Vercel → función serverless que genera el resumen del
  diff automáticamente.** Más "automático" pero el resumen sería técnico
  (nombres de archivo, no lenguaje de producto) — peor para un admin no
  técnico que el resumen redactado a mano que ya se entrega al final de
  cada sesión.
- **Notificación in-app únicamente, sin email.** Descartado: el encargo
  pide explícitamente ambos, y el admin no necesariamente tiene la app
  abierta cuando se despliega algo.
