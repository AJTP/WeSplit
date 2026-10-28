import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as groupController from "./group.controller.js";
import {
  createGroupSchema,
  listGroupsSchema,
  getGroupSchema,
  updateGroupSchema,
  deleteGroupSchema,
} from "./group.schema.js";

export default async function groupRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.post(
    "/groups",
    { schema: createGroupSchema, preHandler: [fastify.authenticate] },
    groupController.createGroup,
  );

  fastify.get(
    "/groups",
    { schema: listGroupsSchema, preHandler: [fastify.authenticate] },
    groupController.listGroups,
  );

  fastify.get(
    "/groups/:groupId",
    { schema: getGroupSchema, preHandler: [fastify.authenticate] },
    groupController.getGroup,
  );

  fastify.patch(
    "/groups/:groupId",
    { schema: updateGroupSchema, preHandler: [fastify.authenticate] },
    groupController.updateGroup,
  );

  fastify.delete(
    "/groups/:groupId",
    { schema: deleteGroupSchema, preHandler: [fastify.authenticate] },
    groupController.deleteGroup,
  );
}
