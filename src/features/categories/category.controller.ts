import * as categoryService from "./category.service.js";
import { toCategoryResponse } from "./category.schema.js";
import { toPaginatedResponse } from "../../shared/schemas/common.schema.js";
import type {
  listCategoriesSchema,
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
} from "./category.schema.js";
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";

export async function listCategories(
  request: ZodRequest<typeof listCategoriesSchema>,
  reply: ZodReply<typeof listCategoriesSchema>,
): Promise<void> {
  const result = await categoryService.listVisible(
    request.server.pg,
    request.user.id,
    request.query,
  );
  reply.send(toPaginatedResponse(request.query, result, toCategoryResponse));
}

export async function createCategory(
  request: ZodRequest<typeof createCategorySchema>,
  reply: ZodReply<typeof createCategorySchema>,
): Promise<void> {
  const category = await categoryService.createCategory(request.server.pg, request.user.id, {
    name: request.body.name,
    color: request.body.color ?? null,
  });
  reply.status(201).send(toCategoryResponse(category));
}

export async function updateCategory(
  request: ZodRequest<typeof updateCategorySchema>,
  reply: ZodReply<typeof updateCategorySchema>,
): Promise<void> {
  const category = await categoryService.updateCategory(
    request.server.pg,
    request.user.id,
    request.params.id,
    request.body,
  );
  reply.send(toCategoryResponse(category));
}

export async function deleteCategory(
  request: ZodRequest<typeof deleteCategorySchema>,
  reply: ZodReply<typeof deleteCategorySchema>,
): Promise<void> {
  await categoryService.deleteCategory(request.server.pg, request.user.id, request.params.id);
  reply.status(204).send();
}
