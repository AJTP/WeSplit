import { del, get, patch, post } from "./client";
import type { Group, Paginated, UserGroup } from "./types";

export const listGroups = (page: number, limit: number) =>
  get<Paginated<UserGroup>>("/groups", { page, limit });

export const getGroup = (groupId: string) => get<UserGroup>(`/groups/${groupId}`);

export interface CreateGroupBody {
  name: string;
  description?: string | null;
  alias?: string;
  aliases?: string[];
}

export const createGroup = (body: CreateGroupBody) => post<Group>("/groups", body);

export const updateGroup = (
  groupId: string,
  body: { name?: string; description?: string | null },
) => patch<Group>(`/groups/${groupId}`, body);

export const deleteGroup = (groupId: string) => del(`/groups/${groupId}`);

export const getInvitationToken = (groupId: string) =>
  get<{ token: string }>(`/groups/${groupId}/invitation`);
