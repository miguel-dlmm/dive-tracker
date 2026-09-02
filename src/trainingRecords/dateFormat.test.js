import { formatDateDDMMYY, todayIso } from "./dateFormat";

describe("formatDateDDMMYY", () => {
  it("convierte YYYY-MM-DD al formato impreso DD/MM/AA (año a 2 dígitos)", () => {
    expect(formatDateDDMMYY("2026-09-02")).toBe("02/09/26");
  });

  it("devuelve cadena vacía si no hay fecha", () => {
    expect(formatDateDDMMYY(null)).toBe("");
    expect(formatDateDDMMYY("")).toBe("");
  });
});

describe("todayIso", () => {
  it("devuelve la fecha de hoy en formato YYYY-MM-DD", () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    expect(todayIso()).toBe(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  });
});
