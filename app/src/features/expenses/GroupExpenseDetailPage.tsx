import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { deleteGroupExpense, getGroupExpense } from "../../api/group-expenses";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorState, LoadingState } from "../../components/States";
import { PageHeader } from "../../components/PageHeader";
import { useCategories } from "../categories/useCategories";
import { useGroup } from "../groups/useGroup";
import { useGroupMembers } from "../groups/useGroupMembers";
import { errorMessage } from "../../lib/errors";
import { formatDate } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { invalidateGroup, keys } from "../../lib/queryKeys";

export function GroupExpenseDetailPage() {
  const { groupId } = useGroup();
  const { expenseId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const expense = useQuery({
    queryKey: keys.groupExpense(groupId, expenseId),
    queryFn: () => getGroupExpense(groupId, expenseId),
  });
  const members = useGroupMembers(groupId);
  const categories = useCategories();

  const removeMutation = useMutation({
    mutationFn: () => deleteGroupExpense(groupId, expenseId),
    onSuccess: async () => {
      await invalidateGroup(queryClient, groupId);
      navigate(`/groups/${groupId}/expenses`, { replace: true });
    },
  });

  if (expense.isPending || members.isPending || categories.isPending) return <LoadingState />;
  if (expense.isError)
    return <ErrorState error={expense.error} onRetry={() => expense.refetch()} />;
  if (members.isError) return <ErrorState error={members.error} />;

  const data = expense.data;
  const aliasById = members.data.aliasById;
  const category = data.category_id ? categories.categoryById.get(data.category_id) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={data.description}
        subtitle={`${formatDate(data.expense_date)}${category ? ` · ${category.name}` : ""}`}
        actions={
          <>
            <Link to={`/groups/${groupId}/expenses/${data.id}/edit`}>
              <Button variant="secondary">Editar</Button>
            </Link>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Eliminar
            </Button>
          </>
        }
      />

      <section className="card flex flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Importe total</span>
          <span className="text-2xl font-semibold tabular-nums text-ink">
            {formatMoney(data.amount)}
          </span>
        </div>
        <p className="text-sm text-ink-soft">
          Lo pagó {aliasById.get(data.paid_by_member_id) ?? "alguien"}.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-medium text-ink">Reparto</h2>
        <ul className="divide-y divide-line">
          {data.shares.map((share) => (
            <li key={share.member_id} className="flex justify-between py-2 text-sm">
              <span className="text-ink-soft">{aliasById.get(share.member_id) ?? "?"}</span>
              <span className="tabular-nums text-ink">{formatMoney(share.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      {confirming ? (
        <ConfirmDialog
          title="¿Eliminar este gasto?"
          message="Dejará de verse en la lista y de contar en los saldos."
          confirmLabel="Eliminar gasto"
          pending={removeMutation.isPending}
          error={removeMutation.isError ? errorMessage(removeMutation.error) : undefined}
          onConfirm={() => removeMutation.mutate()}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </div>
  );
}
