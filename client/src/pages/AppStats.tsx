import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { getSectorFromSic } from "@/lib/sic";
import { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  FileText,
  Building2,
  Globe,
  Loader2,
  PieChart,
  Activity,
} from "lucide-react";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function AppStats() {
  const { data: filingsData, isLoading: filingsLoading } = trpc.edgar.filings.useQuery();
  const { data: statsData, isLoading: statsLoading } = trpc.edgar.stats.useQuery();

  const isLoading = filingsLoading || statsLoading;

  // Compute stats from filings
  const computed = useMemo(() => {
    if (!filingsData) return null;

    // Industry breakdown
    const sectorCounts: Record<string, { count: number; color: string }> = {};
    filingsData.forEach((item) => {
      const sector = getSectorFromSic(item.company.sic || "");
      if (!sectorCounts[sector.name]) {
        sectorCounts[sector.name] = { count: 0, color: sector.color };
      }
      sectorCounts[sector.name].count++;
    });
    const topSectors = Object.entries(sectorCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    // Monthly filing breakdown
    const monthlyCounts: Record<string, { filings: number; amendments: number }> = {};
    filingsData.forEach((item) => {
      const month = item.filing.filingDate.slice(0, 7); // YYYY-MM
      if (!monthlyCounts[month]) monthlyCounts[month] = { filings: 0, amendments: 0 };
      if (item.filing.formType.includes("/A")) {
        monthlyCounts[month].amendments++;
      } else {
        monthlyCounts[month].filings++;
      }
    });
    const monthlyData = Object.entries(monthlyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12);

    // State breakdown
    const stateCounts: Record<string, number> = {};
    filingsData.forEach((item) => {
      const state = item.company.stateOfIncorporation || "Unknown";
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    });
    const topStates = Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Form type breakdown
    const formCounts: Record<string, number> = {};
    filingsData.forEach((item) => {
      formCounts[item.filing.formType] = (formCounts[item.filing.formType] || 0) + 1;
    });
    const formTypes = Object.entries(formCounts).sort((a, b) => b[1] - a[1]);

    // Total unique companies
    const uniqueCompanies = new Set(filingsData.map((f) => f.company.cik)).size;

    return { topSectors, monthlyData, topStates, formTypes, uniqueCompanies };
  }, [filingsData]);

  // Max value for bar chart scaling
  const maxMonthly = computed
    ? Math.max(...computed.monthlyData.map(([, d]) => d.filings + d.amendments), 1)
    : 1;

  const maxSector = computed ? Math.max(...computed.topSectors.map(([, d]) => d.count), 1) : 1;

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            IPO Stats
          </h1>
          <p className="text-muted-foreground mt-1">
            Market statistics, filing trends, and industry breakdown.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {statsData?.filings || filingsData?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total Filings</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {statsData?.companies || computed?.uniqueCompanies || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Unique Companies</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {filingsData?.filter((f) => !f.filing.formType.includes("/A")).length || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Initial Filings</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {filingsData?.filter((f) => f.filing.formType.includes("/A")).length || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Amendments</p>
              </div>
            </div>

            {/* Monthly Filing Activity */}
            <div className="bg-card border border-border/50 rounded-xl p-6">
              <h2 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Monthly Filing Activity
              </h2>
              <p className="text-xs text-muted-foreground mb-6">
                New filings and amendments by month
              </p>
              {computed && computed.monthlyData.length > 0 ? (
                <div className="space-y-3">
                  {computed.monthlyData.map(([month, data]) => {
                    const total = data.filings + data.amendments;
                    const filingWidth = (data.filings / maxMonthly) * 100;
                    const amendWidth = (data.amendments / maxMonthly) * 100;
                    return (
                      <div key={month} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">
                          {formatDate(month + "-01")}
                        </span>
                        <div className="flex-1 flex items-center gap-0.5 h-6">
                          {data.filings > 0 && (
                            <div
                              className="h-full bg-primary/60 rounded-l transition-all"
                              style={{ width: `${filingWidth}%` }}
                              title={`${data.filings} new filings`}
                            />
                          )}
                          {data.amendments > 0 && (
                            <div
                              className="h-full bg-amber-500/50 rounded-r transition-all"
                              style={{ width: `${amendWidth}%` }}
                              title={`${data.amendments} amendments`}
                            />
                          )}
                        </div>
                        <span className="text-xs font-mono text-foreground w-8 text-right">
                          {total}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-primary/60" />
                      <span className="text-xs text-muted-foreground">New Filings</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-amber-500/50" />
                      <span className="text-xs text-muted-foreground">Amendments</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No monthly data available.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Industry Breakdown */}
              <div className="bg-card border border-border/50 rounded-xl p-6">
                <h2 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-primary" />
                  Industry Breakdown
                </h2>
                <p className="text-xs text-muted-foreground mb-5">
                  Top sectors by number of filings
                </p>
                {computed && computed.topSectors.length > 0 ? (
                  <div className="space-y-3">
                    {computed.topSectors.map(([name, data]) => {
                      const pct = ((data.count / maxSector) * 100).toFixed(0);
                      return (
                        <div key={name} className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: data.color }}
                          />
                          <span className="text-sm text-foreground flex-1 min-w-0 truncate">
                            {name}
                          </span>
                          <div className="w-24 h-2 bg-secondary/50 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: data.color,
                                opacity: 0.7,
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                            {data.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No sector data available.
                  </p>
                )}
              </div>

              {/* Filing Types & State Breakdown */}
              <div className="space-y-6">
                {/* Form Types */}
                <div className="bg-card border border-border/50 rounded-xl p-6">
                  <h2 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Filing Types
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Breakdown by SEC form type
                  </p>
                  {computed && computed.formTypes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {computed.formTypes.map(([form, count]) => (
                        <div
                          key={form}
                          className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between"
                        >
                          <span className="text-sm font-mono text-foreground">{form}</span>
                          <span className="text-sm font-bold font-mono text-primary">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No form data available.
                    </p>
                  )}
                </div>

                {/* Top States */}
                <div className="bg-card border border-border/50 rounded-xl p-6">
                  <h2 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Top Incorporation States
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Where IPO companies are incorporated
                  </p>
                  {computed && computed.topStates.length > 0 ? (
                    <div className="space-y-2">
                      {computed.topStates.map(([state, count], idx) => (
                        <div
                          key={state}
                          className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/30 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground w-4">
                              {idx + 1}
                            </span>
                            <span className="text-sm text-foreground">{state}</span>
                          </div>
                          <span className="text-sm font-mono text-muted-foreground">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No state data available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
