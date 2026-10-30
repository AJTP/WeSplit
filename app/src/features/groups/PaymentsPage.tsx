import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deletePayment, listPayments } from "../../api/payments";
import type { Payment } from "../../api/types";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Modal } from "../../components/Modal";
import { Pagination } from "../../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../../components/States";
import { errorMessage } from "../../lib/errors";
import { formatDate } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { invalidateGroup, keys } from "../../lib/queryKeys";
import { PaymentForm } from "./PaymentForm";
import { useGroup } from "./useGroup";
import { useGroupMembers } from "./useGroupMembers";

const PAGE_SIZE = 20;

export function PaymentsPage() {
  const { groupId } = useGroup();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Payment | null>(null);
  const members = useGroupMembers(groupId);
  const payments = useQuery({
    queryKey: keys.payments(groupId, page),
    queryFn: () => listPayments(groupId, page, PAGE_SIZE),
  });

  const removeMutation = useMutation({
    mutationFn: (paymentId: string) => deletePayment(groupId, paymentId),
    onSuccess: async () => {
      setRemoving(null);
      await invalidateGroup(queryClient, groupId);
    },
  });

  if (members.isPending || payments.isPending) return <LoadingState />;
  if (members.isError)
    return <ErrorState error={members.error} onRetry={() => members.refetch()} />;
  if (payments.isError)
    return <ErrorState error={payments.error} onRetry={() => payments.refetch()} />;

  const { members: allMembers, aliasById } = members.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>Registrar pago</Button>
      </div>

      {payments.data.data.length === 0 ? (
        <EmptyState title="No hay pagos registrados en este grupo." />
      ) : (
        <ul className="card divide-y divide-line">
          {payments.data.data.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex flex-col">
                <span className="text-sm text-ink">
                  {aliasById.get(payment.from_member_id) ?? "?"} →{" "}
                  {aliasById.get(payment.to_member_id) ?? "?"}
                </span>
                <span className="text-xs text-muted">
                  {formatDate(payment.paid_on)}
                  {payment.note ? ` · ${payment.note}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="figure text-lg text-ink">{formatMoney(payment.amount)}</span>
                <Button
                  variant="ghost"
                  className="text-negative"
                  onClick={() => setRemoving(payment)}
                  aria-label={`Eliminar pago de ${formatMoney(payment.amount)}`}
                >
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination pagination={payments.data.pagination} onPageChange={setPage} />

      {creating ? (
        <Modal title="Registrar pago" onClose={() => setCreating(false)}>
          <PaymentForm
            groupId={groupId}
            members={allMembers}
            onDone={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      ) : null}

      {removing ? (
        <ConfirmDialog
          title="¿Eliminar este pago?"
          message="Dejará de contar en los saldos del grupo."
          confirmLabel="Eliminar pago"
          pending={removeMutation.isPending}
          error={removeMutation.isError ? errorMessage(removeMutation.error) : undefined}
          onConfirm={() => removeMutation.mutate(removing.id)}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </div>
  );
}
