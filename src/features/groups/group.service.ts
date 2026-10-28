import { randomBytes } from "node:crypto";
import * as groupRepository from "./group.repository.js";
import * as groupMemberRepository from "./group-member.repository.js";
import * as membershipService from "./membership.service.js";
import * as userService from "../users/user.service.js";
import { GroupNotFoundError, DuplicateAliasError } from "./exceptions.js";
import { withTransaction, type Transactional } from "../../shared/db/transaction.js";
import { mapConstraintErrors } from "../../shared/db/pg-errors.js";
import type { Queryable, Group, UserGroup, Paginated } from "../../shared/types.js";
import type { PaginationQuery } from "../../shared/schemas/common.schema.js";

export interface CreateGroupInput {
  name: string;
  description: string | null;
  alias?: string;
  aliases?: string[];
}

// Al crearlo, quien lo crea queda como único administrador con su alias (el
// indicado o, por defecto, su nombre de usuario) ya reclamado. El resto de
// alias, si los hay, nacen sin reclamar: añadir miembros nunca vincula a
// nadie (ver src/features/groups/group-member.service.ts).
export async function createGroup(
  pg: Transactional,
  userId: string,
  input: CreateGroupInput,
): Promise<Group> {
  const token = randomBytes(32).toString("base64url");
  const ownerAlias = input.alias ?? (await userService.getUserById(pg, userId)).name;

  return withTransaction(pg, async (tx) => {
    const group = await groupRepository.create(tx, {
      name: input.name,
      description: input.description,
      invitationToken: token,
      createdByUserId: userId,
    });

    await mapConstraintErrors(
      async () => {
        await groupMemberRepository.create(tx, group.id, {
          alias: ownerAlias,
          role: "admin",
          userId,
        });

        if (input.aliases && input.aliases.length > 0) {
          await groupMemberRepository.createMany(tx, group.id, input.aliases);
        }
      },
      { group_members_group_alias_unique: () => new DuplicateAliasError(group.id) },
    );

    return group;
  });
}

export async function listUserGroups(
  pg: Queryable,
  userId: string,
  page: PaginationQuery,
): Promise<Paginated<UserGroup>> {
  return groupRepository.findByUserIdPaginated(pg, userId, page);
}

export async function getGroup(pg: Queryable, groupId: string, userId: string): Promise<UserGroup> {
  const member = await membershipService.requireMembership(pg, groupId, userId);
  const group = await groupRepository.findById(pg, groupId);
  if (!group) throw new GroupNotFoundError(groupId); // defensivo: requireMembership ya lo comprobó
  const memberCount = await groupMemberRepository.countByGroupId(pg, groupId);
  return { group, member, memberCount };
}

export interface UpdateGroupInput {
  name?: string;
  description?: string | null;
}

export async function updateGroup(
  pg: Queryable,
  groupId: string,
  userId: string,
  patch: UpdateGroupInput,
): Promise<Group> {
  await membershipService.requireAdmin(pg, groupId, userId);
  const current = await groupRepository.findById(pg, groupId);
  if (!current) throw new GroupNotFoundError(groupId);

  const updated = await groupRepository.update(pg, groupId, {
    name: patch.name ?? current.name,
    description: patch.description !== undefined ? patch.description : current.description,
  });
  if (!updated) throw new GroupNotFoundError(groupId);
  return updated;
}

// Borra el grupo entero. Difiere las FK (ver src/shared/db/transaction.ts):
// la cascada vacía group_members y group_expenses en la misma sentencia y sin
// orden garantizado, lo que haría fallar la comprobación inmediata del
// pagador si no se difiriera.
export async function deleteGroup(
  pg: Transactional,
  groupId: string,
  userId: string,
): Promise<void> {
  await withTransaction(
    pg,
    async (tx) => {
      await membershipService.requireAdmin(tx, groupId, userId);
      const deleted = await groupRepository.deleteById(tx, groupId);
      if (!deleted) throw new GroupNotFoundError(groupId);
    },
    { deferConstraints: true },
  );
}
