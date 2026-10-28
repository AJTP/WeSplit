import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as balanceController from "./balance.controller.js";
import { getGroupBalancesSchema, getMyBalancesSchema } from "./balance.schema.js";

export default async function balanceRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get(
    "/groups/:groupId/balances",
    { schema: getGroupBalancesSchema, preHandler: [fastify.authenticate] },
    balanceController.getGroupBalances,
  );

  fastify.get(
    "/me/balances",
    { schema: getMyBalancesSchema, preHandler: [fastify.authenticate] },
    balanceController.getMyBalances,
  );
}
