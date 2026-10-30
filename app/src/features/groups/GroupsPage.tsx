import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { listGroups } from "../../api/groups";
import { Button } from "../../components/Button";
import { Pagination } from "../../components/Pagination";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../../components/States";
import { keys } from "../../lib/queryKeys";

const PAGE_SIZE = 20;

export function GroupsPage() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [...keys.groups, page],
    queryFn: () => listGroups(page, PAGE_SIZE),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mis grupos"
        actions={
          <Link to="/groups/new">
            <Button>Nuevo grupo</Button>
          </Link>
        }
      />

      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}

      {query.data && query.data.data.length === 0 ? (
        <EmptyState title="Todavía no estás en ningún grupo.">
          <p className="text-sm text-muted">Crea uno o pide a alguien el enlace de invitación.</p>
        </EmptyState>
      ) : null}

      {query.data && query.data.data.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {query.data.data.map(({ group, member, member_count: memberCount }) => (
            <li key={group.id}>
              <Link
                to={`/groups/${group.id}`}
                className="card flex h-full flex-col gap-2 p-4 hover:ring-accent/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-ink">{group.name}</span>
                  {member.role === "admin" ? (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent-text">
                      Administrador
                    </span>
                  ) : null}
                </div>
                {group.description ? (
                  <p className="line-clamp-2 text-sm text-muted">{group.description}</p>
                ) : null}
                <p className="mt-auto text-xs text-muted">
                  {memberCount} {memberCount === 1 ? "miembro" : "miembros"} · Tu alias:{" "}
                  {member.alias}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {query.data ? <Pagination pagination={query.data.pagination} onPageChange={setPage} /> : null}
    </div>
  );
}
