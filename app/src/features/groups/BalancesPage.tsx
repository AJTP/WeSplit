import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGroupBalances } from "../../api/balances";
import type { Settlement } from "../../api/types";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { ErrorState, LoadingState } from "../../components/States";
import { formatBalance } from "../../lib/money";
import { keys } from "../../lib/queryKeys";
import { PaymentForm, type PaymentDraft } from "./PaymentForm";
import { SettlementList } from "./SettlementList";
import { useGroup } from "./useGroup";
import { useGroupMembers } from "./useGroupMembers";

export function BalancesPage() {
  const { groupId } = useGroup();
  const members = useGroupMembers(groupId);
  const balances = useQuery({
    queryKey: keys.balances(groupId),
    queryFn: () => getGroupBalances(groupId),
  });
  const [draft, setDraft] = useState<PaymentDraft | null>(null);

  if (members.isPending || balances.isPending) return <LoadingState />;
  if (members.isError)
    return <ErrorState error={members.error} onRetry={() => members.refetch()} />;
  if (balances.isError)
    return <ErrorState error={balances.error} onRetry={() => balances.refetch()} />;

  const { members: allMembers, aliasById } = members.data;
  const openPayment = (settlement: Settlement) =>
    setDraft({
      fromMemberId: settlement.from_member_id,
      toMemberId: settlement.to_member_id,
      amount: settlement.amount,
    });

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <h2 className="mb-3 font-medium text-ink">Saldo por persona</h2>
        <p className="mb-3 text-sm text-muted">
          Positivo: el grupo le debe dinero. Negativo: debe al grupo.
        </p>
        <ul className="divide-y divide-line">
          {balances.data.balances.map((item) => (
            <li key={item.member_id} className="flex items-center justify-between py-2">
              <span className="text-ink-soft">{item.alias}</span>
              <span
                className={`figure text-lg ${item.balance > 0 ? "text-positive" : item.balance < 0 ? "text-negative" : "text-muted"}`}
              >
                {formatBalance(item.balance)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-medium text-ink">Pagos sugeridos</h2>
        <p className="mb-3 text-sm text-muted">
          La forma más corta de saldar todo. Cuando alguien pague, regístralo para que los saldos se
          actualicen.
        </p>
        <SettlementList
          settlements={balances.data.settlements}
          aliasById={aliasById}
          renderAction={(settlement) => (
            <Button variant="secondary" onClick={() => openPayment(settlement)}>
              Registrar pago
            </Button>
          )}
        />
        <div className="mt-4">
          <Button variant="ghost" onClick={() => setDraft({})}>
            Registrar otro pago
          </Button>
        </div>
      </section>

      {draft ? (
        <Modal title="Registrar pago" onClose={() => setDraft(null)}>
          <PaymentForm
            groupId={groupId}
            members={allMembers}
            draft={draft}
            onDone={() => setDraft(null)}
            onCancel={() => setDraft(null)}
          />
        </Modal>
      ) : null}
    </div>
  );
}
