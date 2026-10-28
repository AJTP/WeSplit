import * as paymentRepository from "./payment.repository.js";
import * as groupMemberRepository from "../groups/group-member.repository.js";
import * as membershipService from "../groups/membership.service.js";
import { PaymentNotFoundError, PaymentMemberNotInGroupError } from "./exceptions.js";
import type { Queryable, Payment, Paginated } from "../../shared/types.js";
import type { PaginationQuery } from "../../shared/schemas/common.schema.js";

export interface CreatePaymentInput {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  paidOn: string;
  note: string | null;
}

// La base de datos ya garantiza, con una FK compuesta por cada lado, que
// emisor y receptor son miembros de ESTE grupo; se valida antes también para
// dar un mensaje claro con los ids concretos en vez de un 500 traducido.
async function assertMembersInGroup(
  pg: Queryable,
  groupId: string,
  memberIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(memberIds)];
  const found = await groupMemberRepository.findIdsInGroup(pg, groupId, uniqueIds);
  const missing = uniqueIds.filter((id) => !found.has(id));
  if (missing.length > 0) throw new PaymentMemberNotInGroupError(groupId, missing);
}

// Lo puede registrar cualquier miembro del grupo, no solo las dos partes: si
// quien paga es un alias sin usuario detrás, alguien tiene que poder
// registrarlo por él. El receptor no confirma nada, por el mismo motivo.
export async function createPayment(
  pg: Queryable,
  groupId: string,
  userId: string,
  input: CreatePaymentInput,
): Promise<Payment> {
  await membershipService.requireMembership(pg, groupId, userId);
  await assertMembersInGroup(pg, groupId, [input.fromMemberId, input.toMemberId]);
  return paymentRepository.create(pg, groupId, { ...input, createdByUserId: userId });
}

export async function listPayments(
  pg: Queryable,
  groupId: string,
  userId: string,
  page: PaginationQuery,
): Promise<Paginated<Payment>> {
  await membershipService.requireMembership(pg, groupId, userId);
  return paymentRepository.findPaginated(pg, groupId, page);
}

export async function deletePayment(
  pg: Queryable,
  groupId: string,
  userId: string,
  paymentId: string,
): Promise<void> {
  await membershipService.requireMembership(pg, groupId, userId);
  const deleted = await paymentRepository.softDelete(pg, groupId, paymentId);
  if (!deleted) throw new PaymentNotFoundError(groupId, paymentId);
}
