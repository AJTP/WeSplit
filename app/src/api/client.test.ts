import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { api } from "./client";
import { tokens } from "./tokens";

const OLD = "old-access";
const NEW = "new-access";

function protectedRoute(refreshCalls: { count: number }) {
  return [
    http.get("/api/groups", ({ request }) => {
      const auth = request.headers.get("authorization");
      if (auth === `Bearer ${NEW}`) return HttpResponse.json({ ok: true });
      return HttpResponse.json({ error: "Unauthorized", message: "Unauthorized" }, { status: 401 });
    }),
    http.post("/api/auth/refresh", async () => {
      refreshCalls.count += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return HttpResponse.json({ accessToken: NEW, refreshToken: "rotated" });
    }),
  ];
}

describe("api client", () => {
  beforeEach(() => {
    tokens.save({ accessToken: OLD, refreshToken: "initial" });
  });

  it("renueva el token una vez ante un 401 y reintenta", async () => {
    const calls = { count: 0 };
    server.use(...protectedRoute(calls));

    await expect(api("GET", "/groups")).resolves.toEqual({ ok: true });
    expect(calls.count).toBe(1);
    expect(tokens.getRefreshToken()).toBe("rotated");
  });

  it("comparte una única renovación entre peticiones simultáneas", async () => {
    const calls = { count: 0 };
    server.use(...protectedRoute(calls));

    await Promise.all([api("GET", "/groups"), api("GET", "/groups"), api("GET", "/groups")]);
    expect(calls.count).toBe(1);
  });

  it("cierra la sesión si la renovación falla", async () => {
    server.use(
      http.get("/api/groups", () =>
        HttpResponse.json({ error: "Unauthorized", message: "Unauthorized" }, { status: 401 }),
      ),
      http.post("/api/auth/refresh", () =>
        HttpResponse.json(
          { error: "Unauthorized", message: "Invalid refresh token" },
          { status: 401 },
        ),
      ),
    );

    await expect(api("GET", "/groups")).rejects.toMatchObject({ status: 401 });
    expect(tokens.getAccessToken()).toBeNull();
    expect(tokens.getRefreshToken()).toBeNull();
  });

  it("no intenta renovar en llamadas públicas", async () => {
    let refreshed = false;
    server.use(
      http.post("/api/auth/refresh", () => {
        refreshed = true;
        return HttpResponse.json({ accessToken: NEW, refreshToken: "x" });
      }),
      http.get("/api/invitations/abc", () =>
        HttpResponse.json({ error: "NotFound", message: "not found" }, { status: 404 }),
      ),
    );

    await expect(api("GET", "/invitations/abc", { auth: false })).rejects.toMatchObject({
      status: 404,
    });
    expect(refreshed).toBe(false);
  });
});
