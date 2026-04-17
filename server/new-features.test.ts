import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * New Features Tests
 * ──────────────────
 * Tests for email signup, global search, watchlist, alerts, and AI report generation.
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

function createAuthenticatedContext(userId: number = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-open-id-${userId}`,
      name: "Test User",
      email: "test@example.com",
      role: "user",
      loginMethod: "manus",
      lastSignedIn: new Date(),
      createdAt: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ─── Email Signup Tests ─────────────────────────────────────────────────────

describe("signup.register", () => {
  it("registers a new email successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Use a unique email to avoid conflicts
    const email = `test-${Date.now()}@example.com`;
    const result = await caller.signup.register({ email, source: "test" });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("isNew");
    expect(typeof result.isNew).toBe("boolean");
  });

  it("returns isNew=false for duplicate email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const email = `dup-${Date.now()}@example.com`;

    // First registration
    const first = await caller.signup.register({ email, source: "test" });
    expect(first.isNew).toBe(true);

    // Second registration with same email
    const second = await caller.signup.register({ email, source: "test" });
    expect(second.success).toBe(true);
    expect(second.isNew).toBe(false);
  });

  it("rejects invalid email format", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.signup.register({ email: "not-an-email" })
    ).rejects.toThrow();
  });
});

// ─── Global Search Tests ────────────────────────────────────────────────────

describe("edgar.search", () => {
  it("returns an array of company results", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.edgar.search({ query: "tech" });

    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      const first = results[0];
      expect(first).toHaveProperty("cik");
      expect(first).toHaveProperty("name");
    }
  });

  it("returns empty array for non-matching query", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.edgar.search({
      query: "zzzznonexistent99999",
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it("rejects empty query", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.edgar.search({ query: "" })).rejects.toThrow();
  });
});

// ─── Watchlist Tests ────────────────────────────────────────────────────────

describe("watchlist", () => {
  it("list requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.watchlist.list()).rejects.toThrow();
  });

  it("list returns an array for authenticated users", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const items = await caller.watchlist.list();
    expect(Array.isArray(items)).toBe(true);
  });

  it("add requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.watchlist.add({ companyCik: "0001234567" })
    ).rejects.toThrow();
  });

  it("remove requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.watchlist.remove({ companyCik: "0001234567" })
    ).rejects.toThrow();
  });

  it("toggleAlerts requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.watchlist.toggleAlerts({ companyCik: "0001234567" })
    ).rejects.toThrow();
  });
});

// ─── Alerts Tests ───────────────────────────────────────────────────────────

describe("alerts", () => {
  it("list requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.alerts.list()).rejects.toThrow();
  });

  it("list returns an array for authenticated users", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const alerts = await caller.alerts.list();
    expect(Array.isArray(alerts)).toBe(true);
  });

  it("unreadCount requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.alerts.unreadCount()).rejects.toThrow();
  });

  it("unreadCount returns a number for authenticated users", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const count = await caller.alerts.unreadCount();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("markRead requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.alerts.markRead({ alertId: 1 })).rejects.toThrow();
  });

  it("markAllRead requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.alerts.markAllRead()).rejects.toThrow();
  });
});

// ─── AI Report Tests ────────────────────────────────────────────────────────

describe("aiReport.generate", () => {
  it("returns error for non-existent company", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.aiReport.generate({ cik: "9999999999" });

    expect(result).toHaveProperty("success", false);
    expect(result).toHaveProperty("error");
  });

  it("accepts valid CIK input", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Just verify the input validation works (doesn't reject valid CIK)
    // The actual LLM call may or may not succeed depending on the environment
    const result = await caller.aiReport.generate({ cik: "0000000001" });

    // Should return either success or error, but not throw
    expect(result).toHaveProperty("success");
  });
});

// ─── Company Lookup Tests ───────────────────────────────────────────────────

describe("edgar.company", () => {
  it("returns undefined for non-existent CIK", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const company = await caller.edgar.company({ cik: "9999999999" });
    expect(company).toBeUndefined();
  });

  it("returns company data for valid CIK", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // First get a list of companies to find a valid CIK
    const companies = await caller.edgar.companies();
    if (companies.length > 0) {
      const company = await caller.edgar.company({ cik: companies[0].cik });
      expect(company).toBeDefined();
      expect(company).toHaveProperty("cik", companies[0].cik);
      expect(company).toHaveProperty("name");
    }
  });
});
