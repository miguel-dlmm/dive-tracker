// Contenido versionado de la Política de Privacidad — borrador MVP, con
// [PENDIENTE] donde faltan datos reales del responsable del tratamiento.
// Revisar con criterio legal antes de considerarlo definitivo.
//
// VERSION sube cada vez que cambia el contenido de forma relevante; eso es
// lo único que hace falta tocar para forzar que todos los usuarios vuelvan
// a aceptar (ver pendingLegalConsents en useSession.js).
export const DOCUMENT_TYPE = "privacy_policy";
export const VERSION = "v1";
export const TITLE = "Política de Privacidad";

export const SECTIONS = [
  {
    heading: "1. Responsable del tratamiento",
    body: "Ocean Flow — [PENDIENTE: razón social, dirección y datos de contacto del responsable] es responsable del tratamiento de los datos personales tratados a través de Ocean Pulse.\n\nPara cualquier cuestión relacionada con esta política puedes escribir a [PENDIENTE: email de contacto de privacidad].",
  },
  {
    heading: "2. Qué datos tratamos",
    body: "Datos de tu cuenta: nombre, apellidos, nickname y email.\n\nDatos de tu actividad profesional: escuelas, actividades, tarifas, clases impartidas, comisiones y pagos entre compañeros que registras en la app.\n\nDatos de terceros que tú introduces: en algunos registros (por ejemplo, pagos a compañeros) puedes incluir el nombre de otra persona con la que colaboras profesionalmente. Eres responsable de que esa persona conozca este tratamiento.",
  },
  {
    heading: "3. Finalidad",
    body: "Permitirte llevar el control de tus ingresos como instructor freelance: registro de clases, comisiones, pagos y tarifas, y mostrarte resúmenes de tu propia actividad.",
  },
  {
    heading: "4. Base legal",
    body: "La ejecución de la relación de servicio entre tú y Ocean Flow (prestación de la app). Para los datos de terceros que introduces tú mismo, la base es tu interés legítimo en gestionar tu actividad profesional.",
  },
  {
    heading: "5. Conservación",
    body: "Tus datos se conservan mientras mantengas una cuenta activa en Ocean Pulse. Los datos con relevancia fiscal o contable pueden conservarse el tiempo exigido por la normativa aplicable, incluso si solicitas la baja de tu cuenta.",
  },
  {
    heading: "6. Encargados del tratamiento",
    body: "Usamos Supabase como proveedor de base de datos y autenticación, que actúa como encargado del tratamiento bajo sus propias garantías de seguridad. No cedemos tus datos a terceros con fines comerciales.",
  },
  {
    heading: "7. Tus derechos",
    body: "Puedes solicitar acceso, rectificación, supresión y portabilidad de tus datos escribiendo a [PENDIENTE: email de contacto de privacidad]. Algunas de estas funciones estarán disponibles próximamente directamente desde la app.",
  },
  {
    heading: "8. Seguridad",
    body: "Aplicamos medidas técnicas y organizativas razonables (cifrado en tránsito y en reposo, control de acceso por usuario) para proteger tus datos.",
  },
  {
    heading: "9. Cambios en esta política",
    body: "Si actualizamos esta política de forma relevante, te pediremos que la aceptes de nuevo la próxima vez que accedas a la app.",
  },
];
