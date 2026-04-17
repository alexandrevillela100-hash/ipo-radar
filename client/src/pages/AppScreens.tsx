import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { getSectorFromSic } from "@/lib/sic";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  Filter,
  Search,
  FileText,
  Building2,
  Globe,
  Loader2,
  X,
  ArrowUpDown,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ScreenTab = "all" | "sector" | "state" | "form-type";
type SortField = "name" | "date" | "sector" | "state" | "form";
type SortDir = "asc" | "desc";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AppScreens() {
  const { data: filingsData, isLoading } = trpc.edgar.filings.useQuery();
  const [tab, setTab] = useState<ScreenTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Build filter options
  const filterOptions = useMemo(() => {
    if (!filingsData) return { sectors: [], states: [], forms: [] };

    const sectorSet = new Map<string, { color: string; count: number }>();
    const stateSet = new Map<string, number>();
    const formSet = new Map<string, number>();

    filingsData.forEach((item) => {
      const sector = getSectorFromSic(item.company.sic || "");
      const existing = sectorSet.get(sector.name);
      sectorSet.set(sector.name, {
        color: sector.color,
        count: (existing?.count || 0) + 1,
      });

      const state = item.company.stateOfIncorporation || "Unknown";
      stateSet.set(state, (stateSet.get(state) || 0) + 1);

      formSet.set(item.filing.formType, (formSet.get(item.filing.formType) || 0) + 1);
    });

    return {
      sectors: Array.from(sectorSet.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, ...data })),
      states: Array.from(stateSet.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      forms: Array.from(formSet.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
    };
  }, [filingsData]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!filingsData) return [];

    let items = [...filingsData];

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.company.name.toLowerCase().includes(q) ||
          (i.company.ticker || "").toLowerCase().includes(q) ||
          (i.company.sic || "").includes(q) ||
          getSectorFromSic(i.company.sic || "").name.toLowerCase().includes(q)
      );
    }

    // Sector filter
    if (selectedSector) {
      items = items.filter(
        (i) => getSectorFromSic(i.company.sic || "").name === selectedSector
      );
    }

    // State filter
    if (selectedState) {
      items = items.filter(
        (i) => (i.company.stateOfIncorporation || "Unknown") === selectedState
      );
    }

    // Form type filter
    if (selectedForm) {
      items = items.filter((i) => i.filing.formType === selectedForm);
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.company.name.localeCompare(b.company.name);
          break;
        case "date":
          cmp = a.filing.filingDate.localeCompare(b.filing.filingDate);
          break;
        case "sector":
          cmp = getSectorFromSic(a.company.sic || "").name.localeCompare(
            getSectorFromSic(b.company.sic || "").name
          );
          break;
        case "state":
          cmp = (a.company.stateOfIncorporation || "").localeCompare(
            b.company.stateOfIncorporation || ""
          );
          break;
        case "form":
          cmp = a.filing.formType.localeCompare(b.filing.formType);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [filingsData, searchQuery, selectedSector, selectedState, selectedForm, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const clearFilters = () => {
    setSelectedSector(null);
    setSelectedState(null);
    setSelectedForm(null);
    setSearchQuery("");
  };

  const hasActiveFilters = selectedSector || selectedState || selectedForm || searchQuery;

  const tabs: { label: string; value: ScreenTab; icon: typeof Filter }[] = [
    { label: "All Filings", value: "all", icon: FileText },
    { label: "By Sector", value: "sector", icon: Building2 },
    { label: "By State", value: "state", icon: Globe },
    { label: "By Form Type", value: "form-type", icon: FileText },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Filter className="w-6 h-6 text-primary" />
            Screens
          </h1>
          <p className="text-muted-foreground mt-1">
            Filter and search IPO filings by sector, state, form type, and more.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <Button
                key={t.value}
                variant={tab === t.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setTab(t.value);
                  clearFilters();
                }}
                className={tab === t.value ? "bg-primary text-primary-foreground" : ""}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {t.label}
              </Button>
            );
          })}
        </div>

        {/* Search + Active Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search companies, tickers, sectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/30 border-border/50"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="shrink-0">
              <X className="w-3.5 h-3.5 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {selectedSector && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">
                Sector: {selectedSector}
                <button onClick={() => setSelectedSector(null)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedState && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">
                State: {selectedState}
                <button onClick={() => setSelectedState(null)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedForm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">
                Form: {selectedForm}
                <button onClick={() => setSelectedForm(null)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Sidebar filters (for sector/state/form tabs) */}
            {tab !== "all" && (
              <div className="xl:col-span-1">
                <div className="bg-card border border-border/50 rounded-xl p-4 sticky top-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    {tab === "sector"
                      ? "Sectors"
                      : tab === "state"
                      ? "States"
                      : "Form Types"}
                  </h3>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {(tab === "sector"
                      ? filterOptions.sectors.map((s) => ({
                          name: s.name,
                          count: s.count,
                          color: s.color,
                        }))
                      : tab === "state"
                      ? filterOptions.states.map((s) => ({
                          name: s.name,
                          count: s.count,
                          color: undefined,
                        }))
                      : filterOptions.forms.map((f) => ({
                          name: f.name,
                          count: f.count,
                          color: undefined,
                        }))
                    ).map((item) => {
                      const isActive =
                        (tab === "sector" && selectedSector === item.name) ||
                        (tab === "state" && selectedState === item.name) ||
                        (tab === "form-type" && selectedForm === item.name);
                      return (
                        <button
                          key={item.name}
                          onClick={() => {
                            if (tab === "sector")
                              setSelectedSector(isActive ? null : item.name);
                            if (tab === "state")
                              setSelectedState(isActive ? null : item.name);
                            if (tab === "form-type")
                              setSelectedForm(isActive ? null : item.name);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {item.color && (
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                            )}
                            <span className="truncate">{item.name}</span>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground ml-2">
                            {item.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Data table */}
            <div className={tab === "all" ? "xl:col-span-4" : "xl:col-span-3"}>
              <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-border/30 bg-secondary/20">
                  <button
                    className="col-span-4 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort("name")}
                  >
                    Company
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <button
                    className="col-span-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort("sector")}
                  >
                    Sector
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <button
                    className="col-span-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort("form")}
                  >
                    Form
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <button
                    className="col-span-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort("state")}
                  >
                    State
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <button
                    className="col-span-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort("date")}
                  >
                    Filed
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Table rows */}
                <div className="divide-y divide-border/20">
                  {filteredData.length === 0 ? (
                    <div className="text-center py-16">
                      <Filter className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No filings match your criteria.
                      </p>
                    </div>
                  ) : (
                    filteredData.slice(0, 100).map((item) => {
                      const sector = getSectorFromSic(item.company.sic || "");
                      return (
                        <Link
                          key={`${item.filing.id}-${item.company.cik}`}
                          href={`/ipo/${item.company.cik}`}
                          className="grid grid-cols-12 gap-2 px-5 py-3 hover:bg-secondary/20 transition-colors no-underline group"
                        >
                          <div className="col-span-4 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {item.company.name}
                            </p>
                            {item.company.ticker && (
                              <p className="text-xs font-mono text-muted-foreground">
                                {item.company.ticker}
                              </p>
                            )}
                          </div>
                          <div className="col-span-2 flex items-center">
                            <span
                              className="text-[11px] px-2 py-0.5 rounded-full truncate"
                              style={{
                                backgroundColor: sector.color + "20",
                                color: sector.color,
                              }}
                            >
                              {sector.name}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded font-mono ${
                                item.filing.formType.includes("/A")
                                  ? "bg-amber-500/15 text-amber-400"
                                  : "bg-primary/15 text-primary"
                              }`}
                            >
                              {item.filing.formType}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center">
                            <span className="text-xs text-muted-foreground">
                              {item.company.stateOfIncorporation || "—"}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center justify-between">
                            <span className="text-xs font-mono text-muted-foreground">
                              {formatDate(item.filing.filingDate)}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {filteredData.length > 0 && (
                  <div className="px-5 py-3 border-t border-border/30 bg-secondary/10">
                    <p className="text-xs text-muted-foreground">
                      Showing {Math.min(filteredData.length, 100)} of {filteredData.length} results
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
