import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { getGroupBalances } from "../../api/balances";
import { listGroupExpenses } from "../../api/group-expenses";
import { Button } from "../../components/Button";
import { ErrorState, LoadingState } from "../../components/States";
import { useCategories } from "../categories/useCategories";
import { GroupExpenseList } from "../expenses/GroupExpenseList";
import { formatBalance } from "../../lib/money";
import { keys } from "../../lib/queryKeys";
import { useGroup } from "./useGroup";
import { useGroupMembers } from "./useGroupMembers";
import { SettlementList } from "./SettlementList";

export function GroupOverviewPage() {
  const { groupId, userGroup } = useGroup();
  const members = useGroupMembers(groupId);
  const balances = useQuery({
    queryKey: keys.balances(groupId),
    queryFn: () => getGroupBalances(groupId),
  });
  const recent = useQuery({
    queryKey: keys.groupExpenses(groupId, { page: 1, limit: 5 }),
    queryFn: () => listGroupExpenses(groupId, { page: 1, limit: 5 }),
  });
  const categories = useCategories();

  if (members.isPending || balances.isPending) return <LoadingState />;
  if (members.isError) return <ErrorState error={members.error} />;
  if (balances.isError) return <ErrorState error={balances.error} />;

  const { aliasById } = members.data;
  const mine = balances.data.balances.find((item) => item.member_id === userGroup.member.id);
  const myBalance = mine?.balance ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-sm font-medium text-muted">Tu saldo en este grupo</h2>
        <p className="text-3xl font-semibold text-ink">{formatBalance(myBalance)}</p>
        <p className="text-sm text-muted">
          {myBalance > 0
            ? "Te deben dinero."
            : myBalance < 0
              ? "Debes dinero al grupo."
              : "Estás al día."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="expenses/new">
            <Button>Añadir gasto</Button>
          </Link>
          <Link to="balances">
            <Button variant="secondary">Ver saldos</Button>
          </Link>
        </div>
      </section>

      <section className="card flex flex-col gap-2 p-5">
        <h2 className="font-medium text-ink">Pagos sugeridos</h2>
        <SettlementList settlements={balances.data.settlements} aliasById={aliasById} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-ink">Últimos gastos</h2>
          <Link to="expenses" className="text-sm text-accent-text hover:underline">
            Ver todos
          </Link>
        </div>
        {recent.isError ? <ErrorState error={recent.error} /> : null}
        {recent.data ? (
          <GroupExpenseList
            groupId={groupId}
            expenses={recent.data.data}
            aliasById={aliasById}
            categoryById={categories.categoryById}
          />
        ) : null}
      </section>
    </div>
  );
}
