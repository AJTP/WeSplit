import { z } from "zod";
import { errorResponseSchema } from "../../shared/schemas/common.schema.js";
import { groupMemberResponseSchema } from "./group-member.schema.js";
import type { InvitationView } from "../../shared/types.js";

export const invitationResponseSchema = z.object({ token: z.string() });

const invitationViewAliasSchema = z.object({
  member_id: z.uuid(),
  alias: z.string(),
  claimed: z.boolean(),
});

// Deliberadamente mínimo: lo autoriza tener el token, no ser miembro. Sin
// importes, sin saldos, sin email de nadie.
export const invitationViewResponseSchema = z.object({
  group_id: z.uuid(),
  group_name: z.string(),
  group_description: z.string().nullable(),
  aliases: z.array(invitationViewAliasSchema),
});

export type InvitationViewResponse = z.infer<typeof invitationViewResponseSchema>;

export function toInvitationViewResponse(view: InvitationView): InvitationViewResponse {
  return {
    group_id: view.groupId,
    group_name: view.groupName,
    group_description: view.groupDescription,
    aliases: view.aliases.map((alias) => ({
      member_id: alias.memberId,
      alias: alias.alias,
      claimed: alias.claimed,
    })),
  };
}

export const getGroupInvitationSchema = {
  tags: ["groups"],
  summary: "Obtiene el enlace de invitación del grupo",
  description:
    "El enlace es único por grupo, se genera al crearlo y es permanente: no se regenera ni se revoca.",
  security: [{ bearerAuth: [] }],
  params: z.object({ groupId: z.uuid() }),
  response: {
    200: invitationResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const getInvitationViewSchema = {
  tags: ["invitations"],
  summary: "Consulta un grupo a partir de su enlace de invitación",
  description: "No requiere autenticación: lo que autoriza es poseer el token.",
  params: z.object({ token: z.string().min(1) }),
  response: {
    200: invitationViewResponseSchema,
    404: errorResponseSchema,
  },
};

export const joinByInvitationSchema = {
  tags: ["invitations"],
  summary: "Un usuario autenticado reclama un alias del grupo mediante el enlace",
  description:
    "Unirse y reclamar son la misma operación: no existe un acceso al grupo sin alias elegido.",
  security: [{ bearerAuth: [] }],
  params: z.object({ token: z.string().min(1) }),
  body: z.object({ member_id: z.uuid() }),
  response: {
    200: groupMemberResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
  },
};
