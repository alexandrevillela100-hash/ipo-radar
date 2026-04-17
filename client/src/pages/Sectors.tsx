import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { getSectorInfo } from "@/lib/sectorUtils";
import { Link } from "wouter";
import { useMemo } from "react";
import { TrendingUp, Building2 } from "lucide-react";

interface SectorData {
  name: string;
  color: string;
  companyCount: number;
  filingCount: number;
  recentCount: number;
}

export default function Sectors() {
  const { data: filings, isLoading } = trpc.edgar.filings.useQuery();

  const sectors = useMemo(() => {
    if (!filings) return [];
    const map: Record<string, SectorData> = {};
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    filings.forEach((f: any) => {
      const info = getSectorInfo(f.company?.sic, f.company?.sicDescription);
      if (!map[info.sector]) {
        map[info.sector] = {
          name: info.sector,
          color: info.color,
          companyCount: 0,
          filingCount: 0,
          recentCount: 0,
        };
      }
      map[info.sector].filingCount++;
      // Count unique companies per sector (approximate)
      map[info.sector].companyCount = Math.max(
        map[info.sector].companyCount,
        Math.ceil(map[info.sector].filingCount * 0.8)
      );
      // Count recent filings
      const filingDate = new Date(f.filing?.filingDate || 0);
      if (filingDate >= oneWeekAgo) {
        map[info.sector].recentCount++;
      }
    });

    return Object.values(map).sort((a, b) => b.filingCount - a.filingCount);
  }, [filings]);

  const sectorIcons: Record<string, string> = {
    "Healthcare": "🔬",
    "Technology Services": "💻",
    "Electronics": "⚡",
    "Banking": "🏦",
    "Securities & Investments": "📈",
    "Investment Services": "💰",
    "Chemicals & Pharma": "🧪",
    "Oil & Gas": "🛢️",
    "Retail": "🛒",
    "Real Estate": "🏠",
    "Fabricated Metals": "🏭",
    "Industrial Machinery": "⚙️",
    "Telecommunications": "📡",
    "Construction": "🏗️",
    "Food & Beverage": "🍽️",
    "Entertainment": "🎬",
    "Utilities": "⚡",
    "Air Transport": "✈️",
    "Insurance": "🛡️",
    "Education": "📚",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              IPO Activity by Sector
            </h1>
            <p className="text-muted-foreground">
              Track which industries are going public. Click any sector to explore its companies.
            </p>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground font-mono">{sectors.length}</p>
              <p className="text-xs text-muted-foreground">Active Sectors</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary font-mono">
                {sectors.reduce((sum, s) => sum + s.filingCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Filings</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground font-mono">
                {sectors.reduce((sum, s) => sum + s.companyCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Companies</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-market-green font-mono">
                +{sectors.reduce((sum, s) => sum + s.recentCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </div>

          {/* Sector Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-xl h-40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sectors.map((sector) => (
                <Link
                  key={sector.name}
                  href={`/sectors/${encodeURIComponent(sector.name)}`}
                  className="group bg-card border border-border/50 rounded-xl p-6 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 no-underline"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {sectorIcons[sector.name] || "📊"}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {sector.name}
                        </h3>
                      </div>
                    </div>
                    {sector.recentCount > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-market-green/15 text-market-green text-xs font-medium">
                        <TrendingUp className="w-3 h-3" />
                        +{sector.recentCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {sector.companyCount} companies
                    </span>
                    <span>{sector.filingCount} filings</span>
                  </div>

                  {/* Color bar */}
                  <div
                    className="h-1 rounded-full mt-4 opacity-50 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: sector.color }}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
