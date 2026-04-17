import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { CompanyChat } from "@/components/CompanyChat";
import { Button } from "@/components/ui/button";
import { getSectorFromSic, getSectorImagePlaceholder } from "@/lib/sic";
import {
  generateFakeFinancials,
  formatCurrency,
  formatNumber,
} from "@/lib/fakeFinancials";
import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Database,
  DollarSign,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MapPin,
  Radar,
  ShieldAlert,
  TrendingUp,
  Users,
  BarChart3,
  Briefcase,
  AlertTriangle,
  Star,
  Brain,
} from "lucide-react";
import WatchlistButton from "@/components/WatchlistButton";

/**
 * SEC IPO Detail Page
 * ───────────────────
 * Displays company and filing information fetched from our database
 * (originally sourced from SEC EDGAR APIs).
 * Financial data is currently generated as realistic placeholders.
 *
 * Route: /ipo/:cik
 * Data: trpc.edgar.companyFilings.useQuery({ cik })
 */
function IndexFilingsButton({ cik }: { cik: string }) {
  const indexMutation = trpc.indexing.indexCompany.useMutation({
    onSuccess: (data) => {
      toast.success(`Indexed ${data.totalChunks} chunks from ${data.results.length} filing(s)`);
    },
    onError: (err) => {
      toast.error("Indexing failed: " + err.message);
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-primary/30 text-primary hover:bg-primary/10 text-xs"
      disabled={indexMutation.isPending}
      onClick={() => indexMutation.mutate({ companyCik: cik })}
    >
      {indexMutation.isPending ? (
        <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Indexing...</>
      ) : (
        <><Database className="w-3 h-3 mr-1.5" /> Index for Chat</>
      )}
    </Button>
  );
}

export default function SECIPODetail() {
  const [, params] = useRoute("/ipo/:cik");
  const cik = params?.cik ?? "";
  const { isAuthenticated } = useAuth();

  // Single query that returns both company and filings
  const { data, isLoading } = trpc.edgar.companyFilings.useQuery({ cik });

  const handlePlaceholder = (label: string) => {
    toast("Feature coming soon", {
      description: `${label} will be available in a future release.`,
    });
  };

  // Generate fake financials deterministically based on CIK
  const company = data?.company;
  const filings = data?.filings ?? [];

  const sector = useMemo(
    () => (company ? getSectorFromSic(company.sic, company.sicDescription) : null),
    [company?.sic, company?.sicDescription]
  );

  const financials = useMemo(
    () => (company && sector ? generateFakeFinancials(company.cik, sector.name) : null),
    [company?.cik, sector?.name]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-40">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">
            Loading company data...
          </span>
        </div>
      </div>
    );
  }

  if (!company || !sector || !financials) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-32 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Company Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            No company with CIK {cik} found in the database.
          </p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const image = getSectorImagePlaceholder(sector.name);
  const location = [company.businessCity, company.businessState]
    .filter(Boolean)
    .join(", ");
  const secEdgarUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=S-1&dateb=&owner=include&count=40`;

  const { metrics, historicalRevenue, offering, riskFactors } = financials;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative pt-20">
        <div className="h-64 sm:h-80 relative overflow-hidden">
          <img
            src={image}
            alt={company.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        <div className="container relative -mt-20">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all filings
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `${sector.color}25`,
                    color: sector.color,
                    border: `1px solid ${sector.color}30`,
                  }}
                >
                  {sector.name}
                </span>
                {company.ticker && (
                  <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {company.exchange ?? "TBD"}:{company.ticker}
                  </span>
                )}
                <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                  CIK: {company.cik}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                {company.name}
              </h1>
              {company.sicDescription && (
                <p className="text-muted-foreground mt-2 text-lg">
                  {company.sicDescription}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-shrink-0 sm:self-end">
              <WatchlistButton cik={cik} companyName={company.name} />
              <Link href={`/report/${cik}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Brain className="w-4 h-4" />
                  AI Report
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column — Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Company Information */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">
                    Company Information
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      label: "Industry (SIC)",
                      value: company.sicDescription
                        ? `${company.sicDescription} (${company.sic})`
                        : company.sic ?? "N/A",
                    },
                    {
                      label: "State of Incorporation",
                      value: company.stateOfIncorporation ?? "N/A",
                    },
                    {
                      label: "Headquarters",
                      value: location || "N/A",
                    },
                    {
                      label: "Entity Type",
                      value: company.entityType ?? "N/A",
                    },
                    {
                      label: "Fiscal Year End",
                      value: company.fiscalYearEnd
                        ? `${company.fiscalYearEnd.slice(0, 2)}/${company.fiscalYearEnd.slice(2)}`
                        : "N/A",
                    },
                    {
                      label: "Exchange",
                      value: company.exchange ?? "Not yet listed",
                    },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-secondary/30">
                      <span className="text-xs text-muted-foreground">
                        {item.label}
                      </span>
                      <p className="font-mono text-sm font-semibold text-foreground mt-1">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {company.businessAddress && (
                  <div className="mt-4 p-3 rounded-lg bg-secondary/30">
                    <span className="text-xs text-muted-foreground">
                      Business Address
                    </span>
                    <p className="text-sm text-foreground mt-1">
                      {company.businessAddress}
                      {company.businessCity && `, ${company.businessCity}`}
                      {company.businessState && `, ${company.businessState}`}
                      {company.businessZip && ` ${company.businessZip}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Key Financial Metrics */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">
                      Key Financial Metrics
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
                    Simulated Data
                  </span>
                </div>

                {/* Revenue Highlight */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    {
                      label: "Revenue (TTM)",
                      value: formatCurrency(metrics.revenue),
                      icon: DollarSign,
                      color: "text-emerald-400",
                    },
                    {
                      label: "Revenue Growth",
                      value: `${metrics.revenueGrowth}%`,
                      icon: TrendingUp,
                      color: "text-blue-400",
                    },
                    {
                      label: "Net Income",
                      value: formatCurrency(metrics.netIncome),
                      icon: BarChart3,
                      color: metrics.netIncome >= 0 ? "text-emerald-400" : "text-red-400",
                    },
                    {
                      label: "Employees",
                      value: formatNumber(metrics.employeeCount),
                      icon: Users,
                      color: "text-purple-400",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="p-3 rounded-lg bg-secondary/30 border border-border/30"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                        <span className="text-[11px] text-muted-foreground">
                          {stat.label}
                        </span>
                      </div>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Income Statement */}
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Income Statement Summary
                </h3>
                <div className="rounded-lg border border-border/30 overflow-hidden mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-secondary/40">
                        <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-semibold">
                          Metric
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-semibold">
                          Amount
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-semibold">
                          Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {[
                        { label: "Revenue", amount: metrics.revenue, margin: "100.0%" },
                        { label: "Cost of Revenue", amount: -metrics.costOfRevenue, margin: `${(100 - metrics.grossMargin).toFixed(1)}%` },
                        { label: "Gross Profit", amount: metrics.grossProfit, margin: `${metrics.grossMargin}%`, highlight: true },
                        { label: "Operating Expenses", amount: -metrics.operatingExpenses, margin: `${((metrics.operatingExpenses / metrics.revenue) * 100).toFixed(1)}%` },
                        { label: "Operating Income", amount: metrics.operatingIncome, margin: `${((metrics.operatingIncome / metrics.revenue) * 100).toFixed(1)}%` },
                        { label: "Net Income", amount: metrics.netIncome, margin: `${metrics.netMargin}%`, highlight: true },
                      ].map((row) => (
                        <tr
                          key={row.label}
                          className={row.highlight ? "bg-primary/5" : ""}
                        >
                          <td className={`px-4 py-2.5 ${row.highlight ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                            {row.label}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-mono ${row.amount < 0 ? "text-red-400" : "text-foreground"} ${row.highlight ? "font-semibold" : ""}`}>
                            {formatCurrency(row.amount)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-muted-foreground text-xs">
                            {row.margin}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Balance Sheet Highlights */}
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Balance Sheet Highlights
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Total Assets", value: formatCurrency(metrics.totalAssets) },
                    { label: "Total Liabilities", value: formatCurrency(metrics.totalLiabilities) },
                    { label: "Stockholders' Equity", value: formatCurrency(metrics.totalEquity) },
                    { label: "Cash & Equivalents", value: formatCurrency(metrics.cashAndEquivalents) },
                    { label: "Total Debt", value: formatCurrency(metrics.totalDebt) },
                    { label: "Debt-to-Equity", value: `${(metrics.totalDebt / metrics.totalEquity).toFixed(2)}x` },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-secondary/20">
                      <span className="text-[11px] text-muted-foreground block">
                        {item.label}
                      </span>
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Revenue History */}
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-3">
                  Revenue History
                </h3>
                <div className="flex items-end gap-3 h-32 px-2">
                  {historicalRevenue.map((yr, i) => {
                    const maxRev = Math.max(...historicalRevenue.map((h) => h.revenue));
                    const heightPct = maxRev > 0 ? (yr.revenue / maxRev) * 100 : 0;
                    const isLatest = i === historicalRevenue.length - 1;
                    return (
                      <div key={yr.year} className="flex-1 flex flex-col items-center gap-1">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatCurrency(yr.revenue)}
                        </span>
                        <div
                          className={`w-full rounded-t-md transition-all ${
                            isLatest ? "bg-primary" : "bg-primary/30"
                          }`}
                          style={{ height: `${Math.max(heightPct, 4)}%` }}
                        />
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {yr.year}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* IPO Offering Details */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">
                      IPO Offering Details
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
                    Simulated Data
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Shares Offered", value: formatNumber(offering.sharesOffered) },
                    { label: "Price Range", value: `$${offering.priceRangeLow} – $${offering.priceRangeHigh}` },
                    { label: "Est. Proceeds", value: formatCurrency(offering.estimatedProceeds) },
                    { label: "Lock-up Period", value: offering.lockupPeriod },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-secondary/30">
                      <span className="text-[11px] text-muted-foreground block">
                        {item.label}
                      </span>
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Underwriters */}
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Lead Underwriters
                </h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {offering.underwriters.map((uw) => (
                    <span
                      key={uw}
                      className="px-3 py-1.5 rounded-lg bg-secondary/40 border border-border/30 text-sm font-medium text-foreground"
                    >
                      {uw}
                    </span>
                  ))}
                </div>

                {/* Use of Proceeds */}
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Use of Proceeds
                </h3>
                <div className="space-y-2">
                  {offering.useOfProceeds.map((use, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{use}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Factors */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">
                      Key Risk Factors
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
                    Simulated Data
                  </span>
                </div>

                <div className="space-y-3">
                  {riskFactors.map((risk, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20"
                    >
                      <AlertTriangle
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          risk.severity === "High"
                            ? "text-red-400"
                            : risk.severity === "Medium"
                            ? "text-amber-400"
                            : "text-blue-400"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{risk.title}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                          risk.severity === "High"
                            ? "bg-red-500/15 text-red-400"
                            : risk.severity === "Medium"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-blue-500/15 text-blue-400"
                        }`}
                      >
                        {risk.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filing History */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">
                      SEC Filing History
                    </h2>
                  </div>
                  {isAuthenticated && filings.length > 0 && (
                    <IndexFilingsButton cik={cik} />
                  )}
                </div>

                {filings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No filings found in the database for this company.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filings.map((filing, i) => (
                      <div key={filing.accessionNumber} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                          {i < filings.length - 1 && (
                            <div className="w-px flex-1 bg-border/50 mt-1" />
                          )}
                        </div>
                        <div className="pb-4 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-primary">
                              {filing.formType}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {filing.filingDate}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                filing.filingStatus === "Amended"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-blue-500/20 text-blue-400"
                              }`}
                            >
                              {filing.filingStatus ?? "Filed"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Accession: {filing.accessionNumber}
                          </p>
                          {filing.primaryDocDescription && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {filing.primaryDocDescription}
                            </p>
                          )}
                          {filing.filingUrl && (
                            <a
                              href={filing.filingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View on SEC.gov
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Report — Coming Soon */}
              <div className="p-6 rounded-xl bg-card border border-border/50 border-dashed">
                <div className="flex items-center gap-2 mb-4">
                  <Radar className="w-5 h-5 text-primary/50" />
                  <h2 className="text-lg font-bold text-foreground/50">
                    AI First-Look Report
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase">
                    AI-Powered
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  An institutional-grade initiation report will be generated
                  automatically from the S-1 filing, including business model
                  analysis, competitive positioning, risk assessment, and
                  valuation framework.
                </p>
                <Link href={`/report/${cik}`}>
                  <Button
                    variant="outline"
                    className="mt-4 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Generate AI Report
                  </Button>
                </Link>
              </div>

              {/* Conversational Chat — Grounded in SEC Filings */}
              {company && (
                <CompanyChat cik={company.cik} companyName={company.name} />
              )}
            </div>

            {/* Right Column — Sidebar */}
            <div className="space-y-6">
              {/* Quick Facts */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  Quick Facts
                </h2>
                <div className="space-y-3">
                  {[
                    {
                      icon: Building2,
                      label: "Company",
                      value: company.name,
                    },
                    {
                      icon: MapPin,
                      label: "Location",
                      value: location || "N/A",
                    },
                    {
                      icon: Globe,
                      label: "Sector",
                      value: sector.name,
                    },
                    {
                      icon: Users,
                      label: "Employees",
                      value: `~${formatNumber(metrics.employeeCount)}`,
                    },
                    {
                      icon: DollarSign,
                      label: "Revenue (TTM)",
                      value: formatCurrency(metrics.revenue),
                    },
                    {
                      icon: FileText,
                      label: "Total Filings",
                      value: `${filings.length} filing${filings.length !== 1 ? "s" : ""}`,
                    },
                    {
                      icon: Calendar,
                      label: "Latest Filing",
                      value:
                        filings.length > 0
                          ? `${filings[0].formType} — ${filings[0].filingDate}`
                          : "N/A",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0"
                    >
                      <item.icon className="w-4 h-4 text-primary/70 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          {item.label}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {item.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <a
                  href={secEdgarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="w-full mt-5 border-border/60 text-foreground hover:bg-secondary"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on SEC EDGAR
                  </Button>
                </a>
              </div>

              {/* Offering Summary */}
              <div className="p-6 rounded-xl bg-card border border-primary/20 bg-primary/5">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  Offering Summary
                </h2>
                <div className="space-y-3">
                  {[
                    { label: "Price Range", value: `$${offering.priceRangeLow} – $${offering.priceRangeHigh}` },
                    { label: "Shares Offered", value: formatNumber(offering.sharesOffered) },
                    { label: "Est. Proceeds", value: formatCurrency(offering.estimatedProceeds) },
                    { label: "Lock-up", value: offering.lockupPeriod },
                    { label: "Lead Underwriter", value: offering.underwriters[0] },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0"
                    >
                      <span className="text-xs text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-amber-400/70 mt-3 italic">
                  Simulated data for demonstration purposes
                </p>
              </div>

              {/* Data Source */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/30">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Company information sourced from SEC EDGAR. Financial data,
                  offering details, and risk factors shown above are{" "}
                  <span className="text-amber-400 font-semibold">simulated placeholders</span>{" "}
                  and will be replaced with real data extracted from S-1 filing
                  documents in a future release.
                </p>
                <p className="text-[10px] text-muted-foreground/50 mt-2 font-mono">
                  CIK: {company.cik} | Last updated:{" "}
                  {new Date(company.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-8">
        <div className="container">
          <p className="text-xs text-muted-foreground/60 text-center">
            SEC filings are monitored from official public sources. IPO Radar AI
            does not provide investment advice. All AI-generated content is for
            informational purposes only.
          </p>
        </div>
      </footer>
    </div>
  );
}
