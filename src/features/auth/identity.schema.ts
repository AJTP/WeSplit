import { z } from "zod";
import { errorResponseSchema } from "../../shared/schemas/common.schema.js";
import type { Identity } from "../../shared/types.js";

export const identityResponseSchema = z.object({
  id: z.uuid(),
  provider: z.string(),
  created_at: z.iso.datetime(),
});

export type IdentityResponse = z.infer<typeof identityResponseSchema>;

export function toIdentityResponse(identity: Identity): IdentityResponse {
  return {
    id: identity.id,
    provider: identity.provider,
    created_at: identity.createdAt.toISOString(),
  };
}

export const listIdentitiesSchema = {
  tags: ["auth"],
  summary: "Lista los proveedores de login vinculados a la cuenta",
  security: [{ bearerAuth: [] }],
  response: {
    200: z.array(identityResponseSchema),
    401: errorResponseSchema,
  },
};

export const linkIdentitySchema = {
  tags: ["auth"],
  summary: "Vincula un proveedor de login adicional a la cuenta",
  description:
    "Hoy solo admite Google. Si ese proveedor ya está vinculado a otra cuenta, se rechaza; " +
    "si ya estaba vinculado a esta misma, es idempotente.",
  security: [{ bearerAuth: [] }],
  body: z.object({
    provider: z.literal("google"),
    id_token: z.string().min(1),
  }),
  response: {
    201: identityResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
  },
};

export const unlinkIdentitySchema = {
  tags: ["auth"],
  summary: "Desvincula un proveedor de login de la cuenta",
  description: "No se puede desvincular el último método de acceso de la cuenta.",
  security: [{ bearerAuth: [] }],
  params: z.object({ provider: z.string().min(1) }),
  response: {
    204: z.undefined(),
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
  },
};
