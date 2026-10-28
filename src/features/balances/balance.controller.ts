import * as balanceService from "./balance.service.js";
import { toGroupBalancesResponse, toUserBalanceSummaryResponse } from "./balance.schema.js";
import type { getGroupBalancesSchema, getMyBalancesSchema } from "./balance.schema.js";
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";

export async function getGroupBalances(
  request: ZodRequest<typeof getGroupBalancesSchema>,
  reply: ZodReply<typeof getGroupBalancesSchema>,
): Promise<void> {
  const result = await balanceService.getGroupBalances(
    request.server.pg,
    request.params.groupId,
    request.user.id,
  );
  reply.send(toGroupBalancesResponse(result));
}

export async function getMyBalances(
  request: ZodRequest<typeof getMyBalancesSchema>,
  reply: ZodReply<typeof getMyBalancesSchema>,
): Promise<void> {
  const result = await balanceService.getUserBalanceSummary(request.server.pg, request.user.id);
  reply.send(toUserBalanceSummaryResponse(result));
}
