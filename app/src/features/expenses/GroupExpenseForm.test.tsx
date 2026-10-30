import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import type { GroupMember } from "../../api/types";
import { GroupExpenseForm } from "./GroupExpenseForm";

const members = [
  { id: "m1", alias: "Ana" },
  { id: "m2", alias: "Luis" },
].map((member) => ({
  ...member,
  group_id: "g1",
  role: "member" as const,
  user_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
})) as GroupMember[];

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/groups/g1/expenses/new"]}>
        <Routes>
          <Route
            path="/groups/:groupId/expenses/new"
            element={
              <GroupExpenseForm
                groupId="g1"
                members={members}
                categories={[]}
                defaultPayerId="m1"
              />
            }
          />
          <Route path="/groups/:groupId/expenses/:expenseId" element={<p>Detalle del gasto</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("GroupExpenseForm", () => {
  it("envía el reparto igual con los céntimos sobrantes al primero", async () => {
    let body: unknown;
    server.use(
      http.post("/api/groups/g1/expenses", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: "e1" }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Descripción"), "Cena");
    await user.type(screen.getByLabelText("Importe (€)"), "10,01");
    await user.click(screen.getByRole("button", { name: "Añadir gasto" }));

    await waitFor(() => expect(screen.getByText("Detalle del gasto")).toBeInTheDocument());
    expect(body).toEqual({
      description: "Cena",
      amount: 10.01,
      expense_date: expect.any(String),
      paid_by_member_id: "m1",
      category_id: null,
      shares: [
        { member_id: "m1", amount: 5.01 },
        { member_id: "m2", amount: 5 },
      ],
    });
  });

  it("no envía un reparto por importes que no suma el total", async () => {
    let called = false;
    server.use(
      http.post("/api/groups/g1/expenses", () => {
        called = true;
        return HttpResponse.json({ id: "e1" }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Descripción"), "Taxi");
    await user.type(screen.getByLabelText("Importe (€)"), "10");
    await user.click(screen.getByRole("radio", { name: "Importes" }));
    await user.type(screen.getByLabelText("Importe de Ana (€)"), "6");
    await user.type(screen.getByLabelText("Importe de Luis (€)"), "3");
    await user.click(screen.getByRole("button", { name: "Añadir gasto" }));

    expect(await screen.findByText(/El reparto suma/)).toBeInTheDocument();
    expect(called).toBe(false);
  });
});
