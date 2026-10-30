import { del, get, patch, post } from "./client";
import type { PersonalExpense, Paginated } from "./types";

export interface PersonalExpenseFilters {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  category_id?: string;
}

export const listPersonalExpenses = (filters: PersonalExpenseFilters) =>
  get<Paginated<PersonalExpense>>("/expenses", { ...filters });

export const getPersonalExpense = (expenseId: string) =>
  get<PersonalExpense>(`/expenses/${expenseId}`);

export interface PersonalExpenseBody {
  description: string;
  amount: number;
  expense_date: string;
  category_id?: string | null;
}

export const createPersonalExpense = (body: PersonalExpenseBody) =>
  post<PersonalExpense>("/expenses", body);

export const updatePersonalExpense = (expenseId: string, body: Partial<PersonalExpenseBody>) =>
  patch<PersonalExpense>(`/expenses/${expenseId}`, body);

export const deletePersonalExpense = (expenseId: string) => del(`/expenses/${expenseId}`);
