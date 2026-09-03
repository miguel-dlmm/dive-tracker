import { applyPdfjsPolyfills } from "./pdfjsPolyfills";

// Se prueba sobre un `target` de mentira, no sobre el globalThis real del
// proceso de test — mutar el globalThis compartido contaminaría el resto
// de la suite (otros tests podrían depender de que Promise.withResolvers/
// Iterator NO estén parcheados). Ver comentario de pdfjsPolyfills.js.

describe("applyPdfjsPolyfills", () => {
  it("añade Promise.withResolvers cuando el entorno no lo tiene", () => {
    const target = { Promise };
    applyPdfjsPolyfills(target);
    expect(typeof target.Promise.withResolvers).toBe("function");
  });

  it("Promise.withResolvers añadido funciona de verdad (resolve/reject reales)", async () => {
    const target = { Promise };
    applyPdfjsPolyfills(target);
    const { promise, resolve } = target.Promise.withResolvers();
    resolve("listo");
    await expect(promise).resolves.toBe("listo");
  });

  it("no toca Promise.withResolvers si el entorno ya lo tiene", () => {
    const existing = () => "ya estaba";
    const fakePromise = function FakePromise() {};
    fakePromise.withResolvers = existing;
    const target = { Promise: fakePromise };
    applyPdfjsPolyfills(target);
    expect(target.Promise.withResolvers).toBe(existing);
  });

  it("añade un Iterator global mínimo cuando el entorno no lo tiene, sin ReferenceError", () => {
    const target = { Promise };
    applyPdfjsPolyfills(target);
    expect(typeof target.Iterator).toBe("function");
    // La comprobación real que hace pdfjs-dist al cargarse — no debe
    // lanzar, y debe poder rellenar `.join` a continuación como hace él.
    expect(() => {
      if (typeof target.Iterator.prototype.join !== "function") {
        target.Iterator.prototype.join = (sep) => Array.from([]).join(sep);
      }
    }).not.toThrow();
    expect(typeof target.Iterator.prototype.join).toBe("function");
  });

  it("no toca Iterator si el entorno ya lo tiene", () => {
    const existingIterator = function Iterator() {};
    const target = { Promise, Iterator: existingIterator };
    applyPdfjsPolyfills(target);
    expect(target.Iterator).toBe(existingIterator);
  });
});
