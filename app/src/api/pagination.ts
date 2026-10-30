import type { Paginated } from "./types";

// Para selectores (miembros, categorías) que necesitan la lista completa.
const PAGE_SIZE_MAX = 100;

export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<Paginated<T>>,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await fetchPage(page, PAGE_SIZE_MAX);
    items.push(...result.data);
    if (page >= result.pagination.total_pages || result.data.length === 0) return items;
  }
}
