import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as groupExpenseController from "./group-expense.controller.js";
import {
  createGroupExpenseSchema,
  listGroupExpensesSchema,
  getGroupExpenseSchema,
  updateGroupExpenseSchema,
  deleteGroupExpenseSchema,
} from "./group-expense.schema.js";

export default async function groupExpenseRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.post(
    "/groups/:groupId/expenses",
    { schema: createGroupExpenseSchema, preHandler: [fastify.authenticate] },
    groupExpenseController.createExpense,
  );

  fastify.get(
    "/groups/:groupId/expenses",
    { schema: listGroupExpensesSchema, preHandler: [fastify.authenticate] },
    groupExpenseController.listExpenses,
  );

  fastify.get(
    "/groups/:groupId/expenses/:expenseId",
    { schema: getGroupExpenseSchema, preHandler: [fastify.authenticate] },
    groupExpenseController.getExpense,
  );

  fastify.patch(
    "/groups/:groupId/expenses/:expenseId",
    { schema: updateGroupExpenseSchema, preHandler: [fastify.authenticate] },
    groupExpenseController.updateExpense,
  );

  fastify.delete(
    "/groups/:groupId/expenses/:expenseId",
    { schema: deleteGroupExpenseSchema, preHandler: [fastify.authenticate] },
    groupExpenseController.deleteExpense,
  );
}
