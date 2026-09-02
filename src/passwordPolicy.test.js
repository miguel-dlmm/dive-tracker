import { meetsPasswordPolicy, hasUppercase, hasSymbol, PASSWORD_MIN_LENGTH } from "./passwordPolicy";

describe("passwordPolicy", () => {
  it("exige al menos 8 caracteres", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(meetsPasswordPolicy("Ab1!567")).toBe(false); // 7 caracteres
    expect(meetsPasswordPolicy("Ab1!5678")).toBe(true);
  });

  it("exige al menos una mayúscula", () => {
    expect(hasUppercase("password123!")).toBe(false);
    expect(hasUppercase("Password123!")).toBe(true);
    expect(meetsPasswordPolicy("password123!")).toBe(false);
  });

  it("exige al menos un símbolo", () => {
    expect(hasSymbol("Password123")).toBe(false);
    expect(hasSymbol("Password123!")).toBe(true);
    expect(meetsPasswordPolicy("Password123")).toBe(false);
  });

  it("acepta una contraseña que cumple los tres requisitos", () => {
    expect(meetsPasswordPolicy("Password123!")).toBe(true);
  });

  it("no cuenta una letra acentuada en mayúscula como símbolo, ni viceversa", () => {
    expect(hasSymbol("ÁÉÍÓÚ12345")).toBe(false);
    expect(hasUppercase("áéíóú12345!")).toBe(false);
    expect(meetsPasswordPolicy("Áéíóú123!")).toBe(true);
  });

  it("no revienta con valores vacíos o indefinidos", () => {
    expect(meetsPasswordPolicy("")).toBe(false);
    expect(meetsPasswordPolicy(undefined)).toBe(false);
  });
});
