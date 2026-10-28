import { z } from "zod";
import {
  errorResponseSchema,
  paginationQuerySchema,
  paginatedSchema,
} from "../../shared/schemas/common.schema.js";
import type { GroupExpense, GroupExpenseDetail } from "../../shared/types.js";

const shareSchema = z.object({
  member_id: z.uuid(),
  amount: z.number().positive(),
});

const sharesSchema = z
  .array(shareSchema)
  .min(1)
  .refine((shares) => new Set(shares.map((share) => share.member_id)).size === shares.length, {
    message: "shares must not repeat the same member_id",
  });

export const groupExpenseResponseSchema = z.object({
  id: z.uuid(),
  group_id: z.uuid(),
  paid_by_member_id: z.uuid(),
  category_id: z.uuid().nullable(),
  created_by_user_id: z.uuid().nullable(),
  description: z.string(),
  amount: z.number(),
  expense_date: z.iso.date(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type GroupExpenseResponse = z.infer<typeof groupExpenseResponseSchema>;

export function toGroupExpenseResponse(expense: GroupExpense): GroupExpenseResponse {
  return {
    id: expense.id,
    group_id: expense.groupId,
    paid_by_member_id: expense.paidByMemberId,
    category_id: expense.categoryId,
    created_by_user_id: expense.createdByUserId,
    description: expense.description,
    amount: expense.amount,
    expense_date: expense.expenseDate,
    created_at: expense.createdAt.toISOString(),
    updated_at: expense.updatedAt.toISOString(),
  };
}

// El detalle añade el reparto. Las listas devuelven el gasto sin él: quien
// necesita saber quién paga a quién pide el detalle de ese gasto concreto.
export const groupExpenseDetailResponseSchema = groupExpenseResponseSchema.extend({
  shares: z.array(z.object({ member_id: z.uuid(), amount: z.number() })),
});

export type GroupExpenseDetailResponse = z.infer<typeof groupExpenseDetailResponseSchema>;

export function toGroupExpenseDetailResponse(
  expense: GroupExpenseDetail,
): GroupExpenseDetailResponse {
  return {
    ...toGroupExpenseResponse(expense),
    shares: expense.shares.map((share) => ({ member_id: share.memberId, amount: share.amount })),
  };
}

const groupIdParamsSchema = z.object({ groupId: z.uuid() });
const expenseParamsSchema = z.object({ groupId: z.uuid(), expenseId: z.uuid() });

export const createGroupExpenseSchema = {
  tags: ["group-expenses"],
  summary: "Registra un gasto de grupo con su reparto",
  description:
    "Cualquier miembro puede registrarlo, aunque no sea el pagador. El importe se guarda " +
    "siempre como cantidad exacta por participante: el frontend calcula las partes, la API " +
    "valida que la suma cuadre con el total. Solo admite categorías predefinidas.",
  security: [{ bearerAuth: [] }],
  params: groupIdParamsSchema,
  body: z.object({
    description: z.string().trim().min(1).max(255),
    amount: z.number().positive(),
    expense_date: z.iso.date(),
    paid_by_member_id: z.uuid(),
    category_id: z.uuid().nullable().optional(),
    shares: sharesSchema,
  }),
  response: {
    201: groupExpenseDetailResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    422: errorResponseSchema,
  },
};

export const listGroupExpensesSchema = {
  tags: ["group-expenses"],
  summary: "Lista los gastos de un grupo",
  security: [{ bearerAuth: [] }],
  params: groupIdParamsSchema,
  querystring: paginationQuerySchema.extend({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    category_id: z.uuid().optional(),
    paid_by_member_id: z.uuid().optional(),
  }),
  response: {
    200: paginatedSchema(groupExpenseResponseSchema),
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const getGroupExpenseSchema = {
  tags: ["group-expenses"],
  summary: "Obtiene el detalle de un gasto de grupo, con su reparto",
  security: [{ bearerAuth: [] }],
  params: expenseParamsSchema,
  response: {
    200: groupExpenseDetailResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const updateGroupExpenseSchema = {
  tags: ["group-expenses"],
  summary: "Edita un gasto de grupo",
  description:
    "Puede editarlo cualquier miembro del grupo, lo haya registrado él o no. Si se cambia el " +
    "importe o el reparto, la suma tiene que seguir cuadrando.",
  security: [{ bearerAuth: [] }],
  params: expenseParamsSchema,
  body: z.object({
    description: z.string().trim().min(1).max(255).optional(),
    amount: z.number().positive().optional(),
    expense_date: z.iso.date().optional(),
    paid_by_member_id: z.uuid().optional(),
    category_id: z.uuid().nullable().optional(),
    shares: sharesSchema.optional(),
  }),
  response: {
    200: groupExpenseDetailResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    422: errorResponseSchema,
  },
};

export const deleteGroupExpenseSchema = {
  tags: ["group-expenses"],
  summary: "Elimina un gasto de grupo",
  description:
    "Borrado lógico: el gasto deja de listarse pero afecta a los saldos hasta entonces calculados.",
  security: [{ bearerAuth: [] }],
  params: expenseParamsSchema,
  response: {
    204: z.undefined(),
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};
