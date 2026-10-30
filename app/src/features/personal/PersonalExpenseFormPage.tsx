import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { z } from "zod";
import {
  createPersonalExpense,
  getPersonalExpense,
  updatePersonalExpense,
} from "../../api/personal-expenses";
import type { Category, PersonalExpense } from "../../api/types";
import { Button } from "../../components/Button";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/States";
import { useCategories } from "../categories/useCategories";
import { errorMessage } from "../../lib/errors";
import { todayIso } from "../../lib/dates";
import { fromCents, parseAmount, toCents } from "../../lib/money";
import { keys } from "../../lib/queryKeys";

const schema = z.object({
  description: z.string().trim().min(1, "Describe el gasto.").max(255, "Máximo 255 caracteres."),
  amount: z.string().refine((value) => parseAmount(value) !== null, {
    message: "Indica un importe válido, mayor que 0 y con hasta 2 decimales.",
  }),
  expenseDate: z.string().min(1, "Indica la fecha."),
  category: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function PersonalExpenseFormPage() {
  const { expenseId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const categories = useCategories();
  const expense = useQuery({
    queryKey: keys.personalExpense(expenseId ?? "new"),
    queryFn: () => getPersonalExpense(expenseId ?? ""),
    enabled: Boolean(expenseId),
  });

  if (categories.isPending || expense.isLoading) return <LoadingState />;
  if (categories.isError)
    return <ErrorState error={categories.error} onRetry={() => categories.refetch()} />;
  if (expense.isError)
    return <ErrorState error={expense.error} onRetry={() => expense.refetch()} />;

  const initial = expense.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={expenseId ? "Editar gasto personal" : "Nuevo gasto personal"} />
      <PersonalExpenseForm
        key={expenseId ?? "new"}
        categories={categories.categories}
        initial={initial}
        onSaved={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["personal-expenses"] }),
            queryClient.invalidateQueries({ queryKey: ["personal-expense"] }),
          ]);
          navigate("/expenses", { replace: true });
        }}
        onCancel={() => navigate("/expenses")}
      />
    </div>
  );
}

interface PersonalExpenseFormProps {
  categories: Category[];
  initial?: PersonalExpense;
  onSaved: () => void;
  onCancel: () => void;
}

// Montado con los datos ya cargados (key por gasto): el estado inicial se fija una vez.
function PersonalExpenseForm({ categories, initial, onSaved, onCancel }: PersonalExpenseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: initial?.description ?? "",
      amount: initial ? fromCents(toCents(initial.amount)).toFixed(2) : "",
      expenseDate: initial?.expense_date ?? todayIso(),
      category: initial?.category_id ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const amount = parseAmount(values.amount);
      if (amount === null) throw new Error("Importe no válido");
      const body = {
        description: values.description,
        amount,
        expense_date: values.expenseDate,
        category_id: values.category || null,
      };
      return initial ? updatePersonalExpense(initial.id, body) : createPersonalExpense(body);
    },
    onSuccess: onSaved,
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="flex max-w-xl flex-col gap-4"
    >
      <Field label="Descripción" error={errors.description?.message}>
        {(props) => <TextInput {...props} {...register("description")} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Importe (€)" error={errors.amount?.message}>
          {(props) => <TextInput inputMode="decimal" {...props} {...register("amount")} />}
        </Field>
        <Field label="Fecha" error={errors.expenseDate?.message}>
          {(props) => <TextInput type="date" {...props} {...register("expenseDate")} />}
        </Field>
      </div>
      <Field label="Categoría (opcional)">
        {(props) => (
          <SelectInput {...props} {...register("category")}>
            <option value="">Sin categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      {mutation.isError ? (
        <p role="alert" className="text-sm text-negative">
          {errorMessage(mutation.error)}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
