import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { buildTestApp, truncateAll } from "./setup.js";
import { createAuthenticatedUser } from "./helpers/auth.js";
import type { FastifyInstance } from "fastify";

describe("categories routes", () => {
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

  it("GET /categories lists the 10 predefined categories, visible to any user", async () => {
    const antonio = await createAuthenticatedUser(app);
    const res = await app.inject({
      method: "GET",
      url: "/categories?limit=50",
      headers: antonio.headers,
    });

    expect(res.statusCode).toBe(200);
    const predefined = res
      .json()
      .data.filter((c: { user_id: string | null }) => c.user_id === null);
    expect(predefined).toHaveLength(10);
  });

  it("GET /categories does not expose another user's personal categories", async () => {
    const antonio = await createAuthenticatedUser(app);
    const bea = await createAuthenticatedUser(app);

    await app.inject({
      method: "POST",
      url: "/categories",
      headers: antonio.headers,
      payload: { name: "Mi categoría" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/categories?limit=50",
      headers: bea.headers,
    });
    const names = res.json().data.map((c: { name: string }) => c.name);
    expect(names).not.toContain("Mi categoría");
  });

  it("POST /categories rejects a duplicate name for the same user", async () => {
    const antonio = await createAuthenticatedUser(app);

    await app.inject({
      method: "POST",
      url: "/categories",
      headers: antonio.headers,
      payload: { name: "Gimnasio" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/categories",
      headers: antonio.headers,
      payload: { name: "gimnasio" },
    });

    expect(res.statusCode).toBe(409);
  });

  it("POST /categories allows a personal category to share a name with a predefined one", async () => {
    const antonio = await createAuthenticatedUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/categories",
      headers: antonio.headers,
      payload: { name: "Comida" },
    });

    expect(res.statusCode).toBe(201);
  });

  it("PATCH and DELETE on a predefined category return 404, not 403", async () => {
    const antonio = await createAuthenticatedUser(app);
    const list = await app.inject({
      method: "GET",
      url: "/categories?limit=50",
      headers: antonio.headers,
    });
    const predefinedId = list
      .json()
      .data.find((c: { user_id: string | null }) => c.user_id === null).id;

    const patch = await app.inject({
      method: "PATCH",
      url: `/categories/${predefinedId}`,
      headers: antonio.headers,
      payload: { name: "Otra cosa" },
    });
    expect(patch.statusCode).toBe(404);

    const del = await app.inject({
      method: "DELETE",
      url: `/categories/${predefinedId}`,
      headers: antonio.headers,
    });
    expect(del.statusCode).toBe(404);
  });

  it("PATCH and DELETE on another user's category return 404", async () => {
    const antonio = await createAuthenticatedUser(app);
    const bea = await createAuthenticatedUser(app);

    const create = await app.inject({
      method: "POST",
      url: "/categories",
      headers: antonio.headers,
      payload: { name: "Solo mía" },
    });
    const categoryId = create.json().id;

    const patch = await app.inject({
      method: "PATCH",
      url: `/categories/${categoryId}`,
      headers: bea.headers,
      payload: { name: "Robada" },
    });
    expect(patch.statusCode).toBe(404);

    const del = await app.inject({
      method: "DELETE",
      url: `/categories/${categoryId}`,
      headers: bea.headers,
    });
    expect(del.statusCode).toBe(404);
  });

  // El caso "borrar una categoría deja sin categoría los gastos que la
  // usaban" se prueba en test/personal-expenses.test.ts y
  // test/group-expenses.test.ts, donde ya existen esos endpoints.
});
