import * as invitationService from "./invitation.service.js";
import * as groupMemberService from "./group-member.service.js";
import { toInvitationViewResponse } from "./invitation.schema.js";
import { toGroupMemberResponse } from "./group-member.schema.js";
import type {
  getGroupInvitationSchema,
  getInvitationViewSchema,
  joinByInvitationSchema,
} from "./invitation.schema.js";
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";

export async function getGroupInvitation(
  request: ZodRequest<typeof getGroupInvitationSchema>,
  reply: ZodReply<typeof getGroupInvitationSchema>,
): Promise<void> {
  const invitation = await invitationService.getInvitation(
    request.server.pg,
    request.params.groupId,
    request.user.id,
  );
  reply.send(invitation);
}

export async function getInvitationView(
  request: ZodRequest<typeof getInvitationViewSchema>,
  reply: ZodReply<typeof getInvitationViewSchema>,
): Promise<void> {
  const view = await invitationService.getInvitationView(request.server.pg, request.params.token);
  reply.send(toInvitationViewResponse(view));
}

export async function joinByInvitation(
  request: ZodRequest<typeof joinByInvitationSchema>,
  reply: ZodReply<typeof joinByInvitationSchema>,
): Promise<void> {
  const member = await groupMemberService.joinByInvitation(
    request.server.pg,
    request.params.token,
    request.body.member_id,
    request.user.id,
  );
  reply.send(toGroupMemberResponse(member));
}
