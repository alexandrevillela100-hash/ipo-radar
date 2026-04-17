import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { getSectorInfo } from "@/lib/sectorUtils";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ExternalLink,
  Calendar,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FORM_TYPES = ["All", "S-1", "S-1/A", "F-1", "F-1/A"];
const SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Company A-Z", value: "az" },
  { label: "Company Z-A", value: "za" },
];
const PER_PAGE = 12;

export default function IPODiscovery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [formFilter, setFormFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const { data: filings, isLoading } = trpc.edgar.filings.useQuery();

  // Derive unique sectors from data
  const sectors = useMemo(() => {
    if (!filings) return [];
    const sectorSet = new Set<string>();
    filings.forEach((f: any) => {
      const info = getSectorInfo(f.company?.sic || "", f.company?.sicDescription);
      sectorSet.add(info.sector);
    });
    return ["All", ...Array.from(sectorSet).sort()];
  }, [filings]);

  // Filter and sort
  const filtered = useMemo(() => {
    if (!filings) return [];
    let result = [...filings];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f: any) =>
          f.company?.name?.toLowerCase().includes(q) ||
          f.filing?.formType?.toLowerCase().includes(q) ||
          f.company?.sicDescription?.toLowerCase().includes(q) ||
          f.company?.sic?.toLowerCase().includes(q)
      );
    }

    // Form type filter
    if (formFilter !== "All") {
      result = result.filter((f: any) => f.filing?.formType === formFilter);
    }

    // Sector filter
    if (sectorFilter !== "All") {
      result = result.filter((f: any) => {
        const info = getSectorInfo(f.company?.sic || "", f.company?.sicDescription);
        return info.sector === sectorFilter;
      });
    }

    // Sort
    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.filing?.filingDate || 0).getTime() - new Date(a.filing?.filingDate || 0).getTime();
        case "oldest":
          return new Date(a.filing?.filingDate || 0).getTime() - new Date(b.filing?.filingDate || 0).getTime();
        case "az":
          return (a.company?.name || "").localeCompare(b.company?.name || "");
        case "za":
          return (b.company?.name || "").localeCompare(a.company?.name || "");
        default:
          return 0;
      }
    });

    return result;
  }, [filings, searchQuery, formFilter, sectorFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              IPO Discovery
            </h1>
            <p className="text-muted-foreground">
              Browse all SEC filings for upcoming IPOs. Filter by form type, sector, or search by company name.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="bg-card border border-border/50 rounded-xl p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search companies, industries..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Form Type */}
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <select
                  value={formFilter}
                  onChange={(e) => { setFormFilter(e.target.value); setPage(1); }}
                  className="bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {FORM_TYPES.map((t) => (
                    <option key={t} value={t}>{t === "All" ? "All Forms" : t}</option>
                  ))}
                </select>
              </div>

              {/* Sector */}
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <select
                  value={sectorFilter}
                  onChange={(e) => { setSectorFilter(e.target.value); setPage(1); }}
                  className="bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {sectors.map((s) => (
                    <option key={s} value={s}>{s === "All" ? "All Sectors" : s}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "result" : "results"} found
              </p>
              {(searchQuery || formFilter !== "All" || sectorFilter !== "All") && (
                <button
                  onClick={() => { setSearchQuery(""); setFormFilter("All"); setSectorFilter("All"); setPage(1); }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* Results Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-xl h-64 animate-pulse" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground text-sm">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginated.map((item: any) => {
                const company = item.company;
                const filing = item.filing;
                const sector = getSectorInfo(company?.sic || "", company?.sicDescription);
                const isAmendment = filing?.formType?.includes("/A");

                return (
                  <Link
                    key={`${company?.cik}-${filing?.accessionNumber}`}
                    href={`/ipo/${company?.cik}`}
                    className="group bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 no-underline"
                  >
                    {/* Color bar */}
                    <div className={`h-1.5 ${sector.color.replace("text-", "bg-")}`} style={{ backgroundColor: sector.color.includes("teal") ? "oklch(0.75 0.15 180)" : sector.color.includes("blue") ? "oklch(0.6 0.15 250)" : sector.color.includes("green") ? "oklch(0.65 0.2 145)" : sector.color.includes("amber") ? "oklch(0.75 0.1 75)" : sector.color.includes("purple") ? "oklch(0.6 0.15 300)" : "oklch(0.6 0.1 260)" }} />

                    <div className="p-5">
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isAmendment ? "bg-amber-500/15 text-amber-400" : "bg-primary/15 text-primary"}`}>
                          {filing?.formType || "S-1"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground">
                          {sector.sector}
                        </span>
                      </div>

                      {/* Company name */}
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                        {company?.name || "Unknown Company"}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {company?.sicDescription || sector.description}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {filing?.filingDate || "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {company?.stateOfIncorporation || "N/A"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
