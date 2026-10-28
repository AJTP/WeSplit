import type { Queryable, Identity } from "../../shared/types.js";

export async function findByProvider(
  pg: Queryable,
  provider: string,
  providerUserId: string,
): Promise<{ user_id: string } | null> {
  const { rows } = await pg.query(
    "SELECT user_id FROM identities WHERE provider = $1 AND provider_user_id = $2",
    [provider, providerUserId],
  );
  return (rows[0] as { user_id: string } | undefined) || null;
}

export async function create(
  pg: Queryable,
  userId: string,
  provider: string,
  providerUserId: string,
): Promise<void> {
  await pg.query(
    "INSERT INTO identities (user_id, provider, provider_user_id) VALUES ($1, $2, $3)",
    [userId, provider, providerUserId],
  );
}

interface IdentityRow {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  created_at: string;
}

function toIdentity(row: IdentityRow): Identity {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerUserId: row.provider_user_id,
    createdAt: new Date(row.created_at),
  };
}

export async function findByUserId(pg: Queryable, userId: string): Promise<Identity[]> {
  const { rows } = await pg.query(
    `SELECT id, user_id, provider, provider_user_id, created_at
     FROM identities WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  );
  return (rows as IdentityRow[]).map(toIdentity);
}

export async function countByUserId(pg: Queryable, userId: string): Promise<number> {
  const { rows } = await pg.query("SELECT count(*) AS total FROM identities WHERE user_id = $1", [
    userId,
  ]);
  return Number((rows[0] as { total: string }).total);
}

export async function deleteByProvider(
  pg: Queryable,
  userId: string,
  provider: string,
): Promise<boolean> {
  const { rows } = await pg.query(
    "DELETE FROM identities WHERE user_id = $1 AND provider = $2 RETURNING id",
    [userId, provider],
  );
  return rows.length > 0;
}
