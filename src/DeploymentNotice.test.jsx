vi.mock("./supabaseClient", () => ({ supabase: { from: vi.fn() } }));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeploymentNotice from "./DeploymentNotice";
import { supabase } from "./supabaseClient";

const USER_ID = "super-1";

const NOTICE_A = {
  id: "notice-a", created_at: "2026-09-01T12:00:00Z", commit_hash: "abcdef1234",
  branch: "feature/x", summary: "Resumen del aviso A",
  changes: ["Cambio 1", "Cambio 2"], suggested_tests: ["Probar X"],
  tests_status: "442 passed (442)", build_status: "ok", preview_url: "https://preview.example",
};
const NOTICE_B = {
  id: "notice-b", created_at: "2026-08-31T12:00:00Z", commit_hash: "0987654321",
  branch: "feature/y", summary: "Resumen del aviso B",
  changes: [], suggested_tests: [], tests_status: null, build_status: null, preview_url: null,
};

function mockSupabase({ notices, views, insertResult = { error: null } }) {
  const noticesTable = {
    select: vi.fn(() => noticesTable),
    order: vi.fn(() => noticesTable),
    limit: vi.fn(() => Promise.resolve({ data: notices, error: null })),
  };
  const viewsTable = {
    select: vi.fn(() => viewsTable),
    eq: vi.fn(() => Promise.resolve({ data: views, error: null })),
    insert: vi.fn(() => Promise.resolve(insertResult)),
  };
  supabase.from.mockImplementation((table) => (table === "deployment_notices" ? noticesTable : viewsTable));
  return { noticesTable, viewsTable };
}

beforeEach(() => {
  supabase.from.mockReset();
});

it("sin avisos, no renderiza nada", async () => {
  mockSupabase({ notices: [], views: [] });
  render(<DeploymentNotice userId={USER_ID} />);

  await waitFor(() => expect(supabase.from).toHaveBeenCalled());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("con todos los avisos ya vistos por este usuario, no renderiza nada", async () => {
  mockSupabase({ notices: [NOTICE_A, NOTICE_B], views: [{ notice_id: "notice-a" }, { notice_id: "notice-b" }] });
  render(<DeploymentNotice userId={USER_ID} />);

  await waitFor(() => expect(supabase.from).toHaveBeenCalled());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("muestra el aviso más reciente no visto, con resumen, cambios, pruebas sugeridas y botón de preview", async () => {
  mockSupabase({ notices: [NOTICE_A, NOTICE_B], views: [] });
  render(<DeploymentNotice userId={USER_ID} />);

  expect(await screen.findByText("Resumen del aviso A")).toBeInTheDocument();
  expect(screen.getByText("Cambio 1")).toBeInTheDocument();
  expect(screen.getByText("Probar X")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Preview del commit/ })).toHaveAttribute("href", "https://preview.example");
});

it("salta el aviso ya visto y muestra el siguiente no visto", async () => {
  mockSupabase({ notices: [NOTICE_A, NOTICE_B], views: [{ notice_id: "notice-a" }] });
  render(<DeploymentNotice userId={USER_ID} />);

  expect(await screen.findByText("Resumen del aviso B")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Preview del commit/ })).not.toBeInTheDocument();
  expect(screen.getByText("Preview del commit: sin preview todavía")).toBeInTheDocument();
});

it("al pulsar 'Entendido', marca el aviso como visto para este usuario y lo cierra", async () => {
  const user = userEvent.setup();
  const { viewsTable } = mockSupabase({ notices: [NOTICE_A], views: [] });
  render(<DeploymentNotice userId={USER_ID} />);

  await screen.findByText("Resumen del aviso A");
  await user.click(screen.getByRole("button", { name: "Entendido" }));

  expect(viewsTable.insert).toHaveBeenCalledWith({ notice_id: "notice-a", user_id: USER_ID });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("un 23505 (otra pestaña ya lo marcó como visto) se trata como éxito, sin relanzar ni bloquear el cierre", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const user = userEvent.setup();
  mockSupabase({ notices: [NOTICE_A], views: [], insertResult: { error: { code: "23505", message: "duplicate key" } } });
  render(<DeploymentNotice userId={USER_ID} />);

  await screen.findByText("Resumen del aviso A");
  await user.click(screen.getByRole("button", { name: "Entendido" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});
