// Puertos propios de E2E: no chocan con `pnpm dev` (5173 y 3000).
export const APP_URL = "http://localhost:5174";
export const API_URL = "http://127.0.0.1:3100";
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5435/app_e2e";
export const E2E_JWT_SECRET = "e2e-jwt-secret-only-for-local-tests-0123456789";
export const E2E_GOOGLE_CLIENT_ID = "e2e-client-id";
