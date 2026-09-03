# Release V1 — progreso por fases

> Documento vivo de seguimiento de la iniciativa **"Release V1"**
> (preparar Ocean Flow para hacerlo público fuera de usuarios de test),
> iniciada 2026-09-01 con un documento maestro de 9 fases (0-8) pegado
> por el usuario. Es el mecanismo elegido para el protocolo de trabajo
> por lotes que pide la Fase 0, apartado 0.2 del documento maestro (ver
> también `CLAUDE.md`, sección "Reglas de trabajo obligatorias" → "9.
> Trabajo por fases en iniciativas largas").
>
> **Cómo se usa:** al cerrar (o compactar/cortar) cada fase, se actualiza
> la sección de esa fase con lo hecho, las decisiones tomadas y su
> porqué, lo descartado, los riesgos y el punto exacto por el que se
> iba. Una sesión nueva, sin nada del contexto de la anterior, debe
> poder leer solo este documento y seguir exactamente donde se quedó la
> fase anterior. Las decisiones de arquitectura/producto con impacto
> futuro real siguen yendo, además, a su propio ADR en `docs/ADR/` o a
> `docs/PRODUCT.md`/`docs/BACKLOG.md` (regla 7 de `CLAUDE.md`) — este
> documento enlaza a esos, no los sustituye.

## Estado general

| Fase | Título | Estado |
|---|---|---|
| 0 | Contexto, reglas permanentes y protocolo | ✅ Hecho (2026-09-01) |
| 0.5 | Análisis de riesgos y decisiones (lote nocturno) | ✅ Hecho (2026-09-01, noche) |
| 1 | Rama y saneamiento | ✅ Hecho (2026-09-01, noche) |
| 2 | Multidioma | ✅ Hecho (2026-09-01, noche) |
| 3 | KPIs en la home | ✅ Hecho (2026-09-01, noche) |
| 4 | Cabecera y notificaciones | ✅ Hecho (2026-09-01/02, noche) |
| 5 | Sistema de Training Records | 🟡 En curso — pestaña única, fechas por plantilla, firma de instructor, validación y ajustes visuales del PDF construidos y verificados; rediseño completo del generador y 2 correcciones reales de Safari iOS ya aplicadas (ver detalle); quedan 2 supuestos de fecha por confirmar y las 6 plantillas sin campos |
| 6 | Slides y avisos | 🟡 En curso — avisos generalizados, WhatsNew sin tocar (ver detalle) |
| 7 | Usabilidad, carga y escalabilidad | ✅ Hecho (2026-09-02, análisis documental, sin cambios de código) |
| 8 | Revisión visual y libro de estilo | ✅ Hecho (2026-09-02, `docs/ESTILO.md` actualizado, sin pulido pixel-a-pixel) |
| 9 | Cierre de Release V1 y despliegue a PRO | 🟡 En curso (2026-09-03/04) — auditoría de lint hecha y fusionada a `develop`; plan de despliegue a PRO diseñado y aprobado en sus decisiones clave, **nada ejecutado todavía** — ver detalle |

> Ver sección "Análisis de riesgos y decisiones previas al trabajo
> nocturno" más abajo para el detalle completo de cada fase (riesgo,
> decisión, migración+rollback cuando aplica) antes de tocar el "Fase 0"
> original.

---

## Análisis de riesgos y decisiones previas al trabajo nocturno (2026-09-01, noche)

> El usuario pidió, antes de irse a dormir, que se resolvieran por
> adelantado TODAS las dudas bloqueantes de las 8 fases, para poder
> trabajar el resto de la noche sin interrupciones. Esta sección es ese
> análisis + las decisiones ya cerradas con él. A partir de aquí, cada
> fase se ejecuta sin pedir aprobación adicional salvo bloqueo genuino
> (imposible de decidir con lo ya acordado aquí).

### Nivel de autonomía acordado para esta iniciativa

- **Frontend/UI (Fases 3, 4-parte visual, 7, 8):** autónomo, sin pausas.
- **Endpoints de servidor nuevos:** autónomo (incluye los que necesite el
  generador de Training Records) — priorizando siempre reutilizar y
  componentizar sobre `server/` ya existente antes de escribir algo desde
  cero.
- **Cambios de esquema/BD:** permitidos esta noche, con condición
  explícita del usuario: **siempre contra TEST únicamente** (nunca
  producción — el propio script `scripts/apply-migration.mjs` ya lo
  garantiza estructuralmente: exige `SUPABASE_TEST_DB_URL` y `.env.local`
  no contiene ninguna URL de conexión Postgres directa a producción, solo
  `PROD_SUPABASE_URL`/`PROD_SUPABASE_SERVICE_ROLE_KEY` de solo lectura vía
  API, no de escritura DDL), **documentando y persistiendo el rollback
  antes de ejecutar cada migración**, y **justificando la decisión en la
  documentación** (instrucciones explícitas del usuario, mid-sesión).
- **Rama:** renombrar `nightjob-2026.08.31` → `Release-V1` (aprobado).
  Push de esa rama a `origin` es seguro y ya está contemplado por
  `CLAUDE.md` ("Ramas y entornos": empujar una rama sin fusionarla genera
  un Preview Deployment en Vercel con variables TEST) — se usa esta noche
  para dejar el trabajo visible y para poder disparar el aviso de
  despliegue (ver Fase 6) como mecanismo de notificación al admin en vez
  de interrumpir por chat.
- **Fusión a `develop`/`main`:** NO se hace esta noche sin revisión
  explícita — queda para que el usuario la revise y apruebe mañana.

### Fase 1 — Rama y saneamiento

**Riesgo:** bajo. Renombrar rama es reversible (`git branch -m` de
vuelta). Limpiar Ayuda y añadir confirmación `CANCELAR` son cambios
locales de UI, cubiertos por tests existentes.
**Decisión cerrada:** renombrar `nightjob-2026.08.31` → `Release-V1`
(sin espacio, por compatibilidad con Vercel/tooling que no siempre
soporta espacios en nombres de rama en URLs/env vars) tanto local como
en `origin`. No se toca el modelo `main`/`develop` de ADR-0006: esta
sigue siendo una rama de trabajo larga hacia el lanzamiento, no un
tercer entorno.

### Fase 2 — Multidioma

**Riesgo:** medio — alcance grande (toda la app), riesgo real es dejar
texto sin traducir o romper interpolaciones dentro de un string
traducido. Mitigación: extracción sistemática archivo a archivo,
`npm run test`/`npm run build` como red de seguridad tras cada bloque de
pantallas.
**Decisión cerrada:** traducir **toda la app** esta noche (Home, Mi
trabajo, Comisiones, Compañeros, Tarifas, Pagos, Configuración, Resumen,
Ayuda, textos de emails, textos legales) — el usuario prefiere revisar
sobre la marcha usando la app a que quede nada sin traducir por defecto.
**Migración aprobada — `0007-idioma-perfil.sql`:**

```sql
-- Aditiva: nueva columna con default 'es' (regla del documento maestro:
-- español por defecto), check limita a los 2 idiomas soportados hoy.
alter table public.profiles
  add column if not exists language text not null default 'es'
  check (language in ('es','en'));
comment on column public.profiles.language is 'Idioma preferido de la interfaz (es/en) — Release V1 Fase 2.';
```

**Rollback documentado (antes de aplicar):**

```sql
alter table public.profiles drop column if exists language;
```

**Justificación:** columna en `profiles` (no `localStorage`) porque el
encargo pide fijar el idioma en el perfil, en el registro y en el alta
de usuario por admin — necesita sincronizarse entre dispositivos del
mismo usuario, cosa que `localStorage` no da (mismo razonamiento que ya
usa el proyecto para diferenciar qué va en `localStorage`, ADR-0007,
frente a qué va en BD). Librería: `react-i18next` — estándar de facto en
el ecosistema React para este problema exacto (coherente con la regla
fijada de "estándares primero, no inventar método propio").

### Fase 3 — KPIs en la home

**Riesgo:** bajo. Solo lectura de datos ya cargados por los hooks
existentes (`useSupabaseTable`), cálculo en cliente — sin coste de
servidor añadido a los volúmenes actuales de datos de un instructor
freelance. Construir sobre `motion.js` ya existente, no añadir librería
de animación nueva.

### Fase 4 — Cabecera y notificaciones

**Riesgo:** bajo en la parte de cabecera (solo reorganización visual).
**Decisión de alcance:** no se construye un centro de notificaciones
persistente (icono de campana + bandeja) porque no se pidió
explícitamente y añadiría esquema/complejidad no solicitados — Fase 4
se limita a rediseñar la cabecera (menos iconos sueltos) y a mejorar
visualmente los popups de avisos que ya existen (`WhatsNew.jsx` /
`DeploymentNotice.jsx`), cuyo mecanismo de datos se generaliza en Fase 6.

### Fase 5 — Sistema de generación de Training Records

**Riesgo:** medio-alto por tamaño (subsistema nuevo completo), bajo por
diseño: nada de datos de alumnos/firmas se persiste (tal como pide el
encargo), así que no hay riesgo de fuga de datos sensibles en BD.
**Decisión de arquitectura:** generación de PDF **enteramente en
cliente** (`pdf-lib` para rellenar los campos del PDF, `pdfjs-dist` para
componer el JPG de páginas concatenadas) — no hace falta ningún
endpoint de servidor para la generación en sí, solo para servir la
lista de plantillas activas (ya cubierto por RLS directo a la tabla, sin
endpoint custom). Coherente con "reutilizar antes que construir": evita
transmitir firmas/datos de alumnos a un servidor que no los necesita.
Rama aparte según pide el encargo: `feature/training-records`, creada
desde `Release-V1`.
**Migración aprobada — `0008-training-record-templates.sql`:**

```sql
create table if not exists public.training_record_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  storage_path text not null,
  optional_dives jsonb not null default '[]',
  status text not null default 'pending_validation' check (status in ('pending_validation','active','rejected')),
  missing_fields jsonb not null default '[]',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.training_record_templates enable row level security;
create policy "read active templates" on public.training_record_templates
  for select using (status = 'active' or public.is_admin(auth.uid()));
create policy "admin write templates" on public.training_record_templates
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public) values ('training-record-templates', 'training-record-templates', false)
  on conflict (id) do nothing;
create policy "read template files" on storage.objects
  for select using (bucket_id = 'training-record-templates' and auth.uid() is not null);
create policy "admin manage template files" on storage.objects
  for all using (bucket_id = 'training-record-templates' and public.is_admin(auth.uid()))
  with check (bucket_id = 'training-record-templates' and public.is_admin(auth.uid()));
```

**Rollback documentado (antes de aplicar):**

```sql
drop policy if exists "admin manage template files" on storage.objects;
drop policy if exists "read template files" on storage.objects;
delete from storage.objects where bucket_id = 'training-record-templates';
delete from storage.buckets where id = 'training-record-templates';
drop policy if exists "admin write templates" on public.training_record_templates;
drop policy if exists "read active templates" on public.training_record_templates;
drop table if exists public.training_record_templates;
```

**Justificación:** tabla + bucket en vez de guardar los PDF en el propio
repo — el encargo ya anticipa que el admin subirá plantillas nuevas
desde la app en el futuro, así que el almacenamiento tiene que ser
gestionable en runtime, no solo en build time. El pipeline de
análisis/validación de campos (que bloquea activar una plantilla si
faltan campos) se deja explícitamente para cuando la interfaz de
generación esté terminada — así lo pide el propio encargo ("se hará una
vez esté completamente terminada la interfaz"). Esta noche, las 10
plantillas ya presentes en la raíz del repo se cargan directamente con
`status = 'active'` (semilla manual, no pasan por el pipeline todavía).

### Fase 6 — Slides y avisos

**Riesgo:** medio — cambia el comportamiento de un sistema que ya
funciona en producción-adyacente (`DeploymentNotice.jsx`, ADR-0024, ya
implementado pese a que el ADR sigue etiquetado "Propuesto" — se corrige
el estado del ADR en esta misma fase).
**Decisión cerrada con el usuario:** existen dos tipos de aviso
distintos sobre el mismo mecanismo de "visto una vez" — (a) **release**:
novedades para todos los usuarios, (b) **admin**: el resumen formateado
de sesión, solo para superadmin (comportamiento actual de
`DeploymentNotice`, sin cambios de audiencia). Se comportan igual
(gate por fila no vista en `deployment_notice_views`), solo cambia a
quién llegan.
**Decisión de arquitectura:** se generaliza `deployment_notices`
(columna `audience`) en vez de crear una tabla paralela — mínimo diff,
reutiliza RLS/policies/tests ya existentes. Sustituye también el gate de
`WhatsNew.jsx` (hoy por versión en `localStorage`) por este mismo
mecanismo basado en BD, porque el encargo pide comportamientos
(usuarios creados después del deploy nunca lo ven; usuarios que inician
sesión después del deploy lo ven tras el login y vuelven a home) que
requieren comparar `created_at` del aviso con la fecha de alta del
usuario — imposible de garantizar solo con `localStorage`.
**Migración aprobada — `0010-avisos-generalizados.sql`** (renumerada de
0009 a 0010 al ejecutarla: 0009 ya se usó esta misma noche para
`invitation_links`, ver "Cola de tareas adicionales" — 0008 vive en
`feature/training-records`, sin fusionar todavía):

```sql
alter table public.deployment_notices
  add column if not exists audience text not null default 'superadmin' check (audience in ('all','superadmin'));

drop policy if exists "superadmin read" on public.deployment_notices;
create policy "read own audience" on public.deployment_notices
  for select using (
    (audience = 'superadmin' and public.is_superadmin(auth.uid()))
    or (audience = 'all' and auth.uid() is not null)
  );
-- La policy de escritura no cambia: sigue restringida a superadmin.
```

**Rollback documentado (antes de aplicar):**

```sql
drop policy if exists "read own audience" on public.deployment_notices;
create policy "superadmin read" on public.deployment_notices for select using (public.is_superadmin(auth.uid()));
alter table public.deployment_notices drop column if exists audience;
```

### Fase 7 — Usabilidad, carga y escalabilidad

**Riesgo:** bajo, salvo un punto: "simular carga" contra infraestructura
real tiene coste/cuota compartida.
**Decisión tomada (sin preguntar, bajo riesgo, documentada):** no se
ejecutan pruebas de carga reales contra Supabase TEST esta noche. El
análisis de escalabilidad se hace de forma teórica/documental (límites
publicados del plan actual de Supabase/Vercel vs. patrones de consulta
reales del código), con la propuesta de acciones concretas que pide el
encargo. Si el usuario quiere pruebas de carga reales, es una decisión
aparte que tomar mañana.

### Nota — dominio de Resend y bug real encontrado (email transaccional, ADR-0021)

**Estado del dominio:** comprobado 2026-09-01 noche vía
`scripts/check-resend-domain.local.mjs` — `oceanflow.money`, **verified**,
envío habilitado.

**Bug real encontrado en vivo:** el usuario probó el registro externo
contra TEST mientras se escribía este informe y reportó un 400 en
consola + una cuenta creada sin email de activación. Investigado a
fondo (ver ADR-0021, addendum 2026-09-01): **causa raíz confirmada**,
`EMAIL_FROM` seguía apuntando al remitente de pruebas de Resend
(`onboarding@resend.dev`), que solo entrega al titular de la cuenta
Resend — cualquier alta con otro email fallaba el envío en silencio
(la cuenta SÍ se crea, `best-effort` por diseño, pero el email nunca
llega y no se muestra ningún error real al usuario más allá del toast
genérico "no se pudo enviar"). El 400 de consola resultó ser de un
intento anterior (nickname/validación), un evento distinto — no la
misma causa que el email no enviado.

**Corregido esta noche:**
- `EMAIL_FROM` → `Ocean Flow <no-reply@oceanflow.money>` en
  `.env.local` (verificado con un envío de prueba real, 200 OK).
- Reenviado con éxito el email de activación pendiente a la cuenta de
  prueba afectada (`mi.gueldlmm@gmail.com`, nickname `mmm`) usando el
  código real de `generateActivationLink`/`sendActivationEmail` — ya no
  está bloqueada.
- `docs/ADR/0021-servicio-de-email-transaccional.md` actualizado con el
  addendum completo.

**✅ Corregido también en Vercel TEST (`dive-tracker`), con permiso
explícito del usuario en el momento:**
- `EMAIL_FROM` actualizado a `Ocean Flow <no-reply@oceanflow.money>` en
  los entornos Production y Preview del proyecto `dive-tracker` (vía
  `vercel env rm`/`vercel env add` — la primera vez que la clasificadora
  de permisos de auto mode bloqueó el comando por tocar infraestructura
  compartida; el usuario dio permiso explícito y se repitió).
- Detalle importante descubierto en el proceso: Vercel **fija las
  variables de entorno en el momento del deploy, no las lee en vivo en
  cada invocación** — el primer intento de verificar contra un Preview
  Deployment ya existente (creado antes del cambio de env var) seguía
  fallando (`email_sent: false`) hasta hacer un deploy nuevo (el commit
  de limpieza de Ayuda de Fase 1, empujado a continuación) — con esa
  compilación nueva, verificado end-to-end contra el Preview real:
  `POST /api/external-register` → `{"email_sent":true}`, HTTP 200.
- Cuentas de verificación (`release-v1-verify`, `release-v1-verify2`)
  eliminadas tras la comprobación — no queda ningún dato de prueba mío
  en TEST. La cuenta real que creaste tú (`mi.gueldlmm@gmail.com`,
  nickname `mmm`) se deja intacta con su email ya reenviado, para que la
  actives tú si quieres.

**⚠️ URL de prueba a usar esta noche:** el dominio automático de Vercel
para la rama vieja (`dive-tracker-git-nightjob-20260831-*.vercel.app`)
quedó congelado en el último deploy de antes del renombrado — sigue
respondiendo (Vercel no lo borra solo) pero con el código y el
`EMAIL_FROM` de antes de esta sesión, así que un 400/email no enviado
ahí **no es un bug nuevo**, es esperado. El dominio correcto para probar
el trabajo de esta rama es `https://dive-tracker-git-release-v1-ocean-pulse1.vercel.app`
(verificado en vivo: registro completo, `email_sent: true`). El alias
estable `dive-tracker-three.vercel.app` seguirá apuntando a `develop`
hasta que esta rama se fusione ahí — no antes de que el usuario lo
revise y apruebe.

**⚠️ Sigue pendiente — solo producción real:** aplicar el mismo cambio
de `EMAIL_FROM` en las variables de entorno de `dive-tracker-exgg`
(producción). No se ha tocado esta noche — el permiso que diste fue
para TEST, mientras probabas el registro ahí. Bloquea el registro
público real en producción hasta que se haga.

**Decisión confirmada 2026-09-02 (09:20, ventana rápida antes de que el
usuario se desconectara hasta las 18h):** NO aplicarlo ahora — queda
anotado para hacerse junto con el próximo despliegue real a PROD, como
parte de esa migración de código, no como un cambio de configuración
suelto. No tocar `dive-tracker-exgg` hasta ese momento.

### Fase 8 — Revisión visual y libro de estilo

**Riesgo:** bajo — expresamente sin backend ni funcionalidades nuevas
que requieran BBDD (restricción del propio encargo). Evoluciona
`docs/ESTILO.md` existente en vez de crear un documento paralelo.

---

## Fase 0 — Contexto, reglas permanentes y protocolo (✅ 2026-09-01)

### Lo hecho

1. Exploración del proyecto (arquitectura, sistema de diseño actual,
   navegación, roles, componentes reutilizables) — ver mapa abajo.
2. Reglas permanentes del apartado 0.1 del documento maestro persistidas
   en `CLAUDE.md`, sección nueva **"Reglas permanentes — Release V1
   (lanzamiento público)"**.
3. Protocolo de trabajo por lotes del apartado 0.2 persistido en
   `CLAUDE.md`, sección nueva **"9. Trabajo por fases en iniciativas
   largas"** (dentro de "Reglas de trabajo obligatorias") + este mismo
   documento como mecanismo concreto elegido.

### Mapa del proyecto (resumen — no repetir esta exploración en fases
futuras salvo que algo haya cambiado desde 2026-09-01)

