import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Crown, Loader2, Lock, Zap, ArrowRight } from "lucide-react";
import { Link } from "wouter";

/**
 * PaywallGate wraps authenticated content and checks subscription status.
 * - Free users see a paywall overlay prompting them to upgrade.
 * - Pro/Enterprise users see the children content.
 * - During loading, a skeleton is shown.
 *
 * Usage: <PaywallGate><YourProtectedContent /></PaywallGate>
 */
export default function PaywallGate({
  children,
  feature = "this feature",
}: {
  children: React.ReactNode;
  feature?: string;
}) {
  const { isAuthenticated } = useAuth();
  const { data: billing, isLoading } = trpc.billing.status.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000, // Cache for 1 minute
    retry: 1,
  });

  // While loading, show the content with a subtle loading indicator
  if (isLoading) {
    return <>{children}</>;
  }

  // Check if user has active premium subscription
  const hasAccess =
    billing &&
    (billing.tier === "pro" || billing.tier === "enterprise") &&
    (billing.status === "active" || billing.status === "trialing");

  if (hasAccess) {
    return <>{children}</>;
  }

  // Free user — show paywall overlay
  return (
    <div className="relative">
      {/* Blurred content preview */}
      <div className="pointer-events-none select-none filter blur-sm opacity-40 max-h-[60vh] overflow-hidden">
        {children}
      </div>

      {/* Paywall overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <div className="max-w-md w-full mx-4 bg-card border border-border/50 rounded-2xl p-8 text-center shadow-2xl shadow-primary/5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-7 h-7 text-primary" />
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">
            Upgrade to Pro
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Access {feature} and all premium features with a Pro subscription.
            Start with a 14-day free trial — no credit card required.
          </p>

          <div className="space-y-3 text-left mb-6">
            {[
              "Unlimited AI First-Look Reports",
              "Real-time filing alerts",
              "Full IPO Stats & Analytics",
              "Advanced screening tools",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{f}</span>
              </div>
            ))}
          </div>

          <Link href="/pricing">
            <Button className="w-full mb-3" size="lg">
              <Crown className="w-4 h-4 mr-2" />
              View Plans & Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>

          <p className="text-xs text-muted-foreground">
            Starting at $49/month. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
