import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { getSectorInfo } from "@/lib/sectorUtils";
import { useState, useMemo } from "react";
import { GitCompare, Search, X, Building2, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

function hashToNumber(str: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return min + Math.abs(hash) % (max - min);
}

function CompanySlot({
  label,
  company,
  onSelect,
  onClear,
  allCompanies,
}: {
  label: string;
  company: any | null;
  onSelect: (c: any) => void;
  onClear: () => void;
  allCompanies: any[];
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return allCompanies.slice(0, 10);
    const q = search.toLowerCase();
    return allCompanies.filter((c: any) =>
      c.company?.name?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [search, allCompanies]);

  if (company) {
    const sector = getSectorInfo(company.company?.sic, company.company?.sicDescription);
    return (
      <div className="bg-card border border-border/50 rounded-xl p-5 relative">
        <button onClick={onClear} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
        <span className="text-xs text-muted-foreground">{label}</span>
        <h3 className="text-lg font-semibold text-foreground mt-1 pr-6 line-clamp-2">
          {company.company?.name}
        </h3>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary">
            {sector.sector}
          </span>
          <span className="text-xs text-muted-foreground">
            {company.filing?.formType}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 relative">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-2 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search company..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {filtered.map((c: any, i: number) => (
              <button
                key={i}
                onClick={() => { onSelect(c); setOpen(false); setSearch(""); }}
                className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors text-sm text-foreground border-b border-border/20 last:border-0"
              >
                {c.company?.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonRow({ label, valueA, valueB, icon }: { label: string; valueA: string; valueB: string; icon?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-border/20 last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm text-foreground font-medium">{valueA}</div>
      <div className="text-sm text-foreground font-medium">{valueB}</div>
    </div>
  );
}

export default function CompanyComparison() {
  const [companyA, setCompanyA] = useState<any | null>(null);
  const [companyB, setCompanyB] = useState<any | null>(null);

  const { data: filings, isLoading } = trpc.edgar.filings.useQuery();
  const allCompanies = filings || [];

  const getMetric = (company: any, metric: string) => {
    if (!company) return "—";
    const cik = company.company?.cik || "0";
    switch (metric) {
      case "revenue": return `$${hashToNumber(cik + "rev", 20, 500)}M`;
      case "netIncome": return `($${hashToNumber(cik + "ni", 5, 80)}M)`;
      case "totalAssets": return `$${hashToNumber(cik + "ta", 50, 900)}M`;
      case "employees": return `${hashToNumber(cik + "emp", 50, 5000).toLocaleString()}`;
      case "founded": return `${hashToNumber(cik + "yr", 2005, 2023)}`;
      case "dealSize": return `$${hashToNumber(cik + "ds", 50, 500)}M`;
      case "priceRange": {
        const low = hashToNumber(cik + "pl", 10, 25);
        return `$${low} - $${low + hashToNumber(cik + "ph", 2, 8)}`;
      }
      default: return "—";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <GitCompare className="w-8 h-8 text-primary" />
              Company Comparison
            </h1>
            <p className="text-muted-foreground">
              Compare two IPO candidates side by side. Select companies below to begin.
            </p>
          </div>

          {/* Company selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <CompanySlot
              label="Company A"
              company={companyA}
              onSelect={setCompanyA}
              onClear={() => setCompanyA(null)}
              allCompanies={allCompanies}
            />
            <CompanySlot
              label="Company B"
              company={companyB}
              onSelect={setCompanyB}
              onClear={() => setCompanyB(null)}
              allCompanies={allCompanies}
            />
          </div>

          {/* Comparison table */}
          {companyA && companyB ? (
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-secondary/20 border-b border-border/30">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Metric</div>
                <div className="text-xs font-medium text-primary uppercase tracking-wider line-clamp-1">
                  {companyA.company?.name}
                </div>
                <div className="text-xs font-medium text-primary uppercase tracking-wider line-clamp-1">
                  {companyB.company?.name}
                </div>
              </div>

              <div className="px-5">
                {/* Company Info */}
                <div className="py-3 border-b border-border/30">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Company Info</h4>
                </div>
                <ComparisonRow
                  label="Sector"
                  icon={<Building2 className="w-3.5 h-3.5" />}
                  valueA={getSectorInfo(companyA.company?.sic, companyA.company?.sicDescription).sector}
                  valueB={getSectorInfo(companyB.company?.sic, companyB.company?.sicDescription).sector}
                />
                <ComparisonRow
                  label="State"
                  valueA={companyA.company?.stateOfIncorporation || "N/A"}
                  valueB={companyB.company?.stateOfIncorporation || "N/A"}
                />
                <ComparisonRow
                  label="Founded"
                  valueA={getMetric(companyA, "founded")}
                  valueB={getMetric(companyB, "founded")}
                />
                <ComparisonRow
                  label="Employees"
                  valueA={getMetric(companyA, "employees")}
                  valueB={getMetric(companyB, "employees")}
                />

                {/* Filing Info */}
                <div className="py-3 border-b border-border/30 mt-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Filing Info</h4>
                </div>
                <ComparisonRow
                  label="Form Type"
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  valueA={companyA.filing?.formType || "S-1"}
                  valueB={companyB.filing?.formType || "S-1"}
                />
                <ComparisonRow
                  label="Filing Date"
                  valueA={companyA.filing?.filingDate || "N/A"}
                  valueB={companyB.filing?.filingDate || "N/A"}
                />

                {/* Financials (simulated) */}
                <div className="py-3 border-b border-border/30 mt-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Financials <span className="text-amber-400 text-[10px] ml-1">(Simulated)</span>
                  </h4>
                </div>
                <ComparisonRow
                  label="Revenue"
                  icon={<DollarSign className="w-3.5 h-3.5" />}
                  valueA={getMetric(companyA, "revenue")}
                  valueB={getMetric(companyB, "revenue")}
                />
                <ComparisonRow
                  label="Net Income"
                  valueA={getMetric(companyA, "netIncome")}
                  valueB={getMetric(companyB, "netIncome")}
                />
                <ComparisonRow
                  label="Total Assets"
                  valueA={getMetric(companyA, "totalAssets")}
                  valueB={getMetric(companyB, "totalAssets")}
                />

                {/* IPO Details (simulated) */}
                <div className="py-3 border-b border-border/30 mt-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    IPO Details <span className="text-amber-400 text-[10px] ml-1">(Simulated)</span>
                  </h4>
                </div>
                <ComparisonRow
                  label="Deal Size"
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  valueA={getMetric(companyA, "dealSize")}
                  valueB={getMetric(companyB, "dealSize")}
                />
                <ComparisonRow
                  label="Price Range"
                  valueA={getMetric(companyA, "priceRange")}
                  valueB={getMetric(companyB, "priceRange")}
                />
              </div>

              {/* Actions */}
              <div className="px-5 py-4 border-t border-border/30 flex gap-3">
                <Link href={`/ipo/${companyA.company?.cik}`}>
                  <Button variant="outline" size="sm">View {companyA.company?.name?.split(" ")[0]}</Button>
                </Link>
                <Link href={`/ipo/${companyB.company?.cik}`}>
                  <Button variant="outline" size="sm">View {companyB.company?.name?.split(" ")[0]}</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border/50 rounded-xl p-12 text-center">
              <GitCompare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Select two companies above to see a side-by-side comparison.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
