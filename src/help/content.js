// Contenido del Manual de Ayuda — datos puros, sin JSX.
//
// Organizado por objetivo del usuario ("Registrar una nueva actividad"),
// nunca por pantalla o componente interno ("Formulario de WorkLogTab").
// Cada artículo sigue la misma estructura: qué puedes hacer, cuándo
// usarlo, los pasos a seguir, consejos/errores habituales y el resultado
// que deberías ver al terminar.
//
// sectionKey (opcional): key de la tabla nav_sections cuyo color hereda
// la categoría, para que la Ayuda use los mismos colores que el resto de
// la app en vez de una paleta propia (ver CLAUDE.md, convención 2).
//
// steps: array de strings, o de objetos { text, image: { src, alt } } —
// el campo image no se usa todavía en ningún artículo (no hay capturas
// generadas aún), pero HelpStep ya sabe renderizarlo cuando las haya.
//
// adminOnly (opcional, en categoría o en artículo): oculta el contenido
// a quien no sea admin/superadmin, igual que ADMIN_SECTIONS en ConfigTab.
export const HELP_CATEGORIES = [
  {
    id: "bienvenida",
    icon: "Sparkles",
    label: "Primeros pasos",
    description: "Qué es Ocean Pulse y cómo se organiza",
    articles: [
      {
        id: "primeros-pasos",
        title: "Empezar a usar Ocean Pulse",
        summary: "Una vuelta rápida por las pantallas principales antes de registrar tu primera clase.",
        whatYouCanDo: "Ocean Pulse te ayuda a llevar el control de tus ingresos como instructor freelance: las clases que impartes, las comisiones que generas por clientes referidos y los pagos que haces a compañeros que te han referido a ti.",
        whenToUseIt: "La primera vez que abres la app, o cuando quieras recordar para qué sirve cada pantalla.",
        steps: [
          "Home: resumen del mes y accesos rápidos para crear un registro o una comisión.",
          "Registro: cada clase o actividad que impartes.",
          "Comisiones: lo que ganas cuando refieres un cliente a otro instructor o escuela.",
          "Compañeros: los pagos que tú haces a quien te ha referido un cliente.",
          "Resumen: el balance completo del mes, juntando las tres fuentes anteriores.",
        ],
        tips: [
          "Antes de registrar tu primera clase, revisa en Configuración que tus escuelas, actividades y tarifas estén dadas de alta — así los importes se calculan solos.",
        ],
        expectedResult: "Sabes qué pantalla usar para cada situación y estás listo para registrar tu primera clase.",
      },
    ],
  },
  {
    id: "registro",
    sectionKey: "log",
    icon: "ListChecks",
    label: "Registro",
    description: "Anotar las clases que impartes",
    articles: [
      {
        id: "registrar-actividad",
        title: "Registrar una nueva actividad",
        summary: "Anota una clase que has impartido para que se sume automáticamente a lo que has ganado.",
        whatYouCanDo: "Cada vez que impartes una clase o actividad, la registras aquí para que quede contabilizada en tus ingresos del mes.",
        whenToUseIt: "Justo después de dar una clase, o al final del día cuando repases todo lo impartido.",
        steps: [
          "Entra en Registro y pulsa el botón + de la esquina inferior derecha.",
          "Elige la escuela y la actividad — si ya tienes una tarifa configurada para esa combinación, el importe se calcula solo.",
          "Indica la fecha y el número de personas (si la tarifa es 'por persona').",
          "Guarda. La clase aparece al momento en tu lista y en el calendario de Home.",
        ],
        tips: [
          "Si no existe todavía una tarifa para esa escuela + actividad, la app te deja crearla al vuelo sin salir del formulario.",
          "El estado de cobro (cobrada/pendiente) no se marca aquí — se gestiona desde Configuración → Pagos.",
        ],
        expectedResult: "La clase queda en tu Registro y su importe se suma a 'Ganado este mes' en Home.",
      },
    ],
  },
  {
    id: "comisiones",
    sectionKey: "comisiones",
    icon: "Handshake",
    label: "Comisiones",
    description: "Lo que ganas por referir clientes",
    articles: [
      {
        id: "llevar-comisiones",
        title: "Llevar el control de tus comisiones",
        summary: "Registra lo que ganas cuando refieres un cliente a otra escuela o instructor.",
        whatYouCanDo: "Cuando envías un cliente a otra escuela o compañero, esa escuela suele pagarte una comisión — aquí queda registrada igual que una clase, pero en su propia pantalla.",
        whenToUseIt: "Cuando refieres un cliente y sabes (o esperas) una comisión a cambio.",
        steps: [
          "Entra en Comisiones y pulsa el botón +.",
          "Elige la escuela y la actividad del cliente que referiste.",
          "El importe se calcula solo si existe una tarifa de comisión para esa combinación.",
          "Guarda para dejar constancia del ingreso esperado.",
        ],
        tips: [
          "Las tarifas de comisión se configuran aparte de las tarifas de clase, en Tarifas → modo 'Comisión'.",
        ],
        expectedResult: "La comisión aparece en tu lista y se incluye en el balance del Resumen mensual.",
      },
    ],
  },
  {
    id: "companeros",
    sectionKey: "colegas",
    icon: "Users",
    label: "Compañeros",
    description: "Pagos a quien te refiere clientes",
    articles: [
      {
        id: "pagar-companeros",
        title: "Pagar a un compañero que te ha referido un cliente",
        summary: "Registra lo que tú pagas a otro instructor cuando te ha enviado un cliente.",
        whatYouCanDo: "Es el reverso de Comisiones: aquí registras el dinero que tú entregas a un compañero por haberte referido un cliente.",
        whenToUseIt: "Cuando le debes (o ya has pagado) una comisión a otro instructor.",
        steps: [
          "Entra en Compañeros y pulsa el botón +.",
          "Indica el nombre del compañero, la escuela/actividad del cliente y el importe.",
          "Guarda el pago.",
        ],
        tips: [
          "No necesitas una tarifa configurada — el importe se escribe a mano, ya que suele acordarse caso a caso.",
        ],
        expectedResult: "El pago queda registrado y se resta de tu balance real en el Resumen mensual.",
      },
    ],
  },
  {
    id: "tarifas",
    sectionKey: "rates",
    icon: "Settings2",
    label: "Tarifas",
    description: "Precios por escuela y actividad",
    articles: [
      {
        id: "configurar-tarifas",
        title: "Configurar tus tarifas para que los importes se calculen solos",
        summary: "Define cuánto cobras por cada combinación de escuela y actividad, para no calcular nada a mano.",
        whatYouCanDo: "Una tarifa conecta una escuela + actividad con un precio, una moneda y un tipo de cobro (fijo o por persona). Es lo que permite que Registro y Comisiones calculen el importe automáticamente.",
        whenToUseIt: "La primera vez que trabajas con una escuela o actividad nueva, o cuando te cambian el precio.",
        steps: [
          "Entra en Tarifas (desde Configuración) y elige el modo: 'Instructor' (tus clases) o 'Comisión' (lo que te pagan por referir).",
          "Pulsa + y elige escuela, actividad y tipo de pago.",
          "Indica si el precio es fijo por clase o 'por persona' (se multiplica por el número de asistentes).",
          "Elige la moneda — será la que se use automáticamente en cada registro con esa tarifa.",
        ],
        tips: [
          "Si no hay tarifa para una combinación, Registro y Comisiones muestran el importe en blanco hasta que la crees.",
          "Cambiar una tarifa no recalcula los registros ya guardados — solo afecta a los nuevos.",
        ],
        expectedResult: "A partir de ahora, al registrar esa escuela + actividad, el importe y la moneda aparecen solos.",
      },
    ],
  },
  {
    id: "pagos",
    sectionKey: "payments",
    icon: "Wallet",
    label: "Pagos",
    description: "Qué clases tienes cobradas",
    articles: [
      {
        id: "marcar-cobradas",
        title: "Marcar tus clases como cobradas",
        summary: "Controla qué clases ya te han pagado y cuáles siguen pendientes.",
        whatYouCanDo: "Pagos es una vista de tu Registro centrada en el estado de cobro: te deja ver de un vistazo qué clases siguen pendientes y cambiar su estado.",
        whenToUseIt: "Cuando una escuela te paga, o periódicamente para revisar qué tienes pendiente de cobrar.",
        steps: [
          "Entra en Configuración → Pagos.",
          "Filtra por fecha, escuela o actividad si quieres localizar una clase concreta.",
          "Pulsa el interruptor de estado de la clase para pasarla de pendiente a cobrada (o al revés).",
        ],
        tips: [
          "El cambio de estado es inmediato — no hace falta guardar aparte.",
        ],
        expectedResult: "El estado de cada clase queda actualizado y se refleja en el Resumen mensual.",
      },
    ],
  },
  {
    id: "resumen",
    sectionKey: "summary",
    icon: "BarChart3",
    label: "Resumen",
    description: "Tu balance mensual completo",
    articles: [
      {
        id: "consultar-resumen",
        title: "Consultar cuánto has ganado este mes",
        summary: "Revisa el balance completo: clases, comisiones y pagos a compañeros juntos.",
        whatYouCanDo: "El Resumen junta las tres fuentes de dinero de la app (Registro, Comisiones, Compañeros) en un único balance, filtrable por fechas.",
        whenToUseIt: "A final de mes, o cuando quieras saber tu balance real en un periodo concreto.",
        steps: [
          "Entra en Resumen.",
          "Ajusta el rango de fechas si quieres ver un periodo distinto al mes actual.",
          "Revisa el desglose por escuela, actividad o tipo de ingreso.",
        ],
        tips: [
          "El KPI de Home ('Ganado este mes') solo cuenta Registro — para el balance completo (con Comisiones y Compañeros) usa siempre Resumen.",
        ],
        expectedResult: "Tienes una cifra de balance real del periodo elegido, con el detalle de dónde viene cada ingreso.",
      },
    ],
  },
  {
    id: "configuracion",
    sectionKey: "config",
    icon: "Settings",
    label: "Configuración",
    description: "Adaptar la app a tu forma de trabajar",
    articles: [
      {
        id: "personalizar-listas",
        title: "Personalizar escuelas y actividades",
        summary: "Adapta la app a tu forma de trabajar: añade o edita las escuelas y actividades con las que trabajas.",
        whatYouCanDo: "Nada está fijado en la app: escuelas, actividades, tipos y estados de pago, monedas... todo se edita desde Configuración.",
        whenToUseIt: "Cuando empiezas a trabajar con una escuela o actividad nueva.",
        steps: [
          "Entra en Configuración y elige la pestaña (Escuelas, Actividades, Monedas...).",
          "Escribe el nombre y pulsa + para añadir.",
          "Toca el color para personalizarlo — se usa en toda la app para identificar esa escuela o actividad.",
        ],
        tips: [
          "Marca una escuela, actividad o moneda como 'Favorita' (la estrella) para que aparezca preseleccionada en los formularios.",
        ],
        expectedResult: "La nueva escuela o actividad está disponible al momento en Registro, Comisiones y Tarifas.",
      },
      {
        id: "gestionar-usuarios",
        adminOnly: true,
        title: "Gestionar quién tiene acceso a la app",
        summary: "Como administrador, invita a nuevas personas y controla quién más puede administrar.",
        whatYouCanDo: "Solo los administradores pueden crear cuentas nuevas y conceder o retirar el rol de administrador a otras personas.",
        whenToUseIt: "Cuando alguien nuevo del equipo necesita entrar en la app.",
        steps: [
          "Entra en Configuración → Usuarios (solo visible si eres administrador).",
          "Pulsa 'Crear usuario' e indica email, nombre y una contraseña inicial.",
          "Comparte esa contraseña directamente con la persona — todavía no hay invitación por email.",
        ],
        tips: [
          "Solo puede haber un superadministrador y no es editable desde aquí — es una protección del sistema.",
        ],
        expectedResult: "La persona ya puede iniciar sesión con la contraseña que le has compartido.",
      },
    ],
  },
];
