# Changelog

Registro de cambios relevantes de Ocean Pulse.

## Unreleased

Acumulado desde `v0.1.0` en `develop` y en la rama de trabajo de esta
sesión (`feature/global-redesign`), pendiente de fusionar y etiquetar —
ver `docs/ADR/0010-proceso-de-release.md` y
`docs/SESSION-2026-08-28-rediseno-global.md` para el candidato de
versión propuesto (`v0.2.0`) y los pasos pendientes de aprobación.

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
- **Configuración**: menú agrupado (negocio / administración) en vez de
  pestañas horizontales; Escuelas, Cursos, Tipos de pago, Estados de
  pago y Monedas crean ahora vía botón flotante + hoja inferior;
  eliminar usuario (superadmin, con confirmación).
- **Resumen**: tarjeta principal con comparación al periodo anterior, y
  el resto de la información (Por escuela con desglose por curso al
  tocar, Por curso, Calendario, Comisiones, Pagos de compañeros) como
  tarjetas plegables bajo demanda.
- Bypass de login para desarrollo local (`VITE_DEV_AUTH_BYPASS`) — nunca
  activo en producción.

### Changed
- "Actividad" pasa a mostrarse como "Curso" en toda la interfaz
  (Configuración, Tarifas, Home, Resumen) — solo texto visible, el
  modelo de datos no cambia.
- Tarifas: los filtros pasan a un panel colapsable "Filtrar", igual que
  en Mi trabajo.
- Se oculta el acceso directo a "Pagos" de la navegación — Mi trabajo
  cubre su función ("Cobrar todos", filtro por escuela).
- Estabilidad general en iPhone: zoom involuntario, barra de navegación
  inferior y toasts.

### Fixed
- Alta de tarifas bloqueada en cuentas nuevas sin `payment_types`
  configurado.
- Animación de colapso rota al marcar un movimiento como cobrado o
  pendiente (la fila saltaba en vez de animarse).

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
