import { useQuery } from "@tanstack/react-query";
import { listMembers } from "../../api/members";
import { fetchAllPages } from "../../api/pagination";
import { keys } from "../../lib/queryKeys";

// Todos los alias del grupo (para selectores y para mostrar nombres en las listas).
export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: keys.members(groupId),
    queryFn: () => fetchAllPages((page, limit) => listMembers(groupId, page, limit)),
    select: (members) => ({
      members,
      aliasById: new Map(members.map((member) => [member.id, member.alias])),
    }),
  });
}
