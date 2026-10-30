import type { ReactNode } from "react";
import type { Settlement } from "../../api/types";
import { formatMoney } from "../../lib/money";

interface SettlementListProps {
  settlements: Settlement[];
  aliasById: Map<string, string>;
  renderAction?: (settlement: Settlement) => ReactNode;
}

export function SettlementList({ settlements, aliasById, renderAction }: SettlementListProps) {
  if (settlements.length === 0) {
    return <p className="text-sm text-muted">No hay deudas pendientes en el grupo.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {settlements.map((settlement) => (
        <li
          key={`${settlement.from_member_id}-${settlement.to_member_id}`}
          className="flex flex-wrap items-center justify-between gap-2 py-3"
        >
          <span className="text-sm text-ink-soft">
            <strong>{aliasById.get(settlement.from_member_id) ?? "Alguien"}</strong> debe{" "}
            <strong>{formatMoney(settlement.amount)}</strong> a{" "}
            <strong>{aliasById.get(settlement.to_member_id) ?? "alguien"}</strong>
          </span>
          {renderAction ? renderAction(settlement) : null}
        </li>
      ))}
    </ul>
  );
}
