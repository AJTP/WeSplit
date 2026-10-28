import * as paymentService from "./payment.service.js";
import { toPaymentResponse } from "./payment.schema.js";
import { toPaginatedResponse } from "../../shared/schemas/common.schema.js";
import type {
  createPaymentSchema,
  listPaymentsSchema,
  deletePaymentSchema,
} from "./payment.schema.js";
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";

export async function createPayment(
  request: ZodRequest<typeof createPaymentSchema>,
  reply: ZodReply<typeof createPaymentSchema>,
): Promise<void> {
  const payment = await paymentService.createPayment(
    request.server.pg,
    request.params.groupId,
    request.user.id,
    {
      fromMemberId: request.body.from_member_id,
      toMemberId: request.body.to_member_id,
      amount: request.body.amount,
      paidOn: request.body.paid_on,
      note: request.body.note ?? null,
    },
  );
  reply.status(201).send(toPaymentResponse(payment));
}

export async function listPayments(
  request: ZodRequest<typeof listPaymentsSchema>,
  reply: ZodReply<typeof listPaymentsSchema>,
): Promise<void> {
  const result = await paymentService.listPayments(
    request.server.pg,
    request.params.groupId,
    request.user.id,
    request.query,
  );
  reply.send(toPaginatedResponse(request.query, result, toPaymentResponse));
}

export async function deletePayment(
  request: ZodRequest<typeof deletePaymentSchema>,
  reply: ZodReply<typeof deletePaymentSchema>,
): Promise<void> {
  await paymentService.deletePayment(
    request.server.pg,
    request.params.groupId,
    request.user.id,
    request.params.paymentId,
  );
  reply.status(204).send();
}
