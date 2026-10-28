import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { buildTestApp, truncateAll } from "./setup.js";
import { createAuthenticatedUser } from "./helpers/auth.js";
import type { FastifyInstance } from "fastify";

describe("personal expenses routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await truncateAll(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates and retrieves a personal expense", async () => {
    const antonio = await createAuthenticatedUser(app);

    const create = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: antonio.headers,
      payload: { description: "Café", amount: 2.5, expense_date: "2026-01-01" },
    });
    expect(create.statusCode).toBe(201);

    const get = await app.inject({
      method: "GET",
      url: `/expenses/${create.json().id}`,
      headers: antonio.headers,
    });
    expect(get.statusCode).toBe(200);
    expect(get.json().amount).toBe(2.5);
  });

  it("allows a personal category for a personal expense", async () => {
    const antonio = await createAuthenticatedUser(app);
    const category = await app.inject({
      method: "POST",
      url: "/categories",
      headers: antonio.headers,
      payload: { name: "Suscripciones" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: antonio.headers,
      payload: {
        description: "Netflix",
        amount: 12,
        expense_date: "2026-01-01",
        category_id: category.json().id,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().category_id).toBe(category.json().id);
  });

  it("rejects using another user's category", async () => {
    const antonio = await createAuthenticatedUser(app);
    const bea = await createAuthenticatedUser(app);

    const category = await app.inject({
      method: "POST",
      url: "/categories",
      headers: antonio.headers,
      payload: { name: "Solo mía" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: bea.headers,
      payload: {
        description: "Intento",
        amount: 5,
        expense_date: "2026-01-01",
        category_id: category.json().id,
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET, PATCH and DELETE on another user's expense return 404", async () => {
    const antonio = await createAuthenticatedUser(app);
    const bea = await createAuthenticatedUser(app);

    const create = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: antonio.headers,
      payload: { description: "Privado", amount: 5, expense_date: "2026-01-01" },
    });
    const expenseId = create.json().id;

    const get = await app.inject({
      method: "GET",
      url: `/expenses/${expenseId}`,
      headers: bea.headers,
    });
    expect(get.statusCode).toBe(404);

    const patch = await app.inject({
      method: "PATCH",
      url: `/expenses/${expenseId}`,
      headers: bea.headers,
      payload: { description: "Hackeado" },
    });
    expect(patch.statusCode).toBe(404);

    const del = await app.inject({
      method: "DELETE",
      url: `/expenses/${expenseId}`,
      headers: bea.headers,
    });
    expect(del.statusCode).toBe(404);
  });

  it("filters by date range and category", async () => {
    const antonio = await createAuthenticatedUser(app);
    const categories = await app.inject({
      method: "GET",
      url: "/categories?limit=50",
      headers: antonio.headers,
    });
    const predefinedId = categories
      .json()
      .data.find((c: { user_id: string | null }) => c.user_id === null).id;

    await app.inject({
      method: "POST",
      url: "/expenses",
      headers: antonio.headers,
      payload: {
        description: "Enero",
        amount: 1,
        expense_date: "2026-01-01",
        category_id: predefinedId,
      },
    });
    await app.inject({
      method: "POST",
      url: "/expenses",
      headers: antonio.headers,
      payload: { description: "Marzo", amount: 1, expense_date: "2026-03-01" },
    });

    const res = await app.inject({
      method: "GET",
      url: `/expenses?from=2026-01-01&to=2026-01-31&category_id=${predefinedId}`,
      headers: antonio.headers,
    });
    expect(res.json().data).toHaveLength(1);
    expect(res.json().data[0].description).toBe("Enero");
  });

  it("DELETE soft-deletes: it disappears from list and detail, but a new identical one can be created", async () => {
    const antonio = await createAuthenticatedUser(app);
    const create = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: antonio.headers,
      payload: { description: "Efímero", amount: 1, expense_date: "2026-01-01" },
    });

    const del = await app.inject({
      method: "DELETE",
      url: `/expenses/${create.json().id}`,
      headers: antonio.headers,
    });
    expect(del.statusCode).toBe(204);

    const get = await app.inject({
      method: "GET",
      url: `/expenses/${create.json().id}`,
      headers: antonio.headers,
    });
    expect(get.statusCode).toBe(404);
  });

  it("deleting a category leaves the expenses that used it without a category", async () => {
    const antonio = await createAuthenticatedUser(app);
    const category = await app.inject({
      method: "POST",
      url: "/categories",
      headers: antonio.headers,
      payload: { name: "Gastos varios" },
    });

    const expense = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: antonio.headers,
      payload: {
        description: "Café",
        amount: 2.5,
        expense_date: "2026-01-01",
        category_id: category.json().id,
      },
    });

    const del = await app.inject({
      method: "DELETE",
      url: `/categories/${category.json().id}`,
      headers: antonio.headers,
    });
    expect(del.statusCode).toBe(204);

    const after = await app.inject({
      method: "GET",
      url: `/expenses/${expense.json().id}`,
      headers: antonio.headers,
    });
    expect(after.json().category_id).toBeNull();
  });
});
