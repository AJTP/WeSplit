export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface Identity {
  id: string;
  userId: string;
  provider: string;
  providerUserId: string;
  createdAt: Date;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface OAuthProfile {
  provider: string;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
}

// Tipo auxiliar para pasar al repositorio (Pool o Client con método query)
export type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
};

// --- Transversal -------------------------------------------------------

/** Resultado paginado en términos de dominio: la API lo envuelve aparte;
 * el repositorio solo devuelve la página y cuántos hay en total. */
export interface Paginated<T> {
  items: T[];
  total: number;
}

// --- Categorías ----------------------------------------------------------

export interface Category {
  id: string;
  userId: string | null; // null = predefinida, visible para todos
  name: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- Grupos y miembros ---------------------------------------------------

export type GroupRole = "admin" | "member";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  invitationToken: string;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  alias: string;
  role: GroupRole;
  userId: string | null; // null = alias sin reclamar
  createdAt: Date;
  updatedAt: Date;
}

/** Lectura compuesta de GET /groups: el grupo + cuál es mi alias en él. */
export interface UserGroup {
  group: Group;
  member: GroupMember;
  memberCount: number;
}

/** Lectura compuesta de GET /invitations/:token. Sin importes ni emails:
 * lo autoriza tener el token, no ser miembro. */
export interface InvitationView {
  groupId: string;
  groupName: string;
  groupDescription: string | null;
  aliases: { memberId: string; alias: string; claimed: boolean }[];
}

// --- Gastos ----------------------------------------------------------------

export interface PersonalExpense {
  id: string;
  userId: string;
  categoryId: string | null;
  description: string;
  amount: number; // numeric de Postgres -> Number(row.amount)
  expenseDate: string; // 'YYYY-MM-DD'; ver nota en el repositorio sobre `date`
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface GroupExpenseShare {
  memberId: string;
  amount: number;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  paidByMemberId: string;
  categoryId: string | null;
  createdByUserId: string | null;
  description: string;
  amount: number;
  expenseDate: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** El gasto con su reparto: lo que devuelven POST, GET detalle y PATCH. */
export interface GroupExpenseDetail extends GroupExpense {
  shares: GroupExpenseShare[];
}

// --- Pagos -------------------------------------------------------------

export interface Payment {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  paidOn: string;
  note: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// --- Saldos (lectura compuesta, no hay tabla detrás) --------------------

export interface MemberBalance {
  memberId: string;
  alias: string;
  userId: string | null;
  balance: number; // positivo: el grupo le debe
}

export interface Settlement {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export interface GroupBalances {
  balances: MemberBalance[];
  settlements: Settlement[];
}

/** Una línea del dashboard: mi saldo en un grupo concreto. */
export interface UserGroupBalance {
  groupId: string;
  groupName: string;
  memberId: string;
  alias: string;
  balance: number;
}

export interface UserBalanceSummary {
  totalOwedToUser: number; // suma de saldos positivos
  totalUserOwes: number; // suma de los valores absolutos de los negativos
  net: number; // totalOwedToUser - totalUserOwes
  groups: UserGroupBalance[];
}
