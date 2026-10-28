import * as balanceRepository from "./balance.repository.js";
import * as membershipService from "../groups/membership.service.js";
import { simplifyDebts } from "./settlement.js";
import { toCents, fromCents } from "../../shared/money.js";
import type { Queryable, GroupBalances, UserBalanceSummary } from "../../shared/types.js";

export async function getGroupBalances(
  pg: Queryable,
  groupId: string,
  userId: string,
): Promise<GroupBalances> {
  await membershipService.requireMembership(pg, groupId, userId);
  const balances = await balanceRepository.findGroupBalances(pg, groupId);
  const settlements = simplifyDebts(balances);
  return { balances, settlements };
}

// No se netean los grupos entre sí: si debes 50 en el grupo A y te deben 50
// en el B, no puedes pagar la deuda de A con el crédito de B, así que el
// resumen muestra las dos cifras por separado además del neto.
export async function getUserBalanceSummary(
  pg: Queryable,
  userId: string,
): Promise<UserBalanceSummary> {
  const groups = await balanceRepository.findUserBalancesAcrossGroups(pg, userId);

  let owedCents = 0;
  let owesCents = 0;
  for (const group of groups) {
    const cents = toCents(group.balance);
    if (cents > 0) owedCents += cents;
    else owesCents += -cents;
  }

  return {
    totalOwedToUser: fromCents(owedCents),
    totalUserOwes: fromCents(owesCents),
    net: fromCents(owedCents - owesCents),
    groups,
  };
}
