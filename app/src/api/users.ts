import { del, get, post } from "./client";
import type { Identity } from "./types";

export const listIdentities = () => get<Identity[]>("/users/me/identities");

export const linkGoogleIdentity = (idToken: string) =>
  post<Identity>("/users/me/identities", { provider: "google", id_token: idToken });

export const unlinkIdentity = (provider: string) =>
  del(`/users/me/identities/${encodeURIComponent(provider)}`);

export const deleteAccount = () => del("/users/me");
