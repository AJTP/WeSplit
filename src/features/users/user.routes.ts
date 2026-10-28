import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as userController from "./user.controller.js";
import { getUserSchema, deleteMeSchema } from "./user.schema.js";

export default async function userRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get(
    "/users/:id",
    { schema: getUserSchema, preHandler: [fastify.authenticate] },
    userController.getUser,
  );

  fastify.delete(
    "/users/me",
    { schema: deleteMeSchema, preHandler: [fastify.authenticate] },
    userController.deleteMe,
  );
}
