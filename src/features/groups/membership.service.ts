import * as groupRepository from "./group.repository.js";
import * as groupMemberRepository from "./group-member.repository.js";
import { GroupNotFoundError, NotGroupMemberError, NotGroupAdminError } from "./exceptions.js";
import type { Queryable, GroupMember } from "../../shared/types.js";

// Punto único de autorización de grupo. Devuelve el miembro porque quien
// autoriza casi siempre lo necesita después (su memberId, su rol): así se
// consulta una sola vez en el camino feliz.
//
// Dentro de una transacción hay que pasarle el `tx`, no el pool: si se
// autoriza fuera de la transacción y se escribe dentro, hay una ventana en la
// que el usuario podría haber dejado de ser miembro.
export async function requireMembership(
  pg: Queryable,
  groupId: string,
  userId: string,
): Promise<GroupMember> {
  const member = await groupMemberRepository.findByGroupAndUser(pg, groupId, userId);
  if (member) return member;

  // Distinguir "no existe" de "no eres miembro" cuesta una consulta más, pero
  // solo en el camino de error, y evita que un 403 confirme la existencia de
  // un grupo cuyo id se ha adivinado.
  const exists = await groupRepository.existsById(pg, groupId);
  throw exists ? new NotGroupMemberError(groupId) : new GroupNotFoundError(groupId);
}

// Para editar/eliminar el grupo y para eliminar miembros. Reutiliza la misma
// consulta: el rol viene en el miembro, no hay que volver a la base de datos.
export async function requireAdmin(
  pg: Queryable,
  groupId: string,
  userId: string,
): Promise<GroupMember> {
  const member = await requireMembership(pg, groupId, userId);
  if (member.role !== "admin") throw new NotGroupAdminError(groupId);
  return member;
}
