import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as paymentController from "./payment.controller.js";
import { createPaymentSchema, listPaymentsSchema, deletePaymentSchema } from "./payment.schema.js";

export default async function paymentRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.post(
    "/groups/:groupId/payments",
    { schema: createPaymentSchema, preHandler: [fastify.authenticate] },
    paymentController.createPayment,
  );

  fastify.get(
    "/groups/:groupId/payments",
    { schema: listPaymentsSchema, preHandler: [fastify.authenticate] },
    paymentController.listPayments,
  );

  fastify.delete(
    "/groups/:groupId/payments/:paymentId",
    { schema: deletePaymentSchema, preHandler: [fastify.authenticate] },
    paymentController.deletePayment,
  );
}
