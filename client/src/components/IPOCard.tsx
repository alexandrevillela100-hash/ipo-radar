import { Link } from "wouter";
import type { IPOCompany } from "@/lib/data";
import { TrendingUp, FileText, Calendar } from "lucide-react";

interface IPOCardProps {
  company: IPOCompany;
  index: number;
}

export default function IPOCard({ company, index }: IPOCardProps) {
  const statusColors: Record<string, string> = {
    Filed: "bg-blue-500/20 text-blue-400",
    Amended: "bg-amber-500/20 text-amber-400",
    Priced: "bg-emerald-500/20 text-emerald-400",
    Withdrawn: "bg-red-500/20 text-red-400",
  };

  return (
    <Link href={`/ipo/${company.id}`} className="no-underline">
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
            src={company.image}
            alt={company.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Sector Badge */}
          <div className="absolute top-3 left-3">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md"
              style={{
                backgroundColor: `${company.sectorColor}25`,
                color: company.sectorColor,
                border: `1px solid ${company.sectorColor}30`,
              }}
            >
              {company.sector}
            </span>
          </div>

          {/* Filing Status Badge */}
          <div className="absolute top-3 right-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${statusColors[company.filingStatus]}`}
            >
              {company.filingStatus}
            </span>
          </div>

          {/* Ticker overlay */}
          <div className="absolute bottom-3 left-3">
            <span className="font-mono text-sm font-semibold text-white/90 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded">
              {company.exchange}: {company.ticker}
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
              {company.description}
            </p>
          </div>

          {/* Metrics Strip */}
          <div className="flex items-center gap-4 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary/70" />
              <span className="font-mono text-xs text-muted-foreground">
                {company.dealSize}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary/70" />
              <span className="font-mono text-xs text-muted-foreground">
                {company.proposedRange}
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/50" />
              <span className="text-xs text-muted-foreground/70">
                {company.filingDate}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
