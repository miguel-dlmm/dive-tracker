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
| 1 | Rama y saneamiento | ⬜ Pendiente |
| 2 | Multidioma | ⬜ Pendiente |
| 3 | KPIs en la home | ⬜ Pendiente |
| 4 | Cabecera y notificaciones | ⬜ Pendiente |
| 5 | Sistema de Training Records | ⬜ Pendiente |
| 6 | Slides y avisos | ⬜ Pendiente |
| 7 | Usabilidad, carga y escalabilidad | ⬜ Pendiente |
| 8 | Revisión visual y libro de estilo | ⬜ Pendiente |

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

## Fase 1 — Rama y saneamiento

⬜ Pendiente — no iniciada.

## Fase 2 — Multidioma

⬜ Pendiente — no iniciada.

## Fase 3 — KPIs en la home

⬜ Pendiente — no iniciada.

## Fase 4 — Cabecera y notificaciones

⬜ Pendiente — no iniciada.

## Fase 5 — Sistema de generación de Training Records

⬜ Pendiente — no iniciada. Recordatorio del documento maestro: en rama
aparte, aunque se integre en Release V1.

## Fase 6 — Slides y avisos

⬜ Pendiente — no iniciada.

## Fase 7 — Usabilidad, carga y escalabilidad

⬜ Pendiente — no iniciada.

## Fase 8 — Revisión visual y libro de estilo

⬜ Pendiente — no iniciada. Recordatorio del documento maestro:
restricción de esta fase = nada de backend ni funcionalidades nuevas que
requieran BBDD nueva; si surge algo así de interesante, se anota como
propuesta de próximos pasos, no se implementa.
