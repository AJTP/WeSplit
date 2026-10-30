import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createPayment } from "../../api/payments";
import { Button } from "../../components/Button";
import { Field, SelectInput, TextArea, TextInput } from "../../components/Field";
import { errorMessage } from "../../lib/errors";
import { todayIso } from "../../lib/dates";
import { parseAmount, toCents, fromCents } from "../../lib/money";
import { invalidateGroup } from "../../lib/queryKeys";
import type { GroupMember } from "../../api/types";

export interface PaymentDraft {
  fromMemberId?: string;
  toMemberId?: string;
  amount?: number;
}

interface PaymentFormProps {
  groupId: string;
  members: GroupMember[];
  draft?: PaymentDraft;
  onDone: () => void;
  onCancel: () => void;
}

const schema = z
  .object({
    from: z.string().min(1, "Elige quién paga."),
    to: z.string().min(1, "Elige quién recibe."),
    amount: z.string().refine((value) => parseAmount(value) !== null, {
      message: "Indica un importe válido, mayor que 0 y con hasta 2 decimales.",
    }),
    paidOn: z.string().min(1, "Indica la fecha."),
    note: z.string().trim().max(255, "Máximo 255 caracteres."),
  })
  .refine((values) => values.from !== values.to, {
    message: "Quien paga y quien recibe deben ser distintos.",
    path: ["to"],
  });

type FormValues = z.infer<typeof schema>;

export function PaymentForm({ groupId, members, draft, onDone, onCancel }: PaymentFormProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      from: draft?.fromMemberId ?? "",
      to: draft?.toMemberId ?? "",
      amount: draft?.amount !== undefined ? String(fromCents(toCents(draft.amount))) : "",
      paidOn: todayIso(),
      note: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const amount = parseAmount(values.amount);
      if (amount === null) throw new Error("Importe no válido");
      return createPayment(groupId, {
        from_member_id: values.from,
        to_member_id: values.to,
        amount,
        paid_on: values.paidOn,
        note: values.note || null,
      });
    },
    onSuccess: async () => {
      await invalidateGroup(queryClient, groupId);
      onDone();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="flex flex-col gap-4"
    >
      <Field label="Quién paga" error={errors.from?.message}>
        {(props) => (
          <SelectInput {...props} {...register("from")}>
            <option value="">Elige…</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.alias}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <Field label="Quién recibe" error={errors.to?.message}>
        {(props) => (
          <SelectInput {...props} {...register("to")}>
            <option value="">Elige…</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.alias}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <Field label="Importe (€)" error={errors.amount?.message}>
        {(props) => <TextInput inputMode="decimal" {...props} {...register("amount")} />}
      </Field>
      <Field label="Fecha" error={errors.paidOn?.message}>
        {(props) => <TextInput type="date" {...props} {...register("paidOn")} />}
      </Field>
      <Field label="Nota (opcional)" error={errors.note?.message}>
        {(props) => <TextArea rows={2} {...props} {...register("note")} />}
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
          {mutation.isPending ? "Registrando…" : "Registrar pago"}
        </Button>
      </div>
    </form>
  );
}
