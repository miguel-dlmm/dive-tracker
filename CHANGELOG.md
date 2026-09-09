# Changelog

Registro de cambios relevantes de Ocean Flow.

## Unreleased

## [1.3.0] - 2026-09-09

### Added
- **Firma táctil**: botón "Deshacer" junto a "Borrar" — quita solo el
  último trazo dibujado, no la firma entera.
- **8 idiomas nuevos**: neerlandés, tailandés, indonesio, vietnamita,
  birmano, malayo, ruso y portugués (Brasil) — mismo patrón que los 5
  añadidos en v1.2.0 (`fallbackLng: "es"` cubre cualquier hueco). Migración
  `0020-idiomas-adicionales-2.sql` amplía el check de `profiles.language`,
  aplicada a producción como parte de esta release.
- **Dataset "prueba"**: copia genérica del dataset "ihasia" (escuela,
  cursos y tarifas), pasa a ser el dataset por defecto para altas nuevas
  (registro externo y alta manual) en vez de "ihasia" — migración
  `0019-dataset-prueba.sql`, aplicada a producción como parte de esta
  release.

### Fixed
- **Ayuda abierta desde Training Records**: cerrarla volvía a Home en
  vez de a la propia pantalla de Training Records que se estaba
  editando — el roster/plantilla en curso ya sobrevivían (sessionStorage),
  pero se perdía la pantalla real de origen.
- **Idioma elegido en el alta se perdía en silencio para fr/it/de/ca/eu**:
  la lista de idiomas válidos en `createUser.js`/`externalRegister.js`
  (servidor) se quedó en `["es","en"]` cuando esos 5 idiomas se añadieron
  en v1.1.0 — el cliente los aceptaba pero el servidor los descartaba a
  `null` sin avisar, y la cuenta quedaba en español por defecto. Bug real
  encontrado al añadir los 8 idiomas de esta versión; las tres listas
  (schema.sql, createUser.js, externalRegister.js) quedan documentadas
  como una única fuente de verdad duplicada a propósito, a sincronizar
  juntas en cada idioma nuevo.

## [1.2.1] - 2026-09-09

### Fixed
- **Descargar/exportar a JPG en Training Records, apagado temporalmente**:
  el polyfill de `Uint8Array.toHex/toBase64` (v1.2.0) no resolvió el
  error real en Safari — sin un mensaje de consola nuevo que
  diagnosticar y sin forma de reproducir Safari real en este entorno,
  se oculta el icono (por alumno y "Descargar todo en JPG") hasta
  confirmar la causa real con datos de un dispositivo real. PDF y
  compartir siguen intactos, no dependen de `pdfjs-dist`.

## [1.2.0] - 2026-09-08

### Changed
- Texto de bienvenida de la pantalla de Registro, en los 7 idiomas: de
  "deja el cuaderno y las notas sueltas" a "deja los Excel complicados
  y las notas desordenadas del móvil" — más cercano al método real que
  usa hoy la mayoría de instructores.
- **Selector de "País de residencia"** (Registro y Mi perfil): de un
  buscador (`SearchSelect`) a un desplegable normal (`Select`) con
  scroll, y de un catálogo curado de ~65 países en solo es/en a los
  ~195 países reales del mundo con el nombre resuelto en caliente por
  idioma (`Intl.DisplayNames`) — cubre ya los 7 idiomas de la app, no
  solo español/inglés.
- **Registro: quitado "(opcional)" de "Fecha de nacimiento"/"País de
  residencia"** (provocaba que el campo de fecha saltara a su propia
  línea en móvil) — en su lugar, un asterisco junto a las etiquetas de
  los campos que sí son obligatorios (Email, Nickname). `Field`
  (`shared.jsx`) admite ahora un prop `required` para esto, reutilizable
  en cualquier formulario.
- **`DatePicker` (fecha de nacimiento y cualquier otro selector de fecha
  de la app): navegación por década → año → mes → día.** Antes, llegar a
  un año lejano (una fecha de nacimiento típica) exigía un clic por año.
  Ahora, tocar la cabecera "{mes} {año}" abre un nivel de mes (12 meses +
  salto de año) y, desde ahí, tocar el año abre un nivel de año (la
  década completa + salto de década) — mismo lenguaje visual en los 3
  niveles (círculo/píldora de marca para "elegido", borde de marca para
  "actual"), ningún vocabulario nuevo por nivel.
- **Training Records**: "Cambiar plantilla" se movió de la cabecera de
  sección a dentro de la propia pastilla con el nombre de la plantilla
  elegida; el hueco que deja pasa a un enlace fijo a la Ayuda (siempre
  visible), que abre directamente la categoría "Generar un Training
  Record" alineada bajo la cabecera.

### Fixed
- **Descargar JPG de un Training Record fallaba en Safari real** (Mac e
  iPhone): `pdfjs-dist` calcula la huella de cada PDF con
  `Uint8Array.prototype.toHex()`, una API sin soporte confirmado en
  Safari — "UnknownErrorException: i.toHex is not a function" y un
  DataCloneError secundario al propagar esa excepción por su canal
  interno de mensajes. Añadido a `pdfjsPolyfills.js` junto al resto de
  parches ya existentes para esta misma dependencia.
