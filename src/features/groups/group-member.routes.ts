import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as groupMemberController from "./group-member.controller.js";
import {
  listGroupMembersSchema,
  addGroupMembersSchema,
  renameGroupMemberSchema,
  removeGroupMemberSchema,
  claimGroupMemberSchema,
} from "./group-member.schema.js";

export default async function groupMemberRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get(
    "/groups/:groupId/members",
    { schema: listGroupMembersSchema, preHandler: [fastify.authenticate] },
    groupMemberController.listMembers,
  );

  fastify.post(
    "/groups/:groupId/members",
    { schema: addGroupMembersSchema, preHandler: [fastify.authenticate] },
    groupMemberController.addMembers,
  );

  fastify.patch(
    "/groups/:groupId/members/:memberId",
    { schema: renameGroupMemberSchema, preHandler: [fastify.authenticate] },
    groupMemberController.renameMember,
  );

  fastify.delete(
    "/groups/:groupId/members/:memberId",
    { schema: removeGroupMemberSchema, preHandler: [fastify.authenticate] },
    groupMemberController.removeMember,
  );

  fastify.post(
    "/groups/:groupId/members/:memberId/claim",
    { schema: claimGroupMemberSchema, preHandler: [fastify.authenticate] },
    groupMemberController.claimMember,
  );
}
