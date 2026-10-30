import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { loginWithGoogle } from "../../api/auth";
import { GoogleSignIn } from "../../auth/GoogleSignIn";
import { useAuth } from "../../auth/useAuth";
import { googleClientId } from "../../config";
import { errorMessage } from "../../lib/errors";
import { safeReturnTo } from "../../lib/navigation";

const promises = [
  "Un gasto, repartido al céntimo.",
  "Saldos que se simplifican solos.",
  "Pagos sugeridos para cerrar cuentas.",
];

export function LoginPage() {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));
  const [clientError, setClientError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: loginWithGoogle,
    onSuccess: (session) => {
      login(session);
      navigate(returnTo, { replace: true });
    },
  });

  if (state.status === "authenticated") return <Navigate to={returnTo} replace />;

  const error = clientError ?? (mutation.isError ? errorMessage(mutation.error) : null);

  return (
    <div className="relative grid min-h-dvh overflow-hidden lg:grid-cols-[1.2fr_1fr]">
      {/* Orbes de fondo: dan volumen sin imágenes. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="animate-drift absolute -left-24 top-16 size-[28rem] rounded-full bg-glow/25 blur-3xl" />
        <div className="animate-drift absolute bottom-0 right-0 size-[22rem] rounded-full bg-accent/15 blur-3xl [animation-delay:-6s]" />
      </div>

      <section className="relative flex flex-col justify-center gap-10 px-6 py-16 sm:px-12 lg:px-20">
        <p className="eyebrow animate-rise">Gastos compartidos</p>
        <h1 className="display animate-rise text-[clamp(3.5rem,11vw,8.5rem)] text-ink [animation-delay:.08s]">
          Reparte.
          <br />
          <span className="text-sheen">Sin drama.</span>
        </h1>
        <ul className="flex flex-col gap-3">
          {promises.map((text, index) => (
            <li
              key={text}
              className="animate-rise flex items-center gap-3 text-lg font-semibold text-ink-soft"
              style={{ animationDelay: `${0.2 + index * 0.08}s` }}
            >
              <span
                aria-hidden="true"
                className="grid size-6 place-items-center rounded-full bg-accent text-xs font-black text-on-accent"
              >
                ✓
              </span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      <section className="relative flex items-center justify-center px-6 pb-16 lg:py-16 lg:pr-20">
        <main className="card animate-rise flex w-full max-w-sm flex-col items-stretch gap-7 p-8 [animation-delay:.2s]">
          <div>
            <h2 className="display text-3xl text-ink">Entra con Google</h2>
            <p className="mt-2 text-sm text-muted">Sin contraseñas. Un clic y estás dentro.</p>
          </div>

          {googleClientId ? (
            <div className="flex min-h-11 items-center justify-center">
              {mutation.isPending ? (
                <p role="status" className="flex items-center gap-3 text-sm font-medium text-muted">
                  <span
                    aria-hidden="true"
                    className="size-4 animate-spin rounded-full border-2 border-line border-t-accent"
                  />
                  Entrando…
                </p>
              ) : (
                <GoogleSignIn
                  onIdToken={(idToken) => {
                    setClientError(null);
                    mutation.mutate(idToken);
                  }}
                  onError={setClientError}
                />
              )}
            </div>
          ) : (
            <p role="alert" className="rounded-xl bg-negative/10 p-3 text-sm text-negative">
              Falta VITE_GOOGLE_CLIENT_ID en la configuración del frontend.
            </p>
          )}

          {error ? (
            <p role="alert" className="text-center text-sm font-medium text-negative">
              {error}
            </p>
          ) : null}
        </main>
      </section>
    </div>
  );
}
