import { del, get, patch, post } from "./client";
import type { GroupExpense, GroupExpenseDetail, Paginated } from "./types";

export interface GroupExpenseFilters {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  category_id?: string;
  paid_by_member_id?: string;
}

export const listGroupExpenses = (groupId: string, filters: GroupExpenseFilters) =>
  get<Paginated<GroupExpense>>(`/groups/${groupId}/expenses`, { ...filters });

export const getGroupExpense = (groupId: string, expenseId: string) =>
  get<GroupExpenseDetail>(`/groups/${groupId}/expenses/${expenseId}`);

export interface GroupExpenseBody {
  description: string;
  amount: number;
  expense_date: string;
  paid_by_member_id: string;
  category_id?: string | null;
  shares: { member_id: string; amount: number }[];
}

export const createGroupExpense = (groupId: string, body: GroupExpenseBody) =>
  post<GroupExpenseDetail>(`/groups/${groupId}/expenses`, body);

export const updateGroupExpense = (
  groupId: string,
  expenseId: string,
  body: Partial<GroupExpenseBody>,
) => patch<GroupExpenseDetail>(`/groups/${groupId}/expenses/${expenseId}`, body);

export const deleteGroupExpense = (groupId: string, expenseId: string) =>
  del(`/groups/${groupId}/expenses/${expenseId}`);
