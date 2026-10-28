import { describe, it, expect } from "vitest";
import { simplifyDebts } from "../src/features/balances/settlement.js";

describe("simplifyDebts", () => {
  it("returns no transfers for an empty list", () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it("returns no transfers when everyone is at zero", () => {
    expect(
      simplifyDebts([
        { memberId: "a", balance: 0 },
        { memberId: "b", balance: 0 },
      ]),
    ).toEqual([]);
  });

  it("reproduces the canonical FEATURES.md case: Antonio +30, Bea 0, Carlos -30", () => {
    const result = simplifyDebts([
      { memberId: "antonio", balance: 30 },
      { memberId: "bea", balance: 0 },
      { memberId: "carlos", balance: -30 },
    ]);
    expect(result).toEqual([{ fromMemberId: "carlos", toMemberId: "antonio", amount: 30 }]);
  });

  it("handles two debtors and one creditor", () => {
    const result = simplifyDebts([
      { memberId: "a", balance: 50 },
      { memberId: "b", balance: -20 },
      { memberId: "c", balance: -30 },
    ]);
    const total = result.reduce((sum, s) => sum + s.amount, 0);
    expect(total).toBe(50);
    expect(result.every((s) => s.toMemberId === "a")).toBe(true);
  });

  it("handles one debtor and two creditors", () => {
    const result = simplifyDebts([
      { memberId: "a", balance: -50 },
      { memberId: "b", balance: 20 },
      { memberId: "c", balance: 30 },
    ]);
    const total = result.reduce((sum, s) => sum + s.amount, 0);
    expect(total).toBe(50);
    expect(result.every((s) => s.fromMemberId === "a")).toBe(true);
  });

  it("handles odd cents without losing or gaining money", () => {
    const balances = [
      { memberId: "a", balance: 0.02 },
      { memberId: "b", balance: 0.01 },
      { memberId: "c", balance: -0.03 },
    ];
    const result = simplifyDebts(balances);

    const net: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (const s of result) {
      net[s.fromMemberId] = (net[s.fromMemberId] ?? 0) - s.amount;
      net[s.toMemberId] = (net[s.toMemberId] ?? 0) + s.amount;
    }
    for (const b of balances) {
      expect(Math.round(((net[b.memberId] ?? 0) - b.balance) * 100)).toBe(0);
    }
  });

  it("never produces more transfers than debtors+creditors-1", () => {
    const balances = [
      { memberId: "a", balance: 100 },
      { memberId: "b", balance: -40 },
      { memberId: "c", balance: -30 },
      { memberId: "d", balance: -30 },
    ];
    const result = simplifyDebts(balances);
    expect(result.length).toBeLessThanOrEqual(balances.length - 1);
  });

  it("is deterministic: the same input always produces the same output", () => {
    const balances = [
      { memberId: "b", balance: -10 },
      { memberId: "a", balance: -10 },
      { memberId: "c", balance: 20 },
    ];
    expect(simplifyDebts(balances)).toEqual(simplifyDebts(balances));
  });
});
