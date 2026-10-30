import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { AuthProvider } from "./auth/AuthProvider";

describe("app routing", () => {
  it("sin sesión redirige la ruta protegida a /login", async () => {
    // El enrutador se crea al importar routes.tsx: fijamos la URL antes de importarlo.
    window.history.replaceState(null, "", "/groups");
    const { router } = await import("./routes");
    const queryClient = new QueryClient();

    render(
      <GoogleOAuthProvider clientId="test-client-id">
        <QueryClientProvider client={queryClient}>
          <AuthProvider queryClient={queryClient}>
            <RouterProvider router={router} />
          </AuthProvider>
        </QueryClientProvider>
      </GoogleOAuthProvider>,
    );

    expect(await screen.findByText(/Entra con Google/)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
    expect(window.location.search).toBe("?returnTo=%2Fgroups");
  });
});
