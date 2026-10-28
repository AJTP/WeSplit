import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as categoryController from "./category.controller.js";
import {
  listCategoriesSchema,
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
} from "./category.schema.js";

export default async function categoryRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get(
    "/categories",
    { schema: listCategoriesSchema, preHandler: [fastify.authenticate] },
    categoryController.listCategories,
  );

  fastify.post(
    "/categories",
    { schema: createCategorySchema, preHandler: [fastify.authenticate] },
    categoryController.createCategory,
  );

  fastify.patch(
    "/categories/:id",
    { schema: updateCategorySchema, preHandler: [fastify.authenticate] },
    categoryController.updateCategory,
  );

  fastify.delete(
    "/categories/:id",
    { schema: deleteCategorySchema, preHandler: [fastify.authenticate] },
    categoryController.deleteCategory,
  );
}
