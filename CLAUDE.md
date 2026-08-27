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

For database and architecture changes:
Always propose a migration plan first.
Never implement authentication, permissions or schema changes in a single step.
Prefer incremental migrations.

## Reglas de trabajo obligatorias

Estas reglas son obligatorias para todos los cambios futuros del proyecto,
salvo que se acuerde explícitamente una excepción.

### 1. Control de cambios y gestión de commits

- Nunca hacer commit ni push directamente sin revisión previa del cambio.
- Antes de cualquier commit, mostrar siempre: resumen funcional de los
  cambios, objetivo del cambio y problema que resuelve, lista completa de
  archivos modificados/creados/eliminados, dependencias añadidas o
  modificadas, riesgos técnicos identificados, impacto sobre la arquitectura
  existente, resultado de todas las verificaciones ejecutadas, y el mensaje
  de commit propuesto.
- El mensaje de commit se pide siempre para aprobación antes de ejecutar
  `git commit`.
- Convención semántica siempre: `feat`, `fix`, `refactor`, `test`, `chore`,
  `perf`, `docs`.
- Commits pequeños, coherentes, una única intención técnica. Evitar mezclar
  en un mismo commit: refactor + funcionalidad nueva, cambios visuales +
  cambios de arquitectura, configuración + lógica de negocio.

### 2. Validación obligatoria antes de push

- Antes de cualquier push, ejecutar siempre `npm run test` y `npm run build`.
- Deben pasar todos los tests y el build debe finalizar correctamente.
- Si falla un test: NO commit ni push. Detener e informar nombre del test,
  archivo, error completo, contexto del fallo, posible causa y propuesta de
  solución.
- Si falla el build: NO push. Informar error completo, archivo afectado,
  posible causa y solución propuesta.
- Solo tras aprobación del mensaje de commit + tests correctos + build
  correcto: `git add <archivos>`, `git commit -m "mensaje aprobado"`,
  `git push origin develop`.
- Tras el push, informar siempre: hash del commit, rama utilizada, resumen
  final de cambios, resultado final de tests, resultado final del build.

### 3. Principios de diseño y arquitectura

- Priorizar código mantenible frente a soluciones rápidas; evitar
  duplicación de lógica; una única fuente de verdad para reglas de negocio;
  separar responsabilidades; favorecer composición frente a componentes
  gigantes con demasiadas condiciones; extraer abstracciones solo cuando
  exista una necesidad real; evitar sobreingeniería y patrones introducidos
  solo por moda.
- Antes de crear un componente/hook/servicio/capa/librería nueva, analizar
  si existe duplicación real, si mejora la mantenibilidad, si reduce
  complejidad, y si el coste supera al beneficio.

### 4. Estándares de testing

- Estrategia basada en comportamiento, priorizando en este orden: (1)
  unitarios — funciones puras, cálculos, validaciones, reglas de negocio;
  (2) integración ligera — componentes React críticos, interacción de
  usuario, llamadas a servicios, flujos importantes; (3) seguridad —
  permisos, autenticación, autorización, endpoints sensibles.
- Evitar tests frágiles basados en clases CSS, estructura exacta del HTML,
  implementación interna del componente o estados privados. Validar
  comportamiento visible, llamadas externas, datos enviados y resultados
  obtenidos.
- Mockear únicamente los límites del sistema (API, Supabase, servicios
  externos); no mockear innecesariamente lógica interna propia.

### 5. Revisión arquitectónica continua

- Actuar también como responsable técnico del proyecto: si se detecta un
  problema de diseño, no ignorarlo. Comunicar problema detectado, impacto
  futuro, posibles soluciones, recomendación profesional y coste
  aproximado del cambio.
- No implementar estas mejoras automáticamente — presentar la propuesta y
  esperar aprobación primero.

### 6. Investigación y criterio profesional

- En decisiones arquitectónicas importantes, no limitarse a seguir
  instrucciones literales: analizar alternativas como lo haría un
  desarrollador senior (patrones actuales de la industria, características
  reales del stack, coste/beneficio, evitando soluciones empresariales
  innecesarias para el tamaño del proyecto).
- Si hay una aproximación mejor que la planteada inicialmente,
  presentarla argumentando por qué mejora el diseño, qué problema resuelve,
  qué coste añade y cuándo sería recomendable aplicarla.
- La decisión final siempre debe buscar código simple, seguro, mantenible,
  fácil de evolucionar y sin complejidad innecesaria.

### 7. Documentación viva de decisiones

La conversación no es la fuente de verdad del proyecto: cada decisión
relevante que se apruebe en una sesión debe quedar reflejada en la
documentación, para que una sesión futura entienda el contexto sin
depender del historial de chat.

Es "decisión relevante" cualquier decisión de:
- **Producto** (alcance, usuarios objetivo, flujos, prioridades,
  funcionalidades descartadas).
- **Arquitectura** (modelo de datos, estructura de código, patrones,
  decisiones técnicas con impacto futuro).
- **Seguridad/autenticación/permisos.**
- **UX con impacto transversal** (no un ajuste puntual de una pantalla).

Proceso obligatorio:
1. Al detectar una decisión de este tipo, proponer dónde documentarla
   antes de escribir nada: `docs/PRODUCT.md` si es visión o principio de
   producto; un ADR nuevo en `docs/ADR/` si es una decisión arquitectónica
   o de diseño con alternativas y trade-offs; `docs/BACKLOG.md` si es
   priorización o algo pendiente; este mismo `CLAUDE.md` si es una regla
   permanente de trabajo o desarrollo.
2. No documentar nunca automáticamente sin avisar antes. Indicar primero:
   que la decisión debería quedar registrada, el documento y sección
   propuestos, y un resumen breve de lo que se guardaría.
3. Actualizar el documento solo tras la aprobación.
4. Toda respuesta que incluya un cambio documental cierra con una sección
   final **"Documentación actualizada"**: archivo modificado, sección
   afectada, resumen de la decisión registrada.

Evitar llenar el proyecto de documentación innecesaria — esta regla es
para decisiones que cambiarían de verdad el comportamiento de una sesión
futura, no para cada detalle de implementación.
