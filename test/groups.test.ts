import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { buildTestApp, truncateAll } from "./setup.js";
import { createAuthenticatedUser } from "./helpers/auth.js";
import type { FastifyInstance } from "fastify";

describe("groups routes", () => {
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

  it("POST /groups creates a group with the creator as admin and a default alias", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });

    const res = await app.inject({
      method: "POST",
      url: "/groups",
      headers: antonio.headers,
      payload: { name: "Viaje a Lisboa" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("Viaje a Lisboa");
    expect(body.invitation_token).toBeUndefined();

    const members = await app.inject({
      method: "GET",
      url: `/groups/${body.id}/members`,
      headers: antonio.headers,
    });
    expect(members.json().data).toHaveLength(1);
    expect(members.json().data[0]).toMatchObject({
      alias: "Antonio",
      role: "admin",
      user_id: antonio.id,
    });
  });

  it("POST /groups creates additional unclaimed aliases", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });

    const res = await app.inject({
      method: "POST",
      url: "/groups",
      headers: antonio.headers,
      payload: { name: "Piso", aliases: ["Bea", "Carlos"] },
    });

    const members = await app.inject({
      method: "GET",
      url: `/groups/${res.json().id}/members`,
      headers: antonio.headers,
    });
    const aliases = members.json().data.map((m: { alias: string; user_id: string | null }) => ({
      alias: m.alias,
      claimed: m.user_id !== null,
    }));
    expect(aliases).toEqual(
      expect.arrayContaining([
        { alias: "Antonio", claimed: true },
        { alias: "Bea", claimed: false },
        { alias: "Carlos", claimed: false },
      ]),
    );
  });

  it("GET /groups only returns groups where the user has a claimed alias", async () => {
    const antonio = await createAuthenticatedUser(app);
    const bea = await createAuthenticatedUser(app);

    await app.inject({
      method: "POST",
      url: "/groups",
      headers: antonio.headers,
      payload: { name: "Grupo de Antonio" },
    });

    const res = await app.inject({ method: "GET", url: "/groups", headers: bea.headers });
    expect(res.json().data).toHaveLength(0);
    expect(res.json().pagination).toEqual({ page: 1, limit: 20, total: 0, total_pages: 0 });
  });

  it("GET /groups/:groupId returns 403 for a user who is not a member and 404 for an unknown group", async () => {
    const antonio = await createAuthenticatedUser(app);
    const bea = await createAuthenticatedUser(app);

    const create = await app.inject({
      method: "POST",
      url: "/groups",
      headers: antonio.headers,
      payload: { name: "Viaje" },
    });
    const groupId = create.json().id;

    const forbidden = await app.inject({
      method: "GET",
      url: `/groups/${groupId}`,
      headers: bea.headers,
    });
    expect(forbidden.statusCode).toBe(403);

    const notFound = await app.inject({
      method: "GET",
      url: "/groups/00000000-0000-0000-0000-000000000000",
      headers: antonio.headers,
    });
    expect(notFound.statusCode).toBe(404);
  });

  it("PATCH /groups/:groupId only allows an admin to edit it", async () => {
    const antonio = await createAuthenticatedUser(app);

    const create = await app.inject({
      method: "POST",
      url: "/groups",
      headers: antonio.headers,
      payload: { name: "Viaje", aliases: ["Bea"] },
    });
    const groupId = create.json().id;

    const members = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/members`,
      headers: antonio.headers,
    });
    const beaMemberId = members.json().data.find((m: { alias: string }) => m.alias === "Bea").id;

    const bea = await createAuthenticatedUser(app, { name: "Bea" });
    await app.inject({
      method: "POST",
      url: `/invitations/${await getInvitationToken(app, antonio, groupId)}/join`,
      headers: bea.headers,
      payload: { member_id: beaMemberId },
    });

    const forbidden = await app.inject({
      method: "PATCH",
      url: `/groups/${groupId}`,
      headers: bea.headers,
      payload: { name: "Nuevo nombre" },
    });
    expect(forbidden.statusCode).toBe(403);

    const allowed = await app.inject({
      method: "PATCH",
      url: `/groups/${groupId}`,
      headers: antonio.headers,
      payload: { name: "Nuevo nombre" },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().name).toBe("Nuevo nombre");
  });

  it("DELETE /groups/:groupId removes a populated group (claimed and unclaimed members) without errors", async () => {
    const antonio = await createAuthenticatedUser(app);
    const create = await app.inject({
      method: "POST",
      url: "/groups",
      headers: antonio.headers,
      payload: { name: "Viaje", aliases: ["Bea", "Carlos"] },
    });
    const groupId = create.json().id;

    const res = await app.inject({
      method: "DELETE",
      url: `/groups/${groupId}`,
      headers: antonio.headers,
    });
    expect(res.statusCode).toBe(204);

    const after = await app.inject({
      method: "GET",
      url: `/groups/${groupId}`,
      headers: antonio.headers,
    });
    expect(after.statusCode).toBe(404);
  });

  it("DELETE /groups/:groupId can only be done by an admin", async () => {
    const antonio = await createAuthenticatedUser(app);
    const bea = await createAuthenticatedUser(app, { name: "Bea" });

    const create = await app.inject({
      method: "POST",
      url: "/groups",
      headers: antonio.headers,
      payload: { name: "Viaje", aliases: ["Bea"] },
    });
    const groupId = create.json().id;

    const members = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/members`,
      headers: antonio.headers,
    });
    const beaMemberId = members.json().data.find((m: { alias: string }) => m.alias === "Bea").id;
    const token = await getInvitationToken(app, antonio, groupId);
    await app.inject({
      method: "POST",
      url: `/invitations/${token}/join`,
      headers: bea.headers,
      payload: { member_id: beaMemberId },
    });

    const forbidden = await app.inject({
      method: "DELETE",
      url: `/groups/${groupId}`,
      headers: bea.headers,
    });
    expect(forbidden.statusCode).toBe(403);
  });
});

async function getInvitationToken(
  app: FastifyInstance,
  user: { headers: { authorization: string } },
  groupId: string,
): Promise<string> {
  const res = await app.inject({
    method: "GET",
    url: `/groups/${groupId}/invitation`,
    headers: user.headers,
  });
  return res.json().token;
}
