import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { getMyBalances } from "../../api/balances";
import { Button } from "../../components/Button";
import { EmptyState, ErrorState, LoadingState } from "../../components/States";
import { useCurrentUser } from "../../auth/useAuth";
import { formatBalance, formatMoney } from "../../lib/money";
import { keys } from "../../lib/queryKeys";

export function HomePage() {
  const user = useCurrentUser();
  const summary = useQuery({
    queryKey: keys.myBalances,
    queryFn: getMyBalances,
  });

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-8 animate-rise">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Tu resumen</p>
            <h1 className="display mt-3 text-5xl text-ink sm:text-7xl">
              Hola, <span className="text-sheen">{user.name.split(" ")[0]}</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/groups/new">
              <Button variant="secondary">Nuevo grupo</Button>
            </Link>
            <Link to="/expenses/new">
              <Button>Gasto personal</Button>
            </Link>
          </div>
        </div>

        {summary.isPending ? <LoadingState /> : null}
        {summary.isError ? (
          <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
        ) : null}

        {summary.data ? (
          <div className="grid gap-4 md:grid-cols-5">
            <div className="card relative overflow-hidden p-7 md:col-span-3">
              <p className="eyebrow">Balance neto</p>
              <p
                className={`figure mt-4 text-[clamp(3.5rem,9vw,6.5rem)] leading-none ${summary.data.net >= 0 ? "text-positive" : "text-negative"}`}
              >
                {formatBalance(summary.data.net)}
              </p>
              <p className="mt-4 max-w-md text-sm text-muted">
                Los grupos no se compensan entre sí: cada saldo es independiente.
              </p>
              <span
                aria-hidden="true"
                className="absolute -right-16 -top-16 size-56 rounded-full bg-accent/10 blur-2xl"
              />
            </div>
            <div className="flex flex-col gap-4 md:col-span-2">
              <div className="card flex-1 p-6">
                <p className="eyebrow">Te deben</p>
                <p
                  className={`figure mt-3 text-3xl ${summary.data.total_owed_to_user > 0 ? "text-positive" : "text-muted"}`}
                >
                  {formatMoney(summary.data.total_owed_to_user)}
                </p>
              </div>
              <div className="card flex-1 p-6">
                <p className="eyebrow">Debes</p>
                <p
                  className={`figure mt-3 text-3xl ${summary.data.total_user_owes > 0 ? "text-negative" : "text-muted"}`}
                >
                  {formatMoney(summary.data.total_user_owes)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {summary.data ? (
        <section className="flex flex-col gap-5">
          <div className="flex items-end justify-between">
            <h2 className="display text-3xl text-ink">Tus grupos</h2>
            <span className="eyebrow">{summary.data.groups.length} activos</span>
          </div>
          {summary.data.groups.length === 0 ? (
            <EmptyState title="Todavía no estás en ningún grupo.">
              <p className="text-sm text-muted">Crea uno o entra con un enlace de invitación.</p>
            </EmptyState>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {summary.data.groups.map((group, index) => (
                <li
                  key={group.group_id}
                  className="animate-rise"
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  <Link
                    to={`/groups/${group.group_id}`}
                    className="card card-hover group flex h-full flex-col justify-between gap-8 p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="display text-2xl text-ink">{group.group_name}</span>
                      <span
                        aria-hidden="true"
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted transition duration-500 group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent"
                      >
                        ↗
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <span className="text-sm text-muted">Tu alias: {group.alias}</span>
                      <span
                        className={`figure text-xl ${group.balance > 0 ? "text-positive" : group.balance < 0 ? "text-negative" : "text-muted"}`}
                      >
                        {formatBalance(group.balance)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
