import { get } from "./client";
import type { GroupBalances, UserBalanceSummary } from "./types";

export const getGroupBalances = (groupId: string) =>
  get<GroupBalances>(`/groups/${groupId}/balances`);

export const getMyBalances = () => get<UserBalanceSummary>("/me/balances");
