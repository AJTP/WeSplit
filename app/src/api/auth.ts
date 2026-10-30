import { get, post } from "./client";
import type { LoginResponse, User } from "./types";

export const loginWithGoogle = (idToken: string) =>
  post<LoginResponse>("/auth/google", { id_token: idToken }, false);

export const getMe = () => get<User>("/auth/me");

// Sin refreshToken cierra todas las sesiones; con él, solo la de este dispositivo.
export const logout = (refreshToken?: string) =>
  post<void>("/auth/logout", refreshToken ? { refresh_token: refreshToken } : undefined);
