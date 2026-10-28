import * as userRepository from "./user.repository.js";
import { UserNotFoundError } from "./exceptions.js";
import type { Queryable, User } from "../../shared/types.js";

export async function getUserById(pg: Queryable, userId: string): Promise<User> {
  const user = await userRepository.findById(pg, userId);
  if (!user) {
    throw new UserNotFoundError(userId);
  }
  return user;
}

export async function getUserByEmail(pg: Queryable, email: string): Promise<User | null> {
  return userRepository.findByEmail(pg, email);
}

export async function createUser(
  pg: Queryable,
  userData: { name: string; email: string; avatarUrl: string | null },
): Promise<User> {
  return userRepository.create(pg, userData);
}

// Borrado físico: el esquema ya lo resuelve entero por claves foráneas.
// Identidades, refresh tokens, categorías propias y gastos individuales caen
// en cascada. Los alias que tuviera en grupos quedan sin reclamar (user_id a
// NULL) y sus gastos y pagos de grupo sobreviven sin autor (created_by_user_id
// a NULL): no se alteran los gastos ni los saldos de los demás miembros.
export async function deleteAccount(pg: Queryable, userId: string): Promise<void> {
  const deleted = await userRepository.deleteById(pg, userId);
  if (!deleted) throw new UserNotFoundError(userId);
}
