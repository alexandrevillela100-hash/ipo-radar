/**
 * Stripe Products & Plans Configuration
 * ──────────────────────────────────────
 * Defines subscription tiers, pricing, and helper utilities.
 */

export type SubscriptionTier = "free" | "pro" | "enterprise";

export interface PlanConfig {
  name: string;
  description: string;
  tier: SubscriptionTier;
  monthlyPrice: number;   // in cents
  annualPrice: number;     // in cents
  trialDays: number;
  stripePriceMonthlyLookup: string;
  stripePriceAnnualLookup: string;
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  pro_monthly: {
    name: "IPO Radar Pro (Monthly)",
    description: "Full access to IPO intelligence, AI reports, and real-time alerts.",
    tier: "pro",
    monthlyPrice: 4900,   // $49.00
    annualPrice: 46800,    // $468.00 (for reference)
    trialDays: 14,
    stripePriceMonthlyLookup: "ipo_radar_pro_monthly",
    stripePriceAnnualLookup: "ipo_radar_pro_annual",
    features: [
      "Unlimited IPO tracking",
      "AI-generated initiation reports",
      "Real-time SEC EDGAR alerts",
      "Advanced screening & filters",
      "Company comparison tools",
      "Filing diff viewer",
      "Priority support",
    ],
  },
  pro_annual: {
    name: "IPO Radar Pro (Annual)",
    description: "Full access to IPO intelligence at a discounted annual rate.",
    tier: "pro",
    monthlyPrice: 4900,
    annualPrice: 46800,    // $468.00 ($39/mo effective)
    trialDays: 14,
    stripePriceMonthlyLookup: "ipo_radar_pro_monthly",
    stripePriceAnnualLookup: "ipo_radar_pro_annual",
    features: [
      "Everything in Pro Monthly",
      "20% annual discount",
      "Unlimited IPO tracking",
      "AI-generated initiation reports",
      "Real-time SEC EDGAR alerts",
      "Advanced screening & filters",
      "Company comparison tools",
      "Filing diff viewer",
      "Priority support",
    ],
  },
};

/**
 * Check if a subscription tier has premium (paid) access.
 */
export function hasPremiumAccess(tier: string | null | undefined): boolean {
  if (!tier) return false;
  return tier === "pro" || tier === "enterprise";
}

/**
 * Check if a subscription status represents an active subscription.
 */
export function isSubscriptionActive(status: string | null | undefined): boolean {
  if (!status) return false;
  return status === "active" || status === "trialing";
}
