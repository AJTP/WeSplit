import { z } from "zod";
import {
  errorResponseSchema,
  paginationQuerySchema,
  paginatedSchema,
  idParamsSchema,
} from "../../shared/schemas/common.schema.js";
import type { Category } from "../../shared/types.js";

const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "color must be a 6-digit hex code, e.g. #RRGGBB")
  .nullable();

export const categoryResponseSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid().nullable(),
  name: z.string(),
  color: z.string().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type CategoryResponse = z.infer<typeof categoryResponseSchema>;

export function toCategoryResponse(category: Category): CategoryResponse {
  return {
    id: category.id,
    user_id: category.userId,
    name: category.name,
    color: category.color,
    created_at: category.createdAt.toISOString(),
    updated_at: category.updatedAt.toISOString(),
  };
}

export const listCategoriesSchema = {
  tags: ["categories"],
  summary: "Lista las categorías visibles para el usuario",
  description: "Las predefinidas (comunes a todos) primero, luego las personalizadas del usuario.",
  security: [{ bearerAuth: [] }],
  querystring: paginationQuerySchema,
  response: {
    200: paginatedSchema(categoryResponseSchema),
    401: errorResponseSchema,
  },
};

export const createCategorySchema = {
  tags: ["categories"],
  summary: "Crea una categoría personalizada",
  description: "Visible solo para su creador. Puede coincidir en nombre con una predefinida.",
  security: [{ bearerAuth: [] }],
  body: z.object({
    name: z.string().trim().min(1).max(80),
    color: colorSchema.optional(),
  }),
  response: {
    201: categoryResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const updateCategorySchema = {
  tags: ["categories"],
  summary: "Edita una categoría personalizada",
  description: "Solo el propietario. Tocar una predefinida o una ajena responde 404.",
  security: [{ bearerAuth: [] }],
  params: idParamsSchema,
  body: z.object({
    name: z.string().trim().min(1).max(80).optional(),
    color: colorSchema.optional(),
  }),
  response: {
    200: categoryResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const deleteCategorySchema = {
  tags: ["categories"],
  summary: "Elimina una categoría personalizada",
  description:
    "Solo el propietario. Los gastos que la usaban quedan sin categoría. Tocar una " +
    "predefinida o una ajena responde 404.",
  security: [{ bearerAuth: [] }],
  params: idParamsSchema,
  response: {
    204: z.undefined(),
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};
