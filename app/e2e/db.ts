import crypto from "node:crypto";
import pg from "pg";
import { E2E_DATABASE_URL } from "./env";

// Un TRUNCATE sobre la base equivocada borra datos reales: se exige el sufijo _e2e.
const databaseName = new URL(E2E_DATABASE_URL).pathname.slice(1);
if (!databaseName.endsWith("_e2e")) {
  throw new Error(`Refusing to run E2E against "${databaseName}"`);
}

const pool = new pg.Pool({ connectionString: E2E_DATABASE_URL, max: 2 });

// Lista de test/setup.ts: todas las tablas de la aplicación.
const APP_TABLES = [
  "group_expense_shares",
  "group_expenses",
  "payments",
  "group_members",
  "groups",
  "personal_expenses",
  "categories",
  "identities",
  "refresh_tokens",
  "users",
];

const PREDEFINED_CATEGORIES = [
  "Comida",
  "Supermercado",
  "Transporte",
  "Alojamiento",
  "Ocio",
  "Compras",
  "Salud",
  "Servicios",
  "Viajes",
  "Otros",
];

// Vacía la base y vuelve a sembrar las predefinidas, como test/setup.ts.
export async function resetDatabase(): Promise<void> {
  await pool.query(`TRUNCATE TABLE ${APP_TABLES.join(", ")} RESTART IDENTITY CASCADE`);
  await pool.query(
    "INSERT INTO categories (user_id, name) SELECT NULL, name FROM unnest($1::text[]) AS name",
    [PREDEFINED_CATEGORIES],
  );
}

export interface SeededUser {
  id: string;
  name: string;
  email: string;
  // Para el navegador: el frontend lo renueva al arrancar y lo sustituye por otro.
  browserRefreshToken: string;
  // Para la API de preparación: otro token, porque los refresh tokens son de un solo uso.
  apiRefreshToken: string;
}

// Mismo formato que refresh-token.repository.ts: se guarda el SHA-256 del token.
async function createRefreshToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)],
  );
  return rawToken;
}

export async function createUser(name: string): Promise<SeededUser> {
  const email = `e2e-${crypto.randomUUID()}@wesplit.test`;
  const { rows } = await pool.query<{ id: string }>(
    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
    [name, email],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("No se pudo crear el usuario de prueba");
  return {
    id,
    name,
    email,
    browserRefreshToken: await createRefreshToken(id),
    apiRefreshToken: await createRefreshToken(id),
  };
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
