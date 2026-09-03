// Regla acordada con el usuario para las iniciales autogeneradas de un
// alumno en el generador de Training Records: primera letra del nombre +
// primera letra de CADA palabra del apellido (apellidos compuestos como
// "de la Marta" cuentan cada palabra, no solo la primera) — así el
// instructor no tiene que teclearlas a mano fila por fila del registro,
// aunque siempre puede corregirlas si dos alumnos coinciden.
export function computeInitials(firstName, lastName) {
  const first = (firstName || "").trim();
  const last = (lastName || "").trim();
  const firstLetter = first ? first[0].toUpperCase() : "";
  const lastLetters = last
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join("");
  return `${firstLetter}${lastLetters}`;
}
