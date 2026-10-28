import * as groupRepository from "./group.repository.js";
import * as groupMemberRepository from "./group-member.repository.js";
import * as membershipService from "./membership.service.js";
import { GroupNotFoundError, InvitationNotFoundError } from "./exceptions.js";
import type { Queryable, InvitationView } from "../../shared/types.js";

export async function getInvitation(
  pg: Queryable,
  groupId: string,
  userId: string,
): Promise<{ token: string }> {
  await membershipService.requireMembership(pg, groupId, userId);
  const group = await groupRepository.findById(pg, groupId);
  if (!group) throw new GroupNotFoundError(groupId);
  return { token: group.invitationToken };
}

// Es la excepción a la regla de alias reclamado: debe estar disponible para
// cualquiera que tenga el token, sea o no miembro todavía, porque es justo lo
// que necesita para poder elegir su alias. Por eso no pasa por
// membershipService y devuelve lo mínimo (sin importes, sin emails).
export async function getInvitationView(pg: Queryable, token: string): Promise<InvitationView> {
  const group = await groupRepository.findByInvitationToken(pg, token);
  if (!group) throw new InvitationNotFoundError(token);

  const aliases = await groupMemberRepository.findAliasesByGroupId(pg, group.id);

  return {
    groupId: group.id,
    groupName: group.name,
    groupDescription: group.description,
    aliases,
  };
}
