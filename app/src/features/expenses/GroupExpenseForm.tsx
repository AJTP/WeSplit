import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { createGroupExpense, updateGroupExpense } from "../../api/group-expenses";
import type { Category, GroupExpenseDetail, GroupMember } from "../../api/types";
import { Button } from "../../components/Button";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { errorMessage } from "../../lib/errors";
import { todayIso } from "../../lib/dates";
import { fromCents, parseAmount, toCents } from "../../lib/money";
import { invalidateGroup } from "../../lib/queryKeys";
import { computeShares, sharesToInputs, type SplitMode } from "./computeShares";
import { SplitFields } from "./SplitFields";

const schema = z.object({
  description: z.string().trim().min(1, "Describe el gasto.").max(255, "Máximo 255 caracteres."),
  amount: z.string().refine((value) => parseAmount(value) !== null, {
    message: "Indica un importe válido, mayor que 0 y con hasta 2 decimales.",
  }),
  expenseDate: z.string().min(1, "Indica la fecha."),
  paidBy: z.string().min(1, "Elige quién pagó."),
  category: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface GroupExpenseFormProps {
  groupId: string;
  members: GroupMember[];
  categories: Category[];
  defaultPayerId: string;
  // Solo al editar. El formulario se monta con él ya cargado.
  initial?: GroupExpenseDetail;
}

// Montado con los datos ya cargados (y con key por gasto), así su estado inicial
// se fija una vez y no hay que sincronizarlo con efectos.
export function GroupExpenseForm({
  groupId,
  members,
  categories,
  defaultPayerId,
  initial,
}: GroupExpenseFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: initial?.description ?? "",
      amount: initial ? fromCents(toCents(initial.amount)).toFixed(2) : "",
      expenseDate: initial?.expense_date ?? todayIso(),
      paidBy: initial?.paid_by_member_id ?? defaultPayerId,
      category: initial?.category_id ?? "",
    },
  });

  const [participants, setParticipants] = useState<string[]>(() =>
    initial
      ? initial.shares.filter((share) => share.amount > 0).map((share) => share.member_id)
      : members.map((member) => member.id),
  );
  const [mode, setMode] = useState<SplitMode>(initial ? "amounts" : "equal");
  const [values, setValues] = useState<Record<string, string>>(() =>
    initial ? sharesToInputs(initial.shares) : {},
  );
  const [splitError, setSplitError] = useState<string | null>(null);

  const amountText = watch("amount");
  const amount = parseAmount(amountText);
  const totalCents = amount === null ? null : toCents(amount);

  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof createGroupExpense>[1]) =>
      initial ? updateGroupExpense(groupId, initial.id, body) : createGroupExpense(groupId, body),
    onSuccess: async (expense) => {
      await invalidateGroup(queryClient, groupId);
      navigate(`/groups/${groupId}/expenses/${expense.id}`);
    },
  });

  const onSubmit = handleSubmit((form) => {
    const total = parseAmount(form.amount);
    if (total === null) {
      setError("amount", { message: "Indica un importe válido." });
      return;
    }
    const result = computeShares(mode, toCents(total), participants, values);
    if ("error" in result) {
      setSplitError(result.error);
      return;
    }
    setSplitError(null);
    mutation.mutate({
      description: form.description,
      amount: total,
      expense_date: form.expenseDate,
      paid_by_member_id: form.paidBy,
      category_id: form.category || null,
      shares: [...result.shares].map(([member_id, cents]) => ({
        member_id,
        amount: fromCents(cents),
      })),
    });
  });

  // Mientras no se corrige, mostramos el reparto de ahora mismo para que se vea qué falla.
  const liveResult =
    totalCents === null ? null : computeShares(mode, totalCents, participants, values);
  const liveError = liveResult && "error" in liveResult ? liveResult.error : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-4">
      <Field label="Descripción" error={errors.description?.message}>
        {(props) => (
          <TextInput
            placeholder="Cena, taxi, supermercado…"
            {...props}
            {...register("description")}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Importe (€)" error={errors.amount?.message}>
          {(props) => <TextInput inputMode="decimal" {...props} {...register("amount")} />}
        </Field>
        <Field label="Fecha" error={errors.expenseDate?.message}>
          {(props) => <TextInput type="date" {...props} {...register("expenseDate")} />}
        </Field>
        <Field label="Lo pagó" error={errors.paidBy?.message}>
          {(props) => (
            <SelectInput {...props} {...register("paidBy")}>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.alias}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
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
      </div>

      <SplitFields
        members={members}
        participants={participants}
        onParticipantsChange={(ids) => {
          setParticipants(ids);
          setSplitError(null);
        }}
        mode={mode}
        onModeChange={(next) => {
          setMode(next);
          setSplitError(null);
        }}
        values={values}
        onValuesChange={(next) => {
          setValues(next);
          setSplitError(null);
        }}
        totalCents={totalCents}
        error={splitError ?? liveError ?? undefined}
      />

      {mutation.isError ? (
        <p role="alert" className="text-sm text-negative">
          {errorMessage(mutation.error)}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : initial ? "Guardar cambios" : "Añadir gasto"}
        </Button>
      </div>
    </form>
  );
}
