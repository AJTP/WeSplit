import type { Queryable, GroupExpense, Paginated } from "../../shared/types.js";
import type { PaginationQuery } from "../../shared/schemas/common.schema.js";

interface GroupExpenseRow {
  id: string;
  group_id: string;
  paid_by_member_id: string;
  category_id: string | null;
  created_by_user_id: string | null;
  description: string;
  amount: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function toGroupExpense(row: GroupExpenseRow): GroupExpense {
  return {
    id: row.id,
    groupId: row.group_id,
    paidByMemberId: row.paid_by_member_id,
    categoryId: row.category_id,
    createdByUserId: row.created_by_user_id,
    description: row.description,
    amount: Number(row.amount),
    expenseDate: row.expense_date,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}

// expense_date se selecciona como texto a propósito: el tipo date de
// Postgres se parsea a un Date a medianoche LOCAL, y un '2026-03-15' puede
// volver como 2026-03-14T23:00:00Z al serializar. El dominio lo trata siempre
// como string 'YYYY-MM-DD', nunca como Date.
const EXPENSE_COLUMNS =
  "id, group_id, paid_by_member_id, category_id, created_by_user_id, description, amount, " +
  "expense_date::text AS expense_date, created_at, updated_at, deleted_at";

export async function create(
  pg: Queryable,
  groupId: string,
  data: {
    paidByMemberId: string;
    categoryId: string | null;
    createdByUserId: string;
    description: string;
    amount: number;
    expenseDate: string;
  },
): Promise<GroupExpense> {
  const { rows } = await pg.query(
    `INSERT INTO group_expenses
       (group_id, paid_by_member_id, category_id, created_by_user_id, description, amount, expense_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${EXPENSE_COLUMNS}`,
    [
      groupId,
      data.paidByMemberId,
      data.categoryId,
      data.createdByUserId,
      data.description,
      data.amount,
      data.expenseDate,
    ],
  );
  return toGroupExpense(rows[0] as GroupExpenseRow);
}

export async function findById(
  pg: Queryable,
  groupId: string,
  expenseId: string,
): Promise<GroupExpense | null> {
  const { rows } = await pg.query(
    `SELECT ${EXPENSE_COLUMNS} FROM group_expenses
     WHERE id = $1 AND group_id = $2 AND deleted_at IS NULL`,
    [expenseId, groupId],
  );
  const row = rows[0] as GroupExpenseRow | undefined;
  return row ? toGroupExpense(row) : null;
}

// Bloquea la fila hasta el commit: evita que dos PATCH concurrentes dejen un
// gasto cuyo total no cuadra con su reparto, que es la invariante que la base
// de datos no protege por sí sola.
export async function findByIdForUpdate(
  pg: Queryable,
  groupId: string,
  expenseId: string,
): Promise<GroupExpense | null> {
  const { rows } = await pg.query(
    `SELECT ${EXPENSE_COLUMNS} FROM group_expenses
     WHERE id = $1 AND group_id = $2 AND deleted_at IS NULL
     FOR UPDATE`,
    [expenseId, groupId],
  );
  const row = rows[0] as GroupExpenseRow | undefined;
  return row ? toGroupExpense(row) : null;
}

export async function update(
  pg: Queryable,
  groupId: string,
  expenseId: string,
  data: {
    paidByMemberId: string;
    categoryId: string | null;
    description: string;
    amount: number;
    expenseDate: string;
  },
): Promise<GroupExpense | null> {
  const { rows } = await pg.query(
    `UPDATE group_expenses
     SET paid_by_member_id = $3, category_id = $4, description = $5, amount = $6, expense_date = $7
     WHERE id = $1 AND group_id = $2 AND deleted_at IS NULL
     RETURNING ${EXPENSE_COLUMNS}`,
    [
      expenseId,
      groupId,
      data.paidByMemberId,
      data.categoryId,
      data.description,
      data.amount,
      data.expenseDate,
    ],
  );
  const row = rows[0] as GroupExpenseRow | undefined;
  return row ? toGroupExpense(row) : null;
}

export async function softDelete(
  pg: Queryable,
  groupId: string,
  expenseId: string,
): Promise<boolean> {
  const { rows } = await pg.query(
    `UPDATE group_expenses SET deleted_at = now()
     WHERE id = $1 AND group_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [expenseId, groupId],
  );
  return rows.length > 0;
}

export interface GroupExpenseFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  paidByMemberId?: string;
}

export async function findPaginated(
  pg: Queryable,
  groupId: string,
  filters: GroupExpenseFilters,
  page: PaginationQuery,
): Promise<Paginated<GroupExpense>> {
  const { rows } = await pg.query(
    `SELECT ${EXPENSE_COLUMNS}, count(*) OVER() AS total_count
     FROM group_expenses
     WHERE group_id = $1
       AND deleted_at IS NULL
       AND ($2::date IS NULL OR expense_date >= $2)
       AND ($3::date IS NULL OR expense_date <= $3)
       AND ($4::uuid IS NULL OR category_id = $4)
       AND ($5::uuid IS NULL OR paid_by_member_id = $5)
     ORDER BY expense_date DESC, id DESC
     LIMIT $6 OFFSET $7`,
    [
      groupId,
      filters.from ?? null,
      filters.to ?? null,
      filters.categoryId ?? null,
      filters.paidByMemberId ?? null,
      page.limit,
      (page.page - 1) * page.limit,
    ],
  );
  const items = (rows as (GroupExpenseRow & { total_count: string })[]).map(toGroupExpense);
  const total = rows.length > 0 ? Number((rows[0] as { total_count: string }).total_count) : 0;
  return { items, total };
}
