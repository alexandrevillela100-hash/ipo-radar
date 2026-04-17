import { describe, it, expect } from "vitest";
import { PLANS, hasPremiumAccess, isSubscriptionActive } from "./stripe/products";

describe("Stripe Products Configuration", () => {
  it("should define pro_monthly and pro_annual plans", () => {
    expect(PLANS.pro_monthly).toBeDefined();
    expect(PLANS.pro_annual).toBeDefined();
  });

  it("pro_monthly should have correct pricing", () => {
    expect(PLANS.pro_monthly.monthlyPrice).toBe(4900); // $49.00
    expect(PLANS.pro_monthly.tier).toBe("pro");
    expect(PLANS.pro_monthly.trialDays).toBe(14);
    expect(PLANS.pro_monthly.stripePriceMonthlyLookup).toBe("ipo_radar_pro_monthly");
  });

  it("pro_annual should have correct pricing", () => {
    expect(PLANS.pro_annual.annualPrice).toBe(46800); // $468.00
    expect(PLANS.pro_annual.tier).toBe("pro");
    expect(PLANS.pro_annual.trialDays).toBe(14);
    expect(PLANS.pro_annual.stripePriceAnnualLookup).toBe("ipo_radar_pro_annual");
  });

  it("all plans should have features listed", () => {
    Object.values(PLANS).forEach((plan) => {
      expect(plan.features.length).toBeGreaterThan(0);
      expect(plan.name).toBeTruthy();
      expect(plan.description).toBeTruthy();
    });
  });
});

describe("hasPremiumAccess", () => {
  it("should return true for pro tier", () => {
    expect(hasPremiumAccess("pro")).toBe(true);
  });

  it("should return true for enterprise tier", () => {
    expect(hasPremiumAccess("enterprise")).toBe(true);
  });

  it("should return false for free tier", () => {
    expect(hasPremiumAccess("free")).toBe(false);
  });

  it("should return false for null/undefined", () => {
    expect(hasPremiumAccess(null)).toBe(false);
    expect(hasPremiumAccess(undefined)).toBe(false);
  });
});

describe("isSubscriptionActive", () => {
  it("should return true for active status", () => {
    expect(isSubscriptionActive("active")).toBe(true);
  });

  it("should return true for trialing status", () => {
    expect(isSubscriptionActive("trialing")).toBe(true);
  });

  it("should return false for canceled status", () => {
    expect(isSubscriptionActive("canceled")).toBe(false);
  });

  it("should return false for past_due status", () => {
    expect(isSubscriptionActive("past_due")).toBe(false);
  });

  it("should return false for none status", () => {
    expect(isSubscriptionActive("none")).toBe(false);
  });

  it("should return false for null/undefined", () => {
    expect(isSubscriptionActive(null)).toBe(false);
    expect(isSubscriptionActive(undefined)).toBe(false);
  });
});

describe("Billing tRPC procedures exist", () => {
  it("should have billing router with status, createCheckout, and createPortalSession", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("billing.status");
    expect(procedures).toContain("billing.createCheckout");
    expect(procedures).toContain("billing.createPortalSession");
  });
});

describe("Database schema includes Stripe fields", () => {
  it("users table should have Stripe-related columns", async () => {
    const { users } = await import("../drizzle/schema");
    const columns = Object.keys(users);
    expect(columns).toContain("stripeCustomerId");
    expect(columns).toContain("stripeSubscriptionId");
    expect(columns).toContain("subscriptionTier");
    expect(columns).toContain("subscriptionStatus");
  });
});
