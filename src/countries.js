// Lista de países (ISO 3166-1 alpha-2) para el selector de "País de
// residencia" de Mi perfil y Registro — taxonomía universal fija, mismo
// criterio que `language`/`professional_level` en schema.sql: no es
// configuración de negocio de la cuenta, así que vive como constante
// aquí, no como tabla de Supabase (convención 1 de CLAUDE.md se aplica a
// datos de NEGOCIO, no a un estándar internacional que no cambia).
//
// Solo el código — sin nombre por idioma (a diferencia de la versión
// anterior, curada a mano solo en es/en). Reemplazado 2026-09-08:
// feedback explícito ("me faltan muchos países principales") sobre una
// lista de ~65 países curados por relevancia, que además solo tenía
// nombre en español/inglés — con los 5 idiomas nuevos de la Fase 2
// (fr/it/de/ca/eu), cualquiera de esos usuarios veía el país en
// español igualmente. countryOptionsFor (ProfileTab.jsx) resuelve el
// nombre en caliente con Intl.DisplayNames, el mismo catálogo oficial
// de nombres de país que ya trae el propio motor del navegador en
// cualquier idioma — una sola fuente de verdad, sin mantener una tabla
// de traducciones que además quedaría casi siempre incompleta.
//
// Excluidos a propósito los territorios sin población permanente (no
// tiene sentido ofrecerlos como "país de residencia"): Antártida (AQ),
// isla Bouvet (BV), islas Heard y McDonald (HM), Tierras Australes
// Francesas (TF), islas menores alejadas de EE. UU. (UM), Georgia del
// Sur y Sandwich del Sur (GS).
export const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "EH", "ER", "ES", "ET",
  "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GT", "GU", "GW", "GY",
  "HK", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
  "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ",
  "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA",
  "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
  "UA", "UG", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU",
  "WF", "WS",
  "YE", "YT",
  "ZA", "ZM", "ZW",
];
