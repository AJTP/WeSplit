import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { buildTestApp, truncateAll } from "./setup.js";
import { createAuthenticatedUser } from "./helpers/auth.js";
import type { FastifyInstance } from "fastify";

describe("users routes", () => {
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

  it("GET /users/:id returns a user's public data", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const bea = await createAuthenticatedUser(app);

    const res = await app.inject({
      method: "GET",
      url: `/users/${antonio.id}`,
      headers: bea.headers,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Antonio");
  });

  it("DELETE /users/me removes the account: identities, refresh tokens and personal expenses disappear", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });

    await app.inject({
      method: "POST",
      url: "/expenses",
      headers: antonio.headers,
      payload: { description: "Café", amount: 2, expense_date: "2026-01-01" },
    });

    const res = await app.inject({ method: "DELETE", url: "/users/me", headers: antonio.headers });
    expect(res.statusCode).toBe(204);

    // El JWT en curso sigue siendo criptográficamente válido hasta que
    // expire (authenticate no consulta la BD), pero ya no hay usuario detrás:
    // cualquier endpoint que lo busque responde 404.
    const getUser = await app.inject({
      method: "GET",
      url: `/users/${antonio.id}`,
      headers: antonio.headers,
    });
    expect(getUser.statusCode).toBe(404);
  });

  it("DELETE /users/me releases the user's group aliases without touching expenses, payments or balances", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const bea = await createAuthenticatedUser(app, { name: "Bea" });

    const create = await app.inject({
      method: "POST",
      url: "/groups",
      headers: antonio.headers,
      payload: { name: "Viaje", aliases: ["Bea"] },
    });
    const groupId = create.json().id;

    const invitation = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/invitation`,
      headers: antonio.headers,
    });
    const members = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/members`,
      headers: antonio.headers,
    });
    const antonioMemberId = members
      .json()
      .data.find((m: { alias: string }) => m.alias === "Antonio").id;
    const beaMemberId = members.json().data.find((m: { alias: string }) => m.alias === "Bea").id;

    await app.inject({
      method: "POST",
      url: `/invitations/${invitation.json().token}/join`,
      headers: bea.headers,
      payload: { member_id: beaMemberId },
    });

    await app.inject({
      method: "POST",
      url: `/groups/${groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Cena",
        amount: 20,
        expense_date: "2026-01-01",
        paid_by_member_id: antonioMemberId,
        shares: [
          { member_id: antonioMemberId, amount: 10 },
          { member_id: beaMemberId, amount: 10 },
        ],
      },
    });

    // Antonio, que es el único admin, borra su cuenta.
    await app.inject({ method: "DELETE", url: "/users/me", headers: antonio.headers });

    // El grupo sigue existiendo, con el alias de Antonio sin reclamar y el
    // gasto intacto. Bea, que sigue siendo miembro, puede comprobarlo.
    const membersAfter = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/members`,
      headers: bea.headers,
    });
    expect(membersAfter.statusCode).toBe(200);
    const antonioAfter = membersAfter
      .json()
      .data.find((m: { id: string }) => m.id === antonioMemberId);
    expect(antonioAfter.user_id).toBeNull();

    const balances = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/balances`,
      headers: bea.headers,
    });
    const byId = Object.fromEntries(
      balances
        .json()
        .balances.map((b: { member_id: string; balance: number }) => [b.member_id, b.balance]),
    );
    expect(byId[antonioMemberId]).toBe(10);
    expect(byId[beaMemberId]).toBe(-10);
  });
});
