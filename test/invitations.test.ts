import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { buildTestApp, truncateAll } from "./setup.js";
import { createAuthenticatedUser } from "./helpers/auth.js";
import type { FastifyInstance } from "fastify";

describe("invitations routes", () => {
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

  it("GET /invitations/:token returns 404 for an unknown token", async () => {
    const res = await app.inject({ method: "GET", url: "/invitations/does-not-exist" });
    expect(res.statusCode).toBe(404);
  });

  it("GET /invitations/:token is public and exposes only the alias list, no personal or financial data", async () => {
    const antonio = await createAuthenticatedUser(app, { name: "Antonio" });
    const create = await app.inject({
      method: "POST",
      url: "/groups",
      headers: antonio.headers,
      payload: { name: "Viaje a Roma", aliases: ["Bea"] },
    });

    const invitation = await app.inject({
      method: "GET",
      url: `/groups/${create.json().id}/invitation`,
      headers: antonio.headers,
    });
    const token = invitation.json().token;

    // Sin cabecera de autorización: debe funcionar igualmente.
    const view = await app.inject({ method: "GET", url: `/invitations/${token}` });

    expect(view.statusCode).toBe(200);
    const body = view.json();
    expect(body.group_name).toBe("Viaje a Roma");
    expect(body).not.toHaveProperty("amount");
    expect(body).not.toHaveProperty("email");
    expect(
      body.aliases.sort((a: { alias: string }, b: { alias: string }) =>
        a.alias.localeCompare(b.alias),
      ),
    ).toEqual([
      { member_id: expect.any(String), alias: "Antonio", claimed: true },
      { member_id: expect.any(String), alias: "Bea", claimed: false },
    ]);
  });

  it("POST /invitations/:token/join claims an unclaimed alias", async () => {
    const antonio = await createAuthenticatedUser(app);
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
    const beaMemberId = members.json().data.find((m: { alias: string }) => m.alias === "Bea").id;

    const bea = await createAuthenticatedUser(app, { name: "Bea" });
    const join = await app.inject({
      method: "POST",
      url: `/invitations/${invitation.json().token}/join`,
      headers: bea.headers,
      payload: { member_id: beaMemberId },
    });

    expect(join.statusCode).toBe(200);
    expect(join.json().user_id).toBe(bea.id);

    const myGroups = await app.inject({ method: "GET", url: "/groups", headers: bea.headers });
    expect(myGroups.json().data).toHaveLength(1);
  });

  it("POST /invitations/:token/join rejects claiming an already-claimed alias", async () => {
    const antonio = await createAuthenticatedUser(app);
    const create = await app.inject({
      method: "POST",
      url: "/groups",
      headers: antonio.headers,
      payload: { name: "Viaje" },
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
    const antonioMemberId = members.json().data[0].id;

    const bea = await createAuthenticatedUser(app, { name: "Bea" });
    const res = await app.inject({
      method: "POST",
      url: `/invitations/${invitation.json().token}/join`,
      headers: bea.headers,
      payload: { member_id: antonioMemberId },
    });

    expect(res.statusCode).toBe(409);
  });

  it("POST /invitations/:token/join rejects joining twice", async () => {
    const antonio = await createAuthenticatedUser(app);
    const create = await app.inject({
      method: "POST",
      url: "/groups",
      headers: antonio.headers,
      payload: { name: "Viaje", aliases: ["Bea", "Carlos"] },
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
    const beaMemberId = members.json().data.find((m: { alias: string }) => m.alias === "Bea").id;
    const carlosMemberId = members
      .json()
      .data.find((m: { alias: string }) => m.alias === "Carlos").id;

    const bea = await createAuthenticatedUser(app, { name: "Bea" });
    await app.inject({
      method: "POST",
      url: `/invitations/${invitation.json().token}/join`,
      headers: bea.headers,
      payload: { member_id: beaMemberId },
    });

    const second = await app.inject({
      method: "POST",
      url: `/invitations/${invitation.json().token}/join`,
      headers: bea.headers,
      payload: { member_id: carlosMemberId },
    });

    expect(second.statusCode).toBe(409);
  });

  it("POST /members/:memberId/claim lets a member switch alias, carrying the role over", async () => {
    const antonio = await createAuthenticatedUser(app);
    const create = await app.inject({
      method: "POST",
      url: "/groups",
      headers: antonio.headers,
      payload: { name: "Viaje", aliases: ["Antonio (alias nuevo)"] },
    });
    const groupId = create.json().id;

    const members = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/members`,
      headers: antonio.headers,
    });
    const newAliasId = members
      .json()
      .data.find((m: { alias: string }) => m.alias === "Antonio (alias nuevo)").id;

    const res = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/members/${newAliasId}/claim`,
      headers: antonio.headers,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().user_id).toBe(antonio.id);
    expect(res.json().role).toBe("admin");

    // El grupo sigue teniendo exactamente un admin, ahora en el nuevo alias.
    const updatedMembers = await app.inject({
      method: "GET",
      url: `/groups/${groupId}/members`,
      headers: antonio.headers,
    });
    const admins = updatedMembers
      .json()
      .data.filter(
        (m: { role: string; user_id: string | null }) => m.role === "admin" && m.user_id !== null,
      );
    expect(admins).toHaveLength(1);
    expect(admins[0].id).toBe(newAliasId);
  });
});
