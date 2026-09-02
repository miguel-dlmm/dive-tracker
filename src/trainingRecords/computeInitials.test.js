import { computeInitials } from "./computeInitials";

describe("computeInitials", () => {
  it("combina la primera letra del nombre con la primera letra del apellido simple", () => {
    expect(computeInitials("Juan", "Perez")).toBe("JP");
  });

  it("cuenta cada palabra de un apellido compuesto", () => {
    expect(computeInitials("Miguel", "de la Marta")).toBe("MDLM");
  });

  it("ignora espacios repetidos entre palabras del apellido", () => {
    expect(computeInitials("Ana", "Garcia   Lopez")).toBe("AGL");
  });

  it("devuelve solo lo que haya si falta nombre o apellido", () => {
    expect(computeInitials("", "Perez")).toBe("P");
    expect(computeInitials("Juan", "")).toBe("J");
    expect(computeInitials("", "")).toBe("");
  });

  it("recorta espacios en los extremos", () => {
    expect(computeInitials("  Juan  ", "  Perez  ")).toBe("JP");
  });
});