**Roles.** Sistema completo y real, no solo de UI: `profiles.is_admin` /
`profiles.is_superadmin` (`schema.sql`), funciones `is_admin(uid)` /
`is_superadmin(uid)`, trigger `protect_profile_roles()` que impide que
`is_superadmin` cambie nunca desde la app y que un admin se autoconceda
`is_admin`. RLS ya gatea por rol `currencies`, `nav_sections`,
`app_config`, `profiles`, `legal_consents`, `setup_datasets*` y
`deployment_notices*`. En cliente: `ConfigTab.jsx` define
`BUSINESS_SECTIONS` / `ADMIN_SECTIONS` (incluye "Usuarios") /
`SUPERADMIN_SECTIONS` (Datasets iniciales).

**Ayuda (`src/HelpTab.jsx` + `src/help/content.js`).** Ya soporta
`adminOnly`/`superadminOnly` por categoría/artículo, pero solo como
filtro de UI (`HelpTab.jsx` los oculta a quien no tiene el rol, no los
elimina). Hoy solo una categoría usa `superadminOnly` ("Datasets
iniciales"); nada usa `adminOnly` todavía, y no se encontró ningún
artículo dedicado a "Usuarios" (gestión de usuarios admin). El encargo
de Fase 1 ("quitar de la Ayuda todo lo de admin/superadmin") pide más
que el filtro que ya existe: que ese contenido no exista en absoluto en
Ayuda, ni detrás del filtro de rol.

**Eliminar cuenta (`src/ProfileTab.jsx`, `PrivacySection`).** Hoy pide
un único click en un `ConfirmDialog` centrado (mismo patrón que el resto
de la app) — sin ningún texto que escribir. Llama a
`POST /api/delete-own-account` → `server/users/deleteOwnAccount.js`
(bloquea autoeliminación de superadmin, borra vía
`auth.admin.deleteUser`, cascada real). Fase 1 punto 3 pide añadir un
paso más: escribir la palabra `CANCELAR` antes de poder confirmar.

**Notificaciones/slides — YA EXISTE un sistema, no partir de cero.**
Dos componentes separados, mismo lenguaje visual (modal centrado,
`motion`, icono redondo):
- `WhatsNew.jsx`: carrusel editorial de novedades, contenido fijo en
  código (`SLIDES`), gate por versión en `localStorage`
  (`src/version.js`) — se muestra una vez por versión de la app y por
  usuario. Swipe lateral + botones Atrás/Siguiente ya implementados.
- `DeploymentNotice.jsx`: aviso de despliegue, **solo para superadmin**
  (`profile?.is_superadmin`), lee la tabla `deployment_notices` +
  `deployment_notice_views` (RLS superadmin-only) — implementado según
  ADR-0024 (estado del ADR desactualizado: dice "Propuesto", pero el
  código y los tests ya existen; corregir el estado del ADR cuando se
  toque en Fase 6).
- No hay ningún icono de campana/bandeja de notificaciones en la
  cabecera — ambos sistemas son popups modales, no un centro de
  notificaciones persistente.
- Fase 6 pide generalizar este patrón (mensaje de admin al resto de
  usuarios, garantía real de "solo una vez por contenido") —
  `DeploymentNotice.jsx` ya resuelve exactamente ese problema para
  superadmin; su mecanismo (tabla de "vistos" en vez de solo
  `localStorage`) es el candidato natural a reutilizar/generalizar en
  vez de diseñar uno nuevo.

**Cabecera (`src/App.jsx:265-332`).** Confirmado: 4 botones-icono
(Ayuda, Configuración, perfil+nombre, Cerrar sesión) más el logo/Home —
la percepción de "empiezan a sobrar iconos" de Fase 4 es real, no solo
percepción. Nav inferior (`PRIMARY_TABS`): Home, Mi trabajo, Resumen.

**Animación y diseño.** `src/motion.js` ya es un módulo de tokens de
animación dedicado (`EASE` con curvas Material Design 3, `DURATION`,
`listItemVariants()`, `usePrefersReducedMotion()`), sobre la librería
`motion` (sucesora de Framer Motion, ya en `package.json`, v13). Fases 3
y 8 deben construir sobre esto — no introducir una librería nueva.
`docs/ESTILO.md` ya es un libro de estilo parcial (inventario práctico
de `shared.jsx`, explícitamente no un design system formal). Fase 8
debería evolucionar ese documento, no crear uno paralelo.

**Confirmado greenfield real (nada de esto existe hoy):**
- **Multidioma/i18n**: sin librería (`react-i18next` ni similar), sin
  columna `language`/`locale` en `profiles`, sin selector de idioma en
  `RegisterScreen.jsx`. Todo el texto de la app está en español
  hardcodeado; llamadas a `Intl`/`toLocaleString` fijan `"es-ES"` a
  mano en varios archivos (`shared.jsx`, `SummaryTab.jsx`,
  `ConfigTab.jsx`).
- **Generación de PDF**: ninguna librería (`jspdf`/`pdf-lib`/`react-pdf`)
  en `package.json` ni en `src/`.
- **Firma táctil (signature pad)**: no existe ningún componente de
  dibujo/firma en `shared.jsx` ni en ningún otro sitio.
- Los 5 PDF de plantilla para Training Records ya están en la raíz del
  repo: `OWD_Spanish_Record.pdf`, `AOWD_Spanish_Record.pdf`,
  `SC-RR_Spanish_Record.pdf`, `SC-PB_Spanish_Record.pdf`,
  `SC-LV_Spanish_Record.pdf`.

**Estructura de código.** Confirmada tal cual la describe ya `CLAUDE.md`
("Estructura"): `App.jsx` (shell), `shared.jsx` (librería de
componentes), `useSupabaseTable.js` (hook CRUD genérico), un archivo por
pantalla. Añadido no documentado antes en `CLAUDE.md`: `ProfileTab.jsx`
es hoy una pantalla separada de `ConfigTab.jsx` (perfil de usuario vs.
configuración/administración), y `MovementSheet.jsx` es el rediseño de
"Movimientos" que `CLAUDE.md` ya señala como referencia de calidad no
definitiva.

### Decisiones tomadas en esta fase

- **Mecanismo de progreso por lotes elegido: documento vivo en
  `docs/` + commits normales**, no un sistema aparte (issues, tablero
  externo…). Motivo: es el patrón que ya usa el proyecto para todo lo
  demás (ADR, BACKLOG, PRODUCT.md) — coherente con la regla 7 de
  `CLAUDE.md` y con el principio de MVP/no sobreingeniería del propio
  proyecto.
- **Las reglas 0.1 se documentan en `CLAUDE.md`**, no en un ADR ni en
  `docs/BACKLOG.md`, porque son "reglas permanentes de trabajo/diseño"
  — la categoría que la propia regla 7 de `CLAUDE.md` asigna a ese
  archivo.
- **No se ha tocado nada de Fase 1 en adelante todavía** — el
  documento maestro del usuario indica explícitamente "una fase por
  sesión"; esta sesión se limita a Fase 0.

### Descartado

- Crear un ADR para las reglas 0.1/0.2: no son decisiones de
  arquitectura con alternativas/trade-offs, son reglas de proceso — no
  encajan en el formato ADR del proyecto.

### Riesgos identificados

- `docs/ADR/0024-propuesta-avisos-despliegue-develop.md` tiene el
  título y el "Estado" desactualizados (dice "propuesta, no
  implementada" pero ya está implementado, según confirma el propio
  código fuente en `DeploymentNotice.jsx`). No se corrige en esta fase
  (fuera de alcance de Fase 0) — dejar anotado para cuando se toque en
  Fase 6.

### Punto exacto donde se quedó

Fase 0 completa. Ninguna fase de implementación (1-8) ha empezado
todavía. Próximo paso: el usuario pega la Fase 1 en una sesión nueva (o
en esta misma si decide continuar) y se actualiza este documento con su
resultado.

---

## Fase 1 — Rama y saneamiento (✅ 2026-09-01, noche)

### Lo hecho

1. **Rama renombrada:** `nightjob-2026.08.31` → `Release-V1`, local y en
   `origin` (rama vieja eliminada de `origin` tras confirmar que el push
   de la nueva funcionaba). Saneadas también las referencias colgantes
   al nombre anterior en el sistema de avisos de despliegue (email +
   slide in-app + comentarios), que mostraban literalmente "Preview
   integrada (nightjob)" — commit `e003292`.
2. **Ayuda sin contenido de admin/superadmin** (commit `8990a49`):
   - "Configuración, de un vistazo" reescrita — ya no menciona
     Administración/Superadmin/Usuarios, solo Escuelas/Cursos/Tarifas.
   - Categoría "Datasets iniciales" (antes `superadminOnly: true`)
     eliminada por completo, no solo oculta.
   - "Mi perfil, de un vistazo" ya no menciona la restricción de
     autoeliminación de superadmin.
   - `HelpTab.jsx` ya no recibe `profile` ni filtra por
     `adminOnly`/`superadminOnly` — mecanismo retirado por completo al
     quedarse sin ningún contenido real que filtrar.
3. **Confirmación `CANCELAR` para eliminar cuenta** (commit `61860ec`):
   segundo paso tras el `ConfirmDialog` habitual — un campo de texto
   exige escribir la palabra exacta `CANCELAR` antes de habilitar el
   botón de borrado real. Implementado local a `ProfileTab.jsx`, sin
   tocar el `ConfirmDialog` compartido.
4. **Bug real encontrado y corregido de paso** (no pedido explícitamente
   en Fase 1, pero descubierto probando el registro en vivo durante esta
   fase): `EMAIL_FROM` seguía en el remitente de pruebas de Resend — ver
   sección "Nota — dominio de Resend y bug real encontrado" más arriba
   para el detalle completo. Corregido en `.env.local` y en Vercel TEST
   (ambos con permiso explícito del usuario), verificado end-to-end
   contra un Preview Deployment real. Pendiente solo producción real.

### Decisiones y su porqué

- **`Release-V1` sin espacio** (no "Release V1" literal): compatibilidad
  con URLs/env vars de Vercel y con el propio tooling de git, que no
  siempre maneja bien espacios en nombres de rama.
- **No se creó un tercer entorno ni se tocó el modelo `main`/`develop`
  de ADR-0006** — `Release-V1` sigue siendo una rama de trabajo larga
  hacia el lanzamiento, la misma función que ya cumplía `nightjob`, solo
  con nombre más claro.
- **El filtro `adminOnly`/`superadminOnly` de Ayuda se retiró en vez de
  dejarse "por si acaso"** — con cero contenido real que filtrar tras
  esta fase, mantenerlo habría sido infraestructura especulativa
  (principio ya fijado del proyecto: no construir para necesidades que
  no existen todavía).
- **La confirmación `CANCELAR` vive en `ProfileTab.jsx`, no en
  `ConfirmDialog`** — única eliminación de la app con este paso extra;
  generalizar el componente compartido para un único consumidor real
  habría sido coste sin beneficio.
- **Botón de abortar el segundo paso dice "Volver", no "Cancelar"** —
  con la palabra a escribir siendo literalmente "CANCELAR", un botón
  "Cancelar" al lado habría sido confuso de leer rápido (regla
  permanente de manos mojadas). Pequeña desviación deliberada de la
  redacción literal del encargo, documentada aquí tal como pide la
  regla de justificar en la documentación.

### Descartado

- Guardar el nombre anterior de la rama en algún sitio visible para el
  usuario — el historial de git ya lo conserva, y `docs/ADR/0006` no
  necesita un ADR nuevo solo por un renombrado de rama de trabajo.

### Riesgos

- Ninguno pendiente de esta fase. Los 532 tests y el build pasan tras
  cada commit.

### Verificación

`npm run test` (532/532) y `npm run build` ejecutados y en verde tras
cada uno de los 4 commits de esta fase. Registro externo verificado en
vivo contra un Preview Deployment real (no solo tests), con limpieza de
las cuentas de prueba usadas para verificar.

## Fase 2 — Multidioma (✅ 2026-09-01, noche)

### Lo hecho

**Infraestructura:**
- `i18next` + `react-i18next` instalados. `src/i18n/index.js`: un
  namespace por pantalla (11 en total: `common`, `app`, `auth`,
  `home`, `summary`, `trabajo`, `config`, `profile`, `help`,
  `notices`, `rates`), recursos bundleados en build time (sin backend
  de carga diferida — MVP, la app es pequeña).
- Migración aditiva `0007-idioma-perfil.sql` aplicada a TEST:
  `profiles.language` (es/en, default 'es'), `handle_new_user()`
  actualizado para copiarla del alta.
- Idioma inicial: `profiles.language` una vez hay sesión (sincronizado
  en `AppShell`); `localStorage` (`oceanpulse:language`) como
  respaldo para pantallas sin sesión (Login, Registro...).
- `vitest.setup.js` inicializa i18next globalmente — los 540 tests
  existentes siguen en verde sin tocarlos porque cada `es.json` es
  idéntico, palabra por palabra, al texto que había hardcodeado.

**Traducción completa (es/en) de las 21 pantallas/componentes
alcanzables por un usuario real:** shared.jsx (15 componentes
compartidos), cabecera/navegación (App.jsx), Login, Registro, olvidé
contraseña, restablecer contraseña, crear contraseña, aceptar bases
legales + textos legales, Home, Resumen, Mi trabajo + MovementSheet,
Configuración completa (incluida gestión de usuarios y Datasets
iniciales), Mi perfil, Ayuda completa, WhatsNew, DeploymentNotice,
Tarifas, PendingCollectionCard. Verificado con un barrido final
(`grep` de texto español renderizado en JSX, no en comentarios) sin
resultados — nada queda sin traducir en las pantallas reales de la
app.

**Selectores de idioma** (encargo explícito: "en el perfil, en el
registro y en el alta de usuarios") en los 3 sitios pedidos —
Registro, Mi perfil, "Crear usuario" (admin) — cada uno cambia
`i18n.changeLanguage()` al instante además de persistir el valor.

**Deliberadamente fuera de la traducción de esta fase:**
- `WorkLogTab.jsx`/`ComisionesTab.jsx`/`CompanerosTab.jsx`/
  `PaymentsTab.jsx`: rutas muertas sin ningún punto de entrada en la
  UI desde la unificación en "Mi trabajo" (ADR-0005) — confirmado en
  Fase 0. Traducirlas habría sido esfuerzo sobre código inalcanzable.
- `EnvironmentIndicator.jsx`: la pill "TEST" — mismo texto en
  cualquier idioma, herramienta de desarrollo, no dato de producto.
- Contenido dinámico de `deployment_notices` (el resumen/cambios de
  cada aviso concreto): se sigue redactando en español al crearlo, es
  contenido editorial de cada sesión, no texto de interfaz.
- Traducción de los emails transaccionales (activación, avisos) al
  idioma del destinatario — la infraestructura de idioma por usuario
  ya existe (`profiles.language`), pero conectarla a `EmailService`
  no se pidió explícitamente esta fase y no se ha hecho.

### Decisiones y su porqué

- **`common:movementTypes` como fuente única de Curso/Comisión/Ajuste**
  (pedido explícito del usuario a mitad de fase): antes cada pantalla
  que mostraba el tipo de movimiento (Home, Resumen, Mi trabajo,
  Tarifas) traducía `MOVEMENT_TYPE_META.label` por su cuenta. Ahora
  todas resuelven `t("common:movementTypes.<key>")` — un único sitio
  que editar, mismo literal garantizado en todas partes.
- **`TYPE_OPTIONS`/`TYPE_KEY` (Mi trabajo, Tarifas) se quedan en
  español fijo, a propósito.** Son a la vez el texto mostrado y la
  clave de búsqueda del `Select` de filtro (`shared.jsx` no separa
  value/label) — traducirlos rompería el mapeo interno. El label
  visible en cada fila SÍ usa `common:movementTypes`; solo el valor
  interno del filtro se queda fijo. Documentado en el código para que
  no se "corrija" por error en el futuro.
- **Reparto del trabajo en 9 agentes en paralelo**, cada uno dueño
  exclusivo de un archivo/namespace, para completar una traducción de
  esta escala en una sola noche. Un primer intento del namespace
  `help` no llegó a hacer el trabajo real (reportó sobre coordinación
  ajena en vez de traducir sus archivos) — detectado verificando el
  estado real de los ficheros, no solo el informe, y relanzado desde
  cero con éxito. `RatesTab.jsx` se quedó fuera del reparto inicial
  (vive en su propio archivo pero se renderiza dentro de
  Configuración) — detectado en el barrido final y traducido aparte.
- **Selector de idioma con nombre nativo siempre** ("Español"/
  "English", nunca traducidos entre sí) — convención estándar de
  cualquier selector de idioma reconocible sin depender de que la
  persona ya entienda el idioma actual de la interfaz.

### Descartado

- Traducir automáticamente los emails transaccionales al idioma del
  perfil en esta misma fase — la columna ya existe para cuando se
  decida hacerlo, pero conectar `EmailService` a `profiles.language`
  es un cambio aparte, no pedido explícitamente esta noche.

### Riesgos

- La traducción al inglés de política de privacidad/términos de uso
  es fiel pero automática, sobre un borrador que ya tenía
  `[PENDIENTE]` en español — **necesita revisión legal humana en
  ambos idiomas** antes de tratarse como definitiva. No bloquea
  probar el resto de la app, sí bloquea confiar en el contenido legal
  real todavía.

### Verificación

`npm run test` (540/540) y `npm run build` en verde tras cada uno de
los 9 commits de esta fase. Barrido final de texto español renderizado
(no en comentarios) sin resultados en ningún archivo vivo.

## Fase 3 — KPIs en la home (✅ 2026-09-01, noche)

### Lo hecho

Sección nueva "Tu impacto" al final de Home, tres tarjetas con conteo
ascendente animado:
- **Alumnos este mes** — reutiliza el cálculo ya existente
  (`peopleTrainedThisMonth`), no se duplica lógica.
- **Cursos impartidos** — total histórico (`worklog.rows.length`), no
  de mes, a propósito: da sensación de trayectoria acumulada.
- **Captados este mes** — mismo criterio que alumnos, pero sobre
  `comisionEntries` (aclaración explícita del usuario: "personas por
  las que he comisionado" = clientes referidos, no formados por ti).

`useCountUp` (hook nuevo, `motion.js`): anima de 0 al valor real con
`requestAnimationFrame` + ease-out cúbico; respeta
`prefers-reduced-motion` saltando directo al valor final. `KpiTile`
entra con fade+slide-up escalonado por índice, mismo vocabulario
`EASE.enter`/`DURATION.md` que ya usa el resto de la app — ningún
sistema de animación nuevo aparte.

### Decisiones y su porqué

- **Colocación al final de Home, no al principio.** Pendiente de
  cobrar y Generado este mes son las cifras financieras que se
  consultan a diario (documentado así en el propio código de
  HomeTab.jsx) — los KPIs son más "sensación de logro/trayectoria" que
  consulta diaria, así que cierran la pantalla en vez de competir por
  la primera mirada.
- **No financieros, a propósito.** Lo financiero ya está cubierto por
  las dos tarjetas de arriba — los tres KPIs nuevos responden un
  ángulo distinto ("cómo me está yendo" en términos de actividad, no
  de dinero).
- **`useCountUp` con `requestAnimationFrame`, no con Motion.** No hay
  ningún elemento del DOM que animar (solo un número entero de React
  que además hay que redondear cada fotograma) — traer la librería
  para esto habría sido más pesado que la propia implementación.

### Verificación

`npm run test` (541/541) y `npm run build` en verde. Verificado
también en navegador real (`npm run dev` + bypass de desarrollo,
viewport móvil 430×932): las tres tarjetas animan correctamente, sin
errores de consola, en español e inglés, con datos reales de la
cuenta demo (4 alumnos / 92 cursos / 0 captados este mes).

## Fase 4 — Cabecera y notificaciones (✅ 2026-09-01/02, noche)

### Investigación previa (fuentes contrastadas, según pide CLAUDE.md)

- **[Mobile Navigation Design: 8 Types, Examples & Best Practices](https://www.uxpin.com/studio/blog/mobile-navigation-examples/)** (UXPin) y **[Stop the overuse of overflow menus](https://www.freecodecamp.org/news/stop-the-overuse-of-overflow-menus-5caa4b54e843)** (freeCodeCamp): estructurar navegación primaria con máximo 4-5 elementos; **no ocultar tareas frecuentes** dentro de menús overflow/cajones — los overflow menus sirven para lo secundario/infrecuente, no lo contrario. Objetivo táctil mínimo 44×44 (ya cumplido en toda la app).
- **[Design Guidelines For Better Notifications UX](https://www.smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/)** (Smashing Magazine, jul. 2025): notificaciones se clasifican en tres niveles de atención (alta/media/baja); control del usuario sobre qué puede revisar/personalizar es un principio recurrente en el diseño actual de notificaciones.
- **[Deep: The UX of notifications](https://departmentofproduct.substack.com/p/deep-the-ux-of-notifications)** (Department of Product): notificaciones deben sentirse útiles, no disruptivas; personalización y relevancia por encima de "ping genérico".

### Lo hecho

**Cabecera** — "Cerrar sesión" (5º icono) se mueve de la cabecera a Mi
perfil: es una tarea infrecuente (como mucho una vez por sesión), el
caso exacto que la investigación recomienda sacar del nivel superior
de navegación — a diferencia de Ayuda/Configuración, que SÍ se quedan
donde estaban por ser tareas frecuentes (la propia investigación
advierte explícitamente contra esconder justo esas). Cabecera pasa de
4 elementos tocables a 3 (logo/Home, Ayuda, Configuración) + avatar.
Nueva ubicación en Mi perfil: entre "Seguridad" y "Privacidad", en
gris neutro (no rojo — no es una acción destructiva, no debe leerse
como una).

**Notificaciones** — "Ver qué hay de nuevo en esta versión", enlace
nuevo al principio de Ayuda que reabre `WhatsNew.jsx` bajo demanda.
Antes, cerrar ese slide lo perdía hasta el siguiente release — sin
ninguna forma de volver a consultarlo. No toca el gate de "una vez
por versión al entrar" (sigue sin auto-mostrarse si ya se vio; solo
añade una vía para reabrirlo cuando se quiera), en línea con el
principio de "control del usuario" de la investigación.

### Decisiones y su porqué

- **Alcance de "rediseñar notificaciones" para esta fase: mejora de la
  UX alrededor del mecanismo ya existente, no un rediseño visual
  completo ni un centro de notificaciones nuevo.** `WhatsNew.jsx`/
  `DeploymentNotice.jsx` ya cumplen razonablemente bien los criterios
  de la investigación (dismissible, una a la vez, contenido
  contextual, jerarquía visual clara) — no había una razón real,
  respaldada por la investigación, para un cambio visual mayor; habría
  sido cambiar por cambiar. La generalización real del mecanismo
  (avisos para todos los usuarios, no solo superadmin) es trabajo de
  Fase 6, con su propio cambio de esquema — acoplarlo aquí habría
  mezclado una mejora de UX con un cambio de datos, dos intenciones
  distintas.
- **Ayuda como ubicación de "Ver qué hay de nuevo"**, no un icono
  nuevo en la cabecera — evita repetir el propio problema que esta
  fase intenta resolver (más iconos en la cabecera), y es el sitio
  natural para "quiero repasar algo de la app".

### Verificación

`npm run test` (547/547) y `npm run build` en verde. Verificado en
navegador real (viewport móvil, bypass de desarrollo): cabecera con 3
iconos en vez de 4, "Cerrar sesión" funciona desde Mi perfil, "Ver
qué hay de nuevo" reabre el slide correctamente, ambos en español e
inglés, sin errores de consola.

## Fase 5 — Sistema de generación de Training Records (🟡 en curso — rediseño del generador y correcciones reales de Safari iOS aplicadas, fusionado con Release-V1)

**Rama:** `feature/training-records` (creada desde `Release-V1` tal como
pedía el encargo — fusionada con `Release-V1` esta noche, 2026-09-03).

### ✅ Actualización 2026-09-02 — generador MVP construido

Construido el generador en sí (roster + firma + relleno de PDF), no solo
el mapeo de campos:

- `src/trainingRecords/computeInitials.js` — regla acordada con el
  usuario: primera letra del nombre + primera letra de cada palabra del
  apellido (apellidos compuestos cuentan cada palabra).
- `src/trainingRecords/pdfFill.js` — `buildFillOperations()` (lógica
  pura: qué campo recibe qué valor) + `fillTrainingRecordPdf()` (aplica
  esas operaciones sobre el PDF real con `pdf-lib` y lo aplana con
  `form.flatten()` al final, para que el resultado sea un documento
  estático, no un formulario reeditable). Las firmas (student/parent/
  instructor) son en realidad `PDFTextField` normales en el PDF
  original, no campos de firma nativos — comprobado con
  `render-training-record-debug.mjs` — así que la imagen capturada con
  `signature_pad` se dibuja directamente sobre la página en el
  rectángulo real de ese campo (`page.drawImage`), no se "escribe" en
  el campo.
- `src/trainingRecords/SignatureCapture.jsx`, `StudentFormSheet.jsx`
  (alta/edición de alumno del roster) y `StudentRecordSheet.jsx` (el
  formulario dinámico por alumno, construido a partir de la forma real
  de `templateFieldMaps.js` — una sola implementación sirve para las 4
  plantillas activas en vez de 4 formularios distintos, aunque cada una
  tenga bloques distintos como `optionalSpecialtyDives` de AOWD o
  `courseVariant` de SC-EAN).
- `src/trainingRecords/TrainingRecordsTab.jsx` — pantalla completa:
  elegir plantilla activa → datos del instructor (nombre, iniciales,
  número SSI Pro — persistidos en `localStorage` por ser preferencia
  personal, no dato de un alumno, mismo criterio que la moneda favorita
  de ADR-0007) → roster de alumnos (nunca persistido, ni en Supabase ni
  en `localStorage`) → generar/descargar el PDF de cada alumno →
  "Descargar todos los generados" (descargas secuenciales con una
  pequeña pausa entre cada una, no un `.zip`: añadir una librería de
  compresión nueva solo para esto no compensa para el tamaño típico de
  un roster).
- Punto de entrada: nueva sección "Training Records" dentro de
  Configuración (`BUSINESS_SECTIONS`, visible a cualquier usuario, no
  solo admin — es una herramienta del día a día del instructor, no de
  gestión de la instalación), icono `Award`.
- Namespace de traducción nuevo, `trainingRecords` (ES/EN), registrado
  en `src/i18n/index.js` — mismo patrón que el resto de pantallas.
- Tests: `computeInitials.test.js`, `pdfFill.test.js` (lógica de
  relleno probada exhaustivamente con un PDF de prueba construido con
  `pdf-lib`, sin depender de red ni de las plantillas reales),
  `SignatureCapture.test.jsx` y `TrainingRecordsTab.test.jsx`
  (`signature_pad` mockeado — jsdom no implementa canvas 2D, mismo
  criterio que mockear Supabase).

**Decisiones tomadas sobre la marcha (pedido explícito del usuario,
2026-09-02, antes de que se completara toda esta fase — mejor
documentarlas ahora que dejarlas sueltas en el chat):**
- **MVP explícito: solo las plantillas que ya son formularios PDF
  rellenables de verdad** (las 4 `active`). Las 6 sin campos de
  formulario quedan fuera de este generador hasta que se decida el
  enfoque técnico (superponer texto en coordenadas fijas).
- **Ninguna fecha se rellena todavía** (ni en las filas de progreso ni
  en las firmas) — pendiente decidir de dónde sale cada una (¿la del
  propio movimiento en Mi trabajo? ¿la que teclee el instructor?). El
  único sitio que hay que tocar cuando se decida es `pushProgressRow`/
  los tres campos `*Date` de firma en `pdfFill.js` — están señalados
  con un comentario explícito.

**Explícitamente NO construido todavía, con motivo:**
- **Exportar a JPG** (`pdfjs-dist` + canvas, página larga concatenada
  para las multipágina) — el encargo original lo pedía, pero requiere
  configurar el *worker* de `pdfjs-dist` en el build de Vite
  (`?url` + `new Worker(..., { type: "module" })`), algo que no se ha
  podido verificar visualmente esta noche en un navegador real. Antes
  de darlo por construido sin esa verificación, se deja pendiente en
  vez de arriesgar un build roto o un export silenciosamente
  incorrecto en un documento de certificación — mismo criterio de
  "nunca adivinar en algo de alto riesgo" que ya se aplicó al mapeo de
  campos. El relleno y descarga en PDF (lo importante, el documento
  real) sí está construido y probado.
- Ubicación definitiva en la navegación más allá de "dentro de
  Configuración" — se decidió esta ubicación por ser consistente con
  Escuelas/Cursos/Tarifas (mismo patrón de menú con drill-down), pero
  no se ha validado con el usuario si merece un acceso más directo.
- Pipeline de análisis automático de plantillas nuevas subidas por un
  admin — sigue fuera de alcance, tal como pedía el encargo original,
  hasta que el generador esté completamente terminado.

**Pendiente de verificación humana (no se ha podido hacer esta noche):**
navegador real / `mobile-check` — el flujo completo (elegir plantilla,
añadir alumno, firmar con el dedo, generar y descargar) no se ha
probado en un dispositivo real ni con Playwright. `npm run test`
(583/583) y `npm run build` sí están en verde.

### Hallazgo — mapeo de campos (histórico, ya resuelto)

El mapeo de campos (ver detalle debajo) se verificó construyendo
`scripts/render-training-record-debug.mjs`: renderiza cada página real
de cada plantilla con un recuadro numerado sobre cada campo, para
poder contrastar visualmente cada número contra su etiqueta de texto
en la propia imagen. Con esa herramienta verifiqué a mano, plantilla a
plantilla, las 4 rellenables (OWD, AOWD, SC-DD, SC-EAN) — resultado en
`src/trainingRecords/templateFieldMaps.js`, confirmado además con
`scripts/verify-training-record-field-maps.mjs` (cada campo
referenciado existe de verdad en el PDF real, ninguno se usa dos
veces). Las 4 ya están `status = 'active'` en
`training_record_templates`, y el generador (ver "Actualización" más
arriba) ya las usa. Alcance de este mapeo: solo la página 1 de cada
una (completar el curso entero) — la página 2 de OWD (finalización de
Referral/Scuba/Indoor Diver, para cuando el alumno NO completa todo el
programa) queda fuera, es un camino secundario más complejo,
documentado como pendiente en el propio `templateFieldMaps.js`.

**Lo que sigue siendo cierto y sigue pendiente:** las 6 plantillas sin
campos de formulario (BD, SC-LV, SC-NV, SC-PB, SC-RR, SC-SR) — ver el
detalle original abajo, no ha cambiado nada ahí.

### Detalle original del hallazgo (contexto)

Al analizar los 10 PDF que estaban en la raíz del repo para diseñar el
generador, aparecieron dos problemas de fondo que **cambian el alcance
real de esta fase** respecto a lo que asumía el encargo original:

1. **Solo 4 de las 10 plantillas son formularios PDF rellenables de
   verdad** (tienen campos AcroForm interactivos, comprobado con
   `pdf-lib`): **OWD** (Open Water Diver, 72 campos, 2 páginas),
   **AOWD** (Advanced Open Water Diver, 49 campos), **SC-DD** (Deep
   Diving, 40 campos), **SC-EAN** (Enriched Air Nitrox, 34 campos).
   Las otras 6 — **BD** (Basic Diver), **SC-LV** (Night & Limited
   Visibility), **SC-NV** (Navigation), **SC-PB** (Perfect Buoyancy),
   **SC-RR** (React Right), **SC-SR** (Diver Stress & Rescue) — **no
   tienen ningún campo de formulario**, solo texto e imágenes fijas.
   Rellenar estas 6 por programa necesitaría un enfoque técnico
   distinto (superponer texto en coordenadas concretas de cada
   página, calculadas a mano por plantilla) — mucho más frágil y
   costoso que rellenar un campo de formulario, y no construido esta
   noche.
2. **Los nombres de los campos de las 4 plantillas rellenables son IDs
   opacos sin significado** (p. ej. `undefined.tr-input-23905086-2`),
   no algo como `nombre_alumno` o `firma_instructor`. Probé un
   enfoque de correlación por posición (extraer coordenadas de cada
   campo con `pdf-lib` + coordenadas del texto de cada etiqueta con
   `pdfjs-dist`, y emparejar cada campo con su etiqueta más cercana)
   — funciona razonablemente bien para deducir una propuesta de
   mapeo, pero **no es fiable al 100%** sin comprobación visual
   humana: en OWD, por ejemplo, hay bloques de firma repetidos varias
   veces en la página 2 (parece corresponder a distintas
   combinaciones de finalización — Referral Diver, Scuba Diver,
   Indoor Diver — el propio formulario lo menciona en sus
   instrucciones) donde un error de mapeo pondría una firma en el
   sitio equivocado.

**Por qué no seguí adivinando el mapeo esta noche, ni siquiera con la
autonomía del resto de fases:** un Training Record es un documento de
certificación real, con implicación de seguridad — no es una pantalla
más de la app donde un fallo se corrige con un segundo intento.
Generar un PDF con datos en el campo equivocado (una fecha en el
campo de otro alumno, un número de instructor en el campo de firma)
sería peor que no generarlo. Es exactamente el tipo de decisión que
CLAUDE.md pide validar humanamente antes de dar por cerrada, y que la
regla 5 (revisión arquitectónica continua) pide comunicar en vez de
ignorar o improvisar.

**Esto ya no bloquea nada — resuelto sin esperar revisión humana** (ver
"✅ Actualización" arriba: verificación visual propia + comprobación
automática de que cada campo referenciado existe de verdad en el PDF).
Lo único que sigue pendiente de decisión es el punto 2 original — qué
hacer con las 6 plantillas sin campos de formulario — que no bloquea
construir el generador para las 4 activas.

### Lo hecho

- Migración aditiva `0008-training-record-templates.sql` aplicada a
  TEST (rollback documentado abajo antes de ejecutarla): tabla
  `training_record_templates` + bucket privado
  `training-record-templates` en Storage.
- Las 10 plantillas subidas al bucket y registradas en la tabla.
  **OWD, AOWD, SC-DD y SC-EAN ya están `status = 'active'`** (mapeo de
  campos verificado, `missing_fields = []`) — el generador ya puede
  ofrecerlas. Las otras 6 (BD, SC-LV, SC-NV, SC-PB, SC-RR, SC-SR)
  siguen en `status = 'pending_validation'` con `missing_fields`
  explicando que no tienen ningún campo de formulario rellenable.
  Nombres reales extraídos del propio texto de cada PDF, no de la
  abreviatura del archivo.
- PDFs retirados de la raíz del repo (ya redundantes, el bucket es
  ahora la fuente real) — verificado byte a byte antes de borrarlos
  que la subida fue idéntica al original.
- Dependencias instaladas: `pdf-lib` (rellenar formularios),
  `pdfjs-dist` (renderizar páginas / extraer texto), `signature_pad`
  (captura de firma táctil) — decisión de arquitectura ya tomada:
  generación **enteramente en cliente**, sin endpoint de servidor para
  el relleno en sí (evita transmitir firmas/datos de alumnos a un
  servidor que no los necesita).
- `src/trainingRecords/templateFieldMaps.js` con el mapeo verificado de
  las 4 plantillas activas, `scripts/render-training-record-debug.mjs`
  (herramienta de verificación visual) y
  `scripts/verify-training-record-field-maps.mjs` (comprobación
  automática contra el PDF real) — ver "✅ Actualización" arriba.

### Migración aplicada — con rollback

```sql
-- Aplicada (ver arriba). Rollback:
drop policy if exists "admin manage template files" on storage.objects;
drop policy if exists "read template files" on storage.objects;
delete from storage.objects where bucket_id = 'training-record-templates';
delete from storage.buckets where id = 'training-record-templates';
drop policy if exists "admin write templates" on public.training_record_templates;
drop policy if exists "read active templates" on public.training_record_templates;
drop table if exists public.training_record_templates;
```

### ✅ Actualización 2026-09-02 (sesión de continuación) — verificación en dispositivo real, bug crítico corregido, datos de instructor movidos al perfil

Sesión dedicada al punto 1 pendiente ("validación humana en dispositivo
real"), en rama `feature/training-records` (`npm run dev` + bypass de
desarrollo). Resultado: **un bug real que rompía la generación para
cualquier alumno, en las 4 plantillas activas, sin excepción** — no
detectable por los tests unitarios existentes porque construyen su PDF
de prueba con `pdf-lib` desde cero (estructura de campos "limpia"), no
descargando la plantilla real de Storage.

**Bug encontrado y corregido — `form.flatten()` fallaba siempre:**
`scripts/mobile-check-training-records.mjs` (script nuevo, mismo enfoque
que `mobile-check.mjs` pero para este módulo — Chromium + emulación
iPhone 14 Pro Max) reprodujo en el primer intento un error real al pulsar
"Generar y descargar": `Error: Tried to remove inexistent field
undefined.tr-input-XXXXXXXX-N`, lanzado por pdf-lib dentro de
`form.flatten()`. Diagnosticado con un script de depuración puntual
contra las 4 plantillas reales (descargadas de Supabase Storage): cada
campo de cada una de las 4 plantillas tiene un `/Parent` que apunta, por
error del generador original del PDF, al propio diccionario `/AcroForm`
(que tiene `/Fields`, no `/Kids`) en vez de a un campo padre real o no
tener `/Parent` en absoluto. pdf-lib sigue ese `/Parent` roto al
aplanar, no encuentra el campo en los (inexistentes) `/Kids` de ese
"padre", y lanza el error — **para el primer campo de cualquier
plantilla, siempre**, sin relación con qué datos se rellenen. Sin este
fix, el generador nunca había funcionado de verdad para ningún alumno,
pese a que el mapeo de campos (verificado visualmente semanas atrás) sí
era correcto.

**Fix** (`src/trainingRecords/pdfFill.js`): `stripBrokenParentRefs()`
recorre los campos del formulario justo antes de `form.flatten()` y
quita el `/Parent` cuando el diccionario al que apunta no tiene
`/Kids` (es decir, cuando no es un campo padre real) — verificado
manualmente contra las 4 plantillas activas (AOWD, OWD, SC-DD, SC-EAN),
las 4 flateaban correctamente tras el fix. Test de regresión en
`pdfFill.test.js` que fabrica un PDF con esa misma corrupción a
propósito (confirmado que falla sin el fix y pasa con él — no basta con
que el test pase, hay que comprobar que también sabe fallar).

**Segundo hallazgo, en el propio script de verificación** (no en la
app): las firmas dibujadas con el ratón de Playwright no llegaban al
`<canvas>` de `signature_pad` — el PDF se generaba igualmente (las
firmas son opcionales en `pdfFill.js`) pero salían en blanco. Causa:
el canvas de firma vive más abajo del viewport dentro de la hoja
(`Sheet`, con scroll interno), y `page.mouse.move/down/up` no valida
visibilidad como sí hace un `locator.click()` — el "trazo" no llegaba a
ningún elemento real. Corregido con `scrollIntoViewIfNeeded()` antes de
calcular las coordenadas del canvas. De paso, se encontró y corrigió el
mismo tipo de bug (ambigüedad `getByRole` sin `exact:true`) en el propio
`scripts/mobile-check.mjs` compartido — ver el commit
`fix(training-records): sanea /Parent roto antes de aplanar el PDF`.

**Verificado end-to-end con el PDF real generado** (renderizado a PNG
con `pdftoppm` para revisión visual): nombre, apellidos, iniciales del
alumno en cada fila de progreso, nombre del instructor y ambas firmas
(alumno + instructor) aparecen en el sitio correcto de la página 1 de
AOWD.

**Cambio de arquitectura pedido explícitamente por el usuario mid-sesión
— datos de instructor al perfil, no al dispositivo:** hasta ahora
`InstructorPrefsPanel` guardaba nombre/iniciales/número SSI Pro en
`localStorage`, editable directamente dentro de Training Records. El
usuario pidió moverlos al perfil real (para que se rellenen una vez y
sirvan en cualquier dispositivo) y que, si faltan, el generador lo
bloquee con un aviso y un botón directo a "Mi perfil".
**Implementado:**
- Migración aditiva `0011-datos-instructor-perfil.sql` aplicada a TEST
  (columnas `profiles.instructor_initials`/`ssi_pro_number`, nullable,
  rollback documentado en el propio fichero) — el nombre impreso no es
  una columna nueva, se deriva de `first_name`/`last_name`, que ya
  existían.
- `ProfileTab.jsx`: sección nueva "Datos de instructor" (mismo patrón de
  edición que "Datos personales" ya existente).
- `TrainingRecordsTab.jsx`: `InstructorPrefsPanel` (editable, localStorage)
  retirado por completo. Si al perfil le falta cualquiera de los 4 datos,
  la pantalla bloquea con `InstructorMissingNotice` (aviso + botón "Ir a
  mi perfil", enhebrado `App.jsx` → `ConfigTab` → `TrainingRecordsTab`
  vía `onOpenProfile={() => changeTab("perfil")}`) en vez de dejar
  empezar un roster que no se podría terminar. Con los datos completos,
  `InstructorSummary` (solo lectura) recuerda "Firmando como Nombre
  (iniciales) — SSI Pro número" antes de generar — un documento de
  certificación real no debe generarse sin que quede claro con qué
  identidad se firma.
- Verificado en navegador real con la cuenta demo (que no tenía ningún
  dato de instructor): aparece el aviso → "Ir a mi perfil" → rellenar
  nombre/apellidos + iniciales/número → volver a Training Records → el
  aviso ya no aparece, "Firmando como..." visible, generación correcta.
  Cuenta demo restaurada a su estado original (todos los campos a null)
  tras la comprobación, para no dejar datos de prueba reales en TEST.

**Exportación a JPG, ya construida y verificada** (mismo bloque de
sesión, tras dejar operativo el flujo de verificación en dispositivo
real): `src/trainingRecords/pdfToJpg.js`, `renderPdfToJpgBytes()`
rasteriza cada página del PDF ya relleno con `pdfjs-dist` (worker
resuelto vía `?url` de Vite — se emite como asset aparte,
`dist/assets/pdf.worker-*.mjs`, confirmado con `npm run build`) y las
concatena verticalmente en un único JPG si hay más de una página.
`computeConcatenatedLayout()` es la parte de lógica pura (escalado al
ancho de la página más ancha, huecos entre páginas) y tiene su propio
test sin canvas; el renderizado en sí solo se puede verificar en un
navegador real, igual que `signature_pad`. Botón nuevo "Descargar como
imagen (JPG)" junto a "Descargar de nuevo" en el roster, reutiliza los
bytes del PDF ya generado (no vuelve a rellenar nada). Verificado en
dispositivo real con las dos formas reales que existen hoy: AOWD (1
página, JPG 1188×1584) y OWD (2 páginas — la 2ª es la de
Referral/Scuba/Indoor Diver, sin rellenar — JPG 1188×3180, ambas
páginas legibles y en orden), sin ningún error de consola en ninguno
de los dos casos.

**Commits** (rama `feature/training-records`, empujada a `origin` —
genera Preview Deployment nuevo, ver más abajo): `106c3ab` (fix del
bug de pdf-lib + herramientas de verificación), `e9347d6` (datos de
instructor al perfil), `4dffa38` (este documento), `b14dc05`
(exportación a JPG), `bd418c5` (documentación), `de20eae` (fix
crítico, ver abajo) y `f2d5bdf` (rediseño de la fila de alumno + fix
de un crash real, ver abajo). `npm run test` (598/598) y
`npm run build` en verde tras todos.

**⚠️ Bug crítico encontrado y corregido en el Preview real, reportado
en vivo por el usuario 2026-09-02: pantalla en blanco en Safari
(escritorio y móvil), Chrome no se veía afectado.** Causa raíz:
`pdfjs-dist` (añadido para la exportación a JPG) comprueba
`Iterator.prototype.join` al cargar el módulo, sin proteger que
`Iterator` (Iterator Helpers) exista siquiera — con el `import`
estático de esa sesión, ese código entraba en el bundle principal y se
ejecutaba en CUALQUIER pantalla, incluido el login, antes de que
hubiera sesión. Corregido cambiando el import de `pdfToJpg.js` a
`import()` dinámico dentro del propio botón de exportar — pdfjs-dist
pasa a su propio chunk aparte, confirmado con `grep` que
`Iterator.prototype.join` ya no aparece en `dist/assets/index-*.js`,
solo en el chunk que carga bajo demanda. Verificado en vivo contra el
Preview real tras el fix (confirmación del usuario).

**Rediseño de la fila de alumno del roster, pedido explícito del
usuario tras usar el Preview real** ("cuando edito, debería poder
editar el alumno o la configuración del documento"; "repiensa bien la
usabilidad de estos menús... piensa en la usabilidad de la página,
fácil e intuitiva"): antes, el chevron de la fila aparecía/desaparecía
según si ya se había generado el registro, y "Descargar de nuevo"/
"Descargar imagen" eran iconos sueltos sin etiqueta apretados junto al
menú "⋯" — confuso en la práctica ("ya no hay más botones de acción en
la interfaz", reportado en vivo tras generar). Ahora: un único modelo
de interacción (tocar la fila siempre abre la configuración del
documento, generado o no), un check verde puramente informativo indica
"ya generado", y las descargas se movieron al menú "⋯" ya existente
(`RowMenu`, ahora con `extraActions`, reutilizable por cualquier otra
pantalla). De paso, `StudentRecordSheet` pasó a restaurar de verdad la
configuración ya guardada de cada alumno al reabrirlo (antes se podía
perder o mezclar con la de otro alumno, porque esa hoja nunca se
desmonta entre aperturas). Construyendo esto se encontró y corrigió un
crash real (no reportado por el usuario, encontrado en desarrollo):
sembrar la config del alumno solo en un `useEffect` reventaba la
pantalla entera en plantillas con inmersiones de especialidad (AOWD) —
test de regresión añadido con la plantilla real, confirmado que falla
sin el fix.

**Preview Deployment de esta sesión:**
`https://dive-tracker-git-feature-training-records-ocean-pulse1.vercel.app`
(alias estable de la rama — cada push nuevo a `feature/training-records`
lo actualiza solo).

### ✅ Actualización 2026-09-02 (lote de trabajo — pestaña única de creación, fechas por plantilla, firma de instructor, validación, ajustes visuales del PDF)

Lote grande de trabajo autónomo pedido explícitamente por el usuario
("trabaja este lote de forma autónoma... no esperes respuesta mía en
el chat entre unidades"), con un commit por unidad cerrada. Reemplaza
por completo el modelo de interacción de Fase 5 construido hasta
ahora — sigue siendo la misma arquitectura de fondo (generación
enteramente en cliente, nada se persiste en Supabase salvo lo que ya
persistía: plantillas y perfil del instructor).

**1. Firma del instructor en el perfil.** `profiles.instructor_signature`
(migración `0012-firma-instructor-y-aventuras.sql`, aplicada a TEST) —
se firma una vez en "Mi perfil" → "Datos de instructor" (reutiliza
`SignatureCapture`, movido de `trainingRecords/` a la raíz de `src/`
porque ya no es exclusivo de esa pantalla) y se reutiliza en cada
Training Record generado después, sin volver a firmar documento a
documento. Campo obligatorio para poder usar el generador (se suma a
nombre/apellidos/iniciales/número SSI Pro en el aviso de "faltan datos
de instructor"), editable en cualquier momento.

**2. Iniciales de instructor autogeneradas.** Al guardar "Datos
personales" (nombre/apellidos) en el perfil, si `instructor_initials`
está vacío se calcula solo (`computeInitials`, movido también a la
raíz de `src/`) y se guarda en el mismo patch — nunca sobrescribe unas
iniciales que el usuario ya haya editado a mano (se usa que ya tengan
un valor como señal de "ya editadas", sin necesitar una columna nueva
de "tocado").

**3. Pestaña única de creación (cambio de arquitectura).** Pedido
explícito: "me gusta el modelo planteado con el de cómo configurar el
PDF". `StudentFormSheet.jsx` se retira — sus campos (nombre, apellidos,
iniciales) se fusionan dentro de `StudentRecordSheet.jsx`, que pasa a
ser una única hoja continua: datos del alumno (+ nombre del
padre/madre/tutor, opcional, nuevo) → elegir la plantilla/curso a
certificar → configuración del documento → generar. La plantilla ya no
se elige una vez para toda la sesión: se elige por alumno, así que el
roster de una sesión puede mezclar alumnos de varias plantillas.
`TrainingRecordsTab.jsx` pierde su pantalla de "elegir plantilla
primero" — entra directo al roster (o al aviso de instructor
incompleto).

**4. Roster: iconos siempre visibles, no un menú "⋯".** Pedido
explícito del usuario, que revierte el diseño de la sesión anterior
(menú "⋯" con las descargas dentro): cada fila muestra 3 iconos
reconocibles — Editar (lápiz), PDF (`FileText`) y JPG (`ImageDown`), los
dos últimos solo una vez generado el documento — más la fecha/hora de
la última generación bajo el nombre. El menú "⋯" (`RowMenu`) se queda
solo para Eliminar. `RowMenu` gana un prop `extraActions` genérico (no
usado aquí ahora, pero reutilizable por cualquier pantalla que sí
necesite ese patrón).

**5. Validación de campos obligatorios del documento.** Versión de
examen, certificación y confirmación de examen final (solo si la
plantilla tiene esa sección — AOWD no tiene ninguna de las tres), al
menos una fila de progreso marcada, la fecha del Día 1, y la firma del
alumno — bloquean "Generar y descargar" con mensajes en rojo junto a
cada sección si faltan (`recordConfig.js`, `validateRecordConfig()`,
con tests unitarios exhaustivos). "Versión en línea" y "Open Water
Diver" vienen premarcados por defecto (pedido explícito), así que en
la práctica casi nunca hace falta tocarlos.

**6. Ajustes visuales del PDF — reescritura de `pdfFill.js`.** Los
valores ya no se escriben con `form.getTextField(...).setText()`: se
dibujan a mano (`page.drawText`, igual que ya hacían las firmas) para
poder controlarlos del todo, pedido explícito del usuario:
- **Mayúscula, color de marca (`#0F766E`, el TEAL de Ocean Flow) en vez
  del negro de la plantilla, fuente Helvetica** (estándar de PDF, sin
  incrustar un archivo de fuente aparte, visualmente próxima a la
  fuente sans-serif de las plantillas reales).
- **Centrado y por encima de la línea impresa**, nunca tapado por
  ella — posición calculada desde el rectángulo real de cada campo
  (mismo dato ya usado para las firmas).
- **Firmas más grandes** (`SIGNATURE_BOOST = 1.7`, sin el tope de
  escala ×1 que tenían antes) — pedido explícito ("apenas se ven... si
  parte de la firma cae sobre la línea, no pasa nada").
Verificado renderizando el PDF real generado (`pdftoppm`), no solo
asumido — ver captura en la sesión, texto e iniciales en mayúscula
teal bien centrados, firmas claramente más visibles que antes.

**7. Fechas por fila de progreso (corregido 2026-09-02, mismo día,
tras feedback directo del usuario).** El primer corte de este punto
agrupaba las filas de progreso en fechas de "Día 1"/"Día 2"/"Día 3"
compartidas — el usuario aclaró que su petición original era otra:
**cada item del progreso del curso lleva su propio campo de fecha,
seteable a mano justo ahí**, sin ningún agrupado por día. Se ha
revertido el agrupado por completo:
  - `templateFieldMaps.js` pierde el campo `day` de `progressRow()` —
    ya no agrupa nada, cada fila es independiente.
  - `recordConfig.js`: `config.dayDates` (por día) pasa a ser
    `config.rowDates` (por índice de fila). La confirmación de examen
    final (OWD/SC-DD/SC-EAN) también gana su propia fecha manual
    (`examConfirmedDate`) en vez de derivarse sola del "último día
    activo" — mismo criterio de "cada item marcado lleva su fecha" que
    el resto de filas, más simple que mantener un caso especial. Cada
    inmersión de especialidad completada de AOWD (combo, ver punto 8)
    también gana su propia fecha (`specialtyDives[i].date`).
  - `StudentRecordSheet.jsx`: cada fila de progreso (`ProgressRowToggle`)
    muestra su propio `DatePicker` (con el botón "Hoy" del punto 9) en
    cuanto se marca, en vez de una sección "Fechas" aparte al principio
    de la hoja. Validación por fila: si una fila está marcada y le
    falta la fecha, aviso justo debajo de esa fila.
  - Las dos preguntas que quedaban "pendientes de confirmar" en el
    primer corte (agrupación de OW5/OW6 y de Sesiones Académicas de
    AOWD) **quedan resueltas por descarte** — al no existir ya ningún
    agrupado por día, no hay nada que confirmar.
  - Fecha de las firmas: sigue siendo siempre la fecha de generación
    del PDF (`generatedAtLabel`), sin cambios — no es un "item de
    progreso", es la fecha real en que se firma el documento.
  - Verificado de nuevo end-to-end con `scripts/mobile-check-training-records.mjs`
    (actualizado al nuevo flujo: un tap "Hoy" por fila) y con el PDF
    real renderizado — cada fila del documento generado muestra su
    propia fecha correctamente.

**8. Combo de aventuras de Advanced (AOWD).** Tabla nueva
`training_record_adventures` (migración `0010`, sembrada con las 6
aventuras que dio el usuario: Flotabilidad perfecta, Buceo nocturno,
Computador de buceo, Barco hundido, Identificación de peces,
Corrientes) — nunca hardcodeadas en código (convención 1 de
CLAUDE.md). El campo de texto libre de "Nombre de la especialidad" se
sustituye por un `Select` con estas opciones. Elegir una aventura
marca automáticamente esa fila como completada (fecha del Día 2); la
fila de "sesión en la piscina" se deja siempre sin usar desde este
combo, pedido explícito ("rellenaremos solo la opción de Inmersión...
3, 4 y 5").

**9. Selector de fecha compartido mejorado.** `DatePicker` en
`shared.jsx` (usado en toda la app, no solo aquí) gana un botón "Hoy"
al principio del panel — un toque para el caso más común con
diferencia (fecha de curso = hoy o muy reciente) — y las celdas de día
pasan de 36px a 40px de alto, más cerca del objetivo táctil mínimo de
la convención 7. Mejora hecha en el componente base, no duplicada
localmente, pedido explícito del usuario.

**10. Persistencia entre recargas.** El roster completo (alumnos,
configuración de cada uno, PDF ya generado en bytes) se guarda en
`sessionStorage` (`oceanpulse:trainingRecordsSession`, PDF
codificado en base64) y se restaura al montar — sobrevive a recargar
la página, pedido explícito del usuario ("si tengo alumnos y/o
documentos generados, mantenerlos"). Sigue sin sobrevivir a cerrar la
pestaña ni la sesión — mismo criterio de "efímero" que ya regía este
módulo, solo ampliado de "mientras dure la instancia de React" a
"mientras dure la pestaña del navegador".

**11. Estado vacío con enlace.** "Todavía no has añadido ningún
alumno." + un enlace de texto "Añade tu primer alumno" (además del
FAB) que abre la misma hoja de creación.

**12. Bug real corregido en desarrollo** (encontrado montando el
punto 3, no reportado por el usuario): sembrar la configuración de un
alumno solo en un `useEffect` (después del primer render) reventaba la
pantalla entera al abrir plantillas con inmersiones de especialidad
(AOWD) — su JSX ya lee `specialtyDives[i]` en ese primer render, antes
de que el efecto llegara a rellenarlo. Corregido sembrando también con
inicializadores perezosos de `useState`. Test de regresión con la
plantilla AOWD real (no mockeada) — confirmado que falla sin el fix.

**Respuesta a la pregunta del usuario ("¿cuáles más podrías procesar
como plantilla?"):** hoy solo las mismas 4 (OWD, AOWD, SC-DD, SC-EAN)
son procesables — son las únicas con campos de formulario PDF
rellenables de verdad. Las otras 6 (BD, SC-LV, SC-NV, SC-PB, SC-RR,
SC-SR) siguen sin ningún campo interactivo en el PDF original; la
regla de fechas para BD que dio el usuario queda anotada arriba para
cuando se aborden, pero construirlas requiere el enfoque de
superposición de texto por coordenadas que se decidió no hacer todavía
(ver "hallazgo" original de esta misma Fase 5).

**Verificación:** `npm run test` (622/622) y `npm run build` en verde.
`scripts/mobile-check-training-records.mjs` reescrito de arriba a
abajo para el nuevo flujo (Chromium + iPhone 14 Pro Max) — recorrido
real completo: perfil del instructor con firma → crear alumno → elegir
plantilla → fechas con "Hoy" → confirmación de examen → firma del
alumno → generar → PDF y JPG descargados → recargar página → roster
sigue ahí. Sin errores de consola. PDF real renderizado a imagen
(`pdftoppm`) y revisado a mano: mayúscula/color/centrado/firmas
correctos.

**Decisiones cerradas con el usuario 2026-09-02 (sesión anterior,
siguen vigentes):**
- **Acceso en la navegación:** se queda dentro de Configuración, mismo
  patrón que Escuelas/Cursos/Tarifas — confirmado, no se cambia nada.
- **Las 6 plantillas sin campos de formulario rellenables** (BD, SC-LV,
  SC-NV, SC-PB, SC-RR, SC-SR): quedan fuera del generador (no se
  construye el enfoque de superponer texto por coordenadas). Pedido
  explícito del usuario: movidas a un directorio separado dentro del
  mismo bucket de Storage para que las revise aparte —
  `pending-review/<CÓDIGO>/...` dentro de `training-record-templates`
  (antes vivían junto a las 4 activas, cada una en su propia carpeta
  `<CÓDIGO>/`). `training_record_templates.storage_path` actualizado a
  la ruta nueva para las 6 filas; `status` sigue en
  `pending_validation` sin cambios — es un reordenamiento físico en
  Storage para revisión humana, no un cambio de comportamiento de la
  app (ya filtraba por `status = 'active'`, así que estas 6 nunca se
  ofrecían de todos modos). Nada de código tocado: todo el código que
  lee `storage_path` lo hace dinámicamente desde la fila de la tabla,
  no con una ruta hardcodeada.

**Queda pendiente:**

1. **Confirmar 2 supuestos de agrupación de fechas** (ver punto 7
   arriba): a qué día pertenecen las filas opcionales OW5/OW6 de OWD
   (se les dio un Día 3 propio, no descrito en el encargo), y si
   "Sesiones Académicas" de AOWD va de verdad con el Día 1 (supuesto,
   no confirmado explícitamente).
2. El pipeline de análisis automático de plantillas nuevas (lo que
   subiría un admin en el futuro) sigue explícitamente fuera de
   alcance hasta que la interfaz de generación esté terminada, tal
   como pedía el encargo original.
3. Las 6 plantillas sin campos de formulario (BD y el resto) siguen sin
   abordar — la regla de fechas de BD que dio el usuario en este lote
   ya queda anotada para cuando se decida construirlas.
4. Fusión a `develop`: sigue pendiente de revisión y aprobación
   explícita del usuario, como el resto de esta rama.

### Técnica validada para las 6 plantillas sin campos de formulario (2026-09-02, sin wiring todavía)

El usuario pidió explícitamente añadir campos a las 6 plantillas sin
AcroForm (BD, SC-LV, SC-NV, SC-PB, SC-RR, SC-SR), con verificación
visual por plantilla antes de darla por buena (no adivinar coordenadas
a ojo, mismo criterio de rigor que ya regía las 4 plantillas con
campos). Técnica desarrollada y validada con **SC-LV** como piloto:

- **Extracción real de coordenadas** (`scripts/extract-flat-template-rects.mjs`):
  usa `page.getOperatorList()`
  de pdfjs-dist para parsear el content stream real del PDF y localizar
  cada recuadro gris relleno (`setFillRGBColor` ~`#f1f1f2` seguido de
  `constructPath` con un rectángulo simple) — no una medición a ojo
  sobre la imagen renderizada. pdfjs-dist ya optimiza un rectángulo
  simple relleno a un único `constructPath` cuyo tercer argumento es
  directamente `[minX, minY, maxX, maxY]`.
- **Verificación visual** (`scripts/render-flat-template-rects-overlay.mjs`):
  renderiza la página real y numera cada recuadro extraído encima de su
  posición — confirmado pixel-perfecto contra las 36 cajas de SC-LV
  (ver `training-records-debug/SC-LV-rects-overlay.png`, no
  versionado). Mismo patrón de fila de 4 columnas (Iniciales del
  Alumno/Fecha/Iniciales del Instructor/Número SSI Pro) que las
  plantillas ya soportadas — filas: Sesiones Académicas, Habilidades en
  Piscina (opcional), Inmersión 1, Inmersión 2, Inmersión Adicional
  (opcional), Confirmación de Examen Final; firmas alumno/tutor/
  instructor con sus 2 filas.
- **Checkboxes de versión de examen** ("Versión Impresa"/"Versión
  Online"): SC-LV no los dibuja como rectángulo relleno (son solo
  contorno), así que no los captura la extracción anterior. Posición
  derivada por patrón desde una plantilla real ya soportada (SC-DD:
  hueco de 5.4pt entre el borde derecho del checkbox de 6×6pt y el
  inicio del texto de la etiqueta, aplicado a la posición real del
  texto de SC-LV vía `page.getTextContent()`) — menor confianza que las
  filas de datos (extracción exacta) pero igual de defendible que
  cualquier posición ya usada en producción, no una suposición sin
  referencia.

**Por qué no se ha hecho el wiring todavía** (`templateFieldMaps.js`
con un tipo de campo "rect" en vez de nombre de campo AcroForm, soporte
en `pdfFill.js` para dibujar checkboxes a mano cuando no hay
`form.getCheckBox()` real, entrada en la configuración compartida del
Generador + tests): el Bloque 5 del mismo job nocturno reconstruyó la
pantalla del generador de arriba a abajo justo después de esto (ver
"Actualización 2026-09-03" más abajo) — conectar las 6 plantillas
contra la pantalla vieja, ya sustituida, habría sido trabajo tirado.
Los datos de coordenadas de SC-LV (`training-records-debug/SC-LV-rects.json`,
no versionado) se conservan para reutilizarlos cuando se haga el
wiring real, contra la pantalla NUEVA (configuración compartida por
listado), con las 5 plantillas restantes y la misma técnica ya
validada. Sigue sin abordar.

### ✅ Actualización 2026-09-03 (job nocturno por lotes, Bloque 5 — rediseño de concepto)

Cambio de arquitectura pedido explícitamente por el usuario, corrigiendo
el diseño "una plantilla+configuración por alumno" del lote anterior
(2026-09-02): **"no es una configuración de Training Record por
alumno, es una configuración de Training Record para un listado de
alumnos"**.

- La configuración del documento (plantilla, filas de progreso con su
  fecha cada una, versión de examen, certificación, confirmación de
  examen, inmersiones de especialidad de AOWD) se rellena **una única
  vez**, directamente en la pantalla del Generador — deja de vivir
  dentro de la hoja de cada alumno.
- `StudentRecordSheet.jsx` se retira; `StudentQuickEntrySheet.jsx`
  (nuevo) es una hoja mínima con solo lo que varía de un alumno a
  otro: nombre, apellidos, iniciales (calculadas) y firma (+ firma de
  tutor, opcional, conservada del lote anterior — no explícitamente
  mencionada en el encargo de este bloque, pero es un dato claramente
  ligado al alumno, no a la configuración compartida, así que se
  mantuvo ahí en vez de descartarla).
- `recordConfig.js`: `validateRecordConfig()` deja de exigir firma
  (era el único dato "por alumno" que quedaba mezclado en la
  configuración compartida); `validateStudentFields()` (nueva) valida
  cada alumno por separado. `buildFillData()` toma las firmas del
  propio alumno, no de la configuración.
- "Generar para todos los alumnos": un único botón rellena el
  documento de TODOS los alumnos del listado de golpe, descargando la
  plantilla una sola vez y reutilizándola para cada uno.
- Descarga/compartir: se mantienen los iconos individuales por fila
  (PDF/JPG/Compartir, ya construidos en el lote anterior) y se añade
  una sección "Todo el listado" — descargar todo en PDF, todo en JPG
  (secuencial con una pausa entre cada descarga; varios navegadores
  bloquean descargas simultáneas disparadas de golpe), o compartir
  todo a la vez vía Web Share API con varios ficheros adjuntos (si el
  navegador lo soporta — mismo criterio de "el icono ni aparece si no
  hay soporte" que ya regía el compartir individual).
- Alumnos con datos incompletos (falta firma, nombre...) se marcan con
  un aviso visual en la propia fila del listado, en vez de fallar en
  silencio o bloquear sin explicación al pulsar "Generar".

**Verificación:** `npm run test` (616/616) y `npm run build` en verde.
`scripts/mobile-check-training-records.mjs` reescrito para el nuevo
flujo (Chromium + iPhone 14 Pro Max): configurar una vez, añadir 2
alumnos, generar los 2 de golpe, descargar PDF de uno y JPG de otro,
recargar la página y comprobar que el listado completo (config +
alumnos + documentos ya generados) sigue ahí.

### ✅ Actualización 2026-09-03 (continuación) — rediseño visual completo, KPIs de Home/Movimientos, y fusión con Release-V1

Tras el rediseño de concepto (arriba), pedido explícito del usuario a
mitad de sesión de rediseñar el estilado del generador entero (commit
`d5609ea`): fechas de cada item de progreso compactas en una fila,
icono de editar sustituido por "Regenerar TR" individual por alumno,
card de datos de instructor (avatar, iniciales, SSI PRO Number,
firma), curso a certificar + cambiar plantilla en la misma línea, y
"Todo el listado" con PDF/JPG/compartir más visual.

De la misma noche, ya integrados en esta rama: KPIs de Home movidos a
primera posición (Bloque 9), acceso a Training Records desde una
tarjeta en Home en vez de dentro de Configuración (Bloque 10), y los 3
KPIs animados de Mi trabajo/Movimientos (Generado/Pendiente/Cobrado
este mes, Bloque 11).

Dos bugs reales reportados por el usuario probando en su iPhone
(Safari), ambos corregidos:
- Firmar en el pad de firma podía cerrar la hoja y devolver al menú de
  Configuración — reforzado el bloqueo de scroll de `useBodyScrollLock`
  (ahora bloquea también `<html>`, no solo `<body>`) y añadido
  `overscroll-behavior-y: none` a nivel de documento.
- Editar un alumno o añadir uno nuevo podía bloquear la UI con la hoja
  estirándose hacia arriba — causa: `max-h-[85dvh]` se recalcula en
  vivo con la barra de Safari y podía desajustarse durante el bloqueo
  de scroll; cambiado a `max-h-[85svh]` (conservador, nunca se pasa
  del viewport visible).
- Descargar un PDF/JPG fallaba en Safari con "Error de
  WebKitBlobResource" — `downloadBytes()` revocaba el `blob:` URL en
  el mismo tick que el clic de descarga; Safari gestiona la descarga
  de forma asíncrona (a diferencia de Chrome) y revocar tan pronto
  cortaba la descarga a mitad. Arreglado retrasando la revocación 1s.

**Fusión con `Release-V1`:** esta rama (`feature/training-records`) se
fusiona con `Release-V1` esta misma noche. Colisión de numeración de
migraciones ya resuelta antes de fusionar: esta rama tenía
`0009-datos-instructor-perfil.sql`/`0010-firma-instructor-y-aventuras.sql`,
pero `Release-V1` ya tenía sus propios `0009-invitation-links.sql`/
`0010-avisos-generalizados.sql` con contenido distinto — renumeradas a
`0011`/`0012` (siguientes libres tras el `0008` de plantillas de
Training Records, que no colisionaba). Ninguna migración ya aplicada a
TEST se re-ejecutó ni se deshizo — solo se renombraron los ficheros y
sus referencias cruzadas.

## Fase 6 — Slides y avisos (🟡 en curso)

### Lo hecho

- Migración aditiva `0010-avisos-generalizados.sql` aplicada a TEST
  (rollback documentado en el propio fichero antes de ejecutar):
  columna `deployment_notices.audience` (`'all'`/`'superadmin'`,
  default `'superadmin'` — ninguna fila existente cambia de
  comportamiento) + policy de lectura generalizada.
- `server/notifications/notifyDeployment.js` acepta `audience` en el
  body (default `'superadmin'`, compatible con todas las llamadas que
  ya existían) y lo guarda en la fila — pero el EMAIL sigue yendo
  exclusivamente a superadmins, sea cual sea `audience`. La plantilla
  actual (`deploymentNoticeEmailTemplate.js`: "nuevo despliegue", hash
  de commit, botones de Preview Deployment) es contenido de
  desarrollo — enviárselo por email a un usuario normal con el tono
  actual sería justo el "mensaje de máquina" que la regla 2 de Release
  V1 prohíbe. `audience='all'` hoy solo controla quién puede VER el
  aviso dentro de la app (RLS + `DeploymentNotice.jsx`), no a quién se
  le manda un email. Generalizar el email necesitaría su propia
  plantilla con copy cercano — deliberadamente no construida esta
  noche.
- `src/DeploymentNotice.jsx` generalizado: ya no se monta solo para
  `profile.is_superadmin` (ver `App.jsx`) — se monta para cualquier
  usuario con sesión, y la consulta trae avisos de `audience='all'`
  (para cualquiera) o `audience='superadmin'` (solo si
  `profile.is_superadmin`). Regla añadida que no estaba en el
  mecanismo original: un aviso con `created_at` anterior a la fecha de
  alta del usuario (`profiles.created_at`) nunca se le muestra — sin
  esto, una cuenta nueva vería como "novedad" un aviso de antes de que
  existiera, el comportamiento explícito que pedía el encargo
  ("usuarios creados después del deploy nunca lo ven").

### ⚠️ Deliberadamente NO hecho — necesita una decisión del usuario

El encargo original pedía sustituir también el gate de `WhatsNew.jsx`
(hoy por versión de app en `localStorage`) por este mismo mecanismo de
BD. **No lo he hecho** porque hay una tensión real, no solo un detalle
de implementación:

- `WhatsNew.jsx` es un tour de producto con contenido curado a mano (5
  diapositivas, icono+título+frase por diapositiva, tono cercano —
  ver el propio archivo) que además construí en la Fase 4 de esta
  misma noche como destino de "Ver qué hay de nuevo" en Ayuda.
- `deployment_notices` es un aviso por sesión/commit de trabajo, con
  el formato técnico que ya usa `DeploymentNotice.jsx`
  (`summary`/`technical_changes`/`functional_changes`, pensado para
  que YO (Claude) lo redacte al cerrar un bloque de trabajo).
- Fusionar los dos gates sin fusionar el contenido dejaría "Ver qué
  hay de nuevo" sin nada que mostrar, o mostraría el resumen técnico
  de un commit cualquiera como si fuera el tour de producto — ninguna
  de las dos cosas parece lo que se pidió, y no tengo el texto
  original completo del encargo (la sesión llevaba muchas horas y este
  detalle se resumió, no se guardó literal) para estar seguro de cuál
  de las dos interpretaciones es la correcta.

**Lo que hay ahora mismo:** las dos siguen coexistiendo tal cual
estaban — `WhatsNew.jsx` con su gate de versión en `localStorage` sin
tocar, `DeploymentNotice.jsx` generalizado a las dos audiencias como
mecanismo aparte. Nada se ha roto ni se ha perdido; solo falta decidir
si de verdad deben fusionarse y, si es que sí, con qué contenido.

**Decisión confirmada 2026-09-02 (09:20, ventana rápida antes de que el
usuario se desconectara hasta las 18h):** dejarlos separados por ahora.
`WhatsNew.jsx` sigue siendo el tour de producto por versión, con su
propio gate en `localStorage`, sin tocar. `deployment_notices`
`audience='all'` queda como mecanismo aparte, para cuando en el futuro
haga falta redactar un aviso puntual dirigido a cualquier usuario (no
un resumen técnico) — sin fusionar contenido ni gate con WhatsNew. No
se replantea esto salvo que surja una razón concreta más adelante.

### Verificación

`npm run test`/`npm run build` en verde (ver commit). Pendiente de
`mobile-check`/navegador real, igual que el resto de piezas de esta
noche.

## Fase 7 — Usabilidad, carga y escalabilidad (✅ 2026-09-02)

Análisis teórico/documental, sin pruebas de carga reales contra
Supabase TEST (decisión ya tomada, ver "Análisis de riesgos" arriba) —
revisión real del código, no una checklist genérica.

### Patrón de acceso a datos encontrado

`useSupabaseTable.js` (el hook genérico detrás de casi toda la app) hace
`select("*").order(orderBy)` **sin límite ni paginación** — cada tabla
de negocio (`worklog`, `comisiones`, `colleague_payments`, `rates`,
`commission_rates`...) se trae ENTERA a memoria del cliente en cada
carga de `App.jsx`, y el resto de la app (listas, calendarios,
agregados de Resumen) calcula todo en el propio navegador sobre ese
array completo. No hay ninguna consulta agregada en servidor (ni una
función RPC de suma/count) — todos los totales de Resumen/Home se
calculan en JS sobre las filas ya cargadas.

**Por qué esto NO es un problema hoy, con números reales:** el alcance
del producto ya excluye B2B (ADR-0001) — una cuenta es un instructor
freelance, no una escuela con miles de reservas. Un instructor con
actividad diaria intensa (varios cursos/día, todos los días del año)
generaría del orden de mil-pocos-miles de filas por tabla al año. Eso
es una respuesta de PostgREST de milisegundos y un array trivial de
manejar en cualquier navegador moderno — no hay indicio real de que la
carga completa sea lenta a este volumen. **El eje real de crecimiento
de esta app es el NÚMERO DE CUENTAS (más instructores dándose de alta),
no el volumen de datos DENTRO de una cuenta** — y cada cuenta ya está
aislada por RLS, así que más cuentas no compiten por trabajo entre sí
más allá de la cuota compartida de la instalación de Supabase.

### Límites de la infraestructura actual (plan Free/Hobby) vs. patrones reales

- **Supabase Free:** 500MB de base de datos, ~2GB de transferencia/mes.
  A los tamaños de fila de este esquema (sin blobs — las plantillas de
  Training Records viven en Storage, no en filas), decenas de miles de
  movimientos por cuenta caben cómodos en ese límite. El backup manual
  semanal ya documentado (`docs/ADR/0017`) sigue siendo la única red de
  seguridad — sin cambios aquí, es una decisión de coste ya en
  `docs/BACKLOG.md`, no algo que resolver en esta fase.
- **Vercel (funciones serverless, `api/*.js`):** límite de ejecución
  (10s en Hobby) muy por encima de lo que tarda cualquier endpoint
  actual (altas de usuario, envío de email, generación de enlaces) —
  todos son operaciones puntuales de un solo usuario, no procesamiento
  en lote. Sin riesgo real hoy.
- **RLS y el patrón "traer todo, filtrar en cliente":** ningún índice
  explícito más allá de las claves primarias/foráneas en `schema.sql` —
  a este volumen por cuenta, el planificador de Postgres resuelve un
  `select * where user_id = $1` con o sin índice adicional en un tiempo
  indistinguible. Añadir índices ahora sería optimizar sin problema
  medido — exactamente la sobreingeniería que `CLAUDE.md` pide evitar.

### Recomendación concreta (para cuándo, no para ahora)

**No cambiar nada de arquitectura de datos en esta fase.** La única
señal real que justificaría paginar/agregar en servidor sería una
cuenta con varios años de uso intensivo notando lentitud real — no
hay evidencia de que exista hoy. Si llega esa señal, la recomendación
concreta (por si hace falta consultarla más adelante) sería, en orden
de esfuerzo creciente: (1) limitar `useSupabaseTable` a un rango de
fechas razonable por defecto (p. ej. año en curso) con un selector para
ver años anteriores, antes de (2) mover los totales de Resumen a una
función RPC agregada en servidor. Ninguna de las dos se implementa
ahora — no hay una cuenta real que lo necesite todavía.

### Verificación

Ningún cambio de código en esta fase — es puramente un documento de
análisis, tal como decidió el propio riesgo de la fase.

### Addendum — Monitorización de infraestructura (Bloque 18, job nocturno 2026-09-03)

Encargo explícito: "estudiar alertas de consumo de recursos en Vercel/
Supabase antes de abrir el registro público". Análisis documental,
igual que el resto de esta fase — sin acceso a los dashboards reales
de Vercel/Supabase desde esta sesión (no hay token de API configurado
para consultarlos en vivo), así que esto son las alertas
RECOMENDADAS a configurar a mano, no una comprobación de los valores
actuales.

**Por qué ahora, no antes:** con registro cerrado (altas solo por
invitación de un superadmin, ver `docs/ADR/0024`/`0025`), el número de
cuentas está bajo control total del propio usuario — no hace falta
ninguna alerta para eso. En cuanto el registro público esté disponible,
el número de cuentas deja de estar bajo ese control directo, y es
justo ese eje (más cuentas, no más datos por cuenta — ver el análisis
de escalabilidad de arriba) el que puede acercarse a los límites del
plan gratuito sin que nadie lo note hasta que algo falle.

**Supabase (plan Free) — alertas a configurar en Project Settings →
Usage, o Billing → Alerts si el proyecto ya está en un plan de pago
con facturación por uso:**
- Tamaño de base de datos: umbral en 400MB (80% de los 500MB del plan
  Free) — con margen para migrar de plan con calma, no en caliente.
- Filas de `auth.users` / cuentas activas: sin alerta nativa de
  Supabase para esto — la señal práctica es el propio tamaño de BBDD
  de arriba, que ya crece con cada cuenta nueva.
- Transferencia de red (egress) mensual: umbral en el 80% del límite
  del plan — el más fácil de disparar sin avisar si el registro
  público trae un pico de altas inesperado.
- Storage (plantillas de Training Records + firmas, aunque las firmas
  de alumno son efímeras y nunca se persisten — ver Fase 5): revisar
  el % de uso una vez al mes mientras el registro esté abierto, no
  hace falta alerta automática todavía a los volúmenes actuales.

**Vercel (plan Hobby) — alertas a configurar en el dashboard del
proyecto → Settings → Usage, o en la app de Vercel para notificaciones
push:**
- Invocaciones de funciones serverless (`api/*.js`): el plan Hobby
  tiene un límite mensual — Vercel ya notifica por email al acercarse,
  pero conviene confirmar que esa notificación llega a la cuenta
  correcta (la que gestiona el despliegue, no una cuenta de desarrollo
  aparte).
- Ancho de banda: mismo criterio que Supabase — un pico de registro
  público es el escenario más probable de disparo.
- Build minutes: bajo riesgo real (el build local tarda ~1,7s, ver
  Bloque 13 del job nocturno) — no necesita alerta dedicada.

**Recomendación concreta:** antes de abrir el registro público,
configurar a mano (Claude Code no tiene acceso a estos dashboards)
las alertas de tamaño de BBDD y transferencia de red en Supabase, y
confirmar que las notificaciones nativas de Vercel llegan a la cuenta
correcta — son las dos señales más baratas de vigilar y las más
probables de disparar primero si el registro público trae más altas
de las esperadas. No hace falta nada más sofisticado (un panel de
monitorización propio, alertas custom vía webhook) a este tamaño de
proyecto — sería la misma sobreingeniería que el resto de esta fase
ya decidió evitar.

## Fase 8 — Revisión visual y libro de estilo (✅ 2026-09-02)

Sin backend ni BBDD nueva, tal como pedía el encargo. `docs/ESTILO.md`
actualizado con 4 patrones reales consolidados durante esta sesión:

1. Objetivo táctil 44×44 sin estirar el layout (el fix del bug de
   `Field`, generalizado como principio para cualquier icono futuro).
2. `src/auth/PasswordFields.jsx` como el sitio único para campos de
   contraseña — documentado para que una cuarta pantalla futura no
   vuelva a duplicar en vez de importar.
3. Catálogos cerrados de iconos: el tamaño lo decide lo que existe de
   verdad, nunca rellenar hasta un número "redondo".
4. `ActivationLinkPanel` + su prop `hideMockEmailButton`, ahora
   reutilizado por un cuarto flujo (enlace de invitación).

**No se ha hecho** un pulido visual pixel-a-pixel de toda la app (fuera
de proporción para una sola fase, sin evidencia de que haga falta) ni
se ha tocado nada en `feature/training-records` (un hallazgo de
consistencia real se documentó en la Fase 5 en vez de comitear ahí
mientras el usuario revisa ese PR — ver esa sección).

### Verificación

`npm run test`/`npm run build` en verde (sin cambios de código en esta
fase, solo documentación).

---

## Fase 9 — Cierre de Release V1 y despliegue a producción (🟡 en curso, 2026-09-03/04)

### Lo hecho

**Auditoría de lint en `Release-V1` y fusión a `develop`** (petición
explícita: "piensa q después irá a PRO, asique analiza loq se pueda
corregir y hazlo para luego volver a probar el proceso"):

- `npm run lint` bajado de 245 problemas (229 errores) a 0 errores / 9
  avisos, todos verificados uno a uno como omisiones seguras de
  `react-hooks/exhaustive-deps` (la función cerrada sobre el closure
  depende solo de valores que ya están en el array de dependencias —
  mismo patrón ya usado en varios sitios de la app).
- Cambios: 4 reglas de "preparación para React Compiler" desactivadas en
  `eslint.config.js` con justificación documentada por regla (proyecto
  no adopta React Compiler); `.vercel` a `globalIgnores`; `vite.config.js`
  al patrón de globals de Node; imports `React` sin usar eliminados en 7
  archivos; 6 directivas `eslint-disable` obsoletas convertidas en
  comentarios normales; `global.` → `globalThis.` en 5 archivos de test
  restantes; un `eslint-disable-next-line` mal colocado corregido en
  `DatasetsSection.jsx` (el comentario explicativo de 2 líneas hacía que
  la directiva no cubriera la línea de código real — solucionado
  colapsándola a una sola línea inmediatamente antes del código).
- Commit `82eba44` en `Release-V1`, `npm run test -- --run` (695/695) y
  `npm run build` en verde, preview de Vercel verificado en navegador
  headless (badge TEST, sin errores de consola), aviso de despliegue
  enviado.
- **Fusión `Release-V1` → `develop`**: confirmado de antemano
  (`git merge-base --is-ancestor`) que `develop` era ancestro estricto de
  `Release-V1` → fast-forward limpio, 0 conflictos. `develop` pasó de
  `1e7b7bd` a `82eba44`. Tests/build en verde también en `develop`,
  push hecho, preview del entorno TEST (`dive-tracker-three.vercel.app`)
  verificado en navegador headless. Segundo aviso de despliegue
  deduplicado solo por idempotencia de `commit_hash` (`already_notified:
  true`) — comportamiento correcto, mismo commit ya notificado.

### Auditoría de mecanismos de despliegue — resultado

Pedido explícito: "¿se han seguido todos los mecanismos de despliegues
definidos... changelog actualizado y demás?" Resultado real, contrastado
contra `ADR-0006`, `ADR-0010`, `ADR-0025` y `CLAUDE.md`:

| Mecanismo | Estado |
|---|---|
| Rama efímera → `develop`, tests+build antes de push, Preview verificado | ✅ Seguido en esta fase |
| `CHANGELOG.md` actualizado por commit (regla de ADR-0010) | ❌ `## Unreleased` vacío desde v0.2.0 (2026-08-30) pese a ~160 commits reales de Release V1 |
| `package.json` version bump | ❌ Sigue en `0.2.0` |
| Tag `vX.Y.Z` sobre el commit de release | ❌ No existe tag posterior a `v0.2.0` |
| `npm run mobile-check` antes de cerrar cambios de UI (CLAUDE.md regla 8) | ⚠️ Sin evidencia de haberse ejecutado esta sesión, con UI extensa de por medio (carnet, KPIs, WhatsNew) |
| `gh release create` (paso 7, ADR-0010) | ⚠️ Se saltó en v0.2.0 por no tener `gh` CLI — **ahora sí está instalada** (`gh 2.98.0`, confirmado en el entorno), se puede completar esta vez |
| Protección de rama `main` en GitHub (prevista en ADR-0006) | ⚠️ No configurada (`Branch not protected` vía API) — no bloqueante, mejora aparte |
| Training Records fuera de este release (instrucción explícita del usuario: "quita todo lo relacionado con TR... porque no saldrá, se desplegará en una versión posterior") | ❌ Solo se quitó de Ayuda/WhatsNew — la tarjeta de Home (`HomeTab.jsx`, bloque `onOpenTrainingRecords`) y la sección de Configuración siguen live en `develop`. Fase 5 de este mismo documento sigue 🟡 en curso (2 supuestos de fecha sin confirmar, 6 plantillas sin campos) |
| `EMAIL_FROM` en Vercel prod (proyecto `oceanflow`, antes `dive-tracker-exgg`) | ⚠️ Pendiente — pero es una decisión ya tomada por el usuario el 2026-09-02 ("se hace junto al próximo despliegue real a PROD", ver Fase 4/nota de Resend arriba). No es un descuido, es precisamente este momento |
| Migraciones (`0001`-`0013`) | ℹ️ Todas aditivas, aplicadas solo en TEST, ninguna en producción — esperado, entra en el plan de abajo |
| `ADR-0025` (tabla `schema_migrations` de seguimiento) | ℹ️ Sigue "Propuesta, sin aprobar" — se ofrece como opción en el plan, no obligatoria |

Verificado además con `vercel env ls` real contra los dos proyectos:
`oceanflow` (prod) tiene `RESEND_API_KEY`/`APP_URL`/
`SUPABASE_SERVICE_ROLE_KEY`/`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
ya configuradas — falta solo `EMAIL_FROM`. Dominio de envío
`oceanflow.money` confirmado `verified` en Resend
(`scripts/check-resend-domain.local.mjs`). Prod no tiene dominio propio
en Vercel todavía (`vercel domains ls` → 0), sigue sirviendo desde
`dive-tracker-exgg.vercel.app`.

### Decisiones tomadas por el usuario (2026-09-04)

Presentadas con `AskUserQuestion`, ambas con recomendación explícita:

1. **Training Records → ocultarlo para este release** (opción
   recomendada, elegida). Quitar la tarjeta de `HomeTab.jsx` y el acceso
   a la sección de `ConfigTab.jsx`/`App.jsx` justo antes de fusionar a
   `main`. Código, migraciones (`0008`, `0011`, `0012`) y tablas quedan
   intactos — solo se cierran los 2 puntos de entrada. Reversible con un
   solo commit el día que se decida lanzarlo de verdad.
2. **Versión de la release → `v1.0.0`** (opción recomendada, elegida).
   Justificación: "Release V1" es literalmente el nombre de esta
   iniciativa y su objetivo es "hacer pública la app fuera de usuarios
   de test" — coincide con el disparador que el propio ADR-0010 fija
   para `MAJOR` ("el producto declara una superficie estable"), no una
   `MINOR` más.

### Plan de despliegue a PRO — corregido tras revisión del usuario (2026-09-04)

Pedido explícito del usuario: diseñar el plan (migraciones incluidas)
sin ejecutar nada. Incluye estrategia de rollback ligera pedida aparte
("ten en cuenta la operación de rollback completa del despliegue a PRO,
piensa algo ligero pero eficiente"). El plan original (sección anterior
de este documento, sustituida aquí) tenía 5 problemas reales detectados
por el usuario en revisión — corregidos abajo, no solo anotados:

1. **Migraciones "todas aditivas salvo 0002"**: incompleto. `0005` (además
   de añadir `avatar_icon`/`avatar_color`) también hace
   `drop column if exists default_currency` en la misma sentencia — se
   había leído como "solo añade columnas de avatar" y se pasó por alto.
   Confirmado con grep en `src/`/`server/` de `develop` Y de `main`
   (código hoy en producción) que ni `password_set` ni `default_currency`
   se leen ni se escriben en ningún sitio — ambas están tan muertas como
   se pensaba, pero son 2 migraciones destructivas, no 1.
2. **Sin backup de producción en ningún punto del plan** — contradice la
   lección ya fijada de que todo plan de despliegue a PRO debe incluir
   rollback explícito; un backup es el complemento que faltaba
   específicamente por 0002/0005 (un DROP COLUMN no lo deshace el
   rollback de código). Corregido: `scripts/backup-db.mjs` (`npm run
   backup:db`, ya existente — ver ADR-0017) antes de tocar producción.
   Confirmado por el usuario 2026-09-04: producción está en plan Free de
   Supabase, sin backups automáticos ni PITR — el dump manual es el único
   camino de vuelta, no una capa de refuerzo opcional.
3. **`scripts/apply-migration.mjs` no puede ejecutarse contra producción**
   tal como está escrito (paso B.3 del plan original) — exige
   `SUPABASE_TEST_DB_URL` por diseño, precisamente para que nunca se
   ejecute contra producción por accidente. Corregido con un script
   nuevo y separado, `scripts/apply-migration-prod.mjs` (construido
   2026-09-04): lee `SUPABASE_DB_URL` (misma variable que ya usa
   `backup-db.mjs`, para no mantener dos cadenas de conexión a la misma
   base) y exige además el flag explícito `--confirm-production`. El
   guard de `apply-migration.mjs` (TEST) no se ha tocado.
4. **Tag `v1.0.0` se creaba sobre `develop` en A.5, antes del merge a
   `main`** — no apuntaría al commit realmente desplegado. Corregido:
   el tag se mueve al final del Bloque C, después de verificar el
   despliegue real. Nota aparte: esto es un hueco real en el propio
   ADR-0010 (su ordenación de pasos asume que `develop` es la
   producción, cierto cuando se escribió, ya no); un addendum a esa ADR
   queda pendiente, deliberadamente para después de este despliegue
   (ver "Aplazado a después del despliegue" más abajo).
5. **Checklist post-despliegue solo cubría escritura** (registro,
   invitaciones, recuperación...) — nada verificaba que los datos reales
   del usuario siguieran íntegros tras las 13 migraciones antes de crear
   nada nuevo encima. Corregido: nuevo paso 0 en el Bloque E.

**A. Pre-flight sobre `develop` (antes de tocar `main`)**
1. ✅ Ocultar Training Records (ver decisión 1 arriba) — hecho
   2026-09-04: `HomeTab.jsx` deja de recibir `onOpenTrainingRecords`
   desde `App.jsx` (la tarjeta ya estaba condicionada a esa prop, no
   hizo falta tocar `HomeTab.jsx`); `ConfigTab.jsx` pierde
   `HIDDEN_SECTIONS`/`onOpenProfile` y su import de `TrainingRecordsTab`
   — sin ellos, `allowedSectionKeys` ya no reconoce `"training-records"`
   aunque algo escribiera esa clave a mano en `sessionStorage`. Ningún
   archivo de `src/trainingRecords/`, ninguna migración (`0008`, `0011`,
   `0012`) ni tabla tocados — 100% reversible con un solo commit.
   Verificado: `npm run lint` (0 errores, mismos 9 avisos preexistentes),
   `npm run test -- --run` (695/695), `npm run build` en verde, y
   comprobación manual en navegador (Chromium/Playwright, emulación
   iPhone 14 Pro Max) confirmando "Training Records" ausente tanto de
   Home como del menú de Configuración, sin errores de consola.
2. ✅ `CHANGELOG.md`: `## [1.0.0] - 2026-09-04` redactada, revisada por
   el usuario y corregida con 2 rondas de feedback — mover todo lo real
   de Release V1 (multidioma es/en, KPIs de Home reordenados, carnet de
   instructor, nivel profesional, monedas, registro externo +
   invitaciones, recuperación de contraseña, política de contraseña
   reforzada, avisos generalizados, auditoría de lint) de `## Unreleased` a
   `## [1.0.0] - 2026-09-04` — presentar el borrador para aprobación
   antes de commitear (regla de CLAUDE.md).
3. ✅ Bump de versión a `1.0.0` en **dos** sitios, no solo
   `package.json` — `src/version.js` (`APP_VERSION`) también gatea "Qué
   hay de nuevo" y su propio comentario exige moverla en el mismo commit
   que el CHANGELOG. Contenido de `WhatsNew` (namespace `notices`, 4
   diapositivas) revisado y coherente con lo que de verdad se despliega
   (sin ninguna mención a Training Records). Ajuste de test necesario:
   `App.test.jsx` fijaba `"0.2.0"` como versión "ya vista" en
   `localStorage` para probar la reapertura manual del slide —
   actualizado a `"1.0.0"` para seguir representando "ya visto en la
   versión actual", no una versión antigua real.
4. ✅ `npm run mobile-check` — bloqueado dos veces por causas ajenas a
   este cambio, ambas diagnosticadas y resueltas sin tocar producto:
   - La cuenta demo local tenía el idioma en inglés (quedó así de una
     sesión de prueba anterior de Fase 2) — el script asume español
     ("Mi trabajo"). Cambiado a español desde Mi perfil antes de
     reintentar.
   - El propio script (`scripts/mobile-check.mjs`) tiene una ambigüedad
     de selector preexistente y real, no introducida por este cambio:
     varias hojas comparten el aria-label "Cerrar" con el botón de
     cerrar de un toast (`role="status"`, tarda 3s en autodesaparecer,
     Bloque 7 de esta misma release) y, en las pantallas secundarias
     (Ayuda/Configuración), también con el "✕ Cerrar" de la cabecera
     exterior — confirmado en 2 timings distintos del recorrido. Un
     primer intento de arreglo genérico rompió otro paso del recorrido
     (la ambigüedad no es uniforme: unas veces hay que excluir el toast,
     otras el header, y a veces sí se quiere pulsar el del header) —
     revertido (`git checkout -- scripts/mobile-check.mjs`) en vez de
     seguir iterando, para no mezclar una reparación real de tooling
     (call-site por call-site, 13 sitios) con el trabajo de esta release,
     tal como pidió el usuario. **Pendiente para después del
     despliegue**, igual que el addendum de ADR-0010 y el hook de
     changelog (ver "Aplazado a después del despliegue" abajo).
   - **Verificación real hecha en su lugar** (Chromium/Playwright,
     emulación iPhone 14 Pro Max, cuenta demo en español): confirmado
     que "Training Records" no aparece ni en Home ni en el menú de
     Configuración, capturas de ambas pantallas revisadas visualmente,
     cero errores/avisos de consola. Cubre el cambio real de esta sesión;
     no sustituye el recorrido completo automatizado, que sigue
     pendiente de que se repare el script.
5. Commit `chore: preparar release v1.0.0` (CHANGELOG + ambas versiones),
   push `develop`. **El tag `v1.0.0` NO se crea aquí** — se mueve al
   final del Bloque C (ver punto 4 corregido más arriba: tagear
   `develop` antes del merge a `main` apuntaría a un commit que no es el
   que queda desplegado).

**B. Backup + migraciones — orden corregido: backup → aditivas → catálogo → destructivas aisladas**

1. `SUPABASE_DB_URL=<conexión directa de producción> npm run backup:db`
   (`scripts/backup-db.mjs`, ya existente, ADR-0017) — **antes de tocar
   producción con nada**. Confirmado por el usuario: producción en plan
   Free, sin backups automáticos ni PITR — este dump es el único camino
   de vuelta si algo depende de una columna que no se detectó.
2. Opcional, recomendado: `0014-schema-migrations-tracking.sql` (la
   tabla de `ADR-0025`, 4 líneas — resuelve "qué hay aplicado en cada
   entorno" de una vez; requiere aprobar esa ADR o al menos este paso
   suelto).
3. Las 11 migraciones puramente aditivas (`0001`, `0003`, `0004`, `0006`,
   `0007`, `0008`, `0009`, `0010`, `0011`, `0012`, `0013`) con
   `scripts/apply-migration-prod.mjs <archivo> --confirm-production`
   (script nuevo, construido 2026-09-04 — ver corrección 3 arriba).
   Verificación por archivo: consulta puntual confirmando que la
   columna/tabla existe (mismo criterio ya usado al aplicar contra TEST).
4. **Antes de tocar `0002`/`0005`**: consulta de catálogo (vistas,
   funciones/triggers, políticas RLS, índices que mencionen
   `password_set` o `default_currency`) contra el Postgres real de
   producción — no basta el grep de código de la corrección 1, la
   lógica también puede vivir en la base de datos. Query preparada en
   `check-column-deps.sql` (scratchpad de esta sesión). **Bloqueante:
   parar y enseñar el resultado al usuario antes de ejecutar 0002/0005**
   — instrucción explícita, no una sugerencia.
5. `0002` y `0005` al final, aisladas, solo si el paso 4 no encuentra
   nada — mismo comando que el paso 3, uno por uno, con su propia
   verificación (`select column_name from information_schema.columns
   where table_name='profiles' and column_name in ('password_set',
   'default_currency')` debe devolver 0 filas tras ambas).

**C. Merge y despliegue de código**
1. `git merge origin/develop` sobre `main` (**no** `--ff-only` — `main`
   tiene 1 commit propio, el hotfix `58d9b69`, ya backporteado a
   `develop` con contenido idéntico vía `1e7b7bd` — no debería haber
   conflicto real, solo una fusión trivial).
2. `npm run test -- --run` + `npm run build` sobre `main` ya fusionada.
3. Añadir `EMAIL_FROM=Ocean Flow <no-reply@oceanflow.money>` al proyecto
   Vercel `oceanflow` (Production).
4. `git push origin main` → Vercel despliega solo.
5. Verificación en navegador headless real contra
   `dive-tracker-exgg.vercel.app`, mismo protocolo ya usado en esta
   sesión.
6. **Solo tras el paso 5 en verde**: `git tag -a v1.0.0 -m "v1.0.0"`
   sobre el commit de merge en `main`, `git push origin main --tags`,
   `gh release create v1.0.0 --notes-file <extracto del CHANGELOG>`
   (cierra el paso que se saltó en v0.2.0 por falta de la CLI — ya
   instalada, `gh 2.98.0`). Corrección 4 de arriba: el tag ahora
   apunta al commit que de verdad queda desplegado, no a uno de
   `develop` previo al merge.

**D. Rollback — ligero para las 11 aditivas, distinto para 0002/0005**
- Código: "Instant Rollback" de Vercel al deployment anterior — segundos,
  sin tocar Git. Primera opción siempre, válida pase lo que pase con el
  esquema.
- Las 11 migraciones aditivas: **no hace falta revertirlas en
  caliente** — el código anterior sigue funcionando igual con las
  columnas/tablas nuevas presentes pero sin usar. Rollback de código y
  de esquema quedan desacoplados por diseño para estas 11.
- `0002`/`0005` (DROP COLUMN): **no** son additivas y su rollback no
  está desacoplado del código de la misma forma — si el paso B.4
  (catálogo) no encuentra nada, el código (viejo y nuevo) nunca las
  toca, así que Instant Rollback de código sigue siendo seguro; pero si
  algo se rompe por una de estas dos columnas, la única vuelta atrás
  real es restaurar desde el backup del paso B.1, no un rollback de
  código. Por eso van aisladas y al final, con el backup ya hecho antes.
- Si el problema real está en una migración concreta (de las 11): revertirla
  aparte, con calma, como una migración nueva de "contract" documentada —
  nunca en caliente durante el incidente.
- `git revert` sobre `main` + push como nivel 2 si Instant Rollback no
  basta; se etiqueta como `v1.0.1` con su entrada `Fixed` en el
  changelog (mismo patrón que ya define ADR-0010).

**E. Verificación post-despliegue — datos propios primero, luego los flujos que dependen de EMAIL_FROM**

Corrección 5: la checklist original solo cubría flujos de escritura
(registro, invitaciones...) — nada comprobaba que los datos reales del
usuario siguieran íntegros tras las 13 migraciones antes de crear nada
nuevo encima.

0. **Entrar con la cuenta real de siempre del usuario y verificar que
   sus movimientos, comisiones y perfil siguen intactos** tras las 13
   migraciones — antes de cualquier otra verificación, antes incluso del
   test de email. Si algo se rompió al migrar, se detecta aquí, no
   después de haber creado ya cuentas de prueba encima.
1. Enviar un email de prueba real vía el nuevo `EMAIL_FROM` de
   producción y confirmar entrega (200 OK de Resend + llegada real).
2. Registro externo autoservicio de punta a punta (registro → email de
   activación → activar → política de contraseña reforzada → consentimiento
   legal → entra en la app).
3. Enlace de invitación (superadmin genera → visita → registro → email
   de activación → activar).
4. "Crear usuario" (admin) → email de activación → activar.
5. Recuperación de contraseña → email de recuperación → enlace → nueva
   contraseña aceptada bajo la política reforzada.
6. Regenerar enlace de activación / regenerar contraseña (acciones de
   admin sobre usuarios existentes).
7. Aviso de despliegue por email a superadmin — el mismo mecanismo que
   avisa de que el despliegue ya se ha hecho.

### Aplazado a después del despliegue (decisión explícita del usuario, 2026-09-04)

No mezclar cambios de tooling/proceso con la release en curso — se
retoman una vez v1.0.0 esté desplegada y verificada, no antes:
- **Addendum a ADR-0010**: su ordenación de pasos (tag sobre `develop`)
  asume que `develop` es la producción real, cierto cuando se escribió
  esa ADR, ya no desde que `main` es la producción real (ver
  "Ramas y entornos", `CLAUDE.md`). Corrección 4 de arriba lo aplica en
  la práctica para esta release; falta dejarlo escrito en la propia ADR
  para que la siguiente release no repita el error.
- **Hook local (`pre-push`) que falle de forma ruidosa si un commit
  `feat`/`fix` que toca `src/`/`server/` no actualiza `CHANGELOG.md`**
  — propuesto para que la regla ya existente de ADR-0010 (actualizar el
  changelog en el mismo commit) deje de depender solo de la disciplina
  manual, que es justo lo que dejó `## Unreleased` vacío ~160 commits
  seguidos pese a la regla ya escrita.
- **Reparar `scripts/mobile-check.mjs`** (ver corrección de A.4 arriba)
  — la ambigüedad del selector "Cerrar" es real y preexistente, pero
  arreglarla bien exige clasificar los 13 sitios uno a uno (¿se quiere
  cerrar la hoja, o la pantalla secundaria entera?), trabajo de tooling
  aparte del cambio de producto de esta sesión.

### Punto exacto donde se quedó

Bloque A completo (1-5) salvo el propio commit final de A.5 (CHANGELOG +
versión bump), que se hace junto con el resto de A cuando el usuario dé
el visto bueno para commitear. **Bloque B bloqueado a propósito**,
instrucción explícita del usuario: no ejecutar nada de B hasta tener el
resultado de la consulta de catálogo (paso B.4) sobre `password_set`/
`default_currency` en producción. Esperando a que el usuario añada
`SUPABASE_DB_URL` (producción) a `.env.local` — en cuanto avise, ejecutar
`check-column-deps.sql` (scratchpad de esta sesión) y **parar a enseñar
el resultado antes de tocar 0002/0005**, tal como se pidió. Bloques C, D
y E no ejecutados todavía. `scripts/apply-migration-prod.mjs` ya
construido y con `node --check` en verde, sin usar todavía contra
producción.

### Verificación

Auditoría de lint (sesión anterior): `npm run test -- --run` (695/695) y
`npm run build` en verde, tanto en `Release-V1` como en `develop` tras
el fast-forward. Esta sesión (bloque A): `npm run lint` (0 errores),
`npm run test -- --run` (695/695), `npm run build` en verde, tras cada
uno de los cambios de A.1 y A.3. Verificación manual en navegador
(Chromium/Playwright, iPhone 14 Pro Max) de A.1 y A.4 — ver detalle en
cada punto arriba. Bloques B, C, D, E sin ejecutar — sin verificación
posible todavía.

---

## Cola de tareas adicionales (fuera de las 8 fases)

Pedidas explícitamente por el usuario mid-sesión, con la instrucción
inicial de hacerlas **al final de todas las fases** — completadas el
2026-09-02 dentro del mismo lote de trabajo nocturno, por petición
directa del usuario ("también deja hecho esto dentro de este lote"),
que sustituye esa instrucción inicial de esperar. Las 4 están hechas,
probadas (`npm run test` 591/591, `npm run build` en verde) y
comiteadas; el detalle completo de cada una queda documentado en su
propio bullet más abajo para que quede como referencia permanente, no
solo como historial de la cola.

- **✅ Avatares de perfil: que todos sean animales marinos.** Hoy
  `avatarCatalog.js` usaba un catálogo de iconos genéricos de
  `lucide-react` (sin relación temática con buceo/mar).
  **Implementado:** catálogo reducido a los 6 iconos de `lucide-react`
  que representan de verdad un animal marino (`Fish`, `FishSymbol`,
  `Turtle`, `Shrimp`, `Snail`, `Shell`) — no hay ballena, delfín,
  pulpo, cangrejo, tiburón, estrella de mar ni medusa en esta
  librería, así que el catálogo se queda en 6 en vez de forzar 10
  volviendo a mezclar objetos náuticos (`Waves` sigue excluido, es el
  icono de la app). Grid de selección ajustado a 3 columnas.

- **✅ Robustecer la contraseña (1 mayúscula + 1 símbolo mínimo) y
  forzar su actualización en cuentas existentes que no la cumplan.**
  **Resuelto sin necesitar el flag `profiles.password_meets_policy`
  que se había anticipado** (planteado abajo como "reto de diseño"
  antes de tener la solución real): `useSession.js` → `signIn()` tiene
  acceso a la contraseña en TEXTO PLANO en el único instante en que
  alguien la teclea para iniciar sesión — es la única oportunidad real
  de comprobarla contra la política nueva, ya que Supabase Auth nunca
  expone contraseñas ya guardadas para inspeccionarlas. No hizo falta
  ninguna migración de esquema: `forcedPasswordUpdate` es un estado en
  memoria del hook, calculado en cada login exitoso. Ver
  `src/passwordPolicy.js`, `src/ForcedPasswordUpdateScreen.jsx`, y el
  gate en `AuthGate` (`App.jsx`, se comprueba antes que los
  consentimientos legales pendientes). Limitación real, documentada en
  el propio código: una sesión ya restaurada de una recarga anterior
  no vuelve a pasar por esta comprobación hasta el siguiente login
  explícito (no hay contraseña en texto plano disponible fuera de ese
  instante).

- **✅ Enlace de invitación desde Configuración → Usuarios.** Junto al
  botón "Crear usuario" existente (superadmin), un botón nuevo para
  generar un enlace de invitación de un solo uso: quien lo recibe puede
  autoregistrarse aunque `app_config.allow_external_registration` esté
  desactivado (el registro público general puede seguir cerrado; el
  enlace es una excepción puntual y controlada, pensada para invitar a
  una persona concreta sin abrir el registro a cualquiera).
  **Especificado por el usuario (2026-09-01, noche):**
  - **Expira en 24h** desde que se genera.
  - **Flujo completo:** el superadmin genera el enlace → la persona
    invitada lo visita → crea su perfil (mismo formulario que el
    registro externo hoy: email, nombre, apellidos, nickname, idioma)
    → recibe un email con un enlace de activación (mismo mecanismo que
    ya existe, `generateActivationLink`) → lo pulsa → entra en la app y
    empieza a usarla directamente (mismo camino que ya recorre hoy
    cualquier alta: `CreatePasswordScreen` con aceptación de bases
    legales, `activateAccount()`). No es un flujo nuevo de principio a
    fin — el tramo nuevo es solo "crear perfil sin que
    `allow_external_registration` tenga que estar activado", el resto
    reutiliza el alta ya existente tal cual.
  **✅ Implementado 2026-09-02, con estas decisiones ya resueltas y
  documentadas** (el usuario pidió explícitamente completar esta cola
  dentro del mismo lote de trabajo, en vez de esperar a otra sesión —
  la nota de abajo sobre "pedir aprobación primero" venía de la primera
  vez que se anotó el pendiente, ya superada por ese encargo directo):
  - **Migración aditiva `0009-invitation-links.sql`** (rollback
    documentado en el propio fichero antes de ejecutar, aplicada solo
    contra TEST): tabla `invitation_links` (token uuid, created_by,
    created_at, expires_at, used_at). RLS habilitada SIN ninguna
    policy — todo el acceso real pasa por endpoints de servidor con
    service role (que ignora RLS), ningún cliente debe poder leer ni
    escribir un token directamente.
  - **Dataset inicial de un alta por invitación:** mismo criterio que
    `externalRegister.js` ya usa (el dataset activo marcado
    `is_default`), no un selector nuevo para el superadmin — MVP,
    coherente con "reutilizar antes que construir". Se puede añadir un
    selector más adelante si hace falta, sin romper nada de lo ya
    construido.
  - **Mensaje de enlace caducado/ya usado:** "Este enlace de invitación
    ya no es válido. Puede que haya caducado o que ya se haya usado.
    Pide uno nuevo a quien te invitó." — mismo tono cercano que el
    resto de mensajes de enlaces inválidos de la app (ver
    `ACTIVATION_LINK_INVALID` en `useSession.js`).
  - **Servidor:** `server/users/generateInvitationLink.js` (superadmin,
    igual que crear usuario) crea la fila con `expires_at = now() + 24h`
    y devuelve `${APP_URL}/?invite=<token>`. `externalRegister.js`
    amplía su body con un `invite_token` opcional: si viene, valida el
    token (existe, no caducado, no usado) ANTES de mirar
    `allow_external_registration` — un token roto siempre falla
    explícitamente, nunca cae en silencio al criterio general de
    registro abierto/cerrado. Al completar el alta con éxito, marca
    `used_at = now()` en esa fila (un solo uso real, no solo por
    convención de cliente).
  - **Cliente:** `RegisterScreen.jsx` acepta un `inviteToken` opcional
    y lo manda en el body. `AuthGate` (`App.jsx`) lee `?invite=` de la
    URL — si está presente, muestra `RegisterScreen` directamente
    (salta el botón "Regístrate" y su gate de
    `externalRegistrationEnabled`, que sigue siendo solo UX, nunca el
    control de acceso real) y limpia el parámetro de la URL al volver
    atrás, para no quedarse "atascado" en el registro tras pulsar
    "Volver al login".
  - Reutiliza el resto del flujo de alta tal cual (mismo
    `provisionUser`, mismo `CreatePasswordScreen` con bases legales,
    misma activación) — el único tramo nuevo es "crear perfil sin que
    `allow_external_registration` tenga que estar activado".

- **✅ Bug de UI: el campo "cantidad" del Ajuste de compañeros
  descuadra el formulario y provoca un salto.** Causa real encontrada
  en `shared.jsx` (`Field`), no en `MovementSheet.jsx`: el botón de
  ayuda ("?") del campo "Importe" — el único campo con `hint` en toda
  la app — usaba un objetivo táctil de 44×44 EN FLUJO normal dentro de
  la fila de etiqueta, que quedaba más alta que la de su vecino sin
  hint. Arreglado ahí (el icono pasa a un área pulsable superpuesta
  con `position: absolute`, sin ocupar espacio en el flujo) — corrige
  el problema en el único sitio real donde vivía, sin tocar
  `MovementSheet.jsx`.
