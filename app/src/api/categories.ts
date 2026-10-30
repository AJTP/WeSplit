import { del, get, patch, post } from "./client";
import type { Category, Paginated } from "./types";

export const listCategories = (page: number, limit: number) =>
  get<Paginated<Category>>("/categories", { page, limit });

export interface CategoryBody {
  name?: string;
  color?: string | null;
}

export const createCategory = (body: CategoryBody & { name: string }) =>
  post<Category>("/categories", body);

export const updateCategory = (categoryId: string, body: CategoryBody) =>
  patch<Category>(`/categories/${categoryId}`, body);

export const deleteCategory = (categoryId: string) => del(`/categories/${categoryId}`);
