import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCategories } from "../../api/categories";
import { fetchAllPages } from "../../api/pagination";
import type { Category } from "../../api/types";
import { keys } from "../../lib/queryKeys";

// Predefinidas (user_id nulo) y propias. Todas en una sola lista, con búsqueda por id.
export function useCategories() {
  const query = useQuery({
    queryKey: keys.categories,
    queryFn: () => fetchAllPages((page, limit) => listCategories(page, limit)),
  });
  const categories = useMemo<Category[]>(() => query.data ?? [], [query.data]);
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  return {
    ...query,
    categories,
    categoryById,
    predefined: categories.filter((category) => category.user_id === null),
    own: categories.filter((category) => category.user_id !== null),
  };
}
