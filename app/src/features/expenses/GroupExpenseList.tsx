import { Link } from "react-router";
import type { Category, GroupExpense } from "../../api/types";
import { EmptyState } from "../../components/States";
import { formatDate } from "../../lib/dates";
import { formatMoney } from "../../lib/money";

interface GroupExpenseListProps {
  groupId: string;
  expenses: GroupExpense[];
  aliasById: Map<string, string>;
  categoryById: Map<string, Category>;
}

export function GroupExpenseList({
  groupId,
  expenses,
  aliasById,
  categoryById,
}: GroupExpenseListProps) {
  if (expenses.length === 0) {
    return <EmptyState title="Todavía no hay gastos con estos filtros." />;
  }
  return (
    <ul className="card divide-y divide-line">
      {expenses.map((expense) => {
        const category = expense.category_id ? categoryById.get(expense.category_id) : undefined;
        return (
          <li key={expense.id}>
            <Link
              to={`/groups/${groupId}/expenses/${expense.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-ink">{expense.description}</span>
                <span className="text-xs text-muted">
                  {formatDate(expense.expense_date)} · Pagó{" "}
                  {aliasById.get(expense.paid_by_member_id) ?? "?"}
                  {category ? ` · ${category.name}` : ""}
                </span>
              </div>
              <span className="figure text-lg text-ink">{formatMoney(expense.amount)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
