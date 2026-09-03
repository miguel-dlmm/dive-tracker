vi.mock("./supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { useSupabaseTable } from "./useSupabaseTable";
import { supabase } from "./supabaseClient";

// Bloque 17, job nocturno 2026-09-03 (hallazgo del Bloque 15): este hook
// es la única fuente de CRUD para TODAS las pantallas de la app, pero
// nunca tenía test propio — cada pantalla lo prueba solo de forma
// indirecta, asumiendo su contrato ({rows, insertRow, updateRow,
// deleteRow, bulkUpdateWhere, setDefault}) con un mock manual. Estas
// pruebas verifican el hook en sí, no una pantalla concreta.

// Builder encadenable mínimo — el cliente real de Supabase es "thenable"
// en cualquier punto de la cadena (select/insert/update/delete/eq/order/in
// devuelven el MISMO objeto, que a su vez se puede await directamente,
// sin importar en qué punto de la cadena se pare cada método del hook:
// .select().order(), .insert().select(), .update().eq().select(),
// .delete().eq(), .update().in()). Un único objeto con `then` cubre los
// cinco patrones sin tener que distinguir cuál es "el último" método de
// cada cadena.
function chainMock(result) {
  const chain = {};
  ["select", "insert", "update", "delete", "eq", "order", "in"].forEach((method) => {
    chain[method] = vi.fn(() => chain);
  });
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe("useSupabaseTable — carga inicial (reload)", () => {
  it("carga las filas al montar y marca loaded", async () => {
    const rows = [{ id: "1", name: "Escuela A" }];
    supabase.from.mockReturnValue(chainMock({ data: rows, error: null }));

    const { result } = renderHook(() => useSupabaseTable("schools"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.rows).toEqual(rows);
    expect(supabase.from).toHaveBeenCalledWith("schools");
  });

  it("si falla la carga, deja rows vacío pero loaded en true (no se queda cargando para siempre)", async () => {
    supabase.from.mockReturnValue(chainMock({ data: null, error: { message: "network" } }));

    const { result } = renderHook(() => useSupabaseTable("schools"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.rows).toEqual([]);
  });
});

describe("useSupabaseTable — insertRow", () => {
  it("añade la fila insertada a rows y la devuelve", async () => {
    supabase.from.mockReturnValue(chainMock({ data: [], error: null }));
    const { result } = renderHook(() => useSupabaseTable("schools"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    const inserted = { id: "2", name: "Escuela B" };
    supabase.from.mockReturnValue(chainMock({ data: [inserted], error: null }));

    let returned;
    await act(async () => {
      returned = await result.current.insertRow({ name: "Escuela B" });
    });

    expect(returned).toEqual(inserted);
    expect(result.current.rows).toEqual([inserted]);
  });

  it("lanza si Supabase devuelve error, sin tocar rows", async () => {
    supabase.from.mockReturnValue(chainMock({ data: [{ id: "1" }], error: null }));
    const { result } = renderHook(() => useSupabaseTable("schools"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    supabase.from.mockReturnValue(chainMock({ data: null, error: { message: "duplicate" } }));

    await expect(result.current.insertRow({ name: "x" })).rejects.toBeTruthy();
    expect(result.current.rows).toEqual([{ id: "1" }]);
  });
});

describe("useSupabaseTable — updateRow (pkField personalizable)", () => {
  it("reemplaza la fila con el mismo id por defecto ('id')", async () => {
    supabase.from.mockReturnValue(chainMock({ data: [{ id: "1", name: "Vieja" }], error: null }));
    const { result } = renderHook(() => useSupabaseTable("schools"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    const updated = { id: "1", name: "Nueva" };
    supabase.from.mockReturnValue(chainMock({ data: [updated], error: null }));

    await act(async () => {
      await result.current.updateRow("1", { name: "Nueva" });
    });

    expect(result.current.rows).toEqual([updated]);
  });

  it("usa el pkField indicado (p. ej. 'code' para monedas) en vez de 'id'", async () => {
    supabase.from.mockReturnValue(chainMock({ data: [{ code: "EUR", symbol: "€" }], error: null }));
    const { result } = renderHook(() => useSupabaseTable("currencies", "name", "code"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    const updated = { code: "EUR", symbol: "€€" };
    const chain = chainMock({ data: [updated], error: null });
    supabase.from.mockReturnValue(chain);

    await act(async () => {
      await result.current.updateRow("EUR", { symbol: "€€" });
    });

    expect(chain.eq).toHaveBeenCalledWith("code", "EUR");
    expect(result.current.rows).toEqual([updated]);
  });

  it("lanza si Supabase devuelve error", async () => {
    supabase.from.mockReturnValue(chainMock({ data: [{ id: "1" }], error: null }));
    const { result } = renderHook(() => useSupabaseTable("schools"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    supabase.from.mockReturnValue(chainMock({ data: null, error: { message: "conflict" } }));

    await expect(result.current.updateRow("1", { name: "x" })).rejects.toBeTruthy();
  });
});

describe("useSupabaseTable — deleteRow", () => {
  it("quita la fila borrada de rows", async () => {
    supabase.from.mockReturnValue(chainMock({ data: [{ id: "1" }, { id: "2" }], error: null }));
    const { result } = renderHook(() => useSupabaseTable("schools"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    supabase.from.mockReturnValue(chainMock({ data: null, error: null }));

    await act(async () => {
      await result.current.deleteRow("1");
    });

    expect(result.current.rows).toEqual([{ id: "2" }]);
  });

  it("lanza si Supabase devuelve error, sin tocar rows", async () => {
    supabase.from.mockReturnValue(chainMock({ data: [{ id: "1" }], error: null }));
    const { result } = renderHook(() => useSupabaseTable("schools"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    supabase.from.mockReturnValue(chainMock({ data: null, error: { message: "fk constraint" } }));

    await expect(result.current.deleteRow("1")).rejects.toBeTruthy();
    expect(result.current.rows).toEqual([{ id: "1" }]);
  });
});

describe("useSupabaseTable — bulkUpdateWhere", () => {
  it("actualiza solo las filas que cumplen el predicado y recarga desde la BD", async () => {
    const initial = [{ id: "1", status: "Pending" }, { id: "2", status: "Pending" }, { id: "3", status: "Paid" }];
    supabase.from.mockReturnValue(chainMock({ data: initial, error: null }));
    const { result } = renderHook(() => useSupabaseTable("worklog"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    const afterUpdate = initial.map((r) => (r.status === "Pending" ? { ...r, status: "Paid" } : r));
    const chain = chainMock({ data: afterUpdate, error: null });
    supabase.from.mockReturnValue(chain);

    let count;
    await act(async () => {
      count = await result.current.bulkUpdateWhere((r) => r.status === "Pending", { status: "Paid" });
    });

    expect(count).toBe(2);
    expect(chain.in).toHaveBeenCalledWith("id", ["1", "2"]);
    expect(result.current.rows).toEqual(afterUpdate); // recargado desde la BD, no parcheado en memoria
  });

  it("no llama a Supabase si ningún elemento cumple el predicado", async () => {
    supabase.from.mockReturnValue(chainMock({ data: [{ id: "1", status: "Paid" }], error: null }));
    const { result } = renderHook(() => useSupabaseTable("worklog"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    supabase.from.mockClear();

    let count;
    await act(async () => {
      count = await result.current.bulkUpdateWhere((r) => r.status === "Pending", { status: "Paid" });
    });

    expect(count).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("useSupabaseTable — setDefault", () => {
  it("desmarca cualquier otro is_default y marca el indicado, recargando después", async () => {
    const initial = [
      { code: "EUR", is_default: true },
      { code: "USD", is_default: false },
    ];
    supabase.from.mockReturnValue(chainMock({ data: initial, error: null }));
    const { result } = renderHook(() => useSupabaseTable("currencies", "name", "code"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    const afterReload = [
      { code: "EUR", is_default: false },
      { code: "USD", is_default: true },
    ];
    const chain = chainMock({ data: afterReload, error: null });
    supabase.from.mockReturnValue(chain);

    await act(async () => {
      await result.current.setDefault("USD");
    });

    expect(result.current.rows).toEqual(afterReload);
  });
});
