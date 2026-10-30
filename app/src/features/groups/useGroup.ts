import { createContext, useContext } from "react";
import type { UserGroup } from "../../api/types";

export interface GroupContextValue {
  groupId: string;
  userGroup: UserGroup;
  isAdmin: boolean;
}

export const GroupContext = createContext<GroupContextValue | null>(null);

// Dentro de /groups/:groupId. Lo provee GroupLayout.
export function useGroup(): GroupContextValue {
  const value = useContext(GroupContext);
  if (!value) throw new Error("useGroup must be used inside GroupLayout");
  return value;
}
