import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { getSectorFromSic } from "@/lib/sic";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  Newspaper,
  ExternalLink,
  FileText,
  Clock,
  Loader2,
  Filter,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NewsFilter = "all" | "new-filings" | "amendments" | "recent";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr + "T00:00:00");
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export default function AppNews() {
  const { data: filingsData, isLoading } = trpc.edgar.filings.useQuery();
  const [filter, setFilter] = useState<NewsFilter>("all");

  const newsItems = useMemo(() => {
    if (!filingsData) return [];

    const items = [...filingsData].sort(
      (a, b) => new Date(b.filing.filingDate).getTime() - new Date(a.filing.filingDate).getTime()
    );

    switch (filter) {
      case "new-filings":
        return items.filter((i) => !i.filing.formType.includes("/A"));
      case "amendments":
        return items.filter((i) => i.filing.formType.includes("/A"));
      case "recent": {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return items.filter((i) => new Date(i.filing.filingDate) >= thirtyDaysAgo);
      }
      default:
        return items;
    }
  }, [filingsData, filter]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof newsItems> = {};
    newsItems.forEach((item) => {
      const date = item.filing.filingDate;
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [newsItems]);

  const filters: { label: string; value: NewsFilter; icon: typeof Newspaper }[] = [
    { label: "All Activity", value: "all", icon: Newspaper },
    { label: "New Filings", value: "new-filings", icon: FileText },
    { label: "Amendments", value: "amendments", icon: AlertTriangle },
    { label: "Last 30 Days", value: "recent", icon: Clock },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Newspaper className="w-6 h-6 text-primary" />
              IPO News
            </h1>
            <p className="text-muted-foreground mt-1">
              Latest SEC filing activity for IPO-track companies.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const Icon = f.icon;
            return (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.value)}
                className={filter === f.value ? "bg-primary text-primary-foreground" : ""}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {f.label}
              </Button>
            );
          })}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Filings</p>
            <p className="text-xl font-bold font-mono text-foreground mt-1">
              {filingsData?.length || 0}
            </p>
          </div>
          <div className="bg-card border border-border/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">New S-1/F-1</p>
            <p className="text-xl font-bold font-mono text-primary mt-1">
              {filingsData?.filter((f) => !f.filing.formType.includes("/A")).length || 0}
            </p>
          </div>
          <div className="bg-card border border-border/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Amendments</p>
            <p className="text-xl font-bold font-mono text-amber-400 mt-1">
              {filingsData?.filter((f) => f.filing.formType.includes("/A")).length || 0}
            </p>
          </div>
          <div className="bg-card border border-border/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Showing</p>
            <p className="text-xl font-bold font-mono text-foreground mt-1">{newsItems.length}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : newsItems.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No filings match your filter.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByDate.map(([date, items]) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-full">
                    <Clock className="w-3 h-3 text-primary" />
                    <span className="text-xs font-semibold text-foreground">{formatDate(date)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(date)}</span>
                  <div className="flex-1 h-px bg-border/30" />
                  <span className="text-xs text-muted-foreground">
                    {items.length} filing{items.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Filing cards */}
                <div className="space-y-3">
                  {items.map((item) => {
                    const sector = getSectorFromSic(item.company.sic || "");
                    const isAmendment = item.filing.formType.includes("/A");

                    return (
                      <Link
                        key={item.filing.id}
                        href={`/ipo/${item.company.cik}`}
                        className="block group no-underline"
                      >
                        <div className="bg-card border border-border/50 rounded-xl p-5 hover:border-primary/30 transition-all">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                    isAmendment
                                      ? "bg-amber-500/15 text-amber-400"
                                      : "bg-primary/15 text-primary"
                                  }`}
                                >
                                  {item.filing.formType}
                                </span>
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                  style={{
                                    backgroundColor: sector.color + "20",
                                    color: sector.color,
                                  }}
                                >
                                  {sector.name}
                                </span>
                                {item.company.ticker && (
                                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                                    {item.company.ticker}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                                {item.company.name}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {isAmendment
                                  ? `${item.company.name} filed an amendment (${item.filing.formType}) to their IPO registration statement.`
                                  : `${item.company.name} filed a new ${item.filing.formType} registration statement with the SEC.`}
                                {item.company.stateOfIncorporation &&
                                  ` Incorporated in ${item.company.stateOfIncorporation}.`}
                              </p>
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                {item.company.stateOfIncorporation && (
                                  <span>{item.company.stateOfIncorporation}</span>
                                )}
                                <span>SIC: {item.company.sic}</span>
                                {item.filing.filingUrl && (
                                  <span className="flex items-center gap-1 text-primary/70">
                                    <ExternalLink className="w-3 h-3" />
                                    SEC Filing
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0 mt-1" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