- **Desplegables con teclado en móvil (país de residencia y cualquier
  otro `SearchSelect`/`Select`/`DatePicker`)**: la corrección de
  dirección arriba/abajo tras abrirse el teclado solo escuchaba un
  `resize` de `visualViewport` una única vez — en iOS, el scroll nativo
  que revela el campo por encima del teclado es una señal aparte
  (`scroll`, no `resize`) que se ignoraba por completo, dejando el
  panel flotando en una posición ya obsoleta. Ahora escucha ambas, con
  debounce, hasta que el viewport deja de moverse (`useFloatingPosition`,
  `shared.jsx`) — corrige Registro, Mi perfil y cualquier otro
  desplegable con el mismo patrón de una sola vez.
- **Training Records en producción no ofrecía ninguna plantilla**: la
  migración de esquema de la Fase 5 sí se había aplicado, pero las 10
  filas + los PDF reales se sembraron a mano solo contra TEST durante
  el desarrollo, sin ningún script que lo replicara — producción se
  quedó con la tabla vacía, sin ningún aviso. Sembrado ya en
  producción; añadido `scripts/verify-production-seed-data.mjs` como
  paso del checklist de release (ADR-0010) para no repetir el mismo
  vacío silencioso en una fase futura.
- **Training Records: cerrar la pantalla borraba la plantilla elegida y
  el roster de alumnos**: `persistSession` guardaba también el PDF ya
  generado de cada alumno (varios cientos de KB en base64) — con unos
  pocos alumnos generados, el conjunto superaba la cuota de
  sessionStorage y ese guardado se descartaba en silencio, dejando la
  próxima apertura sin plantilla ni roster. Ya no se persiste el PDF
  generado (se regenera al momento si hace falta, es rápido); el
  roster y la plantilla elegida ya no dependen de esa cuota.
- **Registro externo, campo "País de residencia" en móvil**: en iOS
  Safari, al abrirse el teclado la tarjeta entera se recentraba de
  golpe (`min-h-dvh` + `items-center`) justo cuando el desplegable de
  país ya había fijado su posición, dejándolo superpuesto sobre el
  propio campo — inusable para escribir. Bug real reportado en
  producción, 2026-09-08.

### Removed
- Pantallas huérfanas de antes de la unificación de "Mi trabajo"
  (Registro, Comisiones, Compañeros, Pagos) — sin ningún punto de
  entrada en la navegación desde ADR-0005, confirmado y eliminadas del
  todo.

## [1.1.0] - 2026-09-07

### Added
- **Ayuda → "Generar un Training Record"**: nueva categoría/artículo
  (en los 7 idiomas) que explica cómo generar el documento de progreso
  de un alumno desde Training Records — antes no tenía ninguna mención
  en la Ayuda, pese a ser una pantalla completa con su propio generador.
- **Cinco idiomas nuevos**: francés, italiano, alemán, catalán y
  euskera, junto a español e inglés — toda la interfaz, incluida la
  Política de Privacidad y los Términos de Uso, elegibles desde Mi
  perfil (y desde el alta de usuario para superadmin/registro).
- **Ayuda**: los 3 artículos más básicos ("Registrar un movimiento",
  "Cobrar movimientos pendientes", "Configurar tu aplicación") ya
  incluyen un GIF animado con el flujo real, además del paso a paso en
  texto.
- **Instalar la app**: nueva pantalla con instrucciones paso a paso para
  añadir Ocean Flow a la pantalla de inicio, tanto en iOS (Safari) como
  en Android (Chrome) — accesible desde un enlace fijo en Ayuda y un
  enlace de texto ("Descargar app") junto a los KPIs de Home, ambos
  siempre visibles (oculto solo si ya se está usando la app instalada).
- **Training Records ya tiene acceso propio**, desde una tarjeta en
  Home. Genera el registro de progreso oficial (Training Record) de
  cada alumno para las 10 plantillas SSI, con firma incluida — nada de
  lo que rellenes se guarda en la nube, solo se descarga.
- Generador de Training Records: las 6 plantillas SSI que no tienen
  campos de formulario rellenable (Basic Diver, Night & Limited
  Visibility, Navigation, Perfect Buoyancy, React Right, Diver Stress &
  Rescue) ya se pueden generar, con un segundo modo de relleno por
  coordenadas verificadas visualmente contra cada PDF real.
- Red de seguridad general ante errores de render: un `ErrorBoundary`
  envuelve el contenido de cada pestaña, así que si una pantalla falla
  de forma inesperada se ve una tarjeta de aviso con botón de recargar
  en vez de una pantalla en blanco, y cabecera/navegación siguen
  funcionando.
- Configuración → Usuarios: la hoja de detalle de un usuario muestra
  cuántos movimientos tiene dados de alta y cuándo fue su última
  actividad (crear, editar o eliminar un movimiento).
- El selector de fecha (usado en Mi trabajo, Comisiones, Pagos,
  Training Records...) ya ofrece accesos rápidos a ayer y mañana,
  además de hoy y antes de ayer, no solo hoy.
