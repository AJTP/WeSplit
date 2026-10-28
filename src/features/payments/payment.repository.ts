import type { Queryable, Payment, Paginated } from "../../shared/types.js";
import type { PaginationQuery } from "../../shared/schemas/common.schema.js";

interface PaymentRow {
  id: string;
  group_id: string;
  from_member_id: string;
  to_member_id: string;
  amount: string;
  paid_on: string;
  note: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    groupId: row.group_id,
    fromMemberId: row.from_member_id,
    toMemberId: row.to_member_id,
    amount: Number(row.amount),
    paidOn: row.paid_on,
    note: row.note,
    createdByUserId: row.created_by_user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}

// paid_on como texto por el mismo motivo que expense_date en gastos de
// grupo: el tipo date de Postgres se parsea a medianoche LOCAL.
const PAYMENT_COLUMNS =
  "id, group_id, from_member_id, to_member_id, amount, paid_on::text AS paid_on, note, " +
  "created_by_user_id, created_at, updated_at, deleted_at";

export async function create(
  pg: Queryable,
  groupId: string,
  data: {
    fromMemberId: string;
    toMemberId: string;
    amount: number;
    paidOn: string;
    note: string | null;
    createdByUserId: string;
  },
): Promise<Payment> {
  const { rows } = await pg.query(
    `INSERT INTO payments (group_id, from_member_id, to_member_id, amount, paid_on, note, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${PAYMENT_COLUMNS}`,
    [
      groupId,
      data.fromMemberId,
      data.toMemberId,
      data.amount,
      data.paidOn,
      data.note,
      data.createdByUserId,
    ],
  );
  return toPayment(rows[0] as PaymentRow);
}

export async function findPaginated(
  pg: Queryable,
  groupId: string,
  page: PaginationQuery,
): Promise<Paginated<Payment>> {
  const { rows } = await pg.query(
    `SELECT ${PAYMENT_COLUMNS}, count(*) OVER() AS total_count
     FROM payments
     WHERE group_id = $1 AND deleted_at IS NULL
     ORDER BY paid_on DESC, id DESC
     LIMIT $2 OFFSET $3`,
    [groupId, page.limit, (page.page - 1) * page.limit],
  );
  const items = (rows as (PaymentRow & { total_count: string })[]).map(toPayment);
  const total = rows.length > 0 ? Number((rows[0] as { total_count: string }).total_count) : 0;
  return { items, total };
}

export async function softDelete(
  pg: Queryable,
  groupId: string,
  paymentId: string,
): Promise<boolean> {
  const { rows } = await pg.query(
    `UPDATE payments SET deleted_at = now()
     WHERE id = $1 AND group_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [paymentId, groupId],
  );
  return rows.length > 0;
}
