import * as groupService from "./group.service.js";
import { toGroupResponse, toUserGroupResponse } from "./group.schema.js";
import { toPaginatedResponse } from "../../shared/schemas/common.schema.js";
import type {
  createGroupSchema,
  listGroupsSchema,
  getGroupSchema,
  updateGroupSchema,
  deleteGroupSchema,
} from "./group.schema.js";
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";

export async function createGroup(
  request: ZodRequest<typeof createGroupSchema>,
  reply: ZodReply<typeof createGroupSchema>,
): Promise<void> {
  const group = await groupService.createGroup(request.server.pg, request.user.id, {
    name: request.body.name,
    description: request.body.description ?? null,
    alias: request.body.alias,
    aliases: request.body.aliases,
  });
  reply.status(201).send(toGroupResponse(group));
}

export async function listGroups(
  request: ZodRequest<typeof listGroupsSchema>,
  reply: ZodReply<typeof listGroupsSchema>,
): Promise<void> {
  const result = await groupService.listUserGroups(
    request.server.pg,
    request.user.id,
    request.query,
  );
  reply.send(toPaginatedResponse(request.query, result, toUserGroupResponse));
}

export async function getGroup(
  request: ZodRequest<typeof getGroupSchema>,
  reply: ZodReply<typeof getGroupSchema>,
): Promise<void> {
  const result = await groupService.getGroup(
    request.server.pg,
    request.params.groupId,
    request.user.id,
  );
  reply.send(toUserGroupResponse(result));
}

export async function updateGroup(
  request: ZodRequest<typeof updateGroupSchema>,
  reply: ZodReply<typeof updateGroupSchema>,
): Promise<void> {
  const group = await groupService.updateGroup(
    request.server.pg,
    request.params.groupId,
    request.user.id,
    request.body,
  );
  reply.send(toGroupResponse(group));
}

export async function deleteGroup(
  request: ZodRequest<typeof deleteGroupSchema>,
  reply: ZodReply<typeof deleteGroupSchema>,
): Promise<void> {
  await groupService.deleteGroup(request.server.pg, request.params.groupId, request.user.id);
  reply.status(204).send();
}
