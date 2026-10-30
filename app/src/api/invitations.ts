import { api, post } from "./client";
import type { GroupMember, InvitationView } from "./types";

// Público: lo autoriza tener el token, no hace falta sesión.
export const getInvitation = (token: string) =>
  api<InvitationView>("GET", `/invitations/${encodeURIComponent(token)}`, { auth: false });

export const joinGroup = (token: string, memberId: string) =>
  post<GroupMember>(`/invitations/${encodeURIComponent(token)}/join`, { member_id: memberId });
