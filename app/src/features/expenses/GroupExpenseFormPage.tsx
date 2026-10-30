import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getGroupExpense } from "../../api/group-expenses";
import { ErrorState, LoadingState } from "../../components/States";
import { PageHeader } from "../../components/PageHeader";
import { useCategories } from "../categories/useCategories";
import { useGroup } from "../groups/useGroup";
import { useGroupMembers } from "../groups/useGroupMembers";
import { keys } from "../../lib/queryKeys";
import { GroupExpenseForm } from "./GroupExpenseForm";

export function GroupExpenseFormPage() {
  const { groupId, userGroup } = useGroup();
  const { expenseId } = useParams();
  const members = useGroupMembers(groupId);
  const categories = useCategories();
  const expense = useQuery({
    queryKey: keys.groupExpense(groupId, expenseId ?? "new"),
    queryFn: () => getGroupExpense(groupId, expenseId ?? ""),
    enabled: Boolean(expenseId),
  });

  if (members.isPending || categories.isPending || expense.isLoading) return <LoadingState />;
  if (members.isError)
    return <ErrorState error={members.error} onRetry={() => members.refetch()} />;
  if (categories.isError)
    return <ErrorState error={categories.error} onRetry={() => categories.refetch()} />;
  if (expense.isError)
    return <ErrorState error={expense.error} onRetry={() => expense.refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={expenseId ? "Editar gasto" : "Nuevo gasto"} subtitle="Gasto del grupo" />
      <GroupExpenseForm
        key={expenseId ?? "new"}
        groupId={groupId}
        members={members.data.members}
        categories={categories.predefined}
        defaultPayerId={userGroup.member.id}
        initial={expense.data}
      />
    </div>
  );
}
