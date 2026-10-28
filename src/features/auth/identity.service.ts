import * as identityRepository from "./identity.repository.js";
import * as userService from "../users/user.service.js";
import {
  UnverifiedEmailError,
  LastIdentityError,
  IdentityAlreadyLinkedError,
  IdentityNotFoundError,
} from "./exceptions.js";
import { withTransaction, type Transactional } from "../../shared/db/transaction.js";
import type { Queryable, User, Identity, OAuthProfile } from "../../shared/types.js";

export async function findOrCreateUserFromIdentity(
  pg: Transactional,
  profile: OAuthProfile,
): Promise<User> {
  const { provider, providerUserId, email, emailVerified, name, avatarUrl } = profile;

  if (!emailVerified) {
    throw new UnverifiedEmailError(provider);
  }

  const identity = await identityRepository.findByProvider(pg, provider, providerUserId);

  if (identity) {
    return userService.getUserById(pg, identity.user_id);
  }

  return withTransaction(pg, async (tx) => {
    let user = await userService.getUserByEmail(tx, email);

    if (!user) {
      user = await userService.createUser(tx, { name, email, avatarUrl });
    }

    await identityRepository.create(tx, user.id, provider, providerUserId);

    return user;
  });
}

export async function listIdentities(pg: Queryable, userId: string): Promise<Identity[]> {
  return identityRepository.findByUserId(pg, userId);
}

// Vincula un proveedor adicional a una cuenta ya autenticada. Si ese
// proveedor ya está vinculado a OTRO usuario, se rechaza: no se puede
// apropiar de una identidad ajena. Si ya estaba vinculado a este mismo
// usuario, es idempotente.
export async function linkIdentity(
  pg: Queryable,
  userId: string,
  profile: OAuthProfile,
): Promise<Identity> {
  if (!profile.emailVerified) {
    throw new UnverifiedEmailError(profile.provider);
  }

  const existing = await identityRepository.findByProvider(
    pg,
    profile.provider,
    profile.providerUserId,
  );
  if (existing && existing.user_id !== userId) {
    throw new IdentityAlreadyLinkedError(profile.provider);
  }
  if (!existing) {
    await identityRepository.create(pg, userId, profile.provider, profile.providerUserId);
  }

  const identities = await identityRepository.findByUserId(pg, userId);
  return identities.find((identity) => identity.provider === profile.provider)!;
}

// No deja la cuenta sin ningún método de acceso: si es la única identidad, se
// rechaza antes de intentar borrar. Se comprueba primero que ESE proveedor
// esté vinculado: con una sola identidad, pedir desvincular una que ni
// siquiera existe debe dar 404, no el 409 de "es la última".
export async function unlinkIdentity(
  pg: Queryable,
  userId: string,
  provider: string,
): Promise<void> {
  const identities = await identityRepository.findByUserId(pg, userId);
  const target = identities.find((identity) => identity.provider === provider);
  if (!target) throw new IdentityNotFoundError(provider);
  if (identities.length <= 1) throw new LastIdentityError();

  const deleted = await identityRepository.deleteByProvider(pg, userId, provider);
  if (!deleted) throw new IdentityNotFoundError(provider);
}
