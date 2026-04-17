import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Auth & Authenticated Pages Tests
 * ──────────────────────────────────
 * Tests for email/password login, registration, and the 4 authenticated pages
 * (Calendar, News, Stats, Screens).
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
      cookie: () => {},
    } as unknown as TrpcContext["res"],
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
      loginMethod: "email",
      lastSignedIn: new Date(),
      createdAt: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ─── Email/Password Auth Tests ─────────────────────────────────────────────

describe("emailAuth.register", () => {
  it("registers a new user with email and password", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const email = `newuser-${Date.now()}@example.com`;
    const result = await caller.emailAuth.register({
      email,
      password: "SecurePass123!",
      name: "Test User",
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("user");
    expect(result.user).toHaveProperty("email", email);
    expect(result.user).toHaveProperty("name", "Test User");
  });

  it("rejects registration with invalid email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.emailAuth.register({
        email: "not-an-email",
        password: "SecurePass123!",
        name: "Test",
      })
    ).rejects.toThrow();
  });

  it("rejects registration with short password", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.emailAuth.register({
        email: `short-${Date.now()}@example.com`,
        password: "12345",
        name: "Test",
      })
    ).rejects.toThrow();
  });

  it("returns error for duplicate email registration", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const email = `dup-auth-${Date.now()}@example.com`;

    // First registration
    const first = await caller.emailAuth.register({
      email,
      password: "SecurePass123!",
      name: "First User",
    });
    expect(first.success).toBe(true);

    // Second registration with same email should fail
    const second = await caller.emailAuth.register({
      email,
      password: "AnotherPass456!",
      name: "Second User",
    });
    expect(second.success).toBe(false);
  });
});

describe("emailAuth.login", () => {
  it("logs in with correct credentials", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const email = `login-${Date.now()}@example.com`;
    const password = "SecurePass123!";

    // Register first
    await caller.emailAuth.register({ email, password, name: "Login Test" });

    // Login
    const result = await caller.emailAuth.login({ email, password });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("user");
    expect(result.user).toHaveProperty("email", email);
  });

  it("returns error for wrong password", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const email = `wrongpw-${Date.now()}@example.com`;

    // Register
    await caller.emailAuth.register({
      email,
      password: "CorrectPass123!",
      name: "Wrong PW Test",
    });

    // Login with wrong password
    const result = await caller.emailAuth.login({ email, password: "WrongPassword!" });
    expect(result).toHaveProperty("success", false);
    expect(result).toHaveProperty("error");
  });

  it("returns error for non-existent user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.emailAuth.login({
      email: `nonexistent-${Date.now()}@example.com`,
      password: "SomePass123!",
    });

    expect(result).toHaveProperty("success", false);
    expect(result).toHaveProperty("error");
  });
});

// ─── Edgar Data Endpoints (used by all 4 pages) ───────────────────────────

describe("edgar.companies (Calendar/News/Stats/Screens data)", () => {
  it("returns an array of companies", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const companies = await caller.edgar.companies();
    expect(Array.isArray(companies)).toBe(true);
    expect(companies.length).toBeGreaterThanOrEqual(0);
  });

  it("each company has required fields for Calendar/Screens", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const companies = await caller.edgar.companies();
    if (companies.length > 0) {
      const company = companies[0];
      expect(company).toHaveProperty("cik");
      expect(company).toHaveProperty("name");
      expect(company).toHaveProperty("sic");
    }
  });
});

describe("edgar.filings (Calendar/News/Screens data)", () => {
  it("returns an array of filings", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const filings = await caller.edgar.filings();
    expect(Array.isArray(filings)).toBe(true);
    expect(filings.length).toBeGreaterThanOrEqual(0);
  });

  it("each filing has required fields for News/Calendar", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const filings = await caller.edgar.filings();
    if (filings.length > 0) {
      const filing = filings[0];
      // filings are returned with nested structure from getFilingsWithCompanies
      expect(filing).toHaveProperty("filing");
      expect(filing.filing).toHaveProperty("formType");
      expect(filing.filing).toHaveProperty("filingDate");
      expect(filing.filing).toHaveProperty("companyCik");
    }
  });
});

describe("edgar.stats (Stats page data)", () => {
  it("returns filing statistics", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.edgar.stats();
    expect(stats).toHaveProperty("filings");
    expect(stats).toHaveProperty("companies");
    expect(typeof stats.filings).toBe("number");
    expect(typeof stats.companies).toBe("number");
    expect(stats.filings).toBeGreaterThanOrEqual(0);
    expect(stats.companies).toBeGreaterThanOrEqual(0);
  });
});

// ─── Search Tests (used by Screens page) ───────────────────────────────────

describe("edgar.search (Screens page search)", () => {
  it("searches companies by sector keyword", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.edgar.search({ query: "tech" });
    expect(Array.isArray(results)).toBe(true);
  });

  it("searches companies by ticker", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Get a real ticker from the database
    const companies = await caller.edgar.companies();
    const withTicker = companies.find((c: any) => c.ticker);
    if (withTicker) {
      const results = await caller.edgar.search({
        query: withTicker.ticker!,
      });
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    }
  });
});
