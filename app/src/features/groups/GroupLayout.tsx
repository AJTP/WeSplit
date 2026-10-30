import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useParams } from "react-router";
import { getGroup } from "../../api/groups";
import { ErrorState, LoadingState } from "../../components/States";
import { keys } from "../../lib/queryKeys";
import { GroupContext } from "./useGroup";

const tabs = [
  { to: "", label: "Resumen", end: true },
  { to: "expenses", label: "Gastos" },
  { to: "balances", label: "Saldos" },
  { to: "payments", label: "Pagos" },
  { to: "members", label: "Miembros" },
  { to: "settings", label: "Ajustes" },
];

export function GroupLayout() {
  const { groupId = "" } = useParams();
  const query = useQuery({
    queryKey: keys.group(groupId),
    queryFn: () => getGroup(groupId),
  });

  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
        <Link to="/groups" className="text-sm font-semibold text-accent-text hover:underline">
          Volver a grupos
        </Link>
      </div>
    );
  }

  const userGroup = query.data;
  const { group, member, member_count: memberCount } = userGroup;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-6 animate-rise">
        <div>
          <p className="eyebrow">
            {memberCount} {memberCount === 1 ? "miembro" : "miembros"} · Tu alias: {member.alias}
          </p>
          <h1 className="display mt-3 text-5xl text-ink sm:text-7xl">{group.name}</h1>
          {group.description ? (
            <p className="mt-3 max-w-2xl text-ink-soft">{group.description}</p>
          ) : null}
        </div>
        <nav
          aria-label="Secciones del grupo"
          className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto border-b border-line px-5"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `-mb-px shrink-0 border-b-2 px-4 pb-3 pt-2 text-sm font-bold transition duration-300 ${isActive ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <GroupContext.Provider value={{ groupId, userGroup, isAdmin: member.role === "admin" }}>
        <Outlet />
      </GroupContext.Provider>
    </div>
  );
}
