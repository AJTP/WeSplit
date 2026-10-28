import type { Queryable, GroupMember, GroupRole, Paginated } from "../../shared/types.js";
import type { PaginationQuery } from "../../shared/schemas/common.schema.js";

interface GroupMemberRow {
  id: string;
  group_id: string;
  alias: string;
  role: GroupRole;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

function toGroupMember(row: GroupMemberRow): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    alias: row.alias,
    role: row.role,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const MEMBER_COLUMNS = "id, group_id, alias, role, user_id, created_at, updated_at";

// Un solo alias, opcionalmente ya reclamado. Lo usa group.service al crear el
// grupo, para dar de alta al creador como administrador reclamado.
export async function create(
  pg: Queryable,
  groupId: string,
  data: { alias: string; role?: GroupRole; userId?: string | null },
): Promise<GroupMember> {
  const { rows } = await pg.query(
    `INSERT INTO group_members (group_id, alias, role, user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${MEMBER_COLUMNS}`,
    [groupId, data.alias, data.role ?? "member", data.userId ?? null],
  );
  return toGroupMember(rows[0] as GroupMemberRow);
}

// Varios alias de golpe, siempre sin reclamar y con rol 'member' (son los
// valores por defecto de la tabla). En una sola sentencia, sin SQL dinámico.
export async function createMany(
  pg: Queryable,
  groupId: string,
  aliases: string[],
): Promise<GroupMember[]> {
  const { rows } = await pg.query(
    `INSERT INTO group_members (group_id, alias)
     SELECT $1, a.alias FROM unnest($2::text[]) AS a(alias)
     RETURNING ${MEMBER_COLUMNS}`,
    [groupId, aliases],
  );
  return (rows as GroupMemberRow[]).map(toGroupMember);
}

export async function findById(
  pg: Queryable,
  groupId: string,
  memberId: string,
): Promise<GroupMember | null> {
  const { rows } = await pg.query(
    `SELECT ${MEMBER_COLUMNS} FROM group_members WHERE id = $1 AND group_id = $2`,
    [memberId, groupId],
  );
  const row = rows[0] as GroupMemberRow | undefined;
  return row ? toGroupMember(row) : null;
}

export async function findByGroupAndUser(
  pg: Queryable,
  groupId: string,
  userId: string,
): Promise<GroupMember | null> {
  const { rows } = await pg.query(
    `SELECT ${MEMBER_COLUMNS} FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId],
  );
  const row = rows[0] as GroupMemberRow | undefined;
  return row ? toGroupMember(row) : null;
}

export async function countByGroupId(pg: Queryable, groupId: string): Promise<number> {
  const { rows } = await pg.query(
    "SELECT count(*) AS total FROM group_members WHERE group_id = $1",
    [groupId],
  );
  return Number((rows[0] as { total: string }).total);
}

export async function findByGroupIdPaginated(
  pg: Queryable,
  groupId: string,
  page: PaginationQuery,
): Promise<Paginated<GroupMember>> {
  const { rows } = await pg.query(
    `SELECT ${MEMBER_COLUMNS}, count(*) OVER() AS total_count
     FROM group_members
     WHERE group_id = $1
     ORDER BY lower(alias)
     LIMIT $2 OFFSET $3`,
    [groupId, page.limit, (page.page - 1) * page.limit],
  );
  const items = (rows as (GroupMemberRow & { total_count: string })[]).map(toGroupMember);
  const total = rows.length > 0 ? Number((rows[0] as { total_count: string }).total_count) : 0;
  return { items, total };
}

// Alias sin paginar y con solo lo imprescindible: la vista pública de la
// invitación (GET /invitations/:token) no revela ni user_id ni fechas.
export async function findAliasesByGroupId(
  pg: Queryable,
  groupId: string,
): Promise<{ memberId: string; alias: string; claimed: boolean }[]> {
  const { rows } = await pg.query(
    `SELECT id, alias, (user_id IS NOT NULL) AS claimed
     FROM group_members WHERE group_id = $1 ORDER BY lower(alias)`,
    [groupId],
  );
  return (rows as { id: string; alias: string; claimed: boolean }[]).map((row) => ({
    memberId: row.id,
    alias: row.alias,
    claimed: row.claimed,
  }));
}

// Qué ids, de los pasados, son realmente miembros de ese grupo. La usan los
// gastos y los pagos para validar pagador/participantes sin otra consulta.
export async function findIdsInGroup(
  pg: Queryable,
  groupId: string,
  memberIds: string[],
): Promise<Set<string>> {
  const { rows } = await pg.query(
    "SELECT id FROM group_members WHERE group_id = $1 AND id = ANY($2::uuid[])",
    [groupId, memberIds],
  );
  return new Set((rows as { id: string }[]).map((row) => row.id));
}

export async function updateAlias(
  pg: Queryable,
  groupId: string,
  memberId: string,
  alias: string,
): Promise<GroupMember | null> {
  const { rows } = await pg.query(
    `UPDATE group_members SET alias = $3 WHERE id = $1 AND group_id = $2 RETURNING ${MEMBER_COLUMNS}`,
    [memberId, groupId, alias],
  );
  const row = rows[0] as GroupMemberRow | undefined;
  return row ? toGroupMember(row) : null;
}

// Solo cuenta los que pueden actuar como tal: un alias 'admin' sin reclamar
// no debería poder darse en la práctica (ver group-member.service), pero la
// condición se deja explícita porque es la que importa de verdad.
export async function countAdmins(pg: Queryable, groupId: string): Promise<number> {
  const { rows } = await pg.query(
    "SELECT count(*) AS total FROM group_members WHERE group_id = $1 AND role = 'admin' AND user_id IS NOT NULL",
    [groupId],
  );
  return Number((rows[0] as { total: string }).total);
}

// Si el miembro aparece en algún gasto (como pagador o participante) o en
// algún pago, no se puede borrar: otros ya han visto esos importes reflejados.
export async function hasActivity(
  pg: Queryable,
  groupId: string,
  memberId: string,
): Promise<boolean> {
  const { rows } = await pg.query(
    `SELECT EXISTS (
       SELECT 1 FROM group_expenses
        WHERE group_id = $1 AND paid_by_member_id = $2 AND deleted_at IS NULL
       UNION ALL
       SELECT 1 FROM group_expense_shares s
        JOIN group_expenses e ON e.id = s.group_expense_id
        WHERE e.group_id = $1 AND s.member_id = $2 AND e.deleted_at IS NULL
       UNION ALL
       SELECT 1 FROM payments
        WHERE group_id = $1 AND (from_member_id = $2 OR to_member_id = $2) AND deleted_at IS NULL
     ) AS has_activity`,
    [groupId, memberId],
  );
  return (rows[0] as { has_activity: boolean }).has_activity;
}

export async function deleteById(
  pg: Queryable,
  groupId: string,
  memberId: string,
): Promise<boolean> {
  const { rows } = await pg.query(
    "DELETE FROM group_members WHERE id = $1 AND group_id = $2 RETURNING id",
    [memberId, groupId],
  );
  return rows.length > 0;
}

// El UPDATE condicional que hace posible reclamar sin carreras: si el alias
// ya tenía dueño, `WHERE user_id IS NULL` no afecta a ninguna fila y se
// devuelve null. Nunca comprobar antes con un SELECT: sería racy.
//
// `role`, si se pasa, sobrescribe el rol del alias (lo usa switchAlias para
// arrastrar el rol anterior); si no se pasa, se queda como estaba.
export async function claim(
  pg: Queryable,
  groupId: string,
  memberId: string,
  userId: string,
  role?: GroupRole,
): Promise<GroupMember | null> {
  const { rows } = await pg.query(
    `UPDATE group_members SET user_id = $3, role = COALESCE($4, role)
     WHERE id = $1 AND group_id = $2 AND user_id IS NULL
     RETURNING ${MEMBER_COLUMNS}`,
    [memberId, groupId, userId, role ?? null],
  );
  const row = rows[0] as GroupMemberRow | undefined;
  return row ? toGroupMember(row) : null;
}

// Suelta el alias que el usuario tuviera en el grupo. El rol vuelve a
// 'member': un alias sin reclamar no necesita conservar un rol de admin.
export async function releaseByUserId(
  pg: Queryable,
  groupId: string,
  userId: string,
): Promise<GroupMember | null> {
  const { rows } = await pg.query(
    `UPDATE group_members SET user_id = NULL, role = 'member'
     WHERE group_id = $1 AND user_id = $2
     RETURNING ${MEMBER_COLUMNS}`,
    [groupId, userId],
  );
  const row = rows[0] as GroupMemberRow | undefined;
  return row ? toGroupMember(row) : null;
}
