# Changelog

Registro de cambios relevantes de Ocean Flow.

## Unreleased

## [0.2.0] - 2026-08-30

### Added
- **"Mi trabajo"**: nueva pantalla que unifica Registro, Comisiones y
  Compañeros en una única experiencia — crear, editar, cobrar, marcar
  pendiente y eliminar movimientos desde un único lugar, con moneda
  favorita recordada y creación de tarifa en línea sin salir del
  formulario.
- **Pagos**: rediseñado como panel de liquidación accionable por
  escuela; Home incorpora un dashboard financiero ("Pendiente de
  cobrar", "Generado este mes").
- **Motion** como base de animación/gestos de la app: hoja de creación
  con gesto de arrastrar para cerrar, cabecera global persistente con
  transición de continuidad entre pantallas, navegación que recuerda la
  pestaña activa al recargar la página.
- **Home**: acceso "Añadir movimiento" integrado en la tarjeta
  "Pendiente de cobrar" y creación directa tocando un día del
  calendario — en ambos casos sin salir de Home hasta guardar con éxito.
  Nuevo widget "Los más antiguos por cobrar" (bajo el calendario): cobra
  directamente desde Home las deudas más urgentes (las de fecha más
  antigua), sin pasar por Mi trabajo. La propia tarjeta "Pendiente de
  cobrar" ahora navega a Mi trabajo al tocarla.
- **Configuración**: menú agrupado (negocio / administración) en vez de
  pestañas horizontales; Escuelas, Cursos, Tipos de pago, Estados de
  pago y Monedas crean ahora vía botón flotante + hoja inferior;
  eliminar usuario y desactivar usuario (superadmin, con confirmación)
  — desactivar revoca el acceso sin borrar ningún dato.
- **Usuarios — estado tri-estado y reactivación sin acceso instantáneo**
  (superadmin, ver `docs/ADR/0015-modelo-activacion-usuarios.md`): cada
  cuenta se muestra ahora como Activo/Pendiente/Desactivado en vez del
  binario anterior — una cuenta recién creada o desactivada ya no
  aparece como "Activa" sin haber completado la activación. Nuevas
  acciones "Regenerar enlace de activación" y "Regenerar contraseña"
  (ninguna concede acceso al instante — siempre generan un enlace nuevo
  de un solo uso para compartir); último acceso real (fecha y hora, o
  "Nunca") visible en el detalle; nombre/apellidos/nickname editables
  en línea desde la propia hoja de detalle.
- **Resumen**: tarjeta principal con comparación al periodo anterior, y
  el resto de la información (Por escuela con desglose por curso al
  tocar, Por curso, Comisiones, Ajustes de curso, Calendario) como
  tarjetas plegables bajo demanda. Granularidad, periodo y franja de
  tendencia fusionados en una única tarjeta de navegación temporal —
  siempre 7 periodos (el actual, centrado, y 3 a cada lado); tocar una
  barra recentra la franja en ese periodo, sin flechas ‹ › aparte.
- Bypass de login para desarrollo local (`VITE_DEV_AUTH_BYPASS`) — nunca
  activo en producción.
- Píldora "Qué hay de nuevo": aparece una vez por cuenta al entrar en una
  versión nueva, con un resumen visual y breve de las novedades de esta
  release, navegable con "Siguiente"/"Atrás", puntos o deslizando
  lateralmente (swipe).
- **Tarifas**: rediseño completo — una única lista con Curso y Comisión
  combinados (antes dos pestañas de página separadas), acento de color
  por tipo, selector de tipo integrado en la propia hoja de creación, y
  el mismo lenguaje visual (hoja con gesto de arrastrar, menú "⋯") que
  Mi trabajo.
- Gesto de arrastrar para cerrar en todas las hojas de creación/edición
  de la app (antes solo en Mi trabajo) — Tarifas y cada sub-lista de
  Configuración lo incorporan igual.
- Calendario de Home: el día de hoy queda marcado visualmente (con o
  sin actividad ese día).

### Changed
- **Marca**: el producto se renombra de "Ocean Pulse" a "Ocean Flow" en
  toda la interfaz visible (navegación, login, onboarding, ayuda,
  metadata) — antes "Ocean Pulse" era el producto y "Ocean Flow" la
  marca personal que lo firmaba ("by Ocean Flow"); ahora es un único
  nombre. Términos de Uso y Política de Privacidad actualizados con el
  nuevo nombre (VERSION v1 → v2 en ambos, fuerza la reaceptación).
- "Actividad" pasa a mostrarse como "Curso" en toda la interfaz
  (Configuración, Tarifas, Home, Resumen) — solo texto visible, el
  modelo de datos no cambia.
- Tarifas: los filtros pasan a un panel colapsable "Filtrar", igual que
  en Mi trabajo; cada fila usa ahora el mismo menú "⋯" (Editar/Eliminar)
  que Mi trabajo, en vez de dos iconos sueltos, y "Editar" abre la misma
  hoja que "Nueva tarifa" (precargada) en vez de un formulario en línea.
- Configuración — Escuelas, Cursos, Tipos de pago, Estados de pago y
  Monedas: cada fila usa ahora el mismo menú "⋯" (Editar/Eliminar) que
  Mi trabajo/Tarifas, y "Editar" abre la misma hoja que la creación
  (precargada), en vez de una edición en línea con iconos sueltos.
- Configuración — Usuarios: la tabla con scroll lateral se sustituye por
  una lista (nickname, estado tri-estado, fecha de alta) con una hoja de
  detalle al tocar cada fila, donde vive toda la gestión (roles,
  activar/desactivar con switch, regenerar enlace/contraseña, editar
  datos, eliminar) — mismo patrón de lista + detalle que Escuelas/
  Cursos/Tarifas. El botón-pastilla de Activar/Desactivar se sustituye
  por un switch: apagarlo desactiva al instante, encenderlo desde una
  cuenta desactivada abre el flujo de regenerar enlace en vez de dar
  acceso directo.
- `/api/set-user-active` deja de aceptar `active: true` — reactivar una
  cuenta pasa siempre por `/api/regenerate-activation-link`, nunca por
  un simple des-baneo (cierra la vía de acceso instantáneo a una cuenta
  desactivada).
- Se oculta el acceso directo a "Pagos" de la navegación — Mi trabajo
  cubre su función ("Cobrar todos", filtro por escuela).
- Home: el calendario del mes sube al segundo lugar (tras "Pendiente de
  cobrar"), por delante de "Generado este mes".
- Estabilidad general en iPhone: zoom involuntario, barra de navegación
  inferior y toasts.
- Ajuste de curso deja de pedir moneda por movimiento — se resuelve sola
  (moneda favorita del instructor, o la moneda por defecto de la app si
  no hay ninguna guardada). El formulario reorganiza Instructor
  relacionado + Importe en una sola fila al perder el campo.
- Con una única escuela configurada, se ocultan automáticamente el
  filtro "Escuela" (Tarifas, Mi trabajo) y las secciones/leyenda que
  solo tienen sentido comparando entre varias escuelas (Resumen:
  tarjeta "Por escuela", su desglose dentro de Comisiones, leyenda del
  Calendario) — reaparecen solas en cuanto se da de alta una segunda.
- El botón flotante de creación (FAB) usa ahora un único componente
  compartido en toda la app — mismo aspecto y comportamiento en Mi
  trabajo, Tarifas y cada sub-lista de Configuración.
- Ayuda: contenido reescrito por completo para reflejar Mi trabajo, Home,
  Resumen y Configuración actuales (antes describía Registro/Comisiones/
  Compañeros/Pagos como pantallas separadas). Menú agrupado en
  "Quiero..." (historias de uso) y "Funcionalidades" (referencia por
  pantalla), mismo patrón visual que el menú de Configuración. Las
  categorías de "Quiero..." pasan a ordenarse según el flujo real de una
  cuenta nueva (configurar → crear → cobrar → consultar), y "Crear un
  movimiento" explica ahora qué distingue a Curso, Comisión y Ajuste.

### Fixed
- **Movimientos del primer o último día de un periodo podían desaparecer
  de sus totales** (Resumen, Home, calendario) en cualquier huso horario
  distinto de UTC+0 — incluidos husos reales de instructores/escuelas de
  este proyecto (América, con offset negativo; Tailandia, con offset
  positivo). Causa: se comparaban fechas parseadas como medianoche UTC
  contra límites de periodo construidos en hora local del navegador.
  Confirmado y corregido comparando fechas como texto ("YYYY-MM-DD"),
  nunca como objetos `Date`.
- Alta de tarifas bloqueada en cuentas nuevas sin `payment_types`
  configurado.
- La barra de navegación inferior podía desaparecer al navegar desde una
  pantalla con scroll (p. ej. Home → Resumen tocando "Generado este
  mes") en Safari/WebKit.
- La franja de tendencia de Resumen podía solaparse con su propio título
  y cambiar de altura al navegar entre periodos.
- Los Ajustes de curso mostraban un recuento de "0 personas" en los
  desgloses agregados de Resumen (calendario, Por escuela, Por curso) —
  ese tipo de movimiento no tiene ni ha tenido nunca concepto de
  persona; un desglose mixto con un curso real sigue mostrando su
  recuento real.
- El scroll no se reiniciaba al cambiar de pestaña — la pantalla nueva
  heredaba la posición de scroll de la anterior en vez de abrir desde
  arriba.
- "Eliminar usuario" (y el resto de acciones de gestión de usuarios)
  fallaba en desarrollo local (`npm run dev`): las rutas `/api/*` solo
  existían bajo Vercel/Netlify, nunca bajo Vite puro. Añadido un tercer
  adaptador local en `vite.config.js`, solo para desarrollo.
- El login normal podía mostrar durante un instante la pantalla de crear
  contraseña (o de aceptar bases legales) incluso para una cuenta ya
  completamente activada, por una condición de carrera entre `session` y
  `profile` al actualizar el estado de sesión.
- `PendingCollectionCard` anidaba un `<button>` (el "+" de añadir
  movimiento) dentro de otro `<button>` (la tarjeta completa) en cuanto
  ambos estaban activos a la vez — HTML inválido que solo se manifestaba
  al activar la navegación de la tarjeta por primera vez en Home.
- Animación de salida rota al marcar un movimiento como cobrado o
  pendiente: la fila colapsaba de golpe en vez de animarse suavemente
  (deshacer y eliminar ya animaban bien). Ahora los cuatro — cobrar,
  marcar pendiente, deshacer y eliminar — se comportan de forma
  coherente.
- Crear/eliminar/desactivar usuarios podía rechazarse con "solo un
  superadmin puede..." aunque quien llamara sí lo fuera, si la
  comprobación de permiso fallaba por un problema de configuración del
  servidor (p. ej. una clave de servicio inválida) — ese caso se
  confundía con una negación real de permiso. Ahora un fallo de
  verificación devuelve un mensaje distinto ("No se pudo comprobar tus
  permisos..."), nunca el de superadmin.
- Una cuenta desactivada con sesión persistida podía recargar la página y
  acabar en la pantalla de crear contraseña (o intentar completarla) en
  vez de en el login — `profiles.activated_at` se limpia también al
  desactivar, así que ya no basta para distinguir "desactivado" de
  "pendiente de primer acceso". Un login nuevo contra una cuenta
  desactivada mostraba además el mismo mensaje genérico que unas
  credenciales incorrectas. Ambos casos comparten ahora un único punto de
  detección (`error.code === "user_banned"`, que Supabase revisa en cada
  llamada de `auth.*`, no solo al emitir el token) y un único mensaje:
  "Tu cuenta ha sido desactivada...", con cierre de sesión forzado y
  prioridad sobre cualquier pantalla de activación que estuviera abierta.

## [0.1.0] - 2026-08-26

Primer MVP funcional de extremo a extremo: un administrador puede dar de
alta a un usuario real desde la aplicación y este entra a trabajar con una
configuración inicial funcional, sin ningún paso manual entre medias.
Hasta esta versión, un alta real dejaba al usuario con escuelas,
actividades, tarifas y comisiones completamente vacías — solo el script de
desarrollo (`create-demo-user.js`) resolvía esto para cuentas de prueba.

### Flujo completo validado
1. El administrador crea el usuario desde Configuración → Usuarios → Crear
   usuario, eligiendo un dataset inicial (hoy: "Ihasia").
2. El dataset se clona automáticamente (`clone_setup_dataset()`) en cuanto
   se crea la cuenta; si el clonado falla, el alta se revierte por completo
   (no queda ninguna cuenta a medias).
3. El usuario recibe el enlace de activación, fija su contraseña y acepta
   los documentos legales.
4. Entra a la aplicación con escuelas, actividades, tarifas y comisiones
   ya cargadas, listo para registrar su actividad.

### Added
- Selector obligatorio "Dataset inicial" en el alta de usuarios
  (Configuración → Usuarios → Crear usuario).
- Modelo de datasets de configuración inicial (`setup_datasets` +
  `setup_dataset_schools/activities/rates/commission_rates`) y la función
  `clone_setup_dataset()`, con rollback automático (`deleteUser`) si el
  clonado falla durante el alta real.
- Flujo completo de primer acceso: enlace de activación de un solo uso,
  creación de contraseña propia y aceptación de documentos legales
  versionados.
- Gestión de roles admin/superadmin y directorio de usuarios.
- Configuración del entorno de testing con Vitest.
- Tests de seguridad backend: createUser, updateAdminStatus,
  supabaseAdmin.
- Tests unitarios de helpers compartidos (`colorFor`, `applyListFilters`,
  `formatMoney`, `oppositeStatus`, `lighten`).
- Tests unitarios del cálculo económico (`computeRateTotal`).

### Changed
- Extracción de `computeRateTotal` como única fuente de verdad para el
  cálculo de importes (tarifa fija vs. por persona).
- Reducción de duplicación de lógica de cálculo en `WorkLogTab`,
  `ComisionesTab`, `PaymentsTab`, `SummaryTab` y `HomeTab`.

### Known limitations
- `payment_statuses`/`payment_types` son configuración de cuenta, no de
  dataset — un usuario nuevo nace sin catálogos de pago hasta que exista
  una gestión global de estos, pendiente de una fase posterior.
- Solo existe un dataset ("Ihasia"); no hay todavía CRUD de datasets ni
  versionado — se gestionan a mano vía SQL editor.
- Backlog pendiente de priorizar según uso real, no por funcionalidades
  especulativas.
