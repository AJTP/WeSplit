import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as invitationController from "./invitation.controller.js";
import {
  getGroupInvitationSchema,
  getInvitationViewSchema,
  joinByInvitationSchema,
} from "./invitation.schema.js";

export default async function invitationRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.get(
    "/groups/:groupId/invitation",
    { schema: getGroupInvitationSchema, preHandler: [fastify.authenticate] },
    invitationController.getGroupInvitation,
  );

  // Sin preHandler: pública a propósito. Lo que autoriza es poseer el token.
  fastify.get(
    "/invitations/:token",
    { schema: getInvitationViewSchema },
    invitationController.getInvitationView,
  );

  fastify.post(
    "/invitations/:token/join",
    { schema: joinByInvitationSchema, preHandler: [fastify.authenticate] },
    invitationController.joinByInvitation,
  );
}
