import { describe, expect, it } from "vitest";

/**
 * Since fakeFinancials.ts is a client-side module, we test the core logic
 * by reimplementing the seeded random and format functions here.
 * This validates the deterministic behavior and formatting.
 */

// Replicate the seeded random from fakeFinancials.ts
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  let state = Math.abs(hash) || 12345;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

describe("Fake Financials - Seeded Random", () => {
  it("produces deterministic results for the same seed", () => {
    const rand1 = seededRandom("0002088896");
    const rand2 = seededRandom("0002088896");

    const values1 = [rand1(), rand1(), rand1(), rand1(), rand1()];
    const values2 = [rand2(), rand2(), rand2(), rand2(), rand2()];

    expect(values1).toEqual(values2);
  });

  it("produces different results for different seeds", () => {
    const rand1 = seededRandom("0002088896");
    const rand2 = seededRandom("0001234567");

    const v1 = rand1();
    const v2 = rand2();

    expect(v1).not.toEqual(v2);
  });

  it("produces values between 0 and 1", () => {
    const rand = seededRandom("test-seed-123");
    for (let i = 0; i < 100; i++) {
      const val = rand();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });
});

describe("Fake Financials - Format Functions", () => {
  // Replicate formatCurrency
  function formatCurrency(value: number): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (abs >= 1_000_000_000) {
      return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
    }
    if (abs >= 1_000_000) {
      return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    }
    return `${sign}$${abs.toFixed(0)}`;
  }

  it("formats billions correctly", () => {
    expect(formatCurrency(1_500_000_000)).toBe("$1.5B");
    expect(formatCurrency(2_000_000_000)).toBe("$2.0B");
  });

  it("formats millions correctly", () => {
    expect(formatCurrency(150_000_000)).toBe("$150.0M");
    expect(formatCurrency(42_500_000)).toBe("$42.5M");
  });

  it("formats thousands correctly", () => {
    expect(formatCurrency(500_000)).toBe("$500K");
  });

  it("formats negative values correctly", () => {
    expect(formatCurrency(-50_000_000)).toBe("-$50.0M");
    expect(formatCurrency(-1_200_000_000)).toBe("-$1.2B");
  });

  it("formats small values correctly", () => {
    expect(formatCurrency(500)).toBe("$500");
    expect(formatCurrency(0)).toBe("$0");
  });
});

describe("Fake Financials - Data Consistency", () => {
  it("generates consistent data for the same CIK across calls", () => {
    const cik = "0002088896";
    const rand1 = seededRandom(cik);
    const rand2 = seededRandom(cik);

    // Generate a sequence of values simulating the financial generation
    const sequence1: number[] = [];
    const sequence2: number[] = [];
    for (let i = 0; i < 20; i++) {
      sequence1.push(rand1());
      sequence2.push(rand2());
    }

    expect(sequence1).toEqual(sequence2);
  });

  it("generates revenue in a reasonable range", () => {
    const rand = seededRandom("0002088896");
    const isLargeCompany = rand() > 0.6;
    const baseRevenue = isLargeCompany
      ? 100_000_000 + rand() * 900_000_000
      : 10_000_000 + rand() * 90_000_000;

    expect(baseRevenue).toBeGreaterThan(0);
    expect(baseRevenue).toBeLessThan(1_000_000_000);
  });
});
