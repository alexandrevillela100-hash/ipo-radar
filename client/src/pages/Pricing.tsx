import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, X, Zap, Building2, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
import { useEffect, useState } from "react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic IPO tracking and limited AI reports.",
    icon: Zap,
    iconColor: "text-primary",
    popular: false,
    planKey: null, // No Stripe checkout for free
    features: [
      { text: "Browse all SEC filings", included: true },
      { text: "5 AI First-Look Reports / month", included: true },
      { text: "Basic email alerts", included: true },
      { text: "Watchlist (up to 10 companies)", included: true },
      { text: "IPO Calendar access", included: true },
      { text: "Company comparison tool", included: false },
      { text: "Filing diff viewer", included: false },
      { text: "Sector analytics", included: false },
      { text: "API access", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description:
      "Full access for active investors and analysts who need comprehensive coverage.",
    icon: Crown,
    iconColor: "text-amber-400",
    popular: true,
    planKey: "pro_monthly",
    features: [
      { text: "Browse all SEC filings", included: true },
      { text: "Unlimited AI First-Look Reports", included: true },
      { text: "Real-time filing alerts", included: true },
      { text: "Unlimited watchlist", included: true },
      { text: "IPO Calendar access", included: true },
      { text: "Company comparison tool", included: true },
      { text: "Filing diff viewer", included: true },
      { text: "Sector analytics", included: true },
      { text: "API access (1,000 calls/month)", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "For institutional teams needing bulk data, API access, and dedicated support.",
    icon: Building2,
    iconColor: "text-purple-400",
    popular: false,
    planKey: null, // Contact sales
    features: [
      { text: "Browse all SEC filings", included: true },
      { text: "Unlimited AI First-Look Reports", included: true },
      { text: "Real-time filing alerts", included: true },
      { text: "Unlimited watchlist", included: true },
      { text: "IPO Calendar access", included: true },
      { text: "Company comparison tool", included: true },
      { text: "Filing diff viewer", included: true },
      { text: "Sector analytics", included: true },
      { text: "API access (unlimited)", included: true },
      { text: "Priority support + SLA", included: true },
    ],
  },
];

const faqs = [
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. You can cancel at any time from your Account Settings. Your access continues until the end of your billing period.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, Mastercard, American Express) and can arrange invoicing for Enterprise plans.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Yes. New users get a 14-day free trial of Pro with full access to all features. No credit card required to start.",
  },
  {
    q: "What counts as an AI Report?",
    a: "Each time you generate a new AI First-Look Report for a company, it counts as one report. Re-viewing previously generated reports does not count.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Yes. Annual billing is available at a 20% discount ($39/month billed annually at $468/year).",
  },
];

export default function Pricing() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly"
  );

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      toast("Redirecting to checkout...", {
        description: "You'll be taken to our secure payment page.",
      });
      window.open(data.url, "_blank");
      setLoadingPlan(null);
    },
    onError: (error) => {
      toast.error("Checkout failed", {
        description: error.message || "Please try again.",
      });
      setLoadingPlan(null);
    },
  });

  // Show success/cancel toast from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("checkout") === "cancelled") {
      toast("Checkout cancelled", {
        description: "No charges were made. You can try again anytime.",
      });
    }
  }, [searchString]);

  const handlePlanClick = (plan: (typeof plans)[number]) => {
    if (plan.name === "Free") {
      if (isAuthenticated) {
        navigate("/app/calendar");
      } else {
        navigate("/login");
      }
      return;
    }

    if (plan.name === "Enterprise") {
      navigate("/contact");
      return;
    }

    if (!isAuthenticated) {
      toast("Please sign in first", {
        description: "You need an account to subscribe to Pro.",
      });
      navigate("/login");
      return;
    }

    const planKey =
      billingCycle === "annual" ? "pro_annual" : "pro_monthly";
    setLoadingPlan(planKey);
    createCheckout.mutate({
      planKey,
      origin: window.location.origin,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Start free, upgrade when you need more. No hidden fees, no
              long-term contracts.
            </p>
          </div>

          {/* Billing cycle toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billingCycle === "annual"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual{" "}
              <span className="text-xs opacity-80 ml-1">Save 20%</span>
            </button>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {plans.map((plan) => {
              const displayPrice =
                plan.name === "Pro" && billingCycle === "annual"
                  ? "$39"
                  : plan.price;
              const displayPeriod =
                plan.name === "Pro" && billingCycle === "annual"
                  ? "/month"
                  : plan.period;
              const isLoading =
                loadingPlan ===
                (billingCycle === "annual" ? "pro_annual" : "pro_monthly") &&
                plan.name === "Pro";

              return (
                <div
                  key={plan.name}
                  className={`bg-card rounded-xl p-6 flex flex-col ${
                    plan.popular
                      ? "border-2 border-primary shadow-lg shadow-primary/10 relative"
                      : "border border-border/50"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <plan.icon className={`w-5 h-5 ${plan.iconColor}`} />
                    <h2 className="text-lg font-bold text-foreground">
                      {plan.name}
                    </h2>
                  </div>

                  <div className="mb-2">
                    <span className="text-3xl font-bold text-foreground font-mono">
                      {displayPrice}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {displayPeriod}
                    </span>
                    {plan.name === "Pro" && billingCycle === "annual" && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Billed annually at $468/year
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-6">
                    {plan.description}
                  </p>

                  <Button
                    className={`w-full mb-6 ${
                      plan.popular
                        ? ""
                        : "bg-secondary/50 text-foreground hover:bg-secondary"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    disabled={isLoading || authLoading}
                    onClick={() => handlePlanClick(plan)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redirecting...
                      </>
                    ) : plan.name === "Enterprise" ? (
                      "Contact Sales"
                    ) : plan.name === "Free" ? (
                      "Get Started Free"
                    ) : (
                      "Start 14-Day Trial"
                    )}
                  </Button>

                  <div className="flex-1 space-y-2.5">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-market-green flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            feature.included
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                          }`}
                        >
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="bg-card border border-border/50 rounded-xl p-5"
                >
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    {faq.q}
                  </h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
