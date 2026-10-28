import { z } from "zod";
import {
  errorResponseSchema,
  paginationQuerySchema,
  paginatedSchema,
} from "../../shared/schemas/common.schema.js";
import type { Group, UserGroup } from "../../shared/types.js";

// Contrato público de la API (snake_case); el dominio usa camelCase. No
// incluye invitation_token: el enlace se obtiene por su propio endpoint
// (GET /groups/:groupId/invitation), que requiere ser miembro igual que este.
export const groupResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type GroupResponse = z.infer<typeof groupResponseSchema>;

export function toGroupResponse(group: Group): GroupResponse {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    created_at: group.createdAt.toISOString(),
    updated_at: group.updatedAt.toISOString(),
  };
}

// Lo que devuelve "mi grupo": el grupo, cuál es mi alias en él y cuántos
// miembros tiene en total.
export const userGroupResponseSchema = z.object({
  group: groupResponseSchema,
  member: z.object({
    id: z.uuid(),
    alias: z.string(),
    role: z.enum(["admin", "member"]),
  }),
  member_count: z.number().int(),
});

export type UserGroupResponse = z.infer<typeof userGroupResponseSchema>;

export function toUserGroupResponse(userGroup: UserGroup): UserGroupResponse {
  return {
    group: toGroupResponse(userGroup.group),
    member: {
      id: userGroup.member.id,
      alias: userGroup.member.alias,
      role: userGroup.member.role,
    },
    member_count: userGroup.memberCount,
  };
}

const groupIdParamsSchema = z.object({ groupId: z.uuid() });

export const createGroupSchema = {
  tags: ["groups"],
  summary: "Crea un grupo",
  description:
    "El usuario autenticado queda como único administrador, con el alias indicado o su " +
    "propio nombre por defecto. El resto de alias, si se envían, nacen sin reclamar: " +
    "añadir miembros nunca vincula a nadie, solo el enlace de invitación lo hace.",
  security: [{ bearerAuth: [] }],
  body: z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).nullable().optional(),
    alias: z.string().trim().min(1).max(120).optional(),
    aliases: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  }),
  response: {
    201: groupResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const listGroupsSchema = {
  tags: ["groups"],
  summary: "Lista los grupos de los que el usuario es miembro",
  security: [{ bearerAuth: [] }],
  querystring: paginationQuerySchema,
  response: {
    200: paginatedSchema(userGroupResponseSchema),
    401: errorResponseSchema,
  },
};

export const getGroupSchema = {
  tags: ["groups"],
  summary: "Obtiene un grupo y el alias del usuario en él",
  security: [{ bearerAuth: [] }],
  params: groupIdParamsSchema,
  response: {
    200: userGroupResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const updateGroupSchema = {
  tags: ["groups"],
  summary: "Edita el nombre o la descripción de un grupo",
  description: "Solo un administrador del grupo puede editarlo.",
  security: [{ bearerAuth: [] }],
  params: groupIdParamsSchema,
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
  }),
  response: {
    200: groupResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const deleteGroupSchema = {
  tags: ["groups"],
  summary: "Elimina un grupo y todo lo que contiene",
  description: "Solo un administrador del grupo puede eliminarlo. El borrado es definitivo.",
  security: [{ bearerAuth: [] }],
  params: groupIdParamsSchema,
  response: {
    204: z.undefined(),
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
  },
};
