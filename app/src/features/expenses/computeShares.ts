import {
  fromCents,
  parseAmount,
  splitByPercent,
  splitEqual,
  toCents,
  validateShares,
} from "../../lib/money";

export type SplitMode = "equal" | "amounts" | "percent";

export type ShareResult = { shares: Map<string, number> } | { error: string };

const PERCENT_PATTERN = /^\d+(\.\d{1,2})?$/;

// Reparte un gasto entre los participantes según el modo, en céntimos. Devuelve
// el reparto listo para la API o el motivo por el que no cuadra.
export function computeShares(
  mode: SplitMode,
  totalCents: number,
  participantIds: string[],
  values: Record<string, string>,
): ShareResult {
  if (participantIds.length === 0) return { error: "Elige al menos un participante." };

  if (mode === "equal") {
    return checked(totalCents, splitEqual(totalCents, participantIds));
  }

  if (mode === "amounts") {
    const shares = new Map<string, number>();
    for (const id of participantIds) {
      const amount = parseAmount(values[id] ?? "");
      if (amount === null) return { error: "Indica un importe válido para cada participante." };
      shares.set(id, toCents(amount));
    }
    return checked(totalCents, shares);
  }

  const percents = new Map<string, number>();
  for (const id of participantIds) {
    const text = (values[id] ?? "").trim();
    if (!PERCENT_PATTERN.test(text))
      return { error: "Indica un porcentaje válido para cada participante." };
    percents.set(id, Number(text));
  }
  const total = [...percents.values()].reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 100) > 0.001)
    return { error: `Los porcentajes suman ${total} % y deben sumar 100 %.` };
  return checked(totalCents, splitByPercent(totalCents, percents, participantIds));
}

function checked(totalCents: number, shares: Map<string, number>): ShareResult {
  const error = validateShares(totalCents, shares);
  return error ? { error } : { shares };
}

// Para rellenar los campos al editar: importes en euros con dos decimales.
export function sharesToInputs(
  shares: { member_id: string; amount: number }[],
): Record<string, string> {
  return Object.fromEntries(
    shares.map((share) => [share.member_id, fromCents(toCents(share.amount)).toFixed(2)]),
  );
}
