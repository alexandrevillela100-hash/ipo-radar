import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { getSectorInfo } from "@/lib/sectorUtils";
import { Link, useParams } from "wouter";
import { useMemo } from "react";
import { ArrowLeft, Calendar, Building2 } from "lucide-react";

export default function SectorDetail() {
  const params = useParams<{ sector: string }>();
  const sectorName = decodeURIComponent(params.sector || "");

  const { data: filings, isLoading } = trpc.edgar.filings.useQuery();

  const sectorFilings = useMemo(() => {
    if (!filings) return [];
    return filings.filter((f: any) => {
      const info = getSectorInfo(f.company?.sic, f.company?.sicDescription);
      return info.sector === sectorName;
    });
  }, [filings, sectorName]);

  const stats = useMemo(() => {
    const companies = new Set(sectorFilings.map((f: any) => f.company?.cik)).size;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentCount = sectorFilings.filter(
      (f: any) => new Date(f.filing?.filingDate || 0) >= oneWeekAgo
    ).length;
    return { companies, filings: sectorFilings.length, recent: recentCount };
  }, [sectorFilings]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container">
          {/* Back link */}
          <Link href="/sectors" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground no-underline mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Sectors
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {sectorName} IPOs
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{stats.companies} companies</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span>{stats.filings} filings</span>
              {stats.recent > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                  <span className="text-market-green">{stats.recent} new this week</span>
                </>
              )}
            </div>
          </div>

          {/* Company Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-xl h-48 animate-pulse" />
              ))}
            </div>
          ) : sectorFilings.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No companies found in this sector.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sectorFilings.map((item: any, idx: number) => {
                const company = item.company;
                const filing = item.filing;
                const isAmendment = filing?.formType?.includes("/A");

                return (
                  <Link
                    key={`${company?.cik}-${idx}`}
                    href={`/ipo/${company?.cik}`}
                    className="group bg-card border border-border/50 rounded-xl p-5 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 no-underline"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isAmendment ? "bg-amber-500/15 text-amber-400" : "bg-primary/15 text-primary"}`}>
                        {filing?.formType || "S-1"}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                      {company?.name || "Unknown Company"}
                    </h3>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {company?.sicDescription || sectorName}
                    </p>

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
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
