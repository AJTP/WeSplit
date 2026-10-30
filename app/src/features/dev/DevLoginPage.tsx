import { useEffect, useState } from "react";
import { REFRESH_TOKEN_KEY } from "../../api/tokens";

// Solo existe en desarrollo (ver routes.tsx). Recibe el refresh token de
// `pnpm dev-session` en el fragmento de la URL, que no se envía al servidor.
// Después recarga la app: AuthProvider renueva la sesión al arrancar.
export function DevLoginPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const match = /(?:^#|&)rt=([0-9a-f]+)/.exec(window.location.hash);
    if (!match?.[1]) {
      setError("Falta el token. Ejecuta `pnpm dev-session` y abre la URL que muestra.");
      return;
    }
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, match[1]);
    } catch {
      setError("No se pudo guardar la sesión: el almacenamiento del navegador está bloqueado.");
      return;
    }
    window.location.replace("/");
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <p role={error ? "alert" : "status"} className="text-sm text-ink-soft">
        {error ?? "Entrando con la sesión de desarrollo…"}
      </p>
    </div>
  );
}
