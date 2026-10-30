import { test as base, expect, type BrowserContext } from "@playwright/test";
import { ApiClient } from "./api";
import { createUser, resetDatabase, type SeededUser } from "./db";

// Clave que lee el frontend (app/src/api/tokens.ts).
const REFRESH_TOKEN_KEY = "wesplit.refreshToken";

export interface AppUser extends SeededUser {
  api: ApiClient;
}

// Carga el refresh token antes de que arranque la app. Solo la primera vez por
// pestaña: si el usuario cierra sesión, el test no debe restaurarla.
export async function signIn(context: BrowserContext, refreshToken: string): Promise<void> {
  await context.addInitScript(
    ({ key, token }) => {
      const marker = "e2e-seeded";
      if (sessionStorage.getItem(marker)) return;
      sessionStorage.setItem(marker, "1");
      if (!localStorage.getItem(key)) localStorage.setItem(key, token);
    },
    { key: REFRESH_TOKEN_KEY, token: refreshToken },
  );
}

type Fixtures = {
  // Usuario con sesión en el navegador del test.
  user: AppUser;
  // Segundo usuario, sin sesión: los tests lo usan en otro contexto (invitados).
  stranger: AppUser;
};

export const test = base.extend<Fixtures>({
  user: async ({ context, request }, runTest) => {
    const seeded = await createUser("Ana Pérez");
    await signIn(context, seeded.browserRefreshToken);
    await runTest({ ...seeded, api: new ApiClient(request, seeded.apiRefreshToken) });
  },
  stranger: async ({ request }, runTest) => {
    const seeded = await createUser("Luis Gómez");
    await runTest({ ...seeded, api: new ApiClient(request, seeded.apiRefreshToken) });
  },
});

test.beforeEach(async () => {
  await resetDatabase();
});

export { expect };
