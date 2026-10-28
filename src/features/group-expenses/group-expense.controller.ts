import * as groupExpenseService from "./group-expense.service.js";
import { toGroupExpenseResponse, toGroupExpenseDetailResponse } from "./group-expense.schema.js";
import { toPaginatedResponse } from "../../shared/schemas/common.schema.js";
import type {
  createGroupExpenseSchema,
  listGroupExpensesSchema,
  getGroupExpenseSchema,
  updateGroupExpenseSchema,
  deleteGroupExpenseSchema,
} from "./group-expense.schema.js";
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";

export async function createExpense(
  request: ZodRequest<typeof createGroupExpenseSchema>,
  reply: ZodReply<typeof createGroupExpenseSchema>,
): Promise<void> {
  const expense = await groupExpenseService.createExpense(
    request.server.pg,
    request.params.groupId,
    request.user.id,
    {
      description: request.body.description,
      amount: request.body.amount,
      expenseDate: request.body.expense_date,
      paidByMemberId: request.body.paid_by_member_id,
      categoryId: request.body.category_id ?? null,
      shares: request.body.shares.map((share) => ({
        memberId: share.member_id,
        amount: share.amount,
      })),
    },
  );
  reply.status(201).send(toGroupExpenseDetailResponse(expense));
}

export async function listExpenses(
  request: ZodRequest<typeof listGroupExpensesSchema>,
  reply: ZodReply<typeof listGroupExpensesSchema>,
): Promise<void> {
  const { page, limit, from, to, category_id, paid_by_member_id } = request.query;
  const result = await groupExpenseService.listExpenses(
    request.server.pg,
    request.params.groupId,
    request.user.id,
    { from, to, categoryId: category_id, paidByMemberId: paid_by_member_id },
    { page, limit },
  );
  reply.send(toPaginatedResponse({ page, limit }, result, toGroupExpenseResponse));
}

export async function getExpense(
  request: ZodRequest<typeof getGroupExpenseSchema>,
  reply: ZodReply<typeof getGroupExpenseSchema>,
): Promise<void> {
  const expense = await groupExpenseService.getExpense(
    request.server.pg,
    request.params.groupId,
    request.user.id,
    request.params.expenseId,
  );
  reply.send(toGroupExpenseDetailResponse(expense));
}

export async function updateExpense(
  request: ZodRequest<typeof updateGroupExpenseSchema>,
  reply: ZodReply<typeof updateGroupExpenseSchema>,
): Promise<void> {
  const expense = await groupExpenseService.updateExpense(
    request.server.pg,
    request.params.groupId,
    request.user.id,
    request.params.expenseId,
    {
      description: request.body.description,
      amount: request.body.amount,
      expenseDate: request.body.expense_date,
      paidByMemberId: request.body.paid_by_member_id,
      categoryId: request.body.category_id,
      shares: request.body.shares?.map((share) => ({
        memberId: share.member_id,
        amount: share.amount,
      })),
    },
  );
  reply.send(toGroupExpenseDetailResponse(expense));
}

export async function deleteExpense(
  request: ZodRequest<typeof deleteGroupExpenseSchema>,
  reply: ZodReply<typeof deleteGroupExpenseSchema>,
): Promise<void> {
  await groupExpenseService.deleteExpense(
    request.server.pg,
    request.params.groupId,
    request.user.id,
    request.params.expenseId,
  );
  reply.status(204).send();
}
