import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { getMe, logout as logoutRequest } from "../api/auth";
import { tokens } from "../api/tokens";
import type { LoginResponse } from "../api/types";
import { AuthContext, type AuthState } from "./useAuth";

interface AuthProviderProps {
  queryClient: QueryClient;
  children: ReactNode;
}

export function AuthProvider({ queryClient, children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  // Arranque: si hay sesión guardada, pide el perfil (la API renueva el token si hace falta).
  useEffect(() => {
    let cancelled = false;
    if (!tokens.getRefreshToken()) {
      setState({ status: "anonymous", user: null });
      return;
    }
    getMe()
      .then((user) => {
        if (!cancelled) setState({ status: "authenticated", user });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "anonymous", user: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Si la sesión termina en cualquier punto (renovación fallida), la UI lo sabe.
  useEffect(() => {
    return tokens.subscribe(() => {
      setState({ status: "anonymous", user: null });
      queryClient.clear();
    });
  }, [queryClient]);

  const login = useCallback(
    (session: LoginResponse) => {
      tokens.save(session);
      queryClient.clear();
      setState({ status: "authenticated", user: session.user });
    },
    [queryClient],
  );

  const logout = useCallback(async (allDevices: boolean) => {
    const refreshToken = tokens.getRefreshToken();
    try {
      // Sin refreshToken, la API revoca todas las sesiones (requiere el access token).
      await logoutRequest(allDevices ? undefined : (refreshToken ?? undefined));
    } catch {
      // Aunque falle la llamada, el dispositivo se desconecta igualmente.
    }
    tokens.clear();
  }, []);

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
