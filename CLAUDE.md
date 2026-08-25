# Ocean Pulse — contexto del proyecto

App de control de ingresos para instructor de buceo freelance (Registro/Work
Log de clases impartidas, Comisiones por clientes referidos, Pagos de
compañeros, Tarifas, Resumen). Producto de la marca personal "Ocean Flow".

## Stack

- Vite + React 19 + Tailwind CSS v4
- Supabase (Postgres + JS client) como backend, sin auth todavía (single-user,
  políticas RLS "allow all")
- lucide-react para iconos
- Sin router — navegación por estado (`tab` en App.jsx), no hay URLs por pantalla

## Estructura

- `App.jsx` — shell: paleta de color (constantes exportadas), navegación,
  `ToastProvider`, carga de todos los hooks `useSupabaseTable`
- `shared.jsx` — **librería de componentes propia**, léela entera antes de
  tocar cualquier pantalla. Todo lo reutilizable vive aquí: `Select`,
  `MultiSelect`, `SearchSelect`, `DatePicker`, `MoneyInput`, `Money`,
  `StatusPill`, `StatusSwitch`, `DeleteButton`, `ConfirmDialog`,
  `EditActions`, `ToastProvider`/`useToast`, `AppLoading`, `MonthCalendar`,
  `ListFilterBar`, `colorFor`, `lighten`, `applyListFilters`
- `useSupabaseTable.js` — hook genérico de CRUD (`rows`, `insertRow`,
  `updateRow`, `deleteRow`, `bulkUpdateWhere`, `setDefault`). `insertRow`/
  `updateRow`/`deleteRow` **lanzan** en error (no devuelven silenciosamente) —
  el código que llama debe hacer try/catch si quiere reaccionar
- Un archivo por pantalla: `HomeTab.jsx`, `WorkLogTab.jsx`, `ComisionesTab.jsx`,
  `CompanerosTab.jsx`, `RatesTab.jsx`, `PaymentsTab.jsx`, `ConfigTab.jsx`,
  `SummaryTab.jsx`

## Convenciones — seguirlas es más importante que "queda bien"

1. **Nada hardcodeado que sea configuración del negocio.** Escuelas,
   actividades, tipos de pago, estados de pago, monedas, colores de sección,
   icono de carga: todo vive en tablas de Supabase, editable desde
   Configuración. Si necesitas un nuevo "tipo" de algo, es una tabla nueva,
   no un array en el código.
2. **Colores de una entidad se leen de su propia tabla** (`colorFor(rows,
   name)`), nunca una paleta fija en JS. Excepción: los 6-7 colores de marca
   de la app en sí (`NAVY`, `TEAL`, `CORAL`, `GREEN`...) exportados desde
   `App.jsx` — esos sí son constantes, es la identidad visual de la app, no
   datos de negocio.
3. **Crear registros = FAB + hoja inferior**, nunca un formulario fijo arriba
   de la lista. Mismo patrón en Work Log, Comisiones, Compañeros, Tarifas:
   lista primero, botón flotante `fixed bottom-24 right-4`, hoja
   `fixed inset-0 ... rounded-t-xl`, color del botón = `accentColor` (viene
   de `nav_sections` vía App.jsx).
4. **Editar en línea = `EditActions`** (Guardar/Cancelar unificado), nunca
   iconos sueltos de check/x.
5. **Eliminar = `DeleteButton`** (diálogo centrado + loading + toast), nunca
   un chip de confirmación inline ni un `window.confirm`.
6. **Toda operación de creación/edición/borrado da feedback** vía
   `useToast().success(...)`/`.error(...)`, con try/catch alrededor de la
   llamada a Supabase.
7. **Mobile-first + accesibilidad son requisito, no opcional**, en todo lo
   que se construya:
   - Objetivo táctil mínimo 44×44px en cualquier elemento pulsable
   - Los desplegables (`Select`, `MultiSelect`, `SearchSelect`, `DatePicker`)
     usan `useDropdownFlip`/`useEscapeClose`/`useClickOutside` de
     `shared.jsx` — no reinventar el patrón
   - `aria-label` en botones solo-icono, `role`/`aria-*` correctos en
     desplegables y switches, `aria-hidden="true"` en iconos decorativos
   - Nunca scroll lateral: usar `grid` con columnas fijas para filtros, no
     `flex-wrap` suelto con anchos fijos
8. **Filtros de Actividad = `MultiSelect`** (selección múltiple), el resto de
   filtros (Escuela, Estado, Tipo de pago) van con `Select` normal. Todo
   listado con filtros lleva un "Limpiar filtros".
9. **Moneda vive en la tarifa** (`rates.currency` / `commission_rates.currency`),
   no se elige en el formulario de Work Log/Comisiones — se deriva
   automáticamente de la tarifa que coincide con escuela+actividad. Si no hay
   tarifa, usar `currencies` con `is_default = true` como respaldo, nunca
   dejar el símbolo en blanco.
10. **Tipografía única (Inter)**, jerarquía por peso/tamaño, no mezclar
    fuentes. Cifras de dinero: `tabular-nums` + símbolo de moneda más
    apagado que la cifra (componente `Money`).

## Cosas que NO existen todavía (no asumir que están hechas)

- Autenticación / multiusuario (estimado ~5-7h si se pide: Supabase Auth ya
  soportaría 50k MAU gratis, falta pantalla de login y `user_id` + RLS real
  en las 12 tablas)
- Interacción real en los calendarios (hoy son de solo lectura con un
  desglose al pulsar un día; no filtran el resto de la pantalla)
- El KPI superior de Home ("Ganado este mes") solo cuenta Work Log — el
  desglose al pulsar un día del calendario de Home sí junta Ganado +
  Comisiones + Pagos de compañeros (agrupados por tipo, como en el Resumen)
- Los iconos/imágenes que referencia `index.html` (`/icon.svg`,
  `/icon-192.png`, `/icon-512.png`, `/og-image.png`) son placeholders — hay
  que generarlos
- El icono del logo real de Ocean Flow — de momento el loading usa iconos de
  lucide-react (configurable en Configuración → Ajustes) a la espera del
  logo oficial

## Esquema de base de datos

Ver `schema.sql` — es el esquema consolidado actual (sustituye a las ~10
migraciones sueltas del historial de chat, que ya no hace falta volver a
mirar salvo para entender el porqué de alguna decisión).
