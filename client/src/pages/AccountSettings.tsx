import DashboardShell from "@/components/DashboardShell";
import {
  Settings,
  User,
  Bell,
  Shield,
  CreditCard,
  Mail,
  Crown,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

export default function AccountSettings() {
  const { user } = useAuth();
  const { data: billing, isLoading: billingLoading } =
    trpc.billing.status.useQuery(undefined, {
      staleTime: 30_000,
      retry: 1,
    });

  const createPortal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      toast("Opening billing portal...", {
        description: "Manage your subscription in the Stripe portal.",
      });
      window.open(data.url, "_blank");
    },
    onError: (error) => {
      toast.error("Could not open billing portal", {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    toast("Feature coming soon", {
      description:
        "Account settings will be saved when user accounts are fully integrated.",
    });
  };

  const isPro =
    billing &&
    (billing.tier === "pro" || billing.tier === "enterprise") &&
    (billing.status === "active" || billing.status === "trialing");

  const isTrialing = billing?.status === "trialing";

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-muted-foreground" />
            Account Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile, notifications, and subscription.
          </p>
        </div>

        {/* Profile section */}
        <div className="bg-card border border-border/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Full Name
              </label>
              <input
                type="text"
                defaultValue={user?.name || ""}
                className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Email
              </label>
              <input
                type="email"
                defaultValue={user?.email || ""}
                className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>

        {/* Notification preferences */}
        <div className="bg-card border border-border/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Notification Preferences
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "New S-1/F-1 Filings",
                desc: "Get notified when new IPO filings are submitted to SEC",
                checked: true,
              },
              {
                label: "Filing Amendments",
                desc: "Get notified when watched companies file amendments",
                checked: true,
              },
              {
                label: "Price Range Updates",
                desc: "Get notified when IPO price ranges are updated",
                checked: true,
              },
              {
                label: "AI Report Ready",
                desc: "Get notified when your AI reports are generated",
                checked: true,
              },
              {
                label: "Weekly Market Digest",
                desc: "Receive a weekly summary of IPO market activity",
                checked: false,
              },
              {
                label: "Sector Activity Alerts",
                desc: "Get notified about unusual sector filing activity",
                checked: false,
              },
            ].map((pref, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {pref.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{pref.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={pref.checked}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-secondary/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Email delivery */}
        <div className="bg-card border border-border/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Email Delivery
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Delivery Frequency
              </label>
              <select className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option>Real-time</option>
                <option>Daily digest</option>
                <option>Weekly digest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-card border border-border/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-market-green" />
            Subscription
          </h2>

          {billingLoading ? (
            <div className="flex items-center gap-2 p-4 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading subscription...</span>
            </div>
          ) : isPro ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <p className="text-sm font-semibold text-foreground">
                      {billing.tier === "enterprise"
                        ? "Enterprise"
                        : "Pro"}{" "}
                      Plan
                      {isTrialing && (
                        <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                          Trial
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {billing.cancelAtPeriodEnd
                      ? `Cancels on ${formatDate(billing.currentPeriodEnd)}`
                      : isTrialing
                        ? `Trial ends ${formatDate(billing.trialEnd)}`
                        : `Renews ${formatDate(billing.currentPeriodEnd)}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={createPortal.isPending}
                  onClick={() =>
                    createPortal.mutate({
                      origin: window.location.origin,
                    })
                  }
                >
                  {createPortal.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3 h-3" />
                  )}
                  Manage Subscription
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Free Plan
                </p>
                <p className="text-xs text-muted-foreground">
                  5 AI reports/month · Basic alerts · Public filings
                </p>
              </div>
              <Link href="/pricing">
                <Button size="sm" className="gap-1">
                  <Crown className="w-3 h-3" />
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Security */}
        <div className="bg-card border border-border/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-muted-foreground" />
            Security
          </h2>
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast("Feature coming soon")}
            >
              Change Password
            </Button>
            <div>
              <p className="text-xs text-muted-foreground">
                Last login:{" "}
                {user?.lastSignedIn
                  ? new Date(user.lastSignedIn).toLocaleString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => toast("Changes discarded")}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </DashboardShell>
  );
}
