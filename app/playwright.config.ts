import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import {
  API_URL,
  APP_URL,
  E2E_DATABASE_URL,
  E2E_GOOGLE_CLIENT_ID,
  E2E_JWT_SECRET,
} from "./e2e/env";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  // Todos los tests comparten una base de datos: uno detrás de otro.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: APP_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Backend con la base E2E. Sube el límite de /auth/refresh para que los tests no lo alcancen.
      command: "pnpm exec tsx src/server.ts",
      cwd: repoRoot,
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: "3100",
        HOST: "0.0.0.0",
        LOG_LEVEL: "silent",
        DATABASE_URL: E2E_DATABASE_URL,
        GOOGLE_CLIENT_ID: E2E_GOOGLE_CLIENT_ID,
        JWT_SECRET: E2E_JWT_SECRET,
        JWT_EXPIRES_IN: "1h",
        AUTH_RATE_LIMIT_MAX: "1000",
      } as Record<string, string>,
    },
    {
      // Frontend apuntando al backend E2E. El proxy de Vite reenvía /api a ese puerto.
      command: "pnpm exec vite --port 5174 --strictPort",
      url: APP_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...process.env,
        VITE_API_PROXY_TARGET: API_URL,
        VITE_GOOGLE_CLIENT_ID: E2E_GOOGLE_CLIENT_ID,
      } as Record<string, string>,
    },
  ],
});
