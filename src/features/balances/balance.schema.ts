import { z } from "zod";
import { errorResponseSchema } from "../../shared/schemas/common.schema.js";
import type { GroupBalances, UserBalanceSummary } from "../../shared/types.js";

const memberBalanceSchema = z.object({
  member_id: z.uuid(),
  alias: z.string(),
  user_id: z.uuid().nullable(),
  balance: z.number(),
});

const settlementSchema = z.object({
  from_member_id: z.uuid(),
  to_member_id: z.uuid(),
  amount: z.number(),
});

export const groupBalancesResponseSchema = z.object({
  balances: z.array(memberBalanceSchema),
  settlements: z.array(settlementSchema),
});

export type GroupBalancesResponse = z.infer<typeof groupBalancesResponseSchema>;

export function toGroupBalancesResponse(result: GroupBalances): GroupBalancesResponse {
  return {
    balances: result.balances.map((balance) => ({
      member_id: balance.memberId,
      alias: balance.alias,
      user_id: balance.userId,
      balance: balance.balance,
    })),
    settlements: result.settlements.map((settlement) => ({
      from_member_id: settlement.fromMemberId,
      to_member_id: settlement.toMemberId,
      amount: settlement.amount,
    })),
  };
}

const userGroupBalanceSchema = z.object({
  group_id: z.uuid(),
  group_name: z.string(),
  member_id: z.uuid(),
  alias: z.string(),
  balance: z.number(),
});

export const userBalanceSummaryResponseSchema = z.object({
  total_owed_to_user: z.number(),
  total_user_owes: z.number(),
  net: z.number(),
  groups: z.array(userGroupBalanceSchema),
});

export type UserBalanceSummaryResponse = z.infer<typeof userBalanceSummaryResponseSchema>;

export function toUserBalanceSummaryResponse(
  summary: UserBalanceSummary,
): UserBalanceSummaryResponse {
  return {
    total_owed_to_user: summary.totalOwedToUser,
    total_user_owes: summary.totalUserOwes,
    net: summary.net,
    groups: summary.groups.map((group) => ({
      group_id: group.groupId,
      group_name: group.groupName,
      member_id: group.memberId,
      alias: group.alias,
      balance: group.balance,
    })),
  };
}

export const getGroupBalancesSchema = {
  tags: ["balances"],
  summary: "Saldos de un grupo, con las transferencias que lo saldarían",
  description:
    "Solo para miembros. Las transferencias simplificadas se calculan en el momento de la " +
    "consulta a partir de los saldos; no se persisten.",
  security: [{ bearerAuth: [] }],
  params: z.object({ groupId: z.uuid() }),
  response: {
    200: groupBalancesResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const getMyBalancesSchema = {
  tags: ["balances"],
  summary: "Resumen de saldos del usuario en todos sus grupos",
  description:
    "No se netean los grupos entre sí: deber en uno y que te deban en otro son cifras " +
    "independientes, además del neto.",
  security: [{ bearerAuth: [] }],
  response: {
    200: userBalanceSummaryResponseSchema,
    401: errorResponseSchema,
  },
};
