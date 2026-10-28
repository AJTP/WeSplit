import { z } from "zod";
import {
  errorResponseSchema,
  paginationQuerySchema,
  paginatedSchema,
} from "../../shared/schemas/common.schema.js";
import type { GroupMember } from "../../shared/types.js";

export const groupMemberResponseSchema = z.object({
  id: z.uuid(),
  group_id: z.uuid(),
  alias: z.string(),
  role: z.enum(["admin", "member"]),
  user_id: z.uuid().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type GroupMemberResponse = z.infer<typeof groupMemberResponseSchema>;

export function toGroupMemberResponse(member: GroupMember): GroupMemberResponse {
  return {
    id: member.id,
    group_id: member.groupId,
    alias: member.alias,
    role: member.role,
    user_id: member.userId,
    created_at: member.createdAt.toISOString(),
    updated_at: member.updatedAt.toISOString(),
  };
}

const groupIdParamsSchema = z.object({ groupId: z.uuid() });
const memberParamsSchema = z.object({ groupId: z.uuid(), memberId: z.uuid() });

export const listGroupMembersSchema = {
  tags: ["groups"],
  summary: "Lista los miembros de un grupo",
  security: [{ bearerAuth: [] }],
  params: groupIdParamsSchema,
  querystring: paginationQuerySchema,
  response: {
    200: paginatedSchema(groupMemberResponseSchema),
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const addGroupMembersSchema = {
  tags: ["groups"],
  summary: "Añade uno o varios alias al grupo",
  description:
    "Crea alias sin reclamar: no vincula ningún usuario, ni por email ni por id. La única " +
    "forma de que una persona entre en el grupo es el enlace de invitación.",
  security: [{ bearerAuth: [] }],
  params: groupIdParamsSchema,
  body: z.object({
    aliases: z
      .array(z.string().trim().min(1).max(120))
      .min(1)
      .max(50)
      .refine(
        (aliases) => new Set(aliases.map((alias) => alias.toLowerCase())).size === aliases.length,
        {
          message: "aliases must not repeat (case-insensitive)",
        },
      ),
  }),
  response: {
    201: z.array(groupMemberResponseSchema),
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const renameGroupMemberSchema = {
  tags: ["groups"],
  summary: "Renombra el alias de un miembro",
  description:
    "Un alias sin reclamar lo puede renombrar cualquier miembro; uno reclamado, solo su dueño o un administrador.",
  security: [{ bearerAuth: [] }],
  params: memberParamsSchema,
  body: z.object({ alias: z.string().trim().min(1).max(120) }),
  response: {
    200: groupMemberResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const removeGroupMemberSchema = {
  tags: ["groups"],
  summary: "Elimina un miembro del grupo",
  description:
    "Solo un administrador. Falla si el miembro tiene gastos o pagos, o si es el último " +
    "administrador del grupo.",
  security: [{ bearerAuth: [] }],
  params: memberParamsSchema,
  response: {
    204: z.undefined(),
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const claimGroupMemberSchema = {
  tags: ["groups"],
  summary: "Cambia el alias reclamado por el usuario dentro del grupo",
  description:
    "El alias anterior queda libre, con sus gastos intactos; el rol se arrastra al nuevo.",
  security: [{ bearerAuth: [] }],
  params: memberParamsSchema,
  response: {
    200: groupMemberResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
  },
};
