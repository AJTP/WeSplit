import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { buildTestApp, truncateAll } from "./setup.js";
import { createAuthenticatedUser, type TestUser } from "./helpers/auth.js";
import type { FastifyInstance } from "fastify";

describe("group members routes", () => {
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

  async function createGroup(owner: TestUser, aliases: string[] = []): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/groups",
      headers: owner.headers,
      payload: { name: "Grupo", aliases },
    });
    return res.json().id;
  }

  it("POST /groups/:groupId/members adds unclaimed aliases, never linking any user", async () => {
    const antonio = await createAuthenticatedUser(app);
    const groupId = await createGroup(antonio);

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/members`,
      headers: antonio.headers,
      payload: { aliases: ["Bea", "Carlos"] },
    });

    expect(res.statusCode).toBe(201);
    for (const member of res.json()) {
      expect(member.user_id).toBeNull();
      expect(member.role).toBe("member");
    }
  });

  it("POST /groups/:groupId/members rejects a duplicate alias (case-insensitive)", async () => {
    const antonio = await createAuthenticatedUser(app);
    const groupId = await createGroup(antonio, ["Bea"]);

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/members`,
      headers: antonio.headers,
      payload: { aliases: ["bea"] },
    });

    expect(res.statusCode).toBe(409);
  });

  it("POST /groups/:groupId/members rejects duplicate aliases within the same request", async () => {
    const antonio = await createAuthenticatedUser(app);
    const groupId = await createGroup(antonio);

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/members`,
      headers: antonio.headers,
      payload: { aliases: ["Bea", "bea"] },
    });

    expect(res.statusCode).toBe(400);
  });

  it("PATCH /members/:memberId lets anyone rename an unclaimed alias, but only its owner or an admin rename a claimed one", async () => {
    const antonio = await createAuthenticatedUser(app);
    const groupId = await createGroup(antonio, ["Bea", "Carlos"]);

    const members = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/members`,
      headers: antonio.headers,
    });
    const beaMemberId = members.json().data.find((m: { alias: string }) => m.alias === "Bea").id;
    const carlosMemberId = members
      .json()
      .data.find((m: { alias: string }) => m.alias === "Carlos").id;

    const invitation = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/invitation`,
      headers: antonio.headers,
    });
    const bea = await createAuthenticatedUser(app, { name: "Bea" });
    await app.inject({
      method: "POST",
      url: `/invitations/${invitation.json().token}/join`,
      headers: bea.headers,
      payload: { member_id: beaMemberId },
    });

    // Bea (miembro normal, no admin) puede renombrar el alias libre de Carlos.
    const renameFree = await app.inject({
      method: "PATCH",
      url: `/groups/${groupId}/members/${carlosMemberId}`,
      headers: bea.headers,
      payload: { alias: "Carlitos" },
    });
    expect(renameFree.statusCode).toBe(200);
    expect(renameFree.json().alias).toBe("Carlitos");

    // Pero Bea no puede renombrar el alias reclamado de otro (el de Antonio).
    const antonioMemberId = members
      .json()
      .data.find((m: { alias: string }) => m.alias !== "Bea" && m.alias !== "Carlos").id;
    const forbidden = await app.inject({
      method: "PATCH",
      url: `/groups/${groupId}/members/${antonioMemberId}`,
      headers: bea.headers,
      payload: { alias: "Otro nombre" },
    });
    expect(forbidden.statusCode).toBe(403);

    // El propio dueño sí puede renombrar su alias reclamado.
    const ownRename = await app.inject({
      method: "PATCH",
      url: `/groups/${groupId}/members/${beaMemberId}`,
      headers: bea.headers,
      payload: { alias: "Beatriz" },
    });
    expect(ownRename.statusCode).toBe(200);

    // Y un admin puede renombrar el alias reclamado de cualquiera.
    const adminRename = await app.inject({
      method: "PATCH",
      url: `/groups/${groupId}/members/${beaMemberId}`,
      headers: antonio.headers,
      payload: { alias: "Bea otra vez" },
    });
    expect(adminRename.statusCode).toBe(200);
  });

  it("DELETE /members/:memberId is blocked for a member with activity and for the last admin", async () => {
    const antonio = await createAuthenticatedUser(app);
    const groupId = await createGroup(antonio, ["Bea"]);

    const members = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/members`,
      headers: antonio.headers,
    });
    const antonioMemberId = members
      .json()
      .data.find((m: { role: string }) => m.role === "admin").id;
    const beaMemberId = members.json().data.find((m: { role: string }) => m.role === "member").id;

    // Sin actividad, se puede eliminar.
    const ok = await app.inject({
      method: "DELETE",
      url: `/groups/${groupId}/members/${beaMemberId}`,
      headers: antonio.headers,
    });
    expect(ok.statusCode).toBe(204);

    // Es el único admin: no se puede eliminar a sí mismo.
    const lastAdmin = await app.inject({
      method: "DELETE",
      url: `/groups/${groupId}/members/${antonioMemberId}`,
      headers: antonio.headers,
    });
    expect(lastAdmin.statusCode).toBe(409);
  });

  it("DELETE /members/:memberId requires being an admin", async () => {
    const antonio = await createAuthenticatedUser(app);
    const groupId = await createGroup(antonio, ["Bea", "Carlos"]);

    const members = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/members`,
      headers: antonio.headers,
    });
    const beaMemberId = members.json().data.find((m: { alias: string }) => m.alias === "Bea").id;
    const carlosMemberId = members
      .json()
      .data.find((m: { alias: string }) => m.alias === "Carlos").id;

    const invitation = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/invitation`,
      headers: antonio.headers,
    });
    const bea = await createAuthenticatedUser(app, { name: "Bea" });
    await app.inject({
      method: "POST",
      url: `/invitations/${invitation.json().token}/join`,
      headers: bea.headers,
      payload: { member_id: beaMemberId },
    });

    const res = await app.inject({
      method: "DELETE",
      url: `/groups/${groupId}/members/${carlosMemberId}`,
      headers: bea.headers,
    });
    expect(res.statusCode).toBe(403);
  });
});
