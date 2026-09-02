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
| 5 | Sistema de Training Records | 🟡 En curso — generador MVP construido, sin verificar en dispositivo real (ver detalle) |
| 6 | Slides y avisos | ⬜ Pendiente |
| 7 | Usabilidad, carga y escalabilidad | ⬜ Pendiente |
| 8 | Revisión visual y libro de estilo | ⬜ Pendiente |

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
**Migración aprobada — `0009-avisos-generalizados.sql`:**

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
público real en producción hasta que se haga; revisar mañana antes de
abrir el registro a desconocidos.

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

## Fase 5 — Sistema de generación de Training Records (🟡 en curso — generador MVP construido para las 4 plantillas activas)

**Rama:** `feature/training-records` (creada desde `Release-V1`, tal como
pedía el encargo — no se ha fusionado todavía).

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

### Próximos pasos

El generador en sí (roster, iniciales autogeneradas, formulario dinámico
por plantilla, firma táctil, relleno de PDF con `pdf-lib`) ya está
construido para las 4 plantillas activas — ver "✅ Actualización
2026-09-02" arriba. Queda:

1. **Validación humana en dispositivo real / `mobile-check`** — el flujo
   completo no se ha probado en un navegador de verdad ni con
   Playwright esta noche, solo `npm run test`/`npm run build`.
2. Decidir de dónde sale cada fecha (petición explícita del usuario:
   no rellenar ninguna por ahora) y activarlas en `pdfFill.js` una vez
   decidido — un único punto de cambio, ya señalado con comentario ahí.
3. Exportación a JPG (página larga concatenada con `pdfjs-dist`) —
   deferida por no poder verificar en un navegador real el
   *worker* de `pdfjs-dist` en el build de Vite esta noche (ver
   "Explícitamente NO construido todavía" arriba).
4. Decidir el enfoque para las 6 plantillas sin campos de formulario
   (mapear coordenadas a mano tiene coste y fragilidad altos; también
   cabe dejarlas fuera del generador y ofrecer solo las 4 activas,
   revisando esta decisión más adelante si hace falta).
5. Validar con el usuario si "Training Records" merece un acceso más
   directo que dentro de Configuración (decisión tomada por
   consistencia con Escuelas/Cursos/Tarifas, no confirmada con él).
6. El pipeline de análisis automático de plantillas nuevas (lo que
   subiría un admin en el futuro) sigue explícitamente fuera de
   alcance hasta que la interfaz de generación esté terminada, tal
   como pedía el encargo original.

## Fase 6 — Slides y avisos

⬜ Pendiente — no iniciada.

## Fase 7 — Usabilidad, carga y escalabilidad

⬜ Pendiente — no iniciada.

## Fase 8 — Revisión visual y libro de estilo

⬜ Pendiente — no iniciada. Recordatorio del documento maestro:
restricción de esta fase = nada de backend ni funcionalidades nuevas que
requieran BBDD nueva; si surge algo así de interesante, se anota como
propuesta de próximos pasos, no se implementa.

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
