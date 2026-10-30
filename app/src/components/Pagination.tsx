import type { Paginated } from "../api/types";
import { Button } from "./Button";

interface PaginationProps {
  pagination: Paginated<unknown>["pagination"];
  onPageChange: (page: number) => void;
}

export function Pagination({ pagination, onPageChange }: PaginationProps) {
  if (pagination.total_pages <= 1) return null;
  const { page, total_pages: totalPages } = pagination;
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-2 pt-2">
      <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        Anterior
      </Button>
      <span className="text-sm text-ink-soft">
        Página {page} de {totalPages}
      </span>
      <Button
        variant="secondary"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Siguiente
      </Button>
    </nav>
  );
}
