import * as categoryRepository from "./category.repository.js";
import {
  CategoryNotFoundError,
  DuplicateCategoryNameError,
  CategoryNotPredefinedError,
} from "./exceptions.js";
import { mapConstraintErrors } from "../../shared/db/pg-errors.js";
import type { Queryable, Category, Paginated } from "../../shared/types.js";
import type { PaginationQuery } from "../../shared/schemas/common.schema.js";

export async function listVisible(
  pg: Queryable,
  userId: string,
  page: PaginationQuery,
): Promise<Paginated<Category>> {
  return categoryRepository.findVisiblePaginated(pg, userId, page);
}

export async function createCategory(
  pg: Queryable,
  userId: string,
  data: { name: string; color: string | null },
): Promise<Category> {
  return mapConstraintErrors(() => categoryRepository.create(pg, userId, data), {
    categories_user_name_unique: () => new DuplicateCategoryNameError(),
  });
}

// Tocar una predefinida o una ajena da el mismo 404 que si no existiera, para
// no revelar las categorías personalizadas de otro usuario.
export async function updateCategory(
  pg: Queryable,
  userId: string,
  categoryId: string,
  patch: { name?: string; color?: string | null },
): Promise<Category> {
  const current = await categoryRepository.findOwnedById(pg, userId, categoryId);
  if (!current) throw new CategoryNotFoundError(categoryId);

  return mapConstraintErrors(
    async () => {
      const updated = await categoryRepository.update(pg, userId, categoryId, {
        name: patch.name ?? current.name,
        color: patch.color !== undefined ? patch.color : current.color,
      });
      if (!updated) throw new CategoryNotFoundError(categoryId);
      return updated;
    },
    { categories_user_name_unique: () => new DuplicateCategoryNameError() },
  );
}

// Borrarla deja los gastos que la usaban sin categoría: lo hace por sí solo
// el ON DELETE SET NULL de categories.id en personal_expenses y
// group_expenses, no hay nada que programar aquí.
export async function deleteCategory(
  pg: Queryable,
  userId: string,
  categoryId: string,
): Promise<void> {
  const deleted = await categoryRepository.deleteOwnedById(pg, userId, categoryId);
  if (!deleted) throw new CategoryNotFoundError(categoryId);
}

// La usan los gastos individuales: cualquier categoría visible para el
// usuario (predefinida o suya) sirve.
export async function assertUsableBy(
  pg: Queryable,
  categoryId: string,
  userId: string,
): Promise<void> {
  const category = await categoryRepository.findById(pg, categoryId);
  if (!category || (category.userId !== null && category.userId !== userId)) {
    throw new CategoryNotFoundError(categoryId);
  }
}

// La usan los gastos de grupo: solo admiten categorías predefinidas, para que
// el nombre de una categoría privada de quien registra el gasto no se filtre
// al resto del grupo (ver decisión del usuario en FEATURES.md).
export async function assertPredefined(pg: Queryable, categoryId: string): Promise<void> {
  const category = await categoryRepository.findById(pg, categoryId);
  if (!category) throw new CategoryNotFoundError(categoryId);
  if (category.userId !== null) throw new CategoryNotPredefinedError(categoryId);
}
