import * as groupRepository from "./group.repository.js";
import * as groupMemberRepository from "./group-member.repository.js";
import * as membershipService from "./membership.service.js";
import {
  MemberNotFoundError,
  DuplicateAliasError,
  AliasAlreadyClaimedError,
  AlreadyGroupMemberError,
  MemberHasActivityError,
  LastAdminError,
  CannotRenameClaimedAliasError,
  InvitationNotFoundError,
} from "./exceptions.js";
import { withTransaction, type Transactional } from "../../shared/db/transaction.js";
import { mapConstraintErrors } from "../../shared/db/pg-errors.js";
import type { Queryable, GroupMember, Paginated } from "../../shared/types.js";
import type { PaginationQuery } from "../../shared/schemas/common.schema.js";

// Constraints que fijan "este miembro es de este grupo" en gastos y pagos: si
// saltan al borrar un miembro, es que tenía actividad que no se detectó en la
// comprobación previa (una carrera). Red de seguridad, no el camino normal.
const MEMBER_ACTIVITY_CONSTRAINTS = [
  "group_expense_shares_member_id_fkey",
  "group_expenses_payer_in_group",
  "payments_from_member_in_group",
  "payments_to_member_in_group",
];

export async function listMembers(
  pg: Queryable,
  groupId: string,
  userId: string,
  page: PaginationQuery,
): Promise<Paginated<GroupMember>> {
  await membershipService.requireMembership(pg, groupId, userId);
  return groupMemberRepository.findByGroupIdPaginated(pg, groupId, page);
}

// Crea alias y nada más: nunca vincula ningún usuario, ni por email ni por
// id. La única forma de que una persona entre en el grupo es el enlace de
// invitación (ver joinByInvitation). Cualquier miembro puede añadir alias.
export async function addAliases(
  pg: Queryable,
  groupId: string,
  userId: string,
  aliases: string[],
): Promise<GroupMember[]> {
  await membershipService.requireMembership(pg, groupId, userId);
  return mapConstraintErrors(() => groupMemberRepository.createMany(pg, groupId, aliases), {
    group_members_group_alias_unique: () => new DuplicateAliasError(groupId),
  });
}

// Renombrar un alias sin reclamar lo puede hacer cualquier miembro; uno ya
// reclamado, solo su dueño o un administrador.
export async function renameMember(
  pg: Queryable,
  groupId: string,
  memberId: string,
  userId: string,
  alias: string,
): Promise<GroupMember> {
  const requester = await membershipService.requireMembership(pg, groupId, userId);
  const member = await groupMemberRepository.findById(pg, groupId, memberId);
  if (!member) throw new MemberNotFoundError(groupId, memberId);

  const isClaimed = member.userId !== null;
  const isOwner = member.userId === userId;
  if (isClaimed && !isOwner && requester.role !== "admin") {
    throw new CannotRenameClaimedAliasError(groupId, memberId);
  }

  return mapConstraintErrors(
    async () => {
      const updated = await groupMemberRepository.updateAlias(pg, groupId, memberId, alias);
      if (!updated) throw new MemberNotFoundError(groupId, memberId);
      return updated;
    },
    { group_members_group_alias_unique: () => new DuplicateAliasError(groupId) },
  );
}

// Solo un administrador puede eliminar miembros. Bloqueado si el miembro
// tiene gastos o pagos (hay que liquidar o reasignar antes) o si es el último
// administrador del grupo.
export async function removeMember(
  pg: Queryable,
  groupId: string,
  memberId: string,
  userId: string,
): Promise<void> {
  await membershipService.requireAdmin(pg, groupId, userId);
  const member = await groupMemberRepository.findById(pg, groupId, memberId);
  if (!member) throw new MemberNotFoundError(groupId, memberId);

  if (member.role === "admin" && member.userId !== null) {
    const adminCount = await groupMemberRepository.countAdmins(pg, groupId);
    if (adminCount <= 1) throw new LastAdminError(groupId);
  }

  const hasActivity = await groupMemberRepository.hasActivity(pg, groupId, memberId);
  if (hasActivity) throw new MemberHasActivityError(groupId, memberId);

  await mapConstraintErrors(
    async () => {
      const deleted = await groupMemberRepository.deleteById(pg, groupId, memberId);
      if (!deleted) throw new MemberNotFoundError(groupId, memberId);
    },
    Object.fromEntries(
      MEMBER_ACTIVITY_CONSTRAINTS.map((name) => [
        name,
        () => new MemberHasActivityError(groupId, memberId),
      ]),
    ),
  );
}

// Un usuario llega con el enlace de invitación y elige cuál de los alias es
// el suyo. Unirse y reclamar son la misma operación: dar acceso sin elegir
// alias no existe en este modelo.
export async function joinByInvitation(
  pg: Queryable,
  token: string,
  memberId: string,
  userId: string,
): Promise<GroupMember> {
  const group = await groupRepository.findByInvitationToken(pg, token);
  if (!group) throw new InvitationNotFoundError(token);

  const existing = await groupMemberRepository.findByGroupAndUser(pg, group.id, userId);
  if (existing) throw new AlreadyGroupMemberError(group.id);

  const member = await groupMemberRepository.findById(pg, group.id, memberId);
  if (!member) throw new MemberNotFoundError(group.id, memberId);

  const claimed = await groupMemberRepository.claim(pg, group.id, memberId, userId);
  if (!claimed) throw new AliasAlreadyClaimedError(memberId);

  return claimed;
}

// Cambia el alias reclamado por el usuario dentro del grupo. El alias
// anterior vuelve a quedar libre, con sus gastos intactos; el rol que tenía
// se arrastra al nuevo, para no dejar el grupo sin administrador por un
// cambio de alias.
export async function switchAlias(
  pg: Transactional,
  groupId: string,
  memberId: string,
  userId: string,
): Promise<GroupMember> {
  return withTransaction(pg, async (tx) => {
    const current = await membershipService.requireMembership(tx, groupId, userId);

    const target = await groupMemberRepository.findById(tx, groupId, memberId);
    if (!target) throw new MemberNotFoundError(groupId, memberId);

    // Soltar antes de reclamar: al revés violaría el índice único
    // (group_id, user_id), que solo admite un alias por usuario a la vez.
    await groupMemberRepository.releaseByUserId(tx, groupId, userId);

    const claimed = await groupMemberRepository.claim(tx, groupId, memberId, userId, current.role);
    if (!claimed) throw new AliasAlreadyClaimedError(memberId);

    return claimed;
  });
}
