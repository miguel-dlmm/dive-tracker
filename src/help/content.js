// Contenido del Manual de Ayuda — datos puros, sin JSX.
//
// Rediseño 2026-08-29 (ver docs/ADR/0011-rediseno-ayuda.md): la app
// cambió demasiado desde la última versión de este contenido (Registro/
// Comisiones/Compañeros/Pagos como pantallas separadas, "Ganado este
// mes", pestañas en Configuración) para conservarlo — se reescribe entero
// para reflejar Mi trabajo, Resumen y Configuración actuales.
//
// Cada categoría lleva un `group` opcional:
//   - undefined → categoría suelta, sin cabecera de grupo (solo
//     "Primeros pasos", va siempre primero).
//   - "quiero"  → historias de uso, orientadas a una acción concreta del
//     usuario ("Quiero registrar un movimiento").
//   - "funcionalidades" → referencia por pantalla, para cuando ya sabes
//     qué quieres hacer y necesitas recordar dónde o cómo.
// (Ver HelpCategoryList.jsx — agrupa por esta clave, mismo patrón visual
// que el menú de Configuración de ConfigTab.jsx: aprender a leer un menú
// agrupado sirve para las dos pantallas.)
//
// Cada artículo sigue la misma estructura: qué puedes hacer, cuándo
// usarlo, los pasos a seguir, consejos/errores habituales y el resultado
// que deberías ver al terminar.
//
// sectionKey (opcional): key de la tabla nav_sections cuyo color hereda
// la categoría, para que la Ayuda use los mismos colores que el resto de
// la app en vez de una paleta propia (ver CLAUDE.md, convención 2).
//
// steps: array de strings, o de objetos { text, image: { src, alt } } —
// el campo image sigue sin usarse en ningún artículo. Se evaluaron
// capturas reales para esta reescritura (igual que en WhatsNew.jsx) pero
// las generadas en esta sesión mostraban la cuenta de desarrollo
// ("dev-bypass") y datos de prueba repetidos — no presentables. El
// renderer (HelpStep) ya sabe pintarlas en cuanto existan capturas
// limpias generadas a propósito.
//
// adminOnly (opcional, en categoría o en artículo): oculta el contenido
// a quien no sea admin/superadmin, igual que ADMIN_SECTIONS en ConfigTab.
export const HELP_CATEGORIES = [
  {
    id: "bienvenida",
    icon: "Sparkles",
    label: "Primeros pasos",
    description: "Qué es Ocean Flow y cómo se organiza",
    articles: [
      {
        id: "primeros-pasos",
        title: "Empezar a usar Ocean Flow",
        summary: "Una vuelta rápida por las tres pantallas principales antes de registrar tu primer movimiento.",
        whatYouCanDo: "Ocean Flow te ayuda a llevar el control de tus ingresos como instructor freelance: las clases que impartes, las comisiones que generas por clientes referidos y los ajustes económicos con otros instructores — todo bajo un mismo concepto, \"movimiento\".",
        whenToUseIt: "La primera vez que abres la app, o cuando quieras recordar para qué sirve cada pantalla.",
        steps: [
          "Home: cuánto tienes pendiente de cobrar, un widget con tus deudas más antiguas, el calendario del mes y un acceso directo para crear un movimiento.",
          "Mi trabajo: la lista completa de tus movimientos (cursos, comisiones y ajustes), para crearlos, editarlos, cobrarlos o eliminarlos.",
          "Resumen: tu balance por el periodo que elijas, con la posibilidad de profundizar por escuela, por curso o por comisiones.",
        ],
        tips: [
          "El orden natural para una cuenta nueva es: 1) Configurar tu aplicación (escuelas, cursos, tarifas), 2) Registrar un movimiento de cada tipo que uses, 3) Cobrar — uno cuando te paguen, todos de golpe si revisas periódicamente. Cada uno de esos tres pasos tiene su propia guía en \"Quiero...\" más abajo.",
        ],
        expectedResult: "Sabes qué pantalla usar para cada situación y en qué orden seguir para dejar la app lista para tu día a día.",
      },
    ],
  },

  // ---------------- Quiero... (historias de uso) ----------------
  // Orden 2026-08-29: sigue el flujo real de un usuario nuevo (configurar
  // → crear → cobrar → consultar), no el orden alfabético ni el orden en
  // que se rediseñaron las pantallas — ver docs/ADR/0011, addendum.
  {
    id: "quiero-configurar",
    group: "quiero",
    sectionKey: "config",
    icon: "Settings",
    label: "Configurar tu aplicación",
    description: "Escuelas, cursos, tarifas y catálogos",
    articles: [
      {
        id: "configurar-app",
        title: "Configurar tu aplicación",
        summary: "Nada está fijado en la app: escuelas, cursos, tarifas y catálogos de pago se editan desde Configuración.",
        whatYouCanDo: "Configuración se organiza en dos bloques: lo que cualquier usuario mantiene (Escuelas, Cursos, Tarifas) y, si tienes rol de administrador, un bloque de \"Administración\" con catálogos de toda la app (tipos y estados de pago, monedas, colores, usuarios).",
        whenToUseIt: "Antes de registrar tu primer movimiento, y después cada vez que empieces a trabajar con una escuela o curso nuevo, o cambies un precio.",
        steps: [
          "Entra en Configuración (icono de engranaje, arriba a la derecha) y toca la sección que necesites.",
          "Da de alta tus Escuelas y Cursos primero — una Tarifa siempre relaciona una escuela con un curso, así que hace falta que existan los dos antes.",
          "Dentro de una sección, pulsa el botón \"+\" flotante para crear; \"‹ Configuración\" te devuelve al menú.",
          "Toca el color de una fila para personalizarlo, y la estrella para marcarla como favorita.",
        ],
        tips: [
          "Una escuela, curso o moneda marcada como favorita aparece preseleccionada en los formularios de creación.",
          "Cerrar Configuración (la \"✕\" de la cabecera) te devuelve siempre a la pestaña desde la que entraste.",
        ],
        expectedResult: "La nueva escuela, curso o tarifa está disponible al momento al crear un movimiento — con esto ya puedes seguir con \"Registrar un movimiento\".",
      },
    ],
  },
  {
    id: "quiero-crear-movimiento",
    group: "quiero",
    sectionKey: "trabajo",
    icon: "GraduationCap",
    label: "Registrar un movimiento",
    description: "Un curso impartido, una comisión o un ajuste",
    articles: [
      {
        id: "crear-movimiento",
        title: "Crear un movimiento",
        summary: "El mismo formulario sirve para un curso impartido, una comisión o un ajuste con un compañero — cada tipo tiene sus propios campos.",
        whatYouCanDo: "\"Añadir movimiento\" es el único acceso de creación de toda la app — el propio formulario te deja elegir el tipo, no hace falta acertar un botón distinto para cada caso.",
        whenToUseIt: "Justo después de dar una clase, al cerrar una comisión, o cuando acuerdes un ajuste con otro instructor.",
        steps: [
          "Pulsa \"Añadir movimiento\": el botón \"+\" de la tarjeta \"Pendiente de cobrar\" en Home, el mismo botón tocando un día del calendario de Home, o el \"+\" flotante de Mi trabajo.",
          "Arriba del formulario, elige el tipo: Curso impartido, Comisión o Ajuste de curso.",
          "Curso impartido: escuela, curso, fecha y nº de personas — la tarifa por curso calcula el importe sola.",
          "Comisión: igual que un curso, pero para un cliente que has referido y que forma otro instructor — usa su propia tarifa de comisión, no la de curso.",
          "Ajuste de curso: no depende de ninguna tarifa — indica tú mismo el importe (positivo si te deben, negativo si tú debes) y con qué compañero es el ajuste.",
          "Guarda. Si abriste el formulario desde Home, verás el movimiento en Mi trabajo justo después de guardar.",
        ],
        tips: [
          "Si no existe todavía una tarifa para esa escuela + curso, el formulario te deja crearla al vuelo sin salir de la pantalla (\"Añadir tarifa\") — solo aplica a Curso y Comisión, un Ajuste nunca necesita tarifa.",
          "Cancelar o cerrar el formulario sin guardar no crea nada — puedes abrirlo y cerrarlo sin miedo a dejar movimientos a medias.",
        ],
        expectedResult: "El movimiento aparece en Mi trabajo, dentro de \"Pendientes\", y se suma a \"Generado este mes\" en Home (salvo un Ajuste en tu contra, que no cuenta como generado).",
      },
    ],
  },
  {
    id: "quiero-cobrar",
    group: "quiero",
    sectionKey: "trabajo",
    icon: "Wallet",
    label: "Cobrar movimientos pendientes",
    description: "Marcar como cobrado, uno a uno o todos de golpe",
    articles: [
      {
        id: "cobrar-movimientos",
        title: "Marcar movimientos como cobrados",
        summary: "Controla qué tienes pendiente de cobrar y actualiza el estado en cuanto te paguen — uno a uno, o todos a la vez.",
        whatYouCanDo: "Cada movimiento tiene un estado (pendiente o cobrado). Cambiarlo es inmediato, de un solo toque, con la opción de deshacer si te equivocas. Puedes hacerlo movimiento a movimiento, o de golpe sobre toda la lista visible.",
        whenToUseIt: "En cuanto una escuela o un compañero te paga (uno a uno), o de golpe cuando revisas periódicamente y ya te han pagado varios pendientes a la vez.",
        steps: [
          "Para cobrar uno: entra en Mi trabajo (la pestaña \"Pendientes\" se abre por defecto) y pulsa \"Confirmar cobro\" en su fila (o \"Marcar liquidado\" si es un ajuste en tu contra).",
          "La tarjeta \"Pendiente de cobrar\" de Home te lleva directa a esa misma pestaña — un toque desde la pantalla principal.",
          "Para cobrar varios a la vez: en Mi trabajo, usa \"Cobrar todos\" arriba de la lista — afecta a todo lo que esté visible en ese momento.",
          "Antes de \"Cobrar todos\", usa \"Filtrar\" (por fecha, escuela, curso o tipo) para acotar la lista a justo lo que quieres cobrar de golpe.",
        ],
        tips: [
          "Un toast con \"Deshacer\" aparece tras cada cambio — tienes unos segundos para revertirlo sin volver a buscar el movimiento.",
          "\"Cobrar todos\" pide confirmación antes de aplicarse — no hay \"Deshacer\" para el lote completo, a diferencia de cobrar uno a uno.",
        ],
        expectedResult: "El movimiento (o todos los filtrados) pasa a la pestaña \"Cobrados\" y su importe deja de contar en \"Pendiente de cobrar\" de Home.",
      },
    ],
  },
  {
    id: "quiero-consultar-generado",
    group: "quiero",
    sectionKey: "summary",
    icon: "TrendingUp",
    label: "Consultar cuánto has generado",
    description: "De un vistazo, o en detalle por periodo",
    articles: [
      {
        id: "consultar-generado",
        title: "Consultar cuánto has generado",
        summary: "Un vistazo rápido en Home, o el detalle completo por el periodo que elijas en Resumen.",
        whatYouCanDo: "\"Generado este mes\" en Home te da la cifra del mes en curso, con un indicio de si vas mejor o peor que el mes anterior, sin salir de la pantalla principal. Tocarla te lleva directo a Resumen, que va más allá: cualquier periodo, comparado con el anterior, y con la posibilidad de profundizar por escuela o por curso.",
        whenToUseIt: "Home, para un vistazo rápido al entrar en la app. Resumen, cuando quieras un periodo distinto al mes actual o entender de dónde viene el dinero.",
        steps: [
          "En Home, la tarjeta \"Generado este mes\" ya está siempre visible, sin tocar nada — y tocarla te lleva a Resumen para profundizar.",
          "En Resumen, elige la granularidad y el periodo en el control de arriba (mensual, trimestral, semestral, anual o un rango personalizado) y, si quieres, el tipo (Curso, Comisión o Ajuste).",
          "La tarjeta principal muestra el total del periodo y cuánto ha cambiado respecto al periodo anterior.",
          "Toca \"Por escuela\", \"Por curso\", \"Comisiones\", \"Ajustes de curso\" o \"Calendario\" para profundizar — cada uno se despliega solo si lo pides.",
        ],
        tips: [
          "Dentro de \"Por escuela\", toca una escuela para ver su desglose por curso en el sitio, sin cambiar de pantalla.",
          "La comparación con el periodo anterior no aparece si mezclas más de una moneda en el mismo periodo — evita mostrar un cálculo que no sería exacto.",
        ],
        expectedResult: "Tienes una cifra de balance del periodo elegido, con el detalle de dónde viene cada ingreso si lo necesitas.",
      },
    ],
  },

  // ---------------- Funcionalidades (referencia por pantalla) ----------------
  {
    id: "func-mi-trabajo",
    group: "funcionalidades",
    sectionKey: "trabajo",
    icon: "Briefcase",
    label: "Mi trabajo",
    description: "Crear, editar, cobrar y eliminar movimientos",
    articles: [
      {
        id: "mi-trabajo-referencia",
        title: "Mi trabajo, de un vistazo",
        summary: "La lista completa de tus movimientos — cursos, comisiones y ajustes — con sus acciones.",
        whatYouCanDo: "Mi trabajo unifica lo que antes eran tres pantallas separadas (Registro, Comisiones y Compañeros) en un único lugar, agrupado por estado de cobro.",
        whenToUseIt: "Es tu pantalla de trabajo diaria — crear, revisar, cobrar y editar movimientos.",
        steps: [
          "Pendientes / Cobrados: las dos pestañas de arriba, con el total pendiente en la tarjeta superior.",
          "\"Filtrar\": acota la lista por periodo, escuela, curso o tipo de movimiento.",
          "En cada fila: \"Confirmar cobro\"/\"Marcar pendiente\" para cambiar el estado, y el menú \"⋯\" para Editar o Eliminar.",
          "El botón \"+\" flotante abre el mismo formulario de creación que el resto de la app.",
        ],
        tips: [
          "\"Cobrar todos\"/\"Marcar todos pendientes\" operan sobre la lista visible — con filtros activos, solo afecta a lo filtrado.",
          "Eliminar pide confirmación y anima la salida de la fila, para que veas exactamente qué has borrado.",
        ],
        expectedResult: "Encuentras y actualizas cualquier movimiento sin salir de esta pantalla.",
      },
    ],
  },
  {
    id: "func-resumen",
    group: "funcionalidades",
    sectionKey: "summary",
    icon: "BarChart3",
    label: "Resumen",
    description: "Vistazo rápido y profundidad bajo demanda",
    articles: [
      {
        id: "resumen-referencia",
        title: "Resumen, de un vistazo",
        summary: "Un único total protagonista arriba; todo lo demás se despliega solo si lo pides.",
        whatYouCanDo: "Resumen combina una respuesta rápida (el total del periodo, comparado con el anterior) con tarjetas plegables para quien quiera profundizar.",
        whenToUseIt: "Para entender cómo va un periodo, comparar escuelas o cursos, o repasar comisiones y ajustes con compañeros.",
        steps: [
          "Elige granularidad (mensual, trimestral, semestral, anual o personalizado); la franja de periodos de debajo navega sola — toca cualquiera para recentrar ahí.",
          "Filtra por tipo (Total, Curso, Comisión o Ajuste) con el segmentado de debajo.",
          "La tarjeta principal muestra el total y, cuando tiene sentido calcularla, la comparación con el periodo anterior.",
          "Toca cualquier tarjeta (Por escuela, Por curso, Comisiones, Ajustes de curso, Calendario) para desplegarla.",
        ],
        tips: [
          "Con más de una escuela, \"Por escuela\" empieza desplegada por ser la pregunta más frecuente después del total; con una sola, ese apartado no aparece (no habría nada que comparar) y es \"Por curso\" quien empieza desplegada. Las demás siempre empiezan cerradas.",
          "Dentro de \"Por escuela\", toca una escuela para ver su desglose por curso sin salir de la tarjeta.",
        ],
        expectedResult: "Tienes la cifra que buscabas, con tanto o tan poco detalle como hayas pedido.",
      },
    ],
  },
  {
    id: "func-configuracion",
    group: "funcionalidades",
    sectionKey: "config",
    icon: "Settings",
    label: "Configuración",
    description: "El menú, y qué hay en cada sección",
    articles: [
      {
        id: "configuracion-referencia",
        title: "Configuración, de un vistazo",
        summary: "Un menú agrupado: lo que mantiene cualquier usuario, y lo que solo ve quien administra la cuenta.",
        whatYouCanDo: "Escuelas, Cursos y Tarifas son visibles para cualquier usuario. Si tienes rol de administrador, ves además \"Administración\": Tipos de pago, Estados de pago, Monedas, Colores de navegación, Ajustes generales y Usuarios.",
        whenToUseIt: "Para mantener tus datos base, o —si administras la cuenta— gestionar catálogos y usuarios.",
        steps: [
          "Toca cualquier fila del menú para entrar en esa sección; \"‹ Configuración\" vuelve al menú.",
          "Escuelas, Cursos, Tipos de pago, Estados de pago y Monedas crean mediante el botón \"+\" flotante, igual que en Mi trabajo.",
          "Tarifas muestra Curso y Comisión en una única lista (el tipo se elige como filtro, o al crear, dentro de la propia hoja) — mismo patrón visual que Mi trabajo.",
        ],
        tips: [
          "Solo un superadmin puede crear usuarios o eliminarlos — un admin normal ve el directorio de usuarios en modo solo lectura.",
          "Eliminar un usuario es irreversible y borra también sus datos — pide confirmación explícita.",
        ],
        expectedResult: "Encuentras cualquier catálogo o ajuste sin tener que recordar en qué pestaña vivía antes.",
      },
    ],
  },
  {
    id: "func-filtros",
    group: "funcionalidades",
    icon: "SlidersHorizontal",
    label: "Filtros y búsqueda",
    description: "El mismo patrón en toda la app",
    articles: [
      {
        id: "filtros-referencia",
        title: "Filtrar y buscar",
        summary: "Mi trabajo, Tarifas y los catálogos de Configuración comparten el mismo patrón de filtros.",
        whatYouCanDo: "Un botón \"Filtrar\" (con el número de filtros activos) despliega un panel con los campos disponibles — periodo, escuela, curso, tipo... — en vez de mostrarlos siempre encima de la lista.",
        whenToUseIt: "Cuando la lista tiene demasiados elementos para revisarlos todos a la vista.",
        steps: [
          "Pulsa \"Filtrar\" para desplegar el panel de campos disponibles en esa pantalla.",
          "Elige uno o varios — el filtro de curso admite selección múltiple.",
          "\"Limpiar filtros\" aparece en cuanto hay al menos uno activo.",
        ],
        tips: [
          "El buscador de catálogos (Cursos, Monedas) filtra mientras escribes, sin distinguir mayúsculas ni acentos.",
        ],
        expectedResult: "La lista muestra solo lo que te interesa, sin perder de vista cuántos filtros tienes activos.",
      },
    ],
  },
];
