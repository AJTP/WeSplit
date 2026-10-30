import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import {
  deletePersonalExpense,
  listPersonalExpenses,
  type PersonalExpenseFilters,
} from "../../api/personal-expenses";
import type { PersonalExpense } from "../../api/types";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
import { Pagination } from "../../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../../components/States";
import { useCategories } from "../categories/useCategories";
import { errorMessage } from "../../lib/errors";
import { formatDate } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { keys } from "../../lib/queryKeys";

const PAGE_SIZE = 20;

function readFilters(params: URLSearchParams): PersonalExpenseFilters {
  return {
    page: Number(params.get("page")) || 1,
    limit: PAGE_SIZE,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    category_id: params.get("category_id") || undefined,
  };
}

export function PersonalExpensesPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const queryClient = useQueryClient();
  const categories = useCategories();
  const [removing, setRemoving] = useState<PersonalExpense | null>(null);

  const expenses = useQuery({
    queryKey: keys.personalExpenses(filters),
    queryFn: () => listPersonalExpenses(filters),
  });

  const removeMutation = useMutation({
    mutationFn: (expenseId: string) => deletePersonalExpense(expenseId),
    onSuccess: async () => {
      setRemoving(null);
      await queryClient.invalidateQueries({ queryKey: ["personal-expenses"] });
    },
  });

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gastos personales"
        subtitle="Solo los ves tú. No afectan a los grupos."
        actions={
          <Link to="/expenses/new">
            <Button>Nuevo gasto</Button>
          </Link>
        }
      />

      <form className="card grid gap-3 p-4 sm:grid-cols-3">
        <Field label="Desde">
          {(props) => (
            <TextInput
              type="date"
              {...props}
              value={params.get("from") ?? ""}
              onChange={(event) => update({ from: event.target.value })}
            />
          )}
        </Field>
        <Field label="Hasta">
          {(props) => (
            <TextInput
              type="date"
              {...props}
              value={params.get("to") ?? ""}
              onChange={(event) => update({ to: event.target.value })}
            />
          )}
        </Field>
        <Field label="Categoría">
          {(props) => (
            <SelectInput
              {...props}
              value={params.get("category_id") ?? ""}
              onChange={(event) => update({ category_id: event.target.value })}
            >
              <option value="">Todas</option>
              {categories.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      </form>

      {expenses.isPending ? <LoadingState /> : null}
      {expenses.isError ? (
        <ErrorState error={expenses.error} onRetry={() => expenses.refetch()} />
      ) : null}
      {expenses.data && expenses.data.data.length === 0 ? (
        <EmptyState title="No hay gastos personales con estos filtros." />
      ) : null}
      {expenses.data && expenses.data.data.length > 0 ? (
        <ul className="card divide-y divide-line">
          {expenses.data.data.map((expense) => {
            const category = expense.category_id
              ? categories.categoryById.get(expense.category_id)
              : undefined;
            return (
              <li
                key={expense.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-ink">{expense.description}</span>
                  <span className="text-xs text-muted">
                    {formatDate(expense.expense_date)}
                    {category ? ` · ${category.name}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="figure text-lg text-ink">{formatMoney(expense.amount)}</span>
                  <Link
                    to={`/expenses/${expense.id}/edit`}
                    className="rounded-md px-2 py-1 text-sm text-accent-text hover:bg-accent/10"
                  >
                    Editar
                  </Link>
                  <Button
                    variant="ghost"
                    className="text-negative"
                    onClick={() => setRemoving(expense)}
                    aria-label={`Eliminar ${expense.description}`}
                  >
                    Eliminar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {expenses.data ? (
        <Pagination
          pagination={expenses.data.pagination}
          onPageChange={(page) => update({ page: String(page) })}
        />
      ) : null}

      {removing ? (
        <ConfirmDialog
          title="¿Eliminar este gasto?"
          message={`Se eliminará "${removing.description}".`}
          confirmLabel="Eliminar"
          pending={removeMutation.isPending}
          error={removeMutation.isError ? errorMessage(removeMutation.error) : undefined}
          onConfirm={() => removeMutation.mutate(removing.id)}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </div>
  );
}
