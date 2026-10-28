// Comparar o sumar importes en coma flotante es un bug garantizado
// (0.1 + 0.2 !== 0.3). Todo lo que compare o acumule dinero pasa por aquí.

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function sumCents(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + toCents(amount), 0);
}
