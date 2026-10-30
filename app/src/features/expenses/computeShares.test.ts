import { describe, expect, it } from "vitest";
import { computeShares, sharesToInputs } from "./computeShares";

const ids = ["a", "b", "c"];

describe("computeShares", () => {
  it("reparte a partes iguales entre los seleccionados", () => {
    const result = computeShares("equal", 1000, ids, {});
    expect("shares" in result && [...result.shares.values()]).toEqual([334, 333, 333]);
  });

  it("usa los importes escritos y valida la suma", () => {
    const ok = computeShares("amounts", 1000, ["a", "b"], { a: "6", b: "4" });
    expect("shares" in ok).toBe(true);

    const bad = computeShares("amounts", 1000, ["a", "b"], { a: "6", b: "3" });
    expect("error" in bad && bad.error).toMatch(/suma/);
  });

  it("exige porcentajes que sumen 100", () => {
    const bad = computeShares("percent", 1000, ["a", "b"], { a: "60", b: "30" });
    expect("error" in bad && bad.error).toMatch(/100/);

    const ok = computeShares("percent", 1000, ["a", "b"], { a: "60", b: "40" });
    expect("shares" in ok && ok.shares.get("a")).toBe(600);
  });

  it("no acepta un gasto sin participantes", () => {
    const result = computeShares("equal", 1000, [], {});
    expect("error" in result).toBe(true);
  });

  it("convierte un reparto existente a campos de importe", () => {
    expect(sharesToInputs([{ member_id: "a", amount: 12.5 }])).toEqual({ a: "12.50" });
  });
});
