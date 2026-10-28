import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { buildTestApp, truncateAll } from "./setup.js";
import type { FastifyInstance } from "fastify";

const mockVerifyIdToken = vi.hoisted(() => vi.fn());

vi.mock("../src/features/providers/google.js", () => ({
  verifyGoogleIdToken: mockVerifyIdToken,
}));

function mockGoogleProfile(overrides: Record<string, unknown> = {}): void {
  mockVerifyIdToken.mockResolvedValueOnce({
    provider: "google",
    providerUserId: "google-123",
    email: "ada@example.com",
    emailVerified: true,
    name: "Ada Lovelace",
    avatarUrl: null,
    ...overrides,
  });
}

describe("identities routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    mockVerifyIdToken.mockReset();
    await truncateAll(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(): Promise<{ accessToken: string }> {
    mockGoogleProfile();
    const res = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "x" },
    });
    return res.json();
  }

  it("GET /users/me/identities lists the Google identity created on first login", async () => {
    const { accessToken } = await login();

    const res = await app.inject({
      method: "GET",
      url: "/users/me/identities",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].provider).toBe("google");
  });

  it("DELETE /users/me/identities/:provider rejects removing the last identity", async () => {
    const { accessToken } = await login();

    const res = await app.inject({
      method: "DELETE",
      url: "/users/me/identities/google",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(409);
  });

  it("DELETE /users/me/identities/:provider returns 404 for a provider not linked", async () => {
    const { accessToken } = await login();

    const res = await app.inject({
      method: "DELETE",
      url: "/users/me/identities/github",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
