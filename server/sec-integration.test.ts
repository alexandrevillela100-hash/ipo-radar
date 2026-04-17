import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * SEC Integration Tests
 * ─────────────────────
 * Tests the tRPC routes for the SEC EDGAR data pipeline.
 * Uses a public (unauthenticated) context since these routes are public.
 */

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("edgar.stats", () => {
  it("returns companies and filings counts", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.edgar.stats();

    expect(stats).toHaveProperty("companies");
    expect(stats).toHaveProperty("filings");
    expect(typeof stats.companies).toBe("number");
    expect(typeof stats.filings).toBe("number");
    expect(stats.companies).toBeGreaterThanOrEqual(0);
    expect(stats.filings).toBeGreaterThanOrEqual(0);
  });
});

describe("edgar.filings", () => {
  it("returns an array of filing+company objects", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const filings = await caller.edgar.filings();

    expect(Array.isArray(filings)).toBe(true);
    // If there are filings, verify the shape
    if (filings.length > 0) {
      const first = filings[0];
      expect(first).toHaveProperty("filing");
      expect(first).toHaveProperty("company");
      expect(first.filing).toHaveProperty("accessionNumber");
      expect(first.filing).toHaveProperty("formType");
      expect(first.filing).toHaveProperty("filingDate");
      expect(first.company).toHaveProperty("cik");
      expect(first.company).toHaveProperty("name");
    }
  });
});

describe("edgar.companies", () => {
  it("returns an array of company objects", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const companies = await caller.edgar.companies();

    expect(Array.isArray(companies)).toBe(true);
    if (companies.length > 0) {
      const first = companies[0];
      expect(first).toHaveProperty("cik");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("sic");
    }
  });
});

describe("edgar.companyFilings", () => {
  it("returns company and filings for a given CIK", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Use a CIK that likely doesn't exist — should return undefined company
    const result = await caller.edgar.companyFilings({ cik: "9999999" });

    expect(result).toHaveProperty("company");
    expect(result).toHaveProperty("filings");
    expect(Array.isArray(result.filings)).toBe(true);
    // Non-existent CIK should return undefined company
    expect(result.company).toBeUndefined();
  });
});
