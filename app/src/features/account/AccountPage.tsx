import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { GoogleSignIn } from "../../auth/GoogleSignIn";
import { useAuth, useCurrentUser } from "../../auth/useAuth";
import { deleteAccount, linkGoogleIdentity, listIdentities, unlinkIdentity } from "../../api/users";
import type { Identity } from "../../api/types";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/States";
import { formatDate } from "../../lib/dates";
import { errorMessage } from "../../lib/errors";
import { keys } from "../../lib/queryKeys";

const providerNames: Record<string, string> = { google: "Google" };

export function AccountPage() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [linkError, setLinkError] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<Identity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const identities = useQuery({
    queryKey: keys.identities,
    queryFn: listIdentities,
  });

  const linkMutation = useMutation({
    mutationFn: linkGoogleIdentity,
    onSuccess: () => {
      setLinkError(null);
      return queryClient.invalidateQueries({ queryKey: keys.identities });
    },
    onError: (error) => setLinkError(errorMessage(error)),
  });

  const unlinkMutation = useMutation({
    mutationFn: (provider: string) => unlinkIdentity(provider),
    onSuccess: async () => {
      setUnlinking(null);
      await queryClient.invalidateQueries({ queryKey: keys.identities });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      // La cuenta ya no existe: solo queda cerrar la sesión local.
      await logout(false);
      navigate("/login", { replace: true });
    },
  });

  const signOut = async (allDevices: boolean) => {
    await logout(allDevices);
    navigate("/login", { replace: true });
  };

  const hasGoogle = identities.data?.some((identity) => identity.provider === "google") ?? false;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Cuenta" />

      <section className="card flex items-center gap-4 p-5">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="size-14 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-accent/15 text-lg font-semibold text-accent-text"
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-ink">{user.name}</span>
          <span className="truncate text-sm text-muted">{user.email}</span>
          <span className="text-xs text-muted">
            Desde {formatDate(user.created_at.slice(0, 10))}
          </span>
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="font-medium text-ink">Métodos de acceso</h2>
        {identities.isPending ? <LoadingState /> : null}
        {identities.isError ? (
          <ErrorState error={identities.error} onRetry={() => identities.refetch()} />
        ) : null}
        {identities.data ? (
          <ul className="divide-y divide-line">
            {identities.data.map((identity) => (
              <li key={identity.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-ink-soft">
                  {providerNames[identity.provider] ?? identity.provider}
                  <span className="ml-2 text-xs text-muted">
                    desde {formatDate(identity.created_at.slice(0, 10))}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  className="text-negative"
                  onClick={() => setUnlinking(identity)}
                >
                  Desvincular
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {identities.data && !hasGoogle ? (
          <div className="flex flex-col gap-2 pt-2">
            <p className="text-sm text-muted">Vincula tu cuenta de Google:</p>
            <GoogleSignIn
              onIdToken={(idToken) => {
                setLinkError(null);
                linkMutation.mutate(idToken);
              }}
              onError={setLinkError}
            />
          </div>
        ) : null}
        {linkError ? (
          <p role="alert" className="text-sm text-negative">
            {linkError}
          </p>
        ) : null}
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="font-medium text-ink">Sesión</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => signOut(false)}>
            Cerrar sesión en este dispositivo
          </Button>
          <Button variant="secondary" onClick={() => signOut(true)}>
            Cerrar sesión en todos los dispositivos
          </Button>
        </div>
      </section>

      <section className="card flex flex-col gap-3 border border-negative/30 p-5">
        <h2 className="font-medium text-negative">Eliminar cuenta</h2>
        <p className="text-sm text-ink-soft">
          Se borran tus datos personales, tus categorías y tus gastos personales. Tus alias en los
          grupos quedan sin reclamar, y los gastos y pagos compartidos se conservan para los demás
          miembros. No se puede deshacer.
        </p>
        <div>
          <Button variant="danger" onClick={() => setDeleting(true)}>
            Eliminar mi cuenta
          </Button>
        </div>
      </section>

      {unlinking ? (
        <ConfirmDialog
          title="¿Desvincular este método?"
          message="Si es el último método de acceso, la API no lo permitirá."
          confirmLabel="Desvincular"
          pending={unlinkMutation.isPending}
          error={unlinkMutation.isError ? errorMessage(unlinkMutation.error) : undefined}
          onConfirm={() => unlinkMutation.mutate(unlinking.provider)}
          onCancel={() => setUnlinking(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="¿Eliminar tu cuenta?"
          message="Esta acción es definitiva."
          confirmLabel="Eliminar cuenta"
          pending={deleteMutation.isPending}
          error={deleteMutation.isError ? errorMessage(deleteMutation.error) : undefined}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setDeleting(false)}
        />
      ) : null}
    </div>
  );
}
