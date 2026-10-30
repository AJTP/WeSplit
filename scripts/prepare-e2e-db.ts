// Crea la base de datos de los tests E2E (si no existe) y aplica las migraciones.
// Solo toca una base cuyo nombre termina en _e2e: nunca la de desarrollo.
import { execFileSync } from "node:child_process";
import pg from "pg";

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5435/app_e2e";

const url = new URL(E2E_DATABASE_URL);
const databaseName = url.pathname.replace(/^\//, "");
if (!databaseName.endsWith("_e2e")) {
  throw new Error(`Refusing to use "${databaseName}": the E2E database name must end with _e2e`);
}

// Conexión a la base "postgres" para poder crear la de E2E.
const adminUrl = new URL(E2E_DATABASE_URL);
adminUrl.pathname = "/postgres";
const admin = new pg.Client({ connectionString: adminUrl.toString() });
await admin.connect();
try {
  const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    databaseName,
  ]);
  if (!rowCount) {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    console.log(`Base ${databaseName} creada`);
  }
} finally {
  await admin.end();
}

execFileSync("pnpm", ["exec", "node-pg-migrate", "up", "--tsx", "--no-verbose"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
});
