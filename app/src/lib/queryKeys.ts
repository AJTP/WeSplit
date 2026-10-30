import type { QueryClient } from "@tanstack/react-query";

// Convención: las claves de un grupo llevan su id en la posición 1, así se
// invalidan todas juntas al cambiar algo en ese grupo.
export const keys = {
  group: (groupId: string) => ["group", groupId] as const,
  members: (groupId: string) => ["members", groupId] as const,
  balances: (groupId: string) => ["balances", groupId] as const,
  groupExpenses: (groupId: string, filters: object) =>
    ["group-expenses", groupId, filters] as const,
  groupExpense: (groupId: string, expenseId: string) =>
    ["group-expense", groupId, expenseId] as const,
  payments: (groupId: string, page: number) => ["payments", groupId, page] as const,
  invitation: (groupId: string) => ["invitation", groupId] as const,
  groups: ["groups"] as const,
  myBalances: ["my-balances"] as const,
  categories: ["categories"] as const,
  personalExpenses: (filters: object) => ["personal-expenses", filters] as const,
  personalExpense: (expenseId: string) => ["personal-expense", expenseId] as const,
  identities: ["identities"] as const,
  invitationView: (token: string) => ["invitation-view", token] as const,
};

export function invalidateGroup(queryClient: QueryClient, groupId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ predicate: (query) => query.queryKey[1] === groupId }),
    queryClient.invalidateQueries({ queryKey: keys.myBalances }),
    queryClient.invalidateQueries({ queryKey: keys.groups }),
  ]);
}