- Training Records: "Descargar todo en PDF/JPG" ya descarga un único
  fichero ZIP con todos los documentos, en vez de una descarga por
  alumno una detrás de otra.
- Mi perfil: campos opcionales de fecha de nacimiento y país de
  residencia en "Datos personales".
- La pantalla de registro también pide (opcionalmente) fecha de
  nacimiento y país de residencia, para no tener que añadirlos después
  desde Mi perfil.
- (Interno, seguridad) El registro externo ya está protegido contra
  altas masivas automatizadas (Vercel BotID).

### Changed
- **KPIs de Mi trabajo**: el icono junto a cada cifra queda en 10px, sin
  icono aparte junto a la etiqueta (un solo icono por KPI, no dos) y
  ahora se oculta por completo cuando ese KPI no tiene ningún
  movimiento — antes se veía a tamaño completo junto al "—", igual que
  si hubiera datos. La etiqueta ("Generado este mes"/"Pendiente de
  cobrar"/"Cobrado este mes") queda centrada, también cuando ocupa dos
  líneas — antes se alineaba a la izquierda pese a que el icono y la
  cifra de arriba sí estaban centrados.
- **Training Records de Open Water**: se retira el paso "Certificación"
  (elegir entre Open Water Diver / Scuba Diver) — con Scuba Diver ya
  descartado, solo quedaba una opción real, así que no había nada que
  elegir. El documento sigue marcando "Open Water Diver", como siempre.
- **Training Records en Home**: la tarjeta con borde y degradado pasa a
  ser una fila fina, sin tarjeta propia — igual de accesible, mucho
  menos pesada visualmente. Sin ningún documento generado todavía es una
  invitación real ("Genera tu primer Training Record"); en cuanto lo hay,
  muestra la cifra animada junto a "Generados", mismo patrón que
  Alumnos/Cursos/Captados justo arriba, alineada al mismo margen que el
  resto de tarjetas de Home. El contenido (icono, título, cifra, flecha)
  va agrupado y centrado en la fila, ahora de ancho completo — antes se
  encogía al ancho de su propio contenido y por eso quedaba todo pegado
  a la izquierda con un hueco vacío a la derecha. Con actividad, la
  insignia lleva además un resplandor sutil detrás.
- **Training Records**: en Nitrox, Deep Diving, Basic Diver, Diver
  Stress & Rescue, Navigation, Night & Limited Visibility, Perfect
  Buoyancy y React Right, las filas de progreso del curso que de verdad
  son necesarias para certificarlo pasan a marcarse como "Obligatorio"
  (ya no se pueden desmarcar por error) — mismo criterio que ya tenían
  Open Water Diver y Advanced Open Water Diver.
- **Novedades de esta versión (WhatsNew)**: reescrito con las 6
  novedades reales de este rediseño — rediseño e imagen nueva, carnet
  de instructor, Training Records, multi idioma, Home/Mi trabajo más
  claros, y cómo repasarlo luego desde Ayuda. Animación entre
  diapositivas también mejorada: ahora se aprecia con claridad la
  salida de una y la entrada de la siguiente, en vez de solo un fundido.
- **Comisión y Ajuste** tienen ahora su propio color de marca dedicado
  (antes reutilizaban colores de estado como "pendiente" o un gris
  genérico) — pensado también para material de campaña/redes, no solo
  para la app.
- **Icono de carga (logo)**: ahora solo la parte que parece una ola sube
  y baja en bucle, con el aro que la envuelve fijo — antes el logo
  entero se recortaba de golpe.
- **Color de avatar**: la misma paleta curada de 12 colores que escuelas/
  cursos (incluye blanco), en vez de una paleta propia sin relación con
  el resto de la app.
- **Curso/Comisión/Ajuste**: el mismo icono por tipo en cualquier sitio
  donde aparezca (Tarifas, Mi trabajo, Home) — antes "Ajuste" podía
  mostrar un icono distinto según la pantalla.
- **Color de escuelas y cursos**: ya se elige de una paleta de 12 colores
  ya pensados para quedar bien con el resto de la app (incluye blanco y
  negro), en vez de un selector de color libre sin ninguna restricción.
- **Mi trabajo**: el tipo de movimiento (Curso/Comisión/Ajuste) ya se
  reconoce por un icono en su propia chip de color, no por una franja
  fina a la izquierda; los puntos de color delante de escuela/curso
  desaparecen (en Mi trabajo y Tarifas) — el color ya se lee en el
  propio texto.
- **Logo**: el icono de marca en toda la app usa ahora el vectorial real
  (más nítido a cualquier tamaño) en vez del PNG anterior.
- **Login**: nueva frase bajo el nombre de la app — "Bucea más. Gestiona
  menos." y un subtítulo con lo que hace la app en concreto.
- **KPIs de Home y Mi trabajo** un poco más grandes y con más aire, tras
  una primera vuelta que se quedó corta.
- **Training Records**: la fecha de examen ya va en la misma línea que
  su etiqueta (antes, título arriba y campo suelto debajo); las
  aventuras electivas de AOWD ya se ven exactamente igual que el resto
  de filas de progreso, en vez de apilar la fecha debajo; el calendario
  que se abre en esas filas ya no sale comprimido contra el borde de la
  pantalla.
- **Mi trabajo**: un importe largo (con separador de miles y símbolo de
  moneda) ya no se corta al crear/editar un movimiento con muchas
  personas.
- Últimos restos del navy antiguo (pre-rebrand) al navy de marca:
  títulos de login/registro/recuperar contraseña/aceptar términos y
  "Qué hay de nuevo".
- **Logo más visible** en el login/registro/recuperar contraseña, en la
  pantalla de carga al abrir la app y en la marca de agua del carnet de
  instructor (apenas se distinguía).
- **Training Records** ya es una función independiente, accesible solo
  desde su tarjeta en Home: antes se abría "dentro" de Configuración
  (su flecha "‹ atrás" acababa llevando al menú de Configuración);
  ahora tiene su propia cabecera y cerrarla siempre vuelve a Home.
- **DatePicker y el selector de rango de fechas (Periodo)**, con un
  diseño más acorde a Ocean Flow: campo con borde e icono de marca,
  más redondeado, y "Hoy"/flechas/celdas de día ya cumplen el objetivo
  táctil mínimo de 44px.
- **Calendario**: el cambio de mes (flechas o deslizar) ya se anima en
  vez de saltar al instante.
- **Configuración** ya no muestra "Configuración" dos veces en la
  cabecera al entrar en una sección (una para cerrar, otra para volver
  atrás): ahora hay una única cabecera, igual que en Ayuda — ✕ solo en
  el menú principal, ‹ y el nombre de la sección al entrar en una.
- **KPIs más compactos** en Home y Mi trabajo: icono y cifra comparten
  fila en vez de apilarse en 3 filas centradas, la etiqueta pasa a su
  propia fila debajo — mismas 3 tarjetas, menos alto.
- Últimos restos de verde en cabeceras sin sección propia (login, "Qué
  hay de nuevo", Ayuda/Configuración) corregidos al navy de marca.
- **Calendario**: ya se puede deslizar hacia los lados para cambiar de
  mes, no solo con las flechas — igual que cualquier calendario nativo
  de móvil.
- **Hojas inferiores** (crear/editar en cualquier pantalla) con esquinas
  más redondeadas y fondo de marca al abrirse; **campos de formulario**
  con el foco ya en los colores nuevos.
- **Últimos rincones en verde ya al navy de marca**: login/registro/
  recuperar contraseña, "Qué hay de nuevo", el FAB y la pestaña activa
  de Mi trabajo, y los iconos de categoría de Ayuda (estos últimos
  porque el color de sección en Configuración → Navegación pasa
  también al navy nuevo, no solo por código).
- **Resumen, Tarifas, Configuración, Ayuda y Mi perfil** adoptan el
  color de marca nuevo (cifras, botones, filtros activos, iconos de
  menú, selector de icono de carga). El carnet de instructor estrena
  además un degradado de dos tonos de marca.
- **Mi trabajo** adopta el color de marca nuevo en los KPIs, las
  pestañas activas, "Filtrar"/"Cobrar todos"/"Confirmar cobro" y los
  importes de curso/comisión.
- **Home** adopta el color de marca nuevo en los KPIs, la cifra de
  "Generado este mes" y el punto de "hoy" del calendario.
- **Nuevo logo de Ocean Flow** en la cabecera, el favicon, el icono de
  la app, la pantalla de carga, el login/registro/recuperar contraseña
  y el carnet de instructor — primer paso visible del rediseño de
  marca. La pestaña activa de la navegación inferior ahora se marca con
  una píldora de fondo, más fácil de distinguir de un vistazo.
- **Más opciones de avatar**, de 6 a 14, con iconografía real de mar y
  buceo (ancla, brújula, salvavidas, velero...) además de los animales
  marinos de siempre — y ahora se eligen deslizando en un carrusel en
  vez de una rejilla fija, para que el selector no ocupe más pantalla
  al haber más opciones.
- Pequeña auditoría de unificación visual (ver `docs/ESTILO.md`): Tarifas
  ya anima la alta/baja de cada fila y su estado vacío pasa al mismo
  tratamiento centrado que Mi trabajo; Resumen unifica la tarjeta
  "HeroTotal" con el resto de tarjetas de cifra protagonista; Mi trabajo
  y Tarifas consolidan el título de cada fila (escuela + curso) en un
  único componente compartido, y se retira un esqueleto de carga de Mi
  trabajo que nunca llegaba a pintarse en la práctica.
- El desplazamiento de la pantalla al abrir el detalle de un día en el
  calendario de Home/Resumen ya no es instantáneo — se anima con el
  mismo estilo de movimiento que el resto de la app.
- El tooltip de ayuda del KPI "Pendiente de cobrar" (Mi trabajo) solo
  aparece si de verdad hay algo pendiente de cobrar de un mes anterior
  — si todo lo pendiente es de este mes, ya no hace falta la aclaración.
- La pantalla "Crea tu cuenta" tiene textos más cercanos, de bienvenida
  y menos de trámite ("Únete a Ocean Flow" en vez de "Crea tu cuenta").
- Justo después de activar la cuenta (primer acceso, reactivación...),
  la app ya abre en Home con "Qué hay de nuevo" mostrado automáticamente
  (antes abría directo en Ayuda) — se cierra igual que siempre y no
  vuelve a aparecer solo hasta la próxima versión.
- Los KPIs de Mi trabajo animan el icono de forma continua: se va
  encogiendo mientras el número crece y desaparece justo si hace falta,
  en vez del salto entre dos tamaños fijos de antes — los 3 KPIs
  siempre se encogen a la vez.
- **Home**: la tarjeta "Generado este mes" (duplicaba la misma cifra ya
  visible en la cabecera de Mi trabajo) pasa a mostrar la escuela con
  más movimientos este mes ("Escuela más activa"), con el mismo hueco
  visual y el mismo gesto de pulsar para ir a Resumen.
- **Training Records (Advanced Open Water Diver)**: las 3 "Aventuras"
  ya muestran la etiqueta "Obligatorio", igual que el resto de filas de
  progreso del curso — antes no había ningún indicio visual de que
  fueran obligatorias.

### Chore
- QA exhaustivo pre-release: `npm run mobile-check` corregido (4 pasos
  desactualizados desde el rediseño de navegación del 2026-09-06,
  incluido un swipe que se simulaba con eventos de ratón en vez de
  touch); recorrido completo de 47 capturas sin errores de consola.
  Nueva cobertura unitaria del gesto de deslizar en "Qué hay de nuevo".
- Limpieza de ficheros SVG obsoletos sin ninguna referencia en el código
  (`public/favicon.svg`, `public/icons.svg`) y de dos afirmaciones ya
  falsas en `CLAUDE.md`/`docs/BACKLOG.md` (iconos "pendientes de
  generar" que ya son el logo real; entorno TEST de `dive-tracker`
  "pendiente de configurar" que ya está configurado).

### Fixed
- **Listado de Mi trabajo/Home/Resumen/Comisiones podía mostrar un
  importe distinto al del popup de edición** para el mismo movimiento,
  cuando había una tarifa desactivada (migración 0015) junto a la
  activa para la misma escuela+actividad — el listado podía coger la
  desactivada en vez de la vigente. Ahora usa siempre la tarifa activa,
  igual que ya hacía el popup.
- **Ayuda: al abrir una categoría distinta, la que quedaba abierta se
  cerraba de golpe y la nueva podía acabar en cualquier posición de la
  pantalla** (a veces por encima de la propia cabecera), sobre todo si
  ya se había bajado la página para terminar de leer la anterior. Ahora
  cada categoría que se abre queda alineada justo debajo de la
  cabecera, con una animación de scroll.
- **Instalada como acceso directo en iOS: el botón "+" flotante y el
  final de cualquier pantalla podían quedar tapados por la barra
  inferior** — la barra crece de verdad al no tener el navegador (para
  el indicador de inicio del iPhone), pero el botón y el margen final
  de las pantallas seguían calculando su distancia al borde con un
  valor fijo, igual que en una pestaña normal de Safari. Corregido para
  los dos casos.
- **País de residencia (Registro y Mi perfil): la lista de países podía
  quedar comprimida contra el propio campo, difícil de usar** — al
  tocar el campo, el teclado del móvil se abre a la vez que la lista;
  si la lista decidía su posición justo antes de que el teclado
  terminara de abrirse, se quedaba mal colocada el resto de la
  apertura. Ahora se corrige una vez, en cuanto el teclado se asienta.
- **KPIs de Mi trabajo: el cálculo de espacio disponible para el icono
  y la cifra tenía una referencia circular** — medía un elemento que ya
  había sido encogido por el propio icono, así que podía encoger u
  ocultar el icono de forma incorrecta e inconsistente según el
  dispositivo. Corregido de raíz (mide ahora un contenedor de ancho
  estable, no afectado por el propio icono/cifra); de paso, la cifra
  queda centrada de verdad junto al icono, no solo dentro de una caja
  más ancha que su propio texto.
- **Ayuda → "Mi perfil" y "Consultar cuánto has generado" tenían
  contenido desactualizado** — "Mi perfil" no mencionaba el carnet de
  instructor (una de las novedades del rediseño), y "Consultar cuánto
  has generado" seguía diciendo que "Generado este mes" vivía en Home
  con un indicador de tendencia — hoy esa cifra vive en Mi trabajo.
  Corregidos, en los 7 idiomas.
- **KPIs de Mi trabajo (Generado/Pendiente/Cobrado): un importe de 6+
  dígitos podía llegar a salirse del recuadro** — el icono ya podía
  ocultarse del todo para dejarle sitio, pero el propio número no tenía
  ninguna protección si aun así no cabía. Ahora, en ese caso extremo, el
  número reduce su propio tamaño de letra lo justo para caber, sin
  afectar a los otros dos KPI. De paso, el icono junto a cada cifra
  queda centrado con el número (antes se alineaba arriba) y pasa a ser
  un icono suelto, sin insignia de fondo, pegado a la cifra.
- **Regenerar un solo Training Record ("Regenerar TR") no sumaba al
  contador de Home** — solo "Generar para todos los alumnos" lo hacía.
  Ahora cuenta cualquier generación con éxito, se llame de una en una o
  para todo el listado a la vez.
- **El contador de Training Records generados se compartía entre
  cuentas del mismo navegador** — al entrar con otra cuenta se seguía
  viendo la cifra generada por la cuenta anterior, aunque la nueva no
  hubiera generado ninguno todavía. Ahora cada cuenta tiene su propio
  contador, igual que ya pasa con "Qué hay de nuevo".
- **`manifest.json` nunca llegaba al build de producción** (vivía en la
  raíz del repositorio, no en `public/` — Vite solo empaqueta esa
  carpeta): probable causa de que el icono de la app no aparezca bien
  en Safari iOS al añadirla a la pantalla de inicio.
- **`robots.txt` tampoco llegaba a producción** — mismo bug que
  `manifest.json` de arriba: devolvía 404, dejando la propia
  instrucción de "no indexar esta app" sin una de sus dos capas.
- **Vista previa al compartir un enlace de Ocean Flow** (WhatsApp,
  email...) — la imagen de vista previa usaba una ruta relativa, que la
  mayoría de generadores de vista previa no resuelve.
- "Qué hay de nuevo" (Ayuda) vuelve a deslizar de verdad entre
  diapositivas, en vez de solo aparecer con un fundido — un bug real
  había obligado a quitar esa animación antes.
- Training Records: "Versión del examen", "Certificación" y los
  checkboxes de "Progreso del curso" seguían con el tono verde anterior
  al rediseño — ahora usan el mismo azul marino que el resto de la
  pantalla (el botón "Generar para todos" ya se había corregido antes).
- El calendario de Home/Resumen ahora sí desplaza la pantalla al detalle
  del día al tocarlo, siempre al instante — antes dependía de un tiempo
  variable (a veces varios segundos, a veces nada) según cuánto
  contenido tuviera el día.
- El botón "Generar para todos los alumnos" de Training Records usaba un
  verde genérico en vez del color real de la sección.
- Perfil: fecha de nacimiento y país de residencia ahora van en la misma
  línea, con el campo Profesional al final.
- Config/Usuarios: la fila de una cuenta desactivada ahora se ve
  claramente "apagada" (colores más tenues en toda la fila, no solo en
  el punto de estado).
- El favicon ya no muestra un recuadro azul con el logo en blanco
  dentro — ahora es solo el logo, vectorial, y se invierte a blanco
  automáticamente si el navegador/sistema está en modo oscuro.
- El selector de fecha: los accesos rápidos (hoy/ayer/mañana/antes de
  ayer) ocupaban dos filas enteras y obligaban a hacer scroll para ver
  el calendario completo — ahora es una sola fila. Nuevo salto de año
  (« »), y la fecha de nacimiento del perfil ya no muestra accesos
  rápidos que no tenían sentido ahí.
- Tarifas: una tarifa desactivada se ve ahora igual de "apagada" que una
  cuenta desactivada en Config/Usuarios (antes la diferencia con una
  fila activa era demasiado sutil).
- Mi perfil: el formulario de edición de Datos personales ya no aparece
  con todos los campos pegados unos a otros — ahora respira entre filas.
- Mi perfil: el selector de país de residencia ahora lista los países en
  orden alfabético, y ya no "salta" de un lado a otro al escribir en
  móvil (el teclado virtual ya no le hace cambiar de dirección mientras
  está abierto) — arreglo que también protege a cualquier otro selector
  desplegable de la app frente al mismo problema.
- Mi trabajo: los KPIs con una cifra muy larga ya no se salen del
  cuadro en móvil — ahora la cifra puede partirse en dos líneas también
  cuando es un único número sin espacios.
- El calendario de Home/Resumen ahora se alinea justo debajo de la
  cabecera al tocar un día, en vez de centrar el día pulsado en medio
  de la pantalla — se ve el mes completo y el detalle debajo.
- **(Interno, importante)** Todos los enlaces de email generados por la
  app (bienvenida al dar de alta un usuario, autoregistro, reactivar
  cuenta, regenerar contraseña, invitación) ya usan el dominio real
  desde el que se pidieron, no una URL fija — antes solo "olvidé mi
  contraseña" tenía este arreglo; los otros cinco flujos podían enviar
  un enlace al dominio equivocado si se generaban desde un Preview
  Deployment o desde TEST.
- **(Interno, Training Records) Generar imagen (JPG) fallaba en Safari
  real** — "Setting up fake worker failed". Causa confirmada leyendo el
  código fuente de pdfjs-dist: en su modo de reserva "fake worker",
  esperaba encontrar `WorkerMessageHandler` donde no se exportaba.
- **(Interno, crítico) Todos los deployments de Vercel fallaban** desde
  que se añadió el endpoint de actividad de usuario — superaba el
  límite de 12 Serverless Functions del plan Hobby. Fusionado dentro de
  `/api/list-user-status` en vez de vivir en su propio fichero — ver
  "Límite de Serverless Functions" en `CLAUDE.md`.
- (Interno) El email de "olvidé mi contraseña" podía llevar a la URL
  fija de TEST en vez de al Preview Deployment concreto desde el que se
  pidió — ya usa el dominio real de la petición.
- El KPI "Pendiente de cobrar" (Mi trabajo) podía seguir cortando la
  cifra con importes de 6 cifras — el tamaño de letra ya se ajusta a lo
  largo que sea el número.
- (Interno, Training Records) La exportación a JPG podía fallar con un
  error genérico sin ninguna pista de la causa real si la conversión a
  imagen fallaba a mitad — ahora el mensaje dice en qué paso exacto.
- El menú inferior podía quedar oculto tras la propia barra de Safari en
  una pantalla con poco contenido (p. ej. Mi trabajo sin movimientos) —
  el navegador no tenía nada que desplazar para colapsar su barra.
- (Interno, Training Records) Al firmar en la hoja de alta de alumno,
  un trazo de firma con componente horizontal hacia la derecha (una
  firma normal) podía interpretarse también como el gesto de "deslizar
  para volver" del contenedor de Configuración, devolviendo de golpe al
  menú de Configuración a mitad de firmar. `signature_pad` nunca corta
  la propagación del toque tras dibujar; ahora sí se corta en el propio
  lienzo de firma.
- (Interno, Training Records) La generación de PDF/JPG fallaba en
  Safari real ("Promise.try is not a function" seguido de un
  DataCloneError) porque el Web Worker de pdfjs-dist corre en su propio
  ámbito global, sin heredar los polyfills ya aplicados al hilo
  principal — ahora se le aplican los mismos dentro de él antes de
  cargar su código real.
- Los KPIs de la cabecera de Mi trabajo podían seguir cortando la cifra
  en Safari iOS con importes largos — ahora la cifra puede partirse en
  dos líneas en vez de depender de acertar un tamaño de letra.
- El calendario de "Periodo" en el filtro de Mi trabajo podía salirse
  del viewport sin ninguna forma de hacer scroll para ver el final —
  afectaba en realidad a cualquier panel flotante de la app (Select,
  MultiSelect, DatePicker...) más alto que el hueco disponible.
- Los importes de 4 cifras (1.000 a 9.999) no llevaban el punto de los
  miles, a diferencia de los de 5 cifras o más — ya se ven igual de
  consistentes en toda la app.
- El KPI "Pendiente de cobrar" (Mi trabajo) podía quedar demasiado
  pegado al margen derecho de la tarjeta con una cifra grande, y su
  tooltip se acorta.
- Los 3 KPIs de Mi trabajo reducen u ocultan su icono juntos (nunca solo
  uno) cuando alguna de las 3 cifras crece demasiado, para dejarle sitio
  al número.
- (Interno) Una tarifa desactivada podía usarse igualmente para
  calcular el importe de un movimiento nuevo — ahora solo cuenta una
  tarifa activa, igual que si no existiera ninguna cuando no la hay.
- El calendario de Home y Resumen ya prioriza el día de hoy al abrir la
  pantalla (si tiene alguna entrada), en vez del primer día del mes con
  movimientos.
- (Interno) El desplazamiento automático al panel de detalle del
  calendario de Home no funcionaba en Safari iOS real — se usaba
  `behavior: "smooth"`, con soporte poco fiable comprobado en este
  entorno; ahora el desplazamiento es siempre instantáneo, con la API
  más simple y fiable disponible.
- (Interno, Training Records) La fecha de la firma de padre/madre/tutor
  se rellenaba en el PDF aunque el alumno no fuera menor de edad (y esa
  fila no tuviera ni nombre ni firma) — ahora solo se rellena si de
  verdad hay firma de padre/madre/tutor, en las 10 plantillas.
- Tarifas: "Mostrar desactivadas" ya no está escondido dentro de
  "Filtrar" (siempre visible junto al contador de la lista), y una
  tarifa desactivada se reconoce ahora por su propio fondo, no solo por
  el texto.
- El calendario de Home (y el de Resumen) desplaza la pantalla
  automáticamente para mostrar el detalle del día al tocarlo, si no era
  ya visible — antes no había ninguna pista de que algo hubiera pasado.
- El icono de Configuración podía reabrir la última sección visitada
  (p. ej. Tarifas) en vez del menú, si se había salido de Configuración
  tocando directamente Home/Mi trabajo/Resumen — ya abre siempre el
  menú, salvo al recargar la página dentro de una sección.
- Configuración → Usuarios: el estado de una cuenta se reconoce ahora
  solo por el color (con un botón de ayuda que explica la leyenda) en
  vez de un texto junto al punto de color.
- (Interno) Los emails transaccionales (alta, recuperación de
  contraseña, aviso de despliegue) seguían con los colores de marca
  previos al rebrand — ahora usan el mismo azul marino que el resto de
  la app rediseñada.
- Tarifas seguía marcando el tipo (Curso/Comisión) con una franja de
  color a la izquierda de cada fila — ahora usa el mismo icono en una
  chip circular que ya usa Mi trabajo, para reconocerlo igual en las dos
  pantallas.
- Los 3 KPIs de Mi trabajo ya no reducen su icono a un tamaño intermedio
  con una cifra larga — o se ve a tamaño completo, o se oculta del todo
  (nunca uno solo distinto de sus hermanos), y ahora aparece/desaparece
  con una animación suave en vez de un cambio instantáneo.
- (Interno, importante) Los KPIs de Mi trabajo podían partirse en dos
  líneas en Safari/iOS real con importes que en Chrome se veían bien —
  la cifra ya no se parte nunca; en su lugar se oculta el icono cuando
  hace falta, decidido midiendo de verdad el espacio disponible en el
  propio dispositivo en vez de adivinar un umbral fijo.
- Los emails (bienvenida, recuperar contraseña, reactivar cuenta...)
  seguían mostrando el icono antiguo de olas en la cabecera — ahora
  muestran el logo real de Ocean Flow, igual que el resto de la app.

## [1.0.0] - 2026-09-04

### Added
- **Multidioma (español/inglés)** en toda la app, con selector en
  Registro, Mi perfil y alta de usuarios (admin) — cambia al instante y
  se recuerda por cuenta.
- **Home**: sección "Tu impacto" — alumnos formados este mes, cursos
  impartidos y personas captadas, con animación de conteo; ahora en
  primera posición de la pantalla.
- **Mi trabajo**: 3 KPIs animados en la cabecera (Generado este mes,
  Pendiente de cobrar, Cobrado este mes) en vez de la única tarjeta
  "Pendiente de cobrar" anterior.
- **Mi perfil**: carnet visual del instructor — nivel profesional
  (Divemaster/Instructor), número SSI Pro, iniciales autogeneradas y
  firma capturada, con estética de carnet físico.
- **Recuperación de contraseña autoservicio** ("¿Olvidaste tu
  contraseña?").
- **Registro externo autoservicio** (configurable) y **enlaces de
  invitación de un solo uso** (caducan a las 24h) para dar de alta a
  una persona concreta sin necesidad de abrir el registro público.
- **Contraseña reforzada**: cualquier alta o cambio de contraseña nuevo
  exige ahora un mínimo de 1 mayúscula y 1 símbolo (ver también
  "Changed" — afecta también a cuentas ya existentes).
- **Avisos de despliegue** visibles para todos los usuarios, no solo
  para superadmin (antes solo el resumen técnico llegaba a superadmin).
- **"Ver qué hay de nuevo en esta versión"**: enlace en Ayuda para
  reabrir el slide de novedades cuando se quiera, sin esperar a la
  próxima versión.
- **Indicador visual "TEST"** en el entorno de pruebas, para no
  confundirlo nunca con producción.
- Acceso directo "Hoy" en el selector de fecha.
- Avatares de perfil: catálogo con animales marinos reales (pez,
  tortuga, gamba, caracol, concha).

### Changed
- Cabecera: "Cerrar sesión" se mueve a Mi perfil — de 4 iconos
  tocables a 3 (Ayuda, Configuración, perfil).
- **Contraseña reforzada — efecto sobre cuentas existentes**: una
  cuenta ya creada que no cumpla la política nueva (mínimo 1 mayúscula
  y 1 símbolo) se ve obligada a actualizarla en su próximo inicio de
  sesión, antes de poder seguir usando la app.
- Configuración → Monedas aclara que "predeterminada de la app"
  (respaldo general cuando nadie ha elegido moneda propia) no es lo
  mismo que la moneda favorita personal de Mi perfil — antes ambas
  usaban la misma palabra ("Favorita") sin ninguna explicación.
- Toasts rediseñados: animación de entrada/salida y cierre manual.
- Tono más cercano en los toasts de éxito y en el email de bienvenida.
- Eliminar la cuenta pide ahora escribir la palabra "CANCELAR" como
  paso adicional antes de confirmar.
- Ayuda ya no incluye ningún contenido de administración/superadmin,
  ni siquiera oculto tras el filtro de rol.

### Fixed
- El botón de ayuda ("?") de un campo con texto de ayuda adicional
  (p. ej. Importe en el Ajuste de compañeros) descuadraba el
  formulario y provocaba un salto visual; el propio texto de ayuda
  podía además salirse de la pantalla en campos cerca del borde.
- Las hojas de gestión de usuarios (crear, editar, eliminar) no
  animaban su cierre correctamente.
- El listado de Usuarios mostraba la fecha de alta en cada fila; ahora
  muestra el último acceso real (o "Nunca") — el dato ya existía en la
  hoja de detalle, solo faltaba en la fila.
- El slide de "Eliminar" al arrastrar una fila de Usuarios podía
  quedarse a medio abrir si se soltaba antes de completar el gesto.
- El teclado numérico que muestra iOS Safari no tiene tecla de signo
  menos — el importe de Ajuste de curso (el único caso donde un
  negativo tiene sentido) gana un botón +/- para poder escribirlo sin
  depender del teclado.

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
