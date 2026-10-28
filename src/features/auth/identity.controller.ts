import * as identityService from "./identity.service.js";
import { verifyGoogleIdToken } from "../providers/google.js";
import { toIdentityResponse } from "./identity.schema.js";
import type {
  listIdentitiesSchema,
  linkIdentitySchema,
  unlinkIdentitySchema,
} from "./identity.schema.js";
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";

export async function listIdentities(
  request: ZodRequest<typeof listIdentitiesSchema>,
  reply: ZodReply<typeof listIdentitiesSchema>,
): Promise<void> {
  const identities = await identityService.listIdentities(request.server.pg, request.user.id);
  reply.send(identities.map(toIdentityResponse));
}

export async function linkIdentity(
  request: ZodRequest<typeof linkIdentitySchema>,
  reply: ZodReply<typeof linkIdentitySchema>,
): Promise<void> {
  let profile;
  try {
    profile = await verifyGoogleIdToken(request.body.id_token);
  } catch (err) {
    request.log.warn({ err }, "Google id_token verification failed");
    reply.status(401).send({ error: "Unauthorized", message: "Invalid Google token" });
    return;
  }

  const identity = await identityService.linkIdentity(request.server.pg, request.user.id, profile);
  reply.status(201).send(toIdentityResponse(identity));
}

export async function unlinkIdentity(
  request: ZodRequest<typeof unlinkIdentitySchema>,
  reply: ZodReply<typeof unlinkIdentitySchema>,
): Promise<void> {
  await identityService.unlinkIdentity(request.server.pg, request.user.id, request.params.provider);
  reply.status(204).send();
}
