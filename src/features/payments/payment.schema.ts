import { z } from "zod";
import {
  errorResponseSchema,
  paginationQuerySchema,
  paginatedSchema,
} from "../../shared/schemas/common.schema.js";
import type { Payment } from "../../shared/types.js";

export const paymentResponseSchema = z.object({
  id: z.uuid(),
  group_id: z.uuid(),
  from_member_id: z.uuid(),
  to_member_id: z.uuid(),
  amount: z.number(),
  paid_on: z.iso.date(),
  note: z.string().nullable(),
  created_by_user_id: z.uuid().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type PaymentResponse = z.infer<typeof paymentResponseSchema>;

export function toPaymentResponse(payment: Payment): PaymentResponse {
  return {
    id: payment.id,
    group_id: payment.groupId,
    from_member_id: payment.fromMemberId,
    to_member_id: payment.toMemberId,
    amount: payment.amount,
    paid_on: payment.paidOn,
    note: payment.note,
    created_by_user_id: payment.createdByUserId,
    created_at: payment.createdAt.toISOString(),
    updated_at: payment.updatedAt.toISOString(),
  };
}

const groupIdParamsSchema = z.object({ groupId: z.uuid() });
const paymentParamsSchema = z.object({ groupId: z.uuid(), paymentId: z.uuid() });

export const createPaymentSchema = {
  tags: ["payments"],
  summary: "Registra un pago de un miembro a otro del mismo grupo",
  description:
    "Lo puede registrar cualquier miembro del grupo, no solo las dos partes del pago. El " +
    "receptor no tiene que confirmarlo.",
  security: [{ bearerAuth: [] }],
  params: groupIdParamsSchema,
  body: z
    .object({
      from_member_id: z.uuid(),
      to_member_id: z.uuid(),
      amount: z.number().positive(),
      paid_on: z.iso.date(),
      note: z.string().trim().max(255).nullable().optional(),
    })
    .refine((data) => data.from_member_id !== data.to_member_id, {
      message: "from_member_id and to_member_id must be different",
      path: ["to_member_id"],
    }),
  response: {
    201: paymentResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    422: errorResponseSchema,
  },
};

export const listPaymentsSchema = {
  tags: ["payments"],
  summary: "Lista los pagos de un grupo",
  security: [{ bearerAuth: [] }],
  params: groupIdParamsSchema,
  querystring: paginationQuerySchema,
  response: {
    200: paginatedSchema(paymentResponseSchema),
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const deletePaymentSchema = {
  tags: ["payments"],
  summary: "Elimina un pago",
  description: "Borrado lógico: deja de contar en los saldos del grupo, pero no se pierde.",
  security: [{ bearerAuth: [] }],
  params: paymentParamsSchema,
  response: {
    204: z.undefined(),
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};
