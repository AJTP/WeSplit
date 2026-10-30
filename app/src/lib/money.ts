// Toda la aritmética se hace en céntimos enteros. Los importes solo se
// convierten a euros al mostrarlos o al enviarlos a la API.

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

// Acepta "12,5" y "12.50". Devuelve null si no es un importe con como mucho 2 decimales.
export function parseAmount(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  return value > 0 ? value : null;
}

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function formatMoney(amount: number): string {
  return euro.format(amount);
}

// Para saldos: "+12,00 €" si te deben, "−12,00 €" si debes.
export function formatBalance(amount: number): string {
  const sign = amount > 0 ? "+" : "";
  return `${sign}${euro.format(amount)}`;
}

// Reparto igual. El sobrante de redondeo (céntimos que no caben) va al primero,
// así la suma es exacta.
export function splitEqual(totalCents: number, participantIds: string[]): Map<string, number> {
  const shares = new Map<string, number>();
  const count = participantIds.length;
  if (count === 0) return shares;

  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  participantIds.forEach((id, index) => {
    shares.set(id, base + (index === 0 ? remainder : 0));
  });
  return shares;
}

// Reparto por porcentaje. Los porcentajes tienen que sumar 100 (lo valida el
// formulario); el redondeo se resuelve igual que en splitEqual.
export function splitByPercent(
  totalCents: number,
  percents: Map<string, number>,
  participantIds: string[],
): Map<string, number> {
  const shares = new Map<string, number>();
  let assigned = 0;
  for (const id of participantIds) {
    const cents = Math.floor((totalCents * (percents.get(id) ?? 0)) / 100);
    shares.set(id, cents);
    assigned += cents;
  }
  const first = participantIds[0];
  if (first !== undefined) shares.set(first, (shares.get(first) ?? 0) + (totalCents - assigned));
  return shares;
}

export function sumCents(values: Iterable<number>): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

// Lo que el backend exige: cada parte positiva y la suma igual al total.
// Devuelve null si está bien, o el motivo en español.
export function validateShares(totalCents: number, shares: Map<string, number>): string | null {
  if (shares.size === 0) return "Elige al menos un participante.";
  for (const cents of shares.values()) {
    if (cents <= 0) return "Cada participante tiene que aportar un importe mayor que 0.";
  }
  const sum = sumCents(shares.values());
  if (sum !== totalCents) {
    return `El reparto suma ${formatMoney(fromCents(sum))} y el gasto es ${formatMoney(fromCents(totalCents))}.`;
  }
  return null;
}
