import { del, get, patch, post } from "./client";
import type { GroupMember, Paginated } from "./types";

export const listMembers = (groupId: string, page: number, limit: number) =>
  get<Paginated<GroupMember>>(`/groups/${groupId}/members`, { page, limit });

export const addMembers = (groupId: string, aliases: string[]) =>
  post<GroupMember[]>(`/groups/${groupId}/members`, { aliases });

export const renameMember = (groupId: string, memberId: string, alias: string) =>
  patch<GroupMember>(`/groups/${groupId}/members/${memberId}`, { alias });

export const removeMember = (groupId: string, memberId: string) =>
  del(`/groups/${groupId}/members/${memberId}`);

// memberId es el alias libre al que cambias; el tuyo actual queda libre.
export const claimMember = (groupId: string, memberId: string) =>
  post<GroupMember>(`/groups/${groupId}/members/${memberId}/claim`);
