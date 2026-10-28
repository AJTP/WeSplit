import * as groupExpenseRepository from "./group-expense.repository.js";
import * as groupExpenseShareRepository from "./group-expense-share.repository.js";
import * as membershipService from "../groups/membership.service.js";
import * as groupMemberRepository from "../groups/group-member.repository.js";
import * as categoryService from "../categories/category.service.js";
import {
  GroupExpenseNotFoundError,
  ExpenseSharesMismatchError,
  MemberNotInGroupError,
} from "./exceptions.js";
import { withTransaction, type Transactional } from "../../shared/db/transaction.js";
import { sumCents, toCents, fromCents } from "../../shared/money.js";
import type { GroupExpenseFilters } from "./group-expense.repository.js";
import type { Queryable, GroupExpenseDetail, GroupExpense, Paginated } from "../../shared/types.js";
import type { PaginationQuery } from "../../shared/schemas/common.schema.js";

export interface GroupExpenseShareInput {
  memberId: string;
  amount: number;
}

export interface CreateGroupExpenseInput {
  description: string;
  amount: number;
  expenseDate: string;
  paidByMemberId: string;
  categoryId: string | null;
  shares: GroupExpenseShareInput[];
}

export interface UpdateGroupExpenseInput {
  description?: string;
  amount?: number;
  expenseDate?: string;
  paidByMemberId?: string;
  categoryId?: string | null;
  shares?: GroupExpenseShareInput[];
}

// La suma del reparto no es una restricción de la base de datos (ver Modelo
// de datos en FEATURES.md): se valida aquí, en céntimos enteros, porque
// comparar importes en coma flotante es un bug garantizado.
function assertSharesMatchTotal(amount: number, shares: GroupExpenseShareInput[]): void {
  const expectedCents = toCents(amount);
  const actualCents = sumCents(shares.map((share) => share.amount));
  if (actualCents !== expectedCents) {
    throw new ExpenseSharesMismatchError(amount, fromCents(actualCents));
  }
}

// La base de datos garantiza que el pagador es miembro del grupo (FK
// compuesta), pero NO que los participantes del reparto lo sean: esa FK no
// incluye el group_id. Esta comprobación es obligatoria, no redundante.
async function assertMembersInGroup(
  pg: Queryable,
  groupId: string,
  memberIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(memberIds)];
  const found = await groupMemberRepository.findIdsInGroup(pg, groupId, uniqueIds);
  const missing = uniqueIds.filter((id) => !found.has(id));
  if (missing.length > 0) throw new MemberNotInGroupError(groupId, missing);
}

export async function createExpense(
  pg: Transactional,
  groupId: string,
  userId: string,
  input: CreateGroupExpenseInput,
): Promise<GroupExpenseDetail> {
  await membershipService.requireMembership(pg, groupId, userId);

  assertSharesMatchTotal(input.amount, input.shares);
  if (input.categoryId) {
    await categoryService.assertPredefined(pg, input.categoryId);
  }
  await assertMembersInGroup(pg, groupId, [
    input.paidByMemberId,
    ...input.shares.map((s) => s.memberId),
  ]);

  return withTransaction(pg, async (tx) => {
    const expense = await groupExpenseRepository.create(tx, groupId, {
      paidByMemberId: input.paidByMemberId,
      categoryId: input.categoryId,
      createdByUserId: userId,
      description: input.description,
      amount: input.amount,
      expenseDate: input.expenseDate,
    });
    const shares = await groupExpenseShareRepository.replaceAll(tx, expense.id, input.shares);
    return { ...expense, shares };
  });
}

export async function listExpenses(
  pg: Queryable,
  groupId: string,
  userId: string,
  filters: GroupExpenseFilters,
  page: PaginationQuery,
): Promise<Paginated<GroupExpense>> {
  await membershipService.requireMembership(pg, groupId, userId);
  return groupExpenseRepository.findPaginated(pg, groupId, filters, page);
}

export async function getExpense(
  pg: Queryable,
  groupId: string,
  userId: string,
  expenseId: string,
): Promise<GroupExpenseDetail> {
  await membershipService.requireMembership(pg, groupId, userId);
  const expense = await groupExpenseRepository.findById(pg, groupId, expenseId);
  if (!expense) throw new GroupExpenseNotFoundError(groupId, expenseId);
  const shares = await groupExpenseShareRepository.findByExpenseId(pg, expense.id);
  return { ...expense, shares };
}

// Cualquier miembro puede editar, lo haya registrado él o no y sea o no el
// pagador: no depende de "ser dueño" porque el pagador puede ser un alias sin
// usuario detrás. El FOR UPDATE de findByIdForUpdate es lo que evita que dos
// PATCH concurrentes dejen un total que no cuadra con su reparto.
export async function updateExpense(
  pg: Transactional,
  groupId: string,
  userId: string,
  expenseId: string,
  patch: UpdateGroupExpenseInput,
): Promise<GroupExpenseDetail> {
  await membershipService.requireMembership(pg, groupId, userId);

  return withTransaction(pg, async (tx) => {
    const current = await groupExpenseRepository.findByIdForUpdate(tx, groupId, expenseId);
    if (!current) throw new GroupExpenseNotFoundError(groupId, expenseId);

    const currentShares = await groupExpenseShareRepository.findByExpenseId(tx, expenseId);
    const nextAmount = patch.amount ?? current.amount;
    const nextShares = patch.shares ?? currentShares;
    // Si llega un importe nuevo sin reparto, o un reparto nuevo sin importe,
    // y los dos dejan de cuadrar, se rechaza: no se reescala el reparto por
    // nuestra cuenta, lo calcula el frontend.
    assertSharesMatchTotal(nextAmount, nextShares);

    const nextCategoryId = patch.categoryId !== undefined ? patch.categoryId : current.categoryId;
    if (nextCategoryId) {
      await categoryService.assertPredefined(tx, nextCategoryId);
    }

    const nextPaidByMemberId = patch.paidByMemberId ?? current.paidByMemberId;
    await assertMembersInGroup(tx, groupId, [
      nextPaidByMemberId,
      ...nextShares.map((share) => share.memberId),
    ]);

    const updated = await groupExpenseRepository.update(tx, groupId, expenseId, {
      paidByMemberId: nextPaidByMemberId,
      categoryId: nextCategoryId,
      description: patch.description ?? current.description,
      amount: nextAmount,
      expenseDate: patch.expenseDate ?? current.expenseDate,
    });
    if (!updated) throw new GroupExpenseNotFoundError(groupId, expenseId);

    const shares = patch.shares
      ? await groupExpenseShareRepository.replaceAll(tx, expenseId, patch.shares)
      : currentShares;

    return { ...updated, shares };
  });
}

export async function deleteExpense(
  pg: Queryable,
  groupId: string,
  userId: string,
  expenseId: string,
): Promise<void> {
  await membershipService.requireMembership(pg, groupId, userId);
  const deleted = await groupExpenseRepository.softDelete(pg, groupId, expenseId);
  if (!deleted) throw new GroupExpenseNotFoundError(groupId, expenseId);
}
