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

  // Promise.try: bug real reportado 2026-09-07 en un iPhone real
  // ("TypeError: Promise.try is not a function" dentro del worker de
  // pdfjs-dist, con un DataCloneError como consecuencia directa — ver la
  // nota larga de pdfjsPolyfills.js). MessageHandler#onMessage lo usa
  // como `Promise.try(action, data.data)`: invoca `action` de forma
  // segura, sin que un throw síncrono se salga de la cadena de promesas.
  it("añade Promise.try cuando el entorno no lo tiene", () => {
    const target = { Promise };
    applyPdfjsPolyfills(target);
    expect(typeof target.Promise.try).toBe("function");
  });

  it("Promise.try añadido resuelve con el valor de retorno de la función", async () => {
    const target = { Promise };
    applyPdfjsPolyfills(target);
    await expect(target.Promise.try((a, b) => a + b, 2, 3)).resolves.toBe(5);
  });

  it("Promise.try añadido convierte un throw síncrono en un rechazo, no en una excepción", async () => {
    const target = { Promise };
    applyPdfjsPolyfills(target);
    const boom = () => { throw new Error("boom"); };
    await expect(target.Promise.try(boom)).rejects.toThrow("boom");
  });

  it("no toca Promise.try si el entorno ya lo tiene", () => {
    const existing = () => "ya estaba";
    const fakePromise = function FakePromise() {};
    fakePromise.try = existing;
    const target = { Promise: fakePromise };
    applyPdfjsPolyfills(target);
    expect(target.Promise.try).toBe(existing);
  });

  // Uint8Array.prototype.toHex/.toBase64 y Uint8Array.fromBase64: bug real
  // reportado 2026-09-08 en un Mac/iPhone real, mismo patrón que
  // Promise.try — "UnknownErrorException: i.toHex is not a function" al
  // calcular la huella de un PDF (PDFDocument#fingerprints, pdf.worker.mjs)
  // más un DataCloneError secundario al propagar esa excepción. A
  // diferencia de Promise/Iterator (arriba, con un `target` de mentira
  // completo), aquí se prueba sobre el Uint8Array REAL del proceso de
  // test — necesario porque `new Uint8Array(...)`/`Uint8Array.fromBase64`
  // en las aserciones siempre resuelven al global real, no a un doble —
  // por eso cada test borra y restaura el método exacto que toca en vez
  // de sustituir la clase entera.
  describe("Uint8Array.prototype.toHex/.toBase64 y Uint8Array.fromBase64", () => {
    let hadToHex, hadToBase64, hadFromBase64;
    beforeEach(() => {
      hadToHex = Object.getOwnPropertyDescriptor(Uint8Array.prototype, "toHex");
      hadToBase64 = Object.getOwnPropertyDescriptor(Uint8Array.prototype, "toBase64");
      hadFromBase64 = Object.getOwnPropertyDescriptor(Uint8Array, "fromBase64");
      delete Uint8Array.prototype.toHex;
      delete Uint8Array.prototype.toBase64;
      delete Uint8Array.fromBase64;
    });
    afterEach(() => {
      if (hadToHex) Object.defineProperty(Uint8Array.prototype, "toHex", hadToHex); else delete Uint8Array.prototype.toHex;
      if (hadToBase64) Object.defineProperty(Uint8Array.prototype, "toBase64", hadToBase64); else delete Uint8Array.prototype.toBase64;
      if (hadFromBase64) Object.defineProperty(Uint8Array, "fromBase64", hadFromBase64); else delete Uint8Array.fromBase64;
    });

    const realTarget = () => ({ Promise, Uint8Array, btoa, atob });

    it("añade toHex cuando el entorno no lo tiene, y codifica bytes reales", () => {
      applyPdfjsPolyfills(realTarget());
      expect(new Uint8Array([0, 255, 16]).toHex()).toBe("00ff10");
    });

    it("no toca Uint8Array.prototype.toHex si el entorno ya lo tiene", () => {
      const existing = () => "ya estaba";
      Uint8Array.prototype.toHex = existing;
      applyPdfjsPolyfills(realTarget());
      expect(Uint8Array.prototype.toHex).toBe(existing);
    });

    it("añade toBase64/fromBase64 cuando el entorno no los tiene, y son inversos entre sí", () => {
      applyPdfjsPolyfills(realTarget());
      const original = new Uint8Array([72, 111, 108, 97]); // "Hola"
      const decoded = Uint8Array.fromBase64(original.toBase64());
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it("toBase64 no revienta con un array grande (fuente embebida de varios cientos de KB)", () => {
      applyPdfjsPolyfills(realTarget());
      const big = new Uint8Array(300000).fill(65);
      expect(() => big.toBase64()).not.toThrow();
      expect(Uint8Array.fromBase64(big.toBase64()).length).toBe(big.length);
    });
  });
});
