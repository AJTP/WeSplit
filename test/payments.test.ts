import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { buildTestApp, truncateAll } from "./setup.js";
import { createAuthenticatedUser, type TestUser } from "./helpers/auth.js";
import type { FastifyInstance } from "fastify";

describe("payments routes", () => {
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

  it("lets a third member register a payment between two others (even if one is unclaimed)", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, ["Bea", "Carlos"]);

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/payments`,
      headers: antonio.headers,
      payload: {
        from_member_id: members.Carlos,
        to_member_id: members.Bea,
        amount: 15,
        paid_on: "2026-01-10",
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().from_member_id).toBe(members.Carlos);
    expect(res.json().to_member_id).toBe(members.Bea);
  });

  it("rejects a payment between the same member", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, []);

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/payments`,
      headers: antonio.headers,
      payload: {
        from_member_id: members.Antonio,
        to_member_id: members.Antonio,
        amount: 10,
        paid_on: "2026-01-10",
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects a payment where a member belongs to a different group", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, []);
    const { members: otherMembers } = await createGroupWithMembers(antonio, ["Intruso"]);

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/payments`,
      headers: antonio.headers,
      payload: {
        from_member_id: members.Antonio,
        to_member_id: otherMembers.Intruso,
        amount: 10,
        paid_on: "2026-01-10",
      },
    });

    expect(res.statusCode).toBe(422);
  });

  it("GET list and DELETE soft-delete a payment", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, members } = await createGroupWithMembers(antonio, ["Bea"]);

    const payment = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/payments`,
      headers: antonio.headers,
      payload: {
        from_member_id: members.Bea,
        to_member_id: members.Antonio,
        amount: 10,
        paid_on: "2026-01-10",
      },
    });

    const list = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/payments`,
      headers: antonio.headers,
    });
    expect(list.json().data).toHaveLength(1);

    const del = await app.inject({
      method: "DELETE",
      url: `/groups/${groupId}/payments/${payment.json().id}`,
      headers: antonio.headers,
    });
    expect(del.statusCode).toBe(204);

    const after = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/payments`,
      headers: antonio.headers,
    });
    expect(after.json().data).toHaveLength(0);

    // Al borrarlo, el saldo vuelve a reflejar solo los gastos.
    const balances = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/balances`,
      headers: antonio.headers,
    });
    const total = balances
      .json()
      .balances.reduce((sum: number, b: { balance: number }) => sum + b.balance, 0);
    expect(total).toBe(0);
  });
});
