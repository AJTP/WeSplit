import type { Queryable, PersonalExpense, Paginated } from "../../shared/types.js";
import type { PaginationQuery } from "../../shared/schemas/common.schema.js";

interface PersonalExpenseRow {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string;
  amount: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function toPersonalExpense(row: PersonalExpenseRow): PersonalExpense {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    description: row.description,
    amount: Number(row.amount),
    expenseDate: row.expense_date,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}

// expense_date como texto por el mismo motivo que en gastos de grupo: el
// tipo date de Postgres se parsea a medianoche LOCAL.
const EXPENSE_COLUMNS =
  "id, user_id, category_id, description, amount, expense_date::text AS expense_date, " +
  "created_at, updated_at, deleted_at";

export async function create(
  pg: Queryable,
  userId: string,
  data: { categoryId: string | null; description: string; amount: number; expenseDate: string },
): Promise<PersonalExpense> {
  const { rows } = await pg.query(
    `INSERT INTO personal_expenses (user_id, category_id, description, amount, expense_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${EXPENSE_COLUMNS}`,
    [userId, data.categoryId, data.description, data.amount, data.expenseDate],
  );
  return toPersonalExpense(rows[0] as PersonalExpenseRow);
}

// Mismo WHERE en todas las operaciones: "no existe" y "es de otro usuario"
// dan el mismo resultado, sin lógica extra para no revelar su existencia.
export async function findByIdAndUserId(
  pg: Queryable,
  userId: string,
  expenseId: string,
): Promise<PersonalExpense | null> {
  const { rows } = await pg.query(
    `SELECT ${EXPENSE_COLUMNS} FROM personal_expenses
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [expenseId, userId],
  );
  const row = rows[0] as PersonalExpenseRow | undefined;
  return row ? toPersonalExpense(row) : null;
}

export async function update(
  pg: Queryable,
  userId: string,
  expenseId: string,
  data: { categoryId: string | null; description: string; amount: number; expenseDate: string },
): Promise<PersonalExpense | null> {
  const { rows } = await pg.query(
    `UPDATE personal_expenses
     SET category_id = $3, description = $4, amount = $5, expense_date = $6
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
     RETURNING ${EXPENSE_COLUMNS}`,
    [expenseId, userId, data.categoryId, data.description, data.amount, data.expenseDate],
  );
  const row = rows[0] as PersonalExpenseRow | undefined;
  return row ? toPersonalExpense(row) : null;
}

export async function softDelete(
  pg: Queryable,
  userId: string,
  expenseId: string,
): Promise<boolean> {
  const { rows } = await pg.query(
    `UPDATE personal_expenses SET deleted_at = now()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [expenseId, userId],
  );
  return rows.length > 0;
}

export interface PersonalExpenseFilters {
  from?: string;
  to?: string;
  categoryId?: string;
}

export async function findPaginated(
  pg: Queryable,
  userId: string,
  filters: PersonalExpenseFilters,
  page: PaginationQuery,
): Promise<Paginated<PersonalExpense>> {
  const { rows } = await pg.query(
    `SELECT ${EXPENSE_COLUMNS}, count(*) OVER() AS total_count
     FROM personal_expenses
     WHERE user_id = $1
       AND deleted_at IS NULL
       AND ($2::date IS NULL OR expense_date >= $2)
       AND ($3::date IS NULL OR expense_date <= $3)
       AND ($4::uuid IS NULL OR category_id = $4)
     ORDER BY expense_date DESC, id DESC
     LIMIT $5 OFFSET $6`,
    [
      userId,
      filters.from ?? null,
      filters.to ?? null,
      filters.categoryId ?? null,
      page.limit,
      (page.page - 1) * page.limit,
    ],
  );
  const items = (rows as (PersonalExpenseRow & { total_count: string })[]).map(toPersonalExpense);
  const total = rows.length > 0 ? Number((rows[0] as { total_count: string }).total_count) : 0;
  return { items, total };
}
