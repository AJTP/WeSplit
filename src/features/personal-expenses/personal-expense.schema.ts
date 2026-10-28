import { z } from "zod";
import {
  errorResponseSchema,
  paginationQuerySchema,
  paginatedSchema,
  idParamsSchema,
} from "../../shared/schemas/common.schema.js";
import type { PersonalExpense } from "../../shared/types.js";

export const personalExpenseResponseSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  category_id: z.uuid().nullable(),
  description: z.string(),
  amount: z.number(),
  expense_date: z.iso.date(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type PersonalExpenseResponse = z.infer<typeof personalExpenseResponseSchema>;

export function toPersonalExpenseResponse(expense: PersonalExpense): PersonalExpenseResponse {
  return {
    id: expense.id,
    user_id: expense.userId,
    category_id: expense.categoryId,
    description: expense.description,
    amount: expense.amount,
    expense_date: expense.expenseDate,
    created_at: expense.createdAt.toISOString(),
    updated_at: expense.updatedAt.toISOString(),
  };
}

export const createPersonalExpenseSchema = {
  tags: ["personal-expenses"],
  summary: "Registra un gasto individual, sin grupo ni reparto",
  description: "La categoría es opcional y puede ser predefinida o propia del usuario.",
  security: [{ bearerAuth: [] }],
  body: z.object({
    description: z.string().trim().min(1).max(255),
    amount: z.number().positive(),
    expense_date: z.iso.date(),
    category_id: z.uuid().nullable().optional(),
  }),
  response: {
    201: personalExpenseResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const listPersonalExpensesSchema = {
  tags: ["personal-expenses"],
  summary: "Lista los gastos individuales del usuario",
  description: "Solo devuelve gastos del propio usuario.",
  security: [{ bearerAuth: [] }],
  querystring: paginationQuerySchema.extend({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    category_id: z.uuid().optional(),
  }),
  response: {
    200: paginatedSchema(personalExpenseResponseSchema),
    401: errorResponseSchema,
  },
};

export const getPersonalExpenseSchema = {
  tags: ["personal-expenses"],
  summary: "Obtiene el detalle de un gasto individual",
  description:
    "Solo el propietario. Responder 404 si no existe o es de otro usuario, sin distinguir los dos casos.",
  security: [{ bearerAuth: [] }],
  params: idParamsSchema,
  response: {
    200: personalExpenseResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const updatePersonalExpenseSchema = {
  tags: ["personal-expenses"],
  summary: "Edita un gasto individual",
  security: [{ bearerAuth: [] }],
  params: idParamsSchema,
  body: z.object({
    description: z.string().trim().min(1).max(255).optional(),
    amount: z.number().positive().optional(),
    expense_date: z.iso.date().optional(),
    category_id: z.uuid().nullable().optional(),
  }),
  response: {
    200: personalExpenseResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const deletePersonalExpenseSchema = {
  tags: ["personal-expenses"],
  summary: "Elimina un gasto individual",
  description: "Borrado lógico.",
  security: [{ bearerAuth: [] }],
  params: idParamsSchema,
  response: {
    204: z.undefined(),
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};
