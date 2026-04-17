import { Link } from "wouter";
import { getSectorFromSic, getSectorImagePlaceholder } from "@/lib/sic";
import { FileText, Calendar, Building2 } from "lucide-react";

/**
 * Props shape matching the joined filing+company data from the backend.
 * This mirrors what `trpc.edgar.filings.useQuery()` returns.
 */
export interface SECFilingWithCompany {
  filing: {
    id: number;
    accessionNumber: string;
    companyCik: string;
    formType: string;
    filingDate: string;
    primaryDocument: string | null;
    primaryDocDescription: string | null;
    filingUrl: string | null;
    filingStatus: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  company: {
    id: number;
    cik: string;
    name: string;
    ticker: string | null;
    exchange: string | null;
    sic: string | null;
    sicDescription: string | null;
    stateOfIncorporation: string | null;
    businessAddress: string | null;
    businessCity: string | null;
    businessState: string | null;
    businessZip: string | null;
    fiscalYearEnd: string | null;
    entityType: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

interface SECIPOCardProps {
  data: SECFilingWithCompany;
  index: number;
}

export default function SECIPOCard({ data, index }: SECIPOCardProps) {
  const { filing, company } = data;
  const sector = getSectorFromSic(company.sic, company.sicDescription);
  const image = getSectorImagePlaceholder(sector.name);

  const statusColors: Record<string, string> = {
    Filed: "bg-blue-500/20 text-blue-400",
    Amended: "bg-amber-500/20 text-amber-400",
    Priced: "bg-emerald-500/20 text-emerald-400",
    Withdrawn: "bg-red-500/20 text-red-400",
  };

  // Format the filing date for display
  const displayDate = filing.filingDate; // Already in YYYY-MM-DD

  // Build a location string from available address data
  const location = [company.businessCity, company.businessState]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/ipo/${company.cik}`}
      className="no-underline"
    >
      <article
        className="group rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
        style={{
          animationDelay: `${index * 80}ms`,
          animation: "fadeInUp 0.5s ease-out both",
        }}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={image}
            alt={company.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Sector Badge */}
          <div className="absolute top-3 left-3">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md"
              style={{
                backgroundColor: `${sector.color}25`,
                color: sector.color,
                border: `1px solid ${sector.color}30`,
              }}
            >
              {sector.name}
            </span>
          </div>

          {/* Filing Status Badge */}
          <div className="absolute top-3 right-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${statusColors[filing.filingStatus ?? "Filed"] ?? statusColors.Filed}`}
            >
              {filing.filingStatus ?? "Filed"}
            </span>
          </div>

          {/* Ticker / Form Type overlay */}
          <div className="absolute bottom-3 left-3">
            <span className="font-mono text-sm font-semibold text-white/90 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded">
              {company.ticker
                ? `${company.exchange ?? "TBD"}: ${company.ticker}`
                : filing.formType}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
              {company.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
              {company.sicDescription
                ? `${company.sicDescription}${location ? ` — ${location}` : ""}`
                : location || "SEC filing pending review"}
            </p>
          </div>

          {/* Metrics Strip */}
          <div className="flex items-center gap-4 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary/70" />
              <span className="font-mono text-xs text-muted-foreground">
                {filing.formType}
              </span>
            </div>
            {location && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary/70" />
                <span className="font-mono text-xs text-muted-foreground">
                  {company.businessState ?? ""}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/50" />
              <span className="text-xs text-muted-foreground/70">
                {displayDate}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
