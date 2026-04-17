import DashboardShell from "@/components/DashboardShell";
import { Link } from "wouter";
import {
  Star,
  Trash2,
  Calendar,
  ExternalLink,
  Bell,
  Loader2,
  Plus,
  SearchX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Watchlist() {
  const utils = trpc.useUtils();

  // Fetch watchlist from database
  const watchlistQuery = trpc.watchlist.list.useQuery(undefined, {
    retry: false,
  });

  const removeMutation = trpc.watchlist.remove.useMutation({
    onMutate: async ({ companyCik }) => {
      // Optimistic update: remove from cache
      await utils.watchlist.list.cancel();
      const prev = utils.watchlist.list.getData();
      utils.watchlist.list.setData(undefined, (old) =>
        old?.filter((item) => item.company.cik !== companyCik)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) utils.watchlist.list.setData(undefined, context.prev);
      toast.error("Failed to remove from watchlist");
    },
    onSettled: () => {
      utils.watchlist.list.invalidate();
    },
    onSuccess: () => {
      toast.success("Removed from watchlist");
    },
  });

  const toggleAlertsMutation = trpc.watchlist.toggleAlerts.useMutation({
    onMutate: async ({ companyCik }) => {
      await utils.watchlist.list.cancel();
      const prev = utils.watchlist.list.getData();
      utils.watchlist.list.setData(undefined, (old) =>
        old?.map((item) =>
          item.company.cik === companyCik
            ? {
                ...item,
                watchlistItem: {
                  ...item.watchlistItem,
                  alertsEnabled: item.watchlistItem.alertsEnabled === 1 ? 0 : 1,
                },
              }
            : item
        )
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) utils.watchlist.list.setData(undefined, context.prev);
      toast.error("Failed to toggle alerts");
    },
    onSettled: () => {
      utils.watchlist.list.invalidate();
    },
  });

  const handleRemove = (companyCik: string, name: string) => {
    removeMutation.mutate({ companyCik });
  };

  const handleToggleAlert = (companyCik: string) => {
    toggleAlertsMutation.mutate({ companyCik });
  };

  const isLoading = watchlistQuery.isLoading;
  const isError = watchlistQuery.isError;
  const items = watchlistQuery.data || [];

  // Map SIC to sector
  const getSector = (sicDescription?: string | null) => {
    if (!sicDescription) return "Other";
    const desc = sicDescription.toLowerCase();
    if (
      desc.includes("software") ||
      desc.includes("computer") ||
      desc.includes("electronic")
    )
      return "Technology";
    if (
      desc.includes("pharm") ||
      desc.includes("medical") ||
      desc.includes("health") ||
      desc.includes("bio")
    )
      return "Healthcare";
    if (
      desc.includes("bank") ||
      desc.includes("finance") ||
      desc.includes("invest") ||
      desc.includes("insur")
    )
      return "Financial Services";
    if (
      desc.includes("energy") ||
      desc.includes("oil") ||
      desc.includes("gas")
    )
      return "Energy";
    if (
      desc.includes("food") ||
      desc.includes("beverage") ||
      desc.includes("retail")
    )
      return "Consumer";
    return "Other";
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-400" />
              Watchlist
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${items.length} ${items.length === 1 ? "company" : "companies"} tracked`}
            </p>
          </div>
          <Link href="/ipos">
            <Button size="sm" className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Add Companies
            </Button>
          </Link>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="bg-card border border-border/50 rounded-xl p-12 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              Loading your watchlist...
            </p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-card border border-border/50 rounded-xl p-12 flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Please log in to view your watchlist.
            </p>
            <Link href="/auth">
              <Button size="sm">Log In</Button>
            </Link>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && items.length === 0 && (
          <div className="bg-card border border-border/50 rounded-xl p-12 flex flex-col items-center gap-3">
            <SearchX className="w-10 h-10 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-foreground">
              Your watchlist is empty
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Start tracking IPOs by adding companies to your watchlist. Browse
              the IPO discovery page to find companies to track.
            </p>
            <Link href="/ipos">
              <Button size="sm" className="mt-2 gap-2">
                <Plus className="w-3.5 h-3.5" />
                Browse IPOs
              </Button>
            </Link>
          </div>
        )}

        {/* Watchlist table */}
        {!isLoading && !isError && items.length > 0 && (
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-secondary/20">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Company
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sector
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ticker
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Added
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Alerts
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {items.map((item) => (
                    <tr
                      key={item.watchlistItem.id}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/ipo/${item.company.cik}`}
                          className="no-underline"
                        >
                          <p className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                            {item.company.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            CIK: {item.company.cik}
                            {item.company.businessState &&
                              ` · ${item.company.businessState}`}
                          </p>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-muted-foreground">
                          {getSector(item.company.sicDescription)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {item.company.ticker ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-primary/15 text-primary">
                            {item.company.ticker}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(
                            item.watchlistItem.createdAt
                          ).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() =>
                            handleToggleAlert(item.company.cik)
                          }
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.watchlistItem.alertsEnabled === 1
                              ? "text-amber-400 bg-amber-400/10"
                              : "text-muted-foreground hover:text-amber-400"
                          }`}
                          title={
                            item.watchlistItem.alertsEnabled === 1
                              ? "Alerts enabled — click to disable"
                              : "Alerts disabled — click to enable"
                          }
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/ipo/${item.company.cik}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <button
                            onClick={() =>
                              handleRemove(
                                item.company.cik,
                                item.company.name
                              )
                            }
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
