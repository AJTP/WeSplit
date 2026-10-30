import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { loginPath } from "../lib/navigation";
import { useAuth } from "./useAuth";
import { LoadingState } from "../components/States";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === "loading") return <LoadingState label="Comprobando tu sesión…" />;
  if (state.status === "anonymous") {
    return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  }
  return <>{children}</>;
}
