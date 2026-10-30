import { describe, expect, it } from "vitest";
import {
  fromCents,
  parseAmount,
  splitByPercent,
  splitEqual,
  sumCents,
  toCents,
  validateShares,
} from "./money";

describe("parseAmount", () => {
  it("acepta coma y punto con hasta 2 decimales", () => {
    expect(parseAmount("12,5")).toBe(12.5);
    expect(parseAmount("12.50")).toBe(12.5);
    expect(parseAmount(" 7 ")).toBe(7);
  });

  it("rechaza importes no positivos o con más decimales", () => {
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-3")).toBeNull();
    expect(parseAmount("1.234")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });
});

describe("toCents / fromCents", () => {
  it("evita errores de coma flotante", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fromCents(30)).toBe(0.3);
  });
});

describe("splitEqual", () => {
  it("reparte en partes iguales y el sobrante va al primero", () => {
    const shares = splitEqual(1000, ["a", "b", "c"]);
    expect([...shares.values()]).toEqual([334, 333, 333]);
    expect(sumCents(shares.values())).toBe(1000);
  });

  it("devuelve un reparto vacío sin participantes", () => {
    expect(splitEqual(1000, []).size).toBe(0);
  });
});

describe("splitByPercent", () => {
  it("aplica porcentajes y cuadra el redondeo", () => {
    const percents = new Map([
      ["a", 33.33],
      ["b", 33.33],
      ["c", 33.34],
    ]);
    const shares = splitByPercent(10000, percents, ["a", "b", "c"]);
    expect(sumCents(shares.values())).toBe(10000);
  });
});

describe("validateShares", () => {
  it("acepta un reparto que suma el total", () => {
    expect(
      validateShares(
        300,
        new Map([
          ["a", 100],
          ["b", 200],
        ]),
      ),
    ).toBeNull();
  });

  it("rechaza una suma distinta del total", () => {
    expect(
      validateShares(
        300,
        new Map([
          ["a", 100],
          ["b", 100],
        ]),
      ),
    ).toMatch(/suma/);
  });

  it("rechaza partes no positivas", () => {
    expect(
      validateShares(
        300,
        new Map([
          ["a", 300],
          ["b", 0],
        ]),
      ),
    ).toMatch(/mayor que 0/);
  });
});
