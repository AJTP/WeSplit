import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

export interface TestUser {
  id: string;
  name: string;
  email: string;
  headers: { authorization: string };
}

// Crea el usuario directamente en la base de datos y firma su access token
// con la misma clave que usa la aplicación (app.jwt, decorado por
// @fastify/jwt). No pasa por POST /auth/google a propósito: ese flujo ya lo
// cubre auth.test.ts, y mockear Google en cada fichero de test es frágil
// (vi.mock se hoistea por fichero) y cuesta varias peticiones HTTP por caso.
export async function createAuthenticatedUser(
  app: FastifyInstance,
  overrides: { name?: string; email?: string } = {},
): Promise<TestUser> {
  const suffix = randomUUID();
  const name = overrides.name ?? `Test User ${suffix.slice(0, 8)}`;
  const email = overrides.email ?? `user-${suffix}@example.com`;

  const { rows } = await app.pg.query(
    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email",
    [name, email],
  );
  const user = rows[0] as { id: string; name: string; email: string };

  const token = app.jwt.sign({ id: user.id, email: user.email });

  return { ...user, headers: { authorization: `Bearer ${token}` } };
}
