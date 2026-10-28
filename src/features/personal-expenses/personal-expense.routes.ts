import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as personalExpenseController from "./personal-expense.controller.js";
import {
  createPersonalExpenseSchema,
  listPersonalExpensesSchema,
  getPersonalExpenseSchema,
  updatePersonalExpenseSchema,
  deletePersonalExpenseSchema,
} from "./personal-expense.schema.js";

export default async function personalExpenseRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.post(
    "/expenses",
    { schema: createPersonalExpenseSchema, preHandler: [fastify.authenticate] },
    personalExpenseController.createExpense,
  );

  fastify.get(
    "/expenses",
    { schema: listPersonalExpensesSchema, preHandler: [fastify.authenticate] },
    personalExpenseController.listExpenses,
  );

  fastify.get(
    "/expenses/:id",
    { schema: getPersonalExpenseSchema, preHandler: [fastify.authenticate] },
    personalExpenseController.getExpense,
  );

  fastify.patch(
    "/expenses/:id",
    { schema: updatePersonalExpenseSchema, preHandler: [fastify.authenticate] },
    personalExpenseController.updateExpense,
  );

  fastify.delete(
    "/expenses/:id",
    { schema: deletePersonalExpenseSchema, preHandler: [fastify.authenticate] },
    personalExpenseController.deleteExpense,
  );
}
