import type { Queryable, Category, Paginated } from "../../shared/types.js";
import type { PaginationQuery } from "../../shared/schemas/common.schema.js";

interface CategoryRow {
  id: string;
  user_id: string | null;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const CATEGORY_COLUMNS = "id, user_id, name, color, created_at, updated_at";

// Las predefinidas (user_id NULL) y las propias del usuario, predefinidas
// primero y luego alfabéticas: es el orden en que conviene ofrecerlas al
// elegir categoría para un gasto.
export async function findVisiblePaginated(
  pg: Queryable,
  userId: string,
  page: PaginationQuery,
): Promise<Paginated<Category>> {
  const { rows } = await pg.query(
    `SELECT ${CATEGORY_COLUMNS}, count(*) OVER() AS total_count
     FROM categories
     WHERE user_id IS NULL OR user_id = $1
     ORDER BY (user_id IS NOT NULL), lower(name)
     LIMIT $2 OFFSET $3`,
    [userId, page.limit, (page.page - 1) * page.limit],
  );
  const items = (rows as (CategoryRow & { total_count: string })[]).map(toCategory);
  const total = rows.length > 0 ? Number((rows[0] as { total_count: string }).total_count) : 0;
  return { items, total };
}

export async function findById(pg: Queryable, categoryId: string): Promise<Category | null> {
  const { rows } = await pg.query(`SELECT ${CATEGORY_COLUMNS} FROM categories WHERE id = $1`, [
    categoryId,
  ]);
  const row = rows[0] as CategoryRow | undefined;
  return row ? toCategory(row) : null;
}

// Solo encuentra categorías PROPIAS (nunca predefinidas ni ajenas): es lo que
// hace que editar o borrar una predefinida o una de otro usuario devuelva el
// mismo 404 que si no existiera, sin revelar su existencia.
export async function findOwnedById(
  pg: Queryable,
  userId: string,
  categoryId: string,
): Promise<Category | null> {
  const { rows } = await pg.query(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE id = $1 AND user_id = $2`,
    [categoryId, userId],
  );
  const row = rows[0] as CategoryRow | undefined;
  return row ? toCategory(row) : null;
}

export async function create(
  pg: Queryable,
  userId: string,
  data: { name: string; color: string | null },
): Promise<Category> {
  const { rows } = await pg.query(
    `INSERT INTO categories (user_id, name, color) VALUES ($1, $2, $3) RETURNING ${CATEGORY_COLUMNS}`,
    [userId, data.name, data.color],
  );
  return toCategory(rows[0] as CategoryRow);
}

export async function update(
  pg: Queryable,
  userId: string,
  categoryId: string,
  data: { name: string; color: string | null },
): Promise<Category | null> {
  const { rows } = await pg.query(
    `UPDATE categories SET name = $3, color = $4
     WHERE id = $1 AND user_id = $2
     RETURNING ${CATEGORY_COLUMNS}`,
    [categoryId, userId, data.name, data.color],
  );
  const row = rows[0] as CategoryRow | undefined;
  return row ? toCategory(row) : null;
}

export async function deleteOwnedById(
  pg: Queryable,
  userId: string,
  categoryId: string,
): Promise<boolean> {
  const { rows } = await pg.query(
    "DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id",
    [categoryId, userId],
  );
  return rows.length > 0;
}
