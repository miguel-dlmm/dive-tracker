// Política de contraseñas — Release V1, pedido explícito del usuario
// 2026-09-02: "añadamos robustez a la contraseña: 1 mayúscula y 1
// símbolo". Fuente de verdad única, usada por CreatePasswordScreen,
// ResetPasswordScreen y ForcedPasswordUpdateScreen (y por useSession.js
// para decidir si una cuenta ya existente necesita actualizar su
// contraseña la próxima vez que inicie sesión).
export const PASSWORD_MIN_LENGTH = 8;

// Símbolo: cualquier carácter que no sea letra, dígito ni espacio — cubre
// tanto los símbolos "clásicos" de teclado (!@#$%...) como cualquier otro
// carácter no alfanumérico, sin necesitar mantener una lista cerrada.
// \p{L}/\p{N} (Unicode) para no penalizar letras acentuadas como si fueran
// símbolos.
const SYMBOL_PATTERN = /[^\p{L}\p{N}\s]/u;
const UPPERCASE_PATTERN = /\p{Lu}/u;

export function hasUppercase(password) {
  return UPPERCASE_PATTERN.test(password || "");
}

export function hasSymbol(password) {
  return SYMBOL_PATTERN.test(password || "");
}

export function meetsPasswordPolicy(password) {
  const value = password || "";
  return value.length >= PASSWORD_MIN_LENGTH && hasUppercase(value) && hasSymbol(value);
}
