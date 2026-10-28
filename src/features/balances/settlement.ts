import { toCents, fromCents } from "../../shared/money.js";
import type { MemberBalance, Settlement } from "../../shared/types.js";

// Reduce las deudas del grupo al mínimo número de transferencias necesarias
// para saldarlas, calculado en el momento de la consulta y nunca persistido.
// Separa deudores de acreedores, ordena por importe descendente (y por id a
// igualdad, para que el resultado sea determinista) y los empareja con dos
// punteros. Trabaja siempre en céntimos enteros: comparar o sumar euros en
// coma flotante es un bug garantizado.
//
// Función pura: sin pg, sin async, sin tipos de Fastify. Se prueba sin base
// de datos en test/settlement.test.ts.
export function simplifyDebts(
  balances: Pick<MemberBalance, "memberId" | "balance">[],
): Settlement[] {
  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ memberId: b.memberId, cents: -toCents(b.balance) }))
    .sort((a, b) => b.cents - a.cents || a.memberId.localeCompare(b.memberId));

  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ memberId: b.memberId, cents: toCents(b.balance) }))
    .sort((a, b) => b.cents - a.cents || a.memberId.localeCompare(b.memberId));

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amountCents = Math.min(debtor.cents, creditor.cents);

    if (amountCents > 0) {
      settlements.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount: fromCents(amountCents),
      });
    }

    debtor.cents -= amountCents;
    creditor.cents -= amountCents;

    if (debtor.cents === 0) i += 1;
    if (creditor.cents === 0) j += 1;
  }

  return settlements;
}
