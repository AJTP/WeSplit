import type { Queryable, MemberBalance, UserGroupBalance } from "../../shared/types.js";

interface MemberBalanceRow {
  member_id: string;
  alias: string;
  user_id: string | null;
  balance: string;
}

function toMemberBalance(row: MemberBalanceRow): MemberBalance {
  return {
    memberId: row.member_id,
    alias: row.alias,
    userId: row.user_id,
    balance: Number(row.balance),
  };
}

// La consulta de referencia documentada al final de schema.sql: lo que ha
// pagado menos lo que le tocaba pagar, más lo que ha entregado en pagos menos
// lo que ha recibido. Positivo: el grupo le debe a él. La suma de todos los
// saldos de un grupo es siempre cero. Se devuelven todos los miembros, estén
// vinculados a un usuario o no.
export async function findGroupBalances(pg: Queryable, groupId: string): Promise<MemberBalance[]> {
  const { rows } = await pg.query(
    `SELECT
       m.id AS member_id,
       m.alias,
       m.user_id,
         COALESCE((SELECT sum(e.amount)
                     FROM group_expenses e
                    WHERE e.paid_by_member_id = m.id
                      AND e.deleted_at IS NULL), 0)
       - COALESCE((SELECT sum(s.amount)
                     FROM group_expense_shares s
                     JOIN group_expenses e ON e.id = s.group_expense_id
                    WHERE s.member_id = m.id
                      AND e.deleted_at IS NULL), 0)
       + COALESCE((SELECT sum(p.amount)
                     FROM payments p
                    WHERE p.from_member_id = m.id
                      AND p.deleted_at IS NULL), 0)
       - COALESCE((SELECT sum(p.amount)
                     FROM payments p
                    WHERE p.to_member_id = m.id
                      AND p.deleted_at IS NULL), 0)
         AS balance
     FROM group_members m
     WHERE m.group_id = $1
     ORDER BY lower(m.alias)`,
    [groupId],
  );
  return (rows as MemberBalanceRow[]).map(toMemberBalance);
}

interface UserGroupBalanceRow {
  group_id: string;
  group_name: string;
  member_id: string;
  alias: string;
  balance: string;
}

// Misma expresión de saldo, limitada a los miembros vinculados a este
// usuario (uno por grupo como mucho) y con el nombre del grupo, para que el
// dashboard (GET /me/balances) resuelva todo en una sola consulta.
export async function findUserBalancesAcrossGroups(
  pg: Queryable,
  userId: string,
): Promise<UserGroupBalance[]> {
  const { rows } = await pg.query(
    `SELECT
       g.id AS group_id,
       g.name AS group_name,
       m.id AS member_id,
       m.alias,
         COALESCE((SELECT sum(e.amount)
                     FROM group_expenses e
                    WHERE e.paid_by_member_id = m.id
                      AND e.deleted_at IS NULL), 0)
       - COALESCE((SELECT sum(s.amount)
                     FROM group_expense_shares s
                     JOIN group_expenses e ON e.id = s.group_expense_id
                    WHERE s.member_id = m.id
                      AND e.deleted_at IS NULL), 0)
       + COALESCE((SELECT sum(p.amount)
                     FROM payments p
                    WHERE p.from_member_id = m.id
                      AND p.deleted_at IS NULL), 0)
       - COALESCE((SELECT sum(p.amount)
                     FROM payments p
                    WHERE p.to_member_id = m.id
                      AND p.deleted_at IS NULL), 0)
         AS balance
     FROM group_members m
     JOIN groups g ON g.id = m.group_id
     WHERE m.user_id = $1
     ORDER BY g.created_at DESC`,
    [userId],
  );
  return (rows as UserGroupBalanceRow[]).map((row) => ({
    groupId: row.group_id,
    groupName: row.group_name,
    memberId: row.member_id,
    alias: row.alias,
    balance: Number(row.balance),
  }));
}
