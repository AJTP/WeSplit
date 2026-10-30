import { createContext, useContext } from "react";
import type { LoginResponse, User } from "../api/types";

export type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: User };

export interface AuthContextValue {
  state: AuthState;
  login: (session: LoginResponse) => void;
  // true: cierra en todos los dispositivos. false: solo en este.
  logout: (allDevices: boolean) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

// Usuario autenticado. Solo para rutas protegidas.
export function useCurrentUser(): User {
  const { state } = useAuth();
  if (state.status !== "authenticated") throw new Error("No authenticated user");
  return state.user;
}
