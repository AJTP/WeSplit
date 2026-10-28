import type { Queryable, GroupExpenseShare } from "../../shared/types.js";

interface ShareRow {
  member_id: string;
  amount: string;
}

function toShare(row: ShareRow): GroupExpenseShare {
  return { memberId: row.member_id, amount: Number(row.amount) };
}

export async function findByExpenseId(
  pg: Queryable,
  groupExpenseId: string,
): Promise<GroupExpenseShare[]> {
  const { rows } = await pg.query(
    "SELECT member_id, amount FROM group_expense_shares WHERE group_expense_id = $1 ORDER BY member_id",
    [groupExpenseId],
  );
  return (rows as ShareRow[]).map(toShare);
}

// Borra el reparto anterior y escribe el nuevo en dos sentencias dentro de la
// misma transacción: es un agregado pequeño (como mucho unas pocas filas) y
// así no hay que diferenciar entre insertar, actualizar y borrar filas
// sueltas del reparto. En una sola sentencia, sin SQL dinámico.
export async function replaceAll(
  pg: Queryable,
  groupExpenseId: string,
  shares: { memberId: string; amount: number }[],
): Promise<GroupExpenseShare[]> {
  await pg.query("DELETE FROM group_expense_shares WHERE group_expense_id = $1", [groupExpenseId]);

  const { rows } = await pg.query(
    `INSERT INTO group_expense_shares (group_expense_id, member_id, amount)
     SELECT $1, s.member_id, s.amount
     FROM unnest($2::uuid[], $3::numeric[]) AS s(member_id, amount)
     RETURNING member_id, amount`,
    [groupExpenseId, shares.map((share) => share.memberId), shares.map((share) => share.amount)],
  );
  return (rows as ShareRow[]).map(toShare);
}
