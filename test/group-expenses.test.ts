import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { buildTestApp, truncateAll } from "./setup.js";
import { createAuthenticatedUser, type TestUser } from "./helpers/auth.js";
import type { FastifyInstance } from "fastify";

describe("group expenses routes", () => {
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

  async function createGroupWithMembers(
    owner: TestUser,
    aliases: string[],
  ): Promise<{ groupId: string; members: Record<string, string> }> {
    const create = await app.inject({
      method: "POST",
      url: "/groups",
      headers: owner.headers,
      payload: { name: "Grupo", aliases },
    });
    const groupId = create.json().id;
    const list = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/members`,
      headers: owner.headers,
    });
    const members: Record<string, string> = {};
    for (const m of list.json().data as { id: string; alias: string }[]) {
      members[m.alias] = m.id;
    }
    return { groupId, members };
  }

  it("creates an expense whose shares sum to the total", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, ["Bea", "Carlos"]);

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Cena",
        amount: 90,
        expense_date: "2026-01-15",
        paid_by_member_id: members.Antonio,
        shares: [
          { member_id: members.Antonio, amount: 30 },
          { member_id: members.Bea, amount: 30 },
          { member_id: members.Carlos, amount: 30 },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().shares).toHaveLength(3);
    expect(res.json().expense_date).toBe("2026-01-15");
  });

  it("rejects a mismatched share sum with 422 and the two amounts in details", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, ["Bea"]);

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Cena",
        amount: 90,
        expense_date: "2026-01-15",
        paid_by_member_id: members.Antonio,
        shares: [
          { member_id: members.Antonio, amount: 30 },
          { member_id: members.Bea, amount: 30 },
        ],
      },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().details).toEqual({ expected_amount: 90, actual_amount: 60 });
  });

  it("rejects floating point rounding noise correctly (0.1 + 0.2 style)", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, ["Bea", "Carlos"]);

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Reparto a tercios",
        amount: 0.3,
        expense_date: "2026-01-01",
        paid_by_member_id: members.Antonio,
        shares: [
          { member_id: members.Antonio, amount: 0.1 },
          { member_id: members.Bea, amount: 0.2 },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
  });

  it("rejects a participant who belongs to a different group", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, ["Bea"]);
    const { members: otherMembers } = await createGroupWithMembers(antonio, ["Intruso"]);

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Cena",
        amount: 60,
        expense_date: "2026-01-15",
        paid_by_member_id: members.Antonio,
        shares: [
          { member_id: members.Antonio, amount: 30 },
          { member_id: otherMembers.Intruso, amount: 30 },
        ],
      },
    });

    expect(res.statusCode).toBe(422);
  });

  it("rejects a non-predefined (personal) category", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, []);

    const category = await app.inject({
      method: "POST",
      url: "/categories",
      headers: antonio.headers,
      payload: { name: "Mi categoría privada" },
    });

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Cena",
        amount: 10,
        expense_date: "2026-01-15",
        paid_by_member_id: members.Antonio,
        category_id: category.json().id,
        shares: [{ member_id: members.Antonio, amount: 10 }],
      },
    });

    expect(res.statusCode).toBe(422);
  });

  it("accepts a predefined category", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, []);

    const categories = await app.inject({
      method: "GET",
      url: "/categories?limit=50",
      headers: antonio.headers,
    });
    const predefinedId = categories
      .json()
      .data.find((c: { user_id: string | null }) => c.user_id === null).id;

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Cena",
        amount: 10,
        expense_date: "2026-01-15",
        paid_by_member_id: members.Antonio,
        category_id: predefinedId,
        shares: [{ member_id: members.Antonio, amount: 10 }],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().category_id).toBe(predefinedId);
  });

  it("GET list filters by paid_by_member_id and category_id, paginated", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, ["Bea"]);

    await app.inject({
      method: "POST",
      url: `/groups/${groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Pagado por Antonio",
        amount: 10,
        expense_date: "2026-01-01",
        paid_by_member_id: members.Antonio,
        shares: [{ member_id: members.Antonio, amount: 10 }],
      },
    });
    await app.inject({
      method: "POST",
      url: `/groups/${groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Pagado por Bea",
        amount: 20,
        expense_date: "2026-01-02",
        paid_by_member_id: members.Bea,
        shares: [{ member_id: members.Bea, amount: 20 }],
      },
    });

    const res = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/expenses?paid_by_member_id=${members.Antonio}`,
      headers: antonio.headers,
    });
    expect(res.json().data).toHaveLength(1);
    expect(res.json().data[0].description).toBe("Pagado por Antonio");
    expect(res.json().data[0]).not.toHaveProperty("shares");
  });

  it("GET detail returns 404 for an expense that belongs to another group", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId: groupA, members: membersA } = await createGroupWithMembers(antonio, []);
    const { groupId: groupB } = await createGroupWithMembers(antonio, []);

    const expense = await app.inject({
      method: "POST",
      url: `/groups/${groupA}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Cena",
        amount: 10,
        expense_date: "2026-01-01",
        paid_by_member_id: membersA.Antonio,
        shares: [{ member_id: membersA.Antonio, amount: 10 }],
      },
    });

    const res = await app.inject({
      method: "GET",
      url: `/groups/${groupB}/expenses/${expense.json().id}`,
      headers: antonio.headers,
    });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH lets any member edit the expense, even if they are not the payer, and keeps shares consistent", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, ["Bea"]);
    const bea = await createAuthenticatedUser(app, { name: "Bea" });
    const invitation = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/invitation`,
      headers: antonio.headers,
    });
    await app.inject({
      method: "POST",
      url: `/invitations/${invitation.json().token}/join`,
      headers: bea.headers,
      payload: { member_id: members.Bea },
    });

    const expense = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Cena",
        amount: 20,
        expense_date: "2026-01-01",
        paid_by_member_id: members.Antonio,
        shares: [
          { member_id: members.Antonio, amount: 10 },
          { member_id: members.Bea, amount: 10 },
        ],
      },
    });

    // Bea, que no pagó, edita el gasto.
    const res = await app.inject({
      method: "PATCH",
      url: `/groups/${groupId}/expenses/${expense.json().id}`,
      headers: bea.headers,
      payload: { description: "Cena corregida" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().description).toBe("Cena corregida");
    expect(res.json().shares).toHaveLength(2);

    // Cambiar el importe sin tocar el reparto, cuando deja de cuadrar, falla.
    const mismatch = await app.inject({
      method: "PATCH",
      url: `/groups/${groupId}/expenses/${expense.json().id}`,
      headers: antonio.headers,
      payload: { amount: 100 },
    });
    expect(mismatch.statusCode).toBe(422);

    // Cambiar importe y reparto a la vez, cuadrando, funciona.
    const ok = await app.inject({
      method: "PATCH",
      url: `/groups/${groupId}/expenses/${expense.json().id}`,
      headers: antonio.headers,
      payload: {
        amount: 100,
        shares: [
          { member_id: members.Antonio, amount: 50 },
          { member_id: members.Bea, amount: 50 },
        ],
      },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().amount).toBe(100);
  });

  it("DELETE soft-deletes the expense: it disappears from the list but is not physically removed", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, []);

    const expense = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Cena",
        amount: 10,
        expense_date: "2026-01-01",
        paid_by_member_id: members.Antonio,
        shares: [{ member_id: members.Antonio, amount: 10 }],
      },
    });

    const del = await app.inject({
      method: "DELETE",
      url: `/groups/${groupId}/expenses/${expense.json().id}`,
      headers: antonio.headers,
    });
    expect(del.statusCode).toBe(204);

    const list = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/expenses`,
      headers: antonio.headers,
    });
    expect(list.json().data).toHaveLength(0);

    const detail = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/expenses/${expense.json().id}`,
      headers: antonio.headers,
    });
    expect(detail.statusCode).toBe(404);
  });
});
