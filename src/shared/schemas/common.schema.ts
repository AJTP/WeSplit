import { z } from "zod";
import type { Paginated } from "../types.js";

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// --- Params ------------------------------------------------------------

// Solo para el caso /recurso/:id. Los params con nombres propios (groupId,
// memberId, expenseId) se declaran en el schema de su feature: una factoría
// genérica para ahorrar unas líneas sería sobreingeniería.
export const idParamsSchema = z.object({ id: z.uuid() });

// --- Paginación ----------------------------------------------------------

export const PAGE_DEFAULT = 1;
export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

// z.coerce porque el querystring siempre llega como string.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGE_DEFAULT),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  total_pages: z.number().int(),
});

// Envoltorio genérico: se compone con el schema de item de cada feature.
export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({ data: z.array(item), pagination: paginationMetaSchema });
}

// Del dominio paginado al contrato de la API, en un solo sitio: así
// `total_pages` solo se calcula aquí y no en cada controller.
export function toPaginatedResponse<T, R>(
  page: PaginationQuery,
  result: Paginated<T>,
  toResponse: (item: T) => R,
): { data: R[]; pagination: z.infer<typeof paginationMetaSchema> } {
  return {
    data: result.items.map(toResponse),
    pagination: {
      page: page.page,
      limit: page.limit,
      total: result.total,
      total_pages: result.total === 0 ? 0 : Math.ceil(result.total / page.limit),
    },
  };
}
