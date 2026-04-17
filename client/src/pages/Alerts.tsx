import DashboardShell from "@/components/DashboardShell";
import { Link } from "wouter";
import {
  Bell,
  Check,
  FileText,
  TrendingUp,
  Settings,
  Loader2,
  BellOff,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const typeIcons: Record<string, any> = {
  new_filing: FileText,
  amendment: FileText,
  price_update: TrendingUp,
  system: Bell,
};

const typeColors: Record<string, string> = {
  new_filing: "text-primary bg-primary/10",
  amendment: "text-amber-400 bg-amber-400/10",
  price_update: "text-emerald-400 bg-emerald-400/10",
  system: "text-purple-400 bg-purple-400/10",
};

const typeLabels: Record<string, string> = {
  new_filing: "New Filing",
  amendment: "Amendment",
  price_update: "Price Update",
  system: "System",
};

export default function Alerts() {
  const utils = trpc.useUtils();

  // Fetch alerts from database
  const alertsQuery = trpc.alerts.list.useQuery(undefined, {
    retry: false,
  });

  const markReadMutation = trpc.alerts.markRead.useMutation({
    onMutate: async ({ alertId }) => {
      await utils.alerts.list.cancel();
      const prev = utils.alerts.list.getData();
      utils.alerts.list.setData(undefined, (old) =>
        old?.map((a) => (a.id === alertId ? { ...a, isRead: 1 } : a))
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) utils.alerts.list.setData(undefined, context.prev);
    },
    onSettled: () => {
      utils.alerts.list.invalidate();
      utils.alerts.unreadCount.invalidate();
    },
  });

  const markAllReadMutation = trpc.alerts.markAllRead.useMutation({
    onMutate: async () => {
      await utils.alerts.list.cancel();
      const prev = utils.alerts.list.getData();
      utils.alerts.list.setData(undefined, (old) =>
        old?.map((a) => ({ ...a, isRead: 1 }))
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) utils.alerts.list.setData(undefined, context.prev);
      toast.error("Failed to mark all as read");
    },
    onSuccess: () => {
      toast.success("All alerts marked as read");
    },
    onSettled: () => {
      utils.alerts.list.invalidate();
      utils.alerts.unreadCount.invalidate();
    },
  });

  const isLoading = alertsQuery.isLoading;
  const isError = alertsQuery.isError;
  const alerts = alertsQuery.data || [];
  const unreadCount = alerts.filter((a) => a.isRead === 0).length;

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6 text-amber-400" />
              Alerts
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${unreadCount} unread · ${alerts.length} total`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={
                markAllReadMutation.isPending || unreadCount === 0 || isLoading
              }
              onClick={() => markAllReadMutation.mutate()}
            >
              <Check className="w-3.5 h-3.5" />
              Mark All Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                toast("Feature coming soon", {
                  description: "Alert settings will be available soon.",
                })
              }
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="bg-card border border-border/50 rounded-xl p-12 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              Loading your alerts...
            </p>
          </div>
        )}

        {/* Error / Not logged in */}
        {isError && (
          <div className="bg-card border border-border/50 rounded-xl p-12 flex flex-col items-center gap-3">
            <BellOff className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Please log in to view your alerts.
            </p>
            <Link href="/auth">
              <Button size="sm">Log In</Button>
            </Link>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && alerts.length === 0 && (
          <div className="bg-card border border-border/50 rounded-xl p-12 flex flex-col items-center gap-3">
            <Inbox className="w-10 h-10 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-foreground">
              No alerts yet
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Alerts will appear here when companies on your watchlist file new
              documents, amend existing filings, or when there are important
              market updates.
            </p>
            <Link href="/dashboard/watchlist">
              <Button size="sm" variant="outline" className="mt-2">
                Manage Watchlist
              </Button>
            </Link>
          </div>
        )}

        {/* Alert list */}
        {!isLoading && !isError && alerts.length > 0 && (
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
            <div className="divide-y divide-border/20">
              {alerts.map((alert) => {
                const Icon = typeIcons[alert.type] || Bell;
                return (
                  <div
                    key={alert.id}
                    className={`px-5 py-4 flex items-start gap-4 transition-colors cursor-pointer ${
                      alert.isRead === 0
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-secondary/20"
                    }`}
                    onClick={() => {
                      if (alert.isRead === 0) {
                        markReadMutation.mutate({ alertId: alert.id });
                      }
                    }}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        typeColors[alert.type] ||
                        "text-muted-foreground bg-secondary/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-foreground">
                          {alert.title}
                        </h3>
                        {alert.isRead === 0 && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-auto ${
                            typeColors[alert.type] ||
                            "text-muted-foreground bg-secondary/50"
                          }`}
                        >
                          {typeLabels[alert.type] || alert.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-muted-foreground/60">
                          {formatTime(alert.createdAt)}
                        </p>
                        {alert.companyCik && (
                          <Link
                            href={`/ipo/${alert.companyCik}`}
                            className="text-xs text-primary hover:underline no-underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Company →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
