// Crea una sesión de desarrollo sin pasar por Google: un usuario de prueba y un
// refresh token válido en la base de datos. El frontend lo renueva al arrancar.
//
// Uso: pnpm dev-session [email] [nombre]
// Requiere la base de desarrollo accesible desde el host (por defecto localhost:5435).
import crypto from "node:crypto";
import "dotenv/config";
import pg from "pg";

const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5435/app_dev";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // igual que refresh-token.repository.ts

const [email = "dev@wesplit.local", name = "Usuario de desarrollo"] = process.argv.slice(2);
const databaseUrl = process.env.HOST_DATABASE_URL ?? DEFAULT_DATABASE_URL;
const frontendUrl = process.env.DEV_FRONTEND_URL ?? "http://localhost:5173";

const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (name, email) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name, email],
  );
  const userId = rows[0]?.id;
  if (!userId) throw new Error("No se pudo crear el usuario de desarrollo");

  // Mismo formato que refresh-token.repository.ts: se guarda el SHA-256 del token en hex.
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, new Date(Date.now() + REFRESH_TTL_MS)],
  );

  console.log(`Sesión de desarrollo lista para ${email}`);
  console.log(`Abre: ${frontendUrl}/dev/login#rt=${rawToken}`);
} catch (error) {
  // 42P01 = undefined_table: la base existe pero no tiene el esquema.
  if ((error as { code?: string }).code === "42P01") {
    throw new Error(
      `La base de datos no tiene tablas. Aplica las migraciones con:\n` +
        `  DATABASE_URL=${databaseUrl} pnpm migrate:up`,
      { cause: error },
    );
  }
  throw error;
} finally {
  await pool.end();
}
