import { z } from "zod";
import { errorResponseSchema } from "../../shared/schemas/common.schema.js";
import { userResponseSchema } from "../users/user.schema.js";

const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const googleLoginSchema = {
  tags: ["auth"],
  summary: "Login/registro con Google",
  description:
    "Verifica un id_token de Google, crea o vincula el usuario y devuelve un accessToken (JWT) y un refreshToken.",
  body: z.object({ id_token: z.string().min(1) }),
  response: {
    200: tokenPairSchema.extend({ user: userResponseSchema }),
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
};

export const meSchema = {
  tags: ["auth"],
  summary: "Perfil del usuario autenticado",
  security: [{ bearerAuth: [] }],
  response: {
    200: userResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const refreshSchema = {
  tags: ["auth"],
  summary: "Refresca el access token",
  description:
    "Rota el refresh token recibido: lo revoca y emite un nuevo par accessToken/refreshToken. Independiente del proveedor usado para el login original.",
  body: z.object({ refresh_token: z.string().min(1) }),
  response: {
    200: tokenPairSchema,
    401: errorResponseSchema,
  },
};

export const logoutSchema = {
  tags: ["auth"],
  summary: "Cierra sesión en todos los dispositivos, o solo en el actual",
  description:
    "Sin body, revoca todos los refresh tokens vivos del usuario (comportamiento histórico). " +
    "Con `refresh_token` en el body, revoca únicamente ese, para cerrar sesión solo en el " +
    "dispositivo actual. El accessToken en curso sigue siendo válido hasta que expire " +
    "(JWT_EXPIRES_IN), pero ya no podrá renovarse.",
  security: [{ bearerAuth: [] }],
  // nullish (no solo optional): sin Content-Type, Fastify entrega `null` como
  // body, no `undefined`, y hay que aceptar los dos.
  body: z.object({ refresh_token: z.string().min(1).optional() }).nullish(),
  response: {
    204: z.undefined(),
    401: errorResponseSchema,
  },
};
