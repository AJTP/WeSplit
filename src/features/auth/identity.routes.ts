import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as identityController from "./identity.controller.js";
import {
  listIdentitiesSchema,
  linkIdentitySchema,
  unlinkIdentitySchema,
} from "./identity.schema.js";

export default async function identityRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get(
    "/users/me/identities",
    { schema: listIdentitiesSchema, preHandler: [fastify.authenticate] },
    identityController.listIdentities,
  );

  fastify.post(
    "/users/me/identities",
    { schema: linkIdentitySchema, preHandler: [fastify.authenticate] },
    identityController.linkIdentity,
  );

  fastify.delete(
    "/users/me/identities/:provider",
    { schema: unlinkIdentitySchema, preHandler: [fastify.authenticate] },
    identityController.unlinkIdentity,
  );
}
