import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { listGroupExpenses, type GroupExpenseFilters } from "../../api/group-expenses";
import { Button } from "../../components/Button";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { Pagination } from "../../components/Pagination";
import { ErrorState, LoadingState } from "../../components/States";
import { useCategories } from "../categories/useCategories";
import { useGroup } from "../groups/useGroup";
import { useGroupMembers } from "../groups/useGroupMembers";
import { keys } from "../../lib/queryKeys";
import { GroupExpenseList } from "./GroupExpenseList";

const PAGE_SIZE = 20;

// Los filtros viven en la URL: se pueden compartir y sobreviven a recargar.
function readFilters(params: URLSearchParams): GroupExpenseFilters {
  const page = Number(params.get("page")) || 1;
  return {
    page,
    limit: PAGE_SIZE,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    category_id: params.get("category_id") || undefined,
    paid_by_member_id: params.get("paid_by") || undefined,
  };
}

export function GroupExpensesPage() {
  const { groupId } = useGroup();
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const members = useGroupMembers(groupId);
  const categories = useCategories();

  const expenses = useQuery({
    queryKey: keys.groupExpenses(groupId, filters),
    queryFn: () => listGroupExpenses(groupId, filters),
  });

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Cambiar un filtro vuelve a la primera página.
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  };

  const hasFilters = ["from", "to", "category_id", "paid_by"].some((key) => params.has(key));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="card grid w-full gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
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
                {categories.predefined.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label="Pagado por">
            {(props) => (
              <SelectInput
                {...props}
                value={params.get("paid_by") ?? ""}
                onChange={(event) => update({ paid_by: event.target.value })}
              >
                <option value="">Todos</option>
                {(members.data?.members ?? []).map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.alias}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </form>
      </div>

      <div className="flex items-center justify-between gap-3">
        {hasFilters ? (
          <Button variant="ghost" onClick={() => setParams(new URLSearchParams())}>
            Quitar filtros
          </Button>
        ) : (
          <span />
        )}
        <Link to="new">
          <Button>Nuevo gasto</Button>
        </Link>
      </div>

      {expenses.isPending || members.isPending ? <LoadingState /> : null}
      {expenses.isError ? (
        <ErrorState error={expenses.error} onRetry={() => expenses.refetch()} />
      ) : null}
      {expenses.data && members.data ? (
        <>
          <GroupExpenseList
            groupId={groupId}
            expenses={expenses.data.data}
            aliasById={members.data.aliasById}
            categoryById={categories.categoryById}
          />
          <Pagination
            pagination={expenses.data.pagination}
            onPageChange={(page) => update({ page: String(page) })}
          />
        </>
      ) : null}
    </div>
  );
}
