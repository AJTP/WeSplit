import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { getInvitation, joinGroup } from "../../api/invitations";
import { isApiError } from "../../api/errors";
import { Button } from "../../components/Button";
import { ErrorState, LoadingState } from "../../components/States";
import { useAuth } from "../../auth/useAuth";
import { errorMessage } from "../../lib/errors";
import { loginPath } from "../../lib/navigation";
import { keys } from "../../lib/queryKeys";

export function InvitePage() {
  const { token = "" } = useParams();
  const { state } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [memberId, setMemberId] = useState("");

  const view = useQuery({
    queryKey: keys.invitationView(token),
    queryFn: () => getInvitation(token),
    retry: false,
  });

  const join = useMutation({
    mutationFn: () => joinGroup(token, memberId),
    onSuccess: async (member) => {
      await queryClient.invalidateQueries({ queryKey: keys.groups });
      navigate(`/groups/${member.group_id}`, { replace: true });
    },
  });

  if (state.status === "loading" || view.isPending) return <LoadingState />;

  if (view.isError) {
    const notFound = isApiError(view.error) && view.error.status === 404;
    return (
      <Shell>
        {notFound ? (
          <p role="alert" className="text-sm text-negative">
            Este enlace de invitación no existe o ya no es válido.
          </p>
        ) : (
          <ErrorState error={view.error} onRetry={() => view.refetch()} />
        )}
        <Link to="/" className="text-sm text-accent-text hover:underline">
          Ir al inicio
        </Link>
      </Shell>
    );
  }

  const group = view.data;

  if (state.status === "anonymous") {
    return (
      <Shell>
        <Header name={group.group_name} description={group.group_description} />
        <p className="text-sm text-ink-soft">Entra con tu cuenta de Google para unirte al grupo.</p>
        <Link
          to={loginPath(`/invite/${token}`)}
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent"
        >
          Entrar para unirme
        </Link>
      </Shell>
    );
  }

  // Ya autenticado: el primer alias libre se elige explícitamente, nunca por defecto.
  const free = group.aliases.filter((alias) => !alias.claimed);
  const joinError = join.isError ? errorMessage(join.error) : null;
  const alreadyMember = join.isError && isApiError(join.error) && join.error.status === 409;

  return (
    <Shell>
      <Header name={group.group_name} description={group.group_description} />
      {free.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Todos los alias de este grupo ya están reclamados. Pide al administrador que añada más.
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (memberId) join.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-ink-soft">
              ¿Quién eres en el grupo?
            </legend>
            {group.aliases.map((alias) => (
              <label
                key={alias.member_id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ring-1 ring-inset ${alias.claimed ? "text-muted ring-line" : "cursor-pointer ring-line has-[:checked]:bg-accent/10 has-[:checked]:ring-accent"}`}
              >
                <input
                  type="radio"
                  name="alias"
                  value={alias.member_id}
                  disabled={alias.claimed}
                  checked={memberId === alias.member_id}
                  onChange={() => setMemberId(alias.member_id)}
                />
                <span>{alias.alias}</span>
                {alias.claimed ? <span className="ml-auto text-xs">Ya reclamado</span> : null}
              </label>
            ))}
          </fieldset>
          {joinError ? (
            <p role="alert" className="text-sm text-negative">
              {joinError}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!memberId || join.isPending}>
              {join.isPending ? "Uniéndote…" : "Unirme con este alias"}
            </Button>
            {alreadyMember ? (
              <Link to="/groups" className="text-sm text-accent-text hover:underline">
                Ver mis grupos
              </Link>
            ) : null}
          </div>
        </form>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <main className="card flex w-full max-w-md flex-col gap-4 rounded-2xl p-6 shadow-sm">
        {children}
      </main>
    </div>
  );
}

function Header({ name, description }: { name: string; description: string | null }) {
  return (
    <div>
      <p className="text-sm text-muted">Te han invitado a</p>
      <h1 className="text-2xl font-semibold text-ink">{name}</h1>
      {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
    </div>
  );
}
