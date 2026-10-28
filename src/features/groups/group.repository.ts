import type { Queryable, Group, UserGroup, Paginated } from "../../shared/types.js";
import type { PaginationQuery } from "../../shared/schemas/common.schema.js";

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  invitation_token: string;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    invitationToken: row.invitation_token,
    createdByUserId: row.created_by_user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const GROUP_COLUMNS =
  "id, name, description, invitation_token, created_by_user_id, created_at, updated_at";

export async function create(
  pg: Queryable,
  data: {
    name: string;
    description: string | null;
    invitationToken: string;
    createdByUserId: string;
  },
): Promise<Group> {
  const { rows } = await pg.query(
    `INSERT INTO groups (name, description, invitation_token, created_by_user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${GROUP_COLUMNS}`,
    [data.name, data.description, data.invitationToken, data.createdByUserId],
  );
  return toGroup(rows[0] as GroupRow);
}

export async function findById(pg: Queryable, groupId: string): Promise<Group | null> {
  const { rows } = await pg.query(`SELECT ${GROUP_COLUMNS} FROM groups WHERE id = $1`, [groupId]);
  const row = rows[0] as GroupRow | undefined;
  return row ? toGroup(row) : null;
}

export async function existsById(pg: Queryable, groupId: string): Promise<boolean> {
  const { rows } = await pg.query("SELECT 1 FROM groups WHERE id = $1", [groupId]);
  return rows.length > 0;
}

export async function findByInvitationToken(pg: Queryable, token: string): Promise<Group | null> {
  const { rows } = await pg.query(
    `SELECT ${GROUP_COLUMNS} FROM groups WHERE invitation_token = $1`,
    [token],
  );
  const row = rows[0] as GroupRow | undefined;
  return row ? toGroup(row) : null;
}

export async function update(
  pg: Queryable,
  groupId: string,
  data: { name: string; description: string | null },
): Promise<Group | null> {
  const { rows } = await pg.query(
    `UPDATE groups SET name = $2, description = $3 WHERE id = $1 RETURNING ${GROUP_COLUMNS}`,
    [groupId, data.name, data.description],
  );
  const row = rows[0] as GroupRow | undefined;
  return row ? toGroup(row) : null;
}

export async function deleteById(pg: Queryable, groupId: string): Promise<boolean> {
  const { rows } = await pg.query("DELETE FROM groups WHERE id = $1 RETURNING id", [groupId]);
  return rows.length > 0;
}

interface UserGroupRow {
  group_id: string;
  group_name: string;
  group_description: string | null;
  invitation_token: string;
  created_by_user_id: string | null;
  group_created_at: string;
  group_updated_at: string;
  member_id: string;
  alias: string;
  role: "admin" | "member";
  member_user_id: string | null;
  member_created_at: string;
  member_updated_at: string;
  member_count: string;
  total_count: string;
}

function toUserGroup(row: UserGroupRow): UserGroup {
  return {
    group: {
      id: row.group_id,
      name: row.group_name,
      description: row.group_description,
      invitationToken: row.invitation_token,
      createdByUserId: row.created_by_user_id,
      createdAt: new Date(row.group_created_at),
      updatedAt: new Date(row.group_updated_at),
    },
    member: {
      id: row.member_id,
      groupId: row.group_id,
      alias: row.alias,
      role: row.role,
      userId: row.member_user_id,
      createdAt: new Date(row.member_created_at),
      updatedAt: new Date(row.member_updated_at),
    },
    memberCount: Number(row.member_count),
  };
}

// Los grupos a los que el usuario pertenece: aquellos donde tiene un alias
// reclamado. Trae en la misma consulta cuál es ese alias y cuántos miembros
// tiene el grupo, que es justo lo que el frontend necesita para la lista.
export async function findByUserIdPaginated(
  pg: Queryable,
  userId: string,
  page: PaginationQuery,
): Promise<Paginated<UserGroup>> {
  const { rows } = await pg.query(
    `SELECT
       g.id AS group_id, g.name AS group_name, g.description AS group_description,
       g.invitation_token, g.created_by_user_id,
       g.created_at AS group_created_at, g.updated_at AS group_updated_at,
       m.id AS member_id, m.alias, m.role, m.user_id AS member_user_id,
       m.created_at AS member_created_at, m.updated_at AS member_updated_at,
       (SELECT count(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count,
       count(*) OVER() AS total_count
     FROM groups g
     JOIN group_members m ON m.group_id = g.id AND m.user_id = $1
     ORDER BY g.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, page.limit, (page.page - 1) * page.limit],
  );

  const items = (rows as UserGroupRow[]).map(toUserGroup);
  const total = rows.length > 0 ? Number((rows[0] as UserGroupRow).total_count) : 0;
  return { items, total };
}
