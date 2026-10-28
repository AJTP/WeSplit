import * as personalExpenseService from "./personal-expense.service.js";
import { toPersonalExpenseResponse } from "./personal-expense.schema.js";
import { toPaginatedResponse } from "../../shared/schemas/common.schema.js";
import type {
  createPersonalExpenseSchema,
  listPersonalExpensesSchema,
  getPersonalExpenseSchema,
  updatePersonalExpenseSchema,
  deletePersonalExpenseSchema,
} from "./personal-expense.schema.js";
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";

export async function createExpense(
  request: ZodRequest<typeof createPersonalExpenseSchema>,
  reply: ZodReply<typeof createPersonalExpenseSchema>,
): Promise<void> {
  const expense = await personalExpenseService.createExpense(request.server.pg, request.user.id, {
    description: request.body.description,
    amount: request.body.amount,
    expenseDate: request.body.expense_date,
    categoryId: request.body.category_id ?? null,
  });
  reply.status(201).send(toPersonalExpenseResponse(expense));
}

export async function listExpenses(
  request: ZodRequest<typeof listPersonalExpensesSchema>,
  reply: ZodReply<typeof listPersonalExpensesSchema>,
): Promise<void> {
  const { page, limit, from, to, category_id } = request.query;
  const result = await personalExpenseService.listExpenses(
    request.server.pg,
    request.user.id,
    { from, to, categoryId: category_id },
    { page, limit },
  );
  reply.send(toPaginatedResponse({ page, limit }, result, toPersonalExpenseResponse));
}

export async function getExpense(
  request: ZodRequest<typeof getPersonalExpenseSchema>,
  reply: ZodReply<typeof getPersonalExpenseSchema>,
): Promise<void> {
  const expense = await personalExpenseService.getExpense(
    request.server.pg,
    request.user.id,
    request.params.id,
  );
  reply.send(toPersonalExpenseResponse(expense));
}

export async function updateExpense(
  request: ZodRequest<typeof updatePersonalExpenseSchema>,
  reply: ZodReply<typeof updatePersonalExpenseSchema>,
): Promise<void> {
  const expense = await personalExpenseService.updateExpense(
    request.server.pg,
    request.user.id,
    request.params.id,
    {
      description: request.body.description,
      amount: request.body.amount,
      expenseDate: request.body.expense_date,
      categoryId: request.body.category_id,
    },
  );
  reply.send(toPersonalExpenseResponse(expense));
}

export async function deleteExpense(
  request: ZodRequest<typeof deletePersonalExpenseSchema>,
  reply: ZodReply<typeof deletePersonalExpenseSchema>,
): Promise<void> {
  await personalExpenseService.deleteExpense(request.server.pg, request.user.id, request.params.id);
  reply.status(204).send();
}
