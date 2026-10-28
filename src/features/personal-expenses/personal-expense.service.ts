import * as personalExpenseRepository from "./personal-expense.repository.js";
import * as categoryService from "../categories/category.service.js";
import { PersonalExpenseNotFoundError } from "./exceptions.js";
import type { PersonalExpenseFilters } from "./personal-expense.repository.js";
import type { Queryable, PersonalExpense, Paginated } from "../../shared/types.js";
import type { PaginationQuery } from "../../shared/schemas/common.schema.js";

export interface PersonalExpenseInput {
  description: string;
  amount: number;
  expenseDate: string;
  categoryId: string | null;
}

export async function createExpense(
  pg: Queryable,
  userId: string,
  input: PersonalExpenseInput,
): Promise<PersonalExpense> {
  if (input.categoryId) {
    await categoryService.assertUsableBy(pg, input.categoryId, userId);
  }
  return personalExpenseRepository.create(pg, userId, {
    categoryId: input.categoryId,
    description: input.description,
    amount: input.amount,
    expenseDate: input.expenseDate,
  });
}

export async function listExpenses(
  pg: Queryable,
  userId: string,
  filters: PersonalExpenseFilters,
  page: PaginationQuery,
): Promise<Paginated<PersonalExpense>> {
  return personalExpenseRepository.findPaginated(pg, userId, filters, page);
}

export async function getExpense(
  pg: Queryable,
  userId: string,
  expenseId: string,
): Promise<PersonalExpense> {
  const expense = await personalExpenseRepository.findByIdAndUserId(pg, userId, expenseId);
  if (!expense) throw new PersonalExpenseNotFoundError(expenseId);
  return expense;
}

export async function updateExpense(
  pg: Queryable,
  userId: string,
  expenseId: string,
  patch: Partial<PersonalExpenseInput>,
): Promise<PersonalExpense> {
  const current = await personalExpenseRepository.findByIdAndUserId(pg, userId, expenseId);
  if (!current) throw new PersonalExpenseNotFoundError(expenseId);

  const nextCategoryId = patch.categoryId !== undefined ? patch.categoryId : current.categoryId;
  if (nextCategoryId) {
    await categoryService.assertUsableBy(pg, nextCategoryId, userId);
  }

  const updated = await personalExpenseRepository.update(pg, userId, expenseId, {
    categoryId: nextCategoryId,
    description: patch.description ?? current.description,
    amount: patch.amount ?? current.amount,
    expenseDate: patch.expenseDate ?? current.expenseDate,
  });
  if (!updated) throw new PersonalExpenseNotFoundError(expenseId);
  return updated;
}

export async function deleteExpense(
  pg: Queryable,
  userId: string,
  expenseId: string,
): Promise<void> {
  const deleted = await personalExpenseRepository.softDelete(pg, userId, expenseId);
  if (!deleted) throw new PersonalExpenseNotFoundError(expenseId);
}
