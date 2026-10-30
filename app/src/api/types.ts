// Espejo de los schemas de src/features/*/*.schema.ts del backend (contrato snake_case).

export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;
export type Uuid = string;

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

export interface User {
  id: Uuid;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: ISODateTime;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends TokenPair {
  user: User;
}

export interface Identity {
  id: Uuid;
  provider: string;
  created_at: ISODateTime;
}

export type Role = "admin" | "member";

export interface Group {
  id: Uuid;
  name: string;
  description: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface UserGroup {
  group: Group;
  member: { id: Uuid; alias: string; role: Role };
  member_count: number;
}

export interface GroupMember {
  id: Uuid;
  group_id: Uuid;
  alias: string;
  role: Role;
  user_id: Uuid | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface InvitationView {
  group_id: Uuid;
  group_name: string;
  group_description: string | null;
  aliases: { member_id: Uuid; alias: string; claimed: boolean }[];
}

export interface MemberBalance {
  member_id: Uuid;
  alias: string;
  user_id: Uuid | null;
  balance: number;
}

export interface Settlement {
  from_member_id: Uuid;
  to_member_id: Uuid;
  amount: number;
}

export interface GroupBalances {
  balances: MemberBalance[];
  settlements: Settlement[];
}

export interface UserBalanceSummary {
  total_owed_to_user: number;
  total_user_owes: number;
  net: number;
  groups: {
    group_id: Uuid;
    group_name: string;
    member_id: Uuid;
    alias: string;
    balance: number;
  }[];
}

export interface Category {
  id: Uuid;
  user_id: Uuid | null;
  name: string;
  color: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface GroupExpense {
  id: Uuid;
  group_id: Uuid;
  paid_by_member_id: Uuid;
  category_id: Uuid | null;
  created_by_user_id: Uuid | null;
  description: string;
  amount: number;
  expense_date: ISODate;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface GroupExpenseShare {
  member_id: Uuid;
  amount: number;
}

export interface GroupExpenseDetail extends GroupExpense {
  shares: GroupExpenseShare[];
}

export interface Payment {
  id: Uuid;
  group_id: Uuid;
  from_member_id: Uuid;
  to_member_id: Uuid;
  amount: number;
  paid_on: ISODate;
  note: string | null;
  created_by_user_id: Uuid | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface PersonalExpense {
  id: Uuid;
  user_id: Uuid;
  category_id: Uuid | null;
  description: string;
  amount: number;
  expense_date: ISODate;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}
