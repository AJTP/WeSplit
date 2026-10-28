import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { buildTestApp, truncateAll } from "./setup.js";
import { createAuthenticatedUser, type TestUser } from "./helpers/auth.js";
import type { FastifyInstance } from "fastify";

describe("balances routes", () => {
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
  ): Promise<{ groupId: string; invitationToken: string; members: Record<string, string> }> {
    const create = await app.inject({
      method: "POST",
      url: "/groups",
      headers: owner.headers,
      payload: { name: "Grupo", aliases },
    });
    const groupId = create.json().id;
    const invitation = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/invitation`,
      headers: owner.headers,
    });
    const list = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/members`,
      headers: owner.headers,
    });
    const members: Record<string, string> = {};
    for (const m of list.json().data as { id: string; alias: string }[]) {
      members[m.alias] = m.id;
    }
    return { groupId, invitationToken: invitation.json().token, members };
  }

  it("reproduces the canonical FEATURES.md case: a 90 expense split 30/30/30, then a 30 payment, with Carlos unclaimed", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const { groupId, invitationToken, members } = await createGroupWithMembers(antonio, [
      "Bea",
      "Carlos",
    ]);

    // Bea reclama su alias DESPUÉS de que se registre el gasto: los saldos
    // deben reflejarlo retroactivamente sin tocar ningún dato.
    await app.inject({
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

    const bea = await createAuthenticatedUser(app, { name: "Bea" });
    await app.inject({
      method: "POST",
      url: `/invitations/${invitationToken}/join`,
      headers: bea.headers,
      payload: { member_id: members.Bea },
    });

    await app.inject({
      method: "POST",
      url: `/groups/${groupId}/payments`,
      headers: bea.headers,
      payload: {
        from_member_id: members.Bea,
        to_member_id: members.Antonio,
        amount: 30,
        paid_on: "2026-01-16",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/balances`,
      headers: antonio.headers,
    });

    expect(res.statusCode).toBe(200);
    const byAlias = Object.fromEntries(
      res
        .json()
        .balances.map((b: { alias: string; balance: number; user_id: string | null }) => [
          b.alias,
          b,
        ]),
    );
    expect(byAlias.Antonio.balance).toBe(30);
    expect(byAlias.Bea.balance).toBe(0);
    expect(byAlias.Carlos.balance).toBe(-30);
    expect(byAlias.Carlos.user_id).toBeNull();

    // Suman cero.
    const total = res
      .json()
      .balances.reduce((sum: number, b: { balance: number }) => sum + b.balance, 0);
    expect(total).toBe(0);

    // Simplificación: una sola transferencia de Carlos a Antonio.
    expect(res.json().settlements).toEqual([
      { from_member_id: members.Carlos, to_member_id: members.Antonio, amount: 30 },
    ]);
  });

  it("GET /groups/:groupId/balances requires membership", async () => {
    const antonio = await createAuthenticatedUser(app);
    const outsider = await createAuthenticatedUser(app);
    const { groupId } = await createGroupWithMembers(antonio, []);

    const res = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/balances`,
      headers: outsider.headers,
    });
    expect(res.statusCode).toBe(403);
  });

  it("GET /me/balances aggregates across groups without netting debts and credits", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const bea = await createAuthenticatedUser(app, { name: "Bea" });

    // Grupo A: Antonio debe 50.
    const groupA = await createGroupWithMembers(antonio, ["Bea"]);
    await app.inject({
      method: "POST",
      url: `/invitations/${groupA.invitationToken}/join`,
      headers: bea.headers,
      payload: { member_id: groupA.members.Bea },
    });
    await app.inject({
      method: "POST",
      url: `/groups/${groupA.groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Alquiler",
        amount: 100,
        expense_date: "2026-01-01",
        paid_by_member_id: groupA.members.Bea,
        shares: [
          { member_id: groupA.members.Antonio, amount: 50 },
          { member_id: groupA.members.Bea, amount: 50 },
        ],
      },
    });

    // Grupo B: a Antonio le deben 50.
    const groupB = await createGroupWithMembers(antonio, ["Bea"]);
    await app.inject({
      method: "POST",
      url: `/invitations/${groupB.invitationToken}/join`,
      headers: bea.headers,
      payload: { member_id: groupB.members.Bea },
    });
    await app.inject({
      method: "POST",
      url: `/groups/${groupB.groupId}/expenses`,
      headers: antonio.headers,
      payload: {
        description: "Luz",
        amount: 100,
        expense_date: "2026-01-01",
        paid_by_member_id: groupB.members.Antonio,
        shares: [
          { member_id: groupB.members.Antonio, amount: 50 },
          { member_id: groupB.members.Bea, amount: 50 },
        ],
      },
    });

    const res = await app.inject({ method: "GET", url: "/me/balances", headers: antonio.headers });

    expect(res.statusCode).toBe(200);
    expect(res.json().total_user_owes).toBe(50);
    expect(res.json().total_owed_to_user).toBe(50);
    expect(res.json().net).toBe(0);
    expect(res.json().groups).toHaveLength(2);
  });
});
