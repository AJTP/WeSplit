import * as groupMemberService from "./group-member.service.js";
import { toGroupMemberResponse } from "./group-member.schema.js";
import { toPaginatedResponse } from "../../shared/schemas/common.schema.js";
import type {
  listGroupMembersSchema,
  addGroupMembersSchema,
  renameGroupMemberSchema,
  removeGroupMemberSchema,
  claimGroupMemberSchema,
} from "./group-member.schema.js";
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";

export async function listMembers(
  request: ZodRequest<typeof listGroupMembersSchema>,
  reply: ZodReply<typeof listGroupMembersSchema>,
): Promise<void> {
  const result = await groupMemberService.listMembers(
    request.server.pg,
    request.params.groupId,
    request.user.id,
    request.query,
  );
  reply.send(toPaginatedResponse(request.query, result, toGroupMemberResponse));
}

export async function addMembers(
  request: ZodRequest<typeof addGroupMembersSchema>,
  reply: ZodReply<typeof addGroupMembersSchema>,
): Promise<void> {
  const members = await groupMemberService.addAliases(
    request.server.pg,
    request.params.groupId,
    request.user.id,
    request.body.aliases,
  );
  reply.status(201).send(members.map(toGroupMemberResponse));
}

export async function renameMember(
  request: ZodRequest<typeof renameGroupMemberSchema>,
  reply: ZodReply<typeof renameGroupMemberSchema>,
): Promise<void> {
  const member = await groupMemberService.renameMember(
    request.server.pg,
    request.params.groupId,
    request.params.memberId,
    request.user.id,
    request.body.alias,
  );
  reply.send(toGroupMemberResponse(member));
}

export async function removeMember(
  request: ZodRequest<typeof removeGroupMemberSchema>,
  reply: ZodReply<typeof removeGroupMemberSchema>,
): Promise<void> {
  await groupMemberService.removeMember(
    request.server.pg,
    request.params.groupId,
    request.params.memberId,
    request.user.id,
  );
  reply.status(204).send();
}

export async function claimMember(
  request: ZodRequest<typeof claimGroupMemberSchema>,
  reply: ZodReply<typeof claimGroupMemberSchema>,
): Promise<void> {
  const member = await groupMemberService.switchAlias(
    request.server.pg,
    request.params.groupId,
    request.params.memberId,
    request.user.id,
  );
  reply.send(toGroupMemberResponse(member));
}
