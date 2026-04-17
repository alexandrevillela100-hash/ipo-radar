import { useParams, Link } from "wouter";
import { ipoCompanies } from "@/lib/data";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  Calendar,
  MapPin,
  Users,
  TrendingUp,
  FileText,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  BarChart3,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

/*
 * Design: Dark Terminal Luxe — IPO Detail Page
 * - Hero banner with company image
 * - Structured data sections: Business, Financials, Offering, Risks
 * - Monospaced financial data, teal accents
 */

export default function IPODetail() {
  const { id } = useParams<{ id: string }>();
  const company = ipoCompanies.find((c) => c.id === id);

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-28 text-center">
          <h1 className="text-2xl font-bold text-foreground">Company not found</h1>
          <Link href="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to IPO Radar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    Filed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Amended: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Priced: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Withdrawn: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const handlePlaceholder = (label: string) => {
    toast("Feature coming soon", {
      description: `${label} will be available in a future release.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative pt-16">
        <div className="relative h-64 sm:h-80 overflow-hidden">
          <img
            src={company.image}
            alt={company.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        <div className="container relative -mt-20">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium mb-4 no-underline">
            <ArrowLeft className="w-4 h-4" />
            Back to IPO Radar
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold border"
                  style={{
                    backgroundColor: `${company.sectorColor}20`,
                    color: company.sectorColor,
                    borderColor: `${company.sectorColor}30`,
                  }}
                >
                  {company.sector}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[company.filingStatus]}`}
                >
                  {company.filingStatus}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                {company.name}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="font-mono font-semibold text-foreground">
                  {company.exchange}: {company.ticker}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {company.headquarters}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Founded {company.founded}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => handlePlaceholder("Add to Watchlist")}
                variant="outline"
                className="border-border/60 text-foreground hover:bg-secondary"
              >
                Add to Watchlist
              </Button>
              <Button
                onClick={() => handlePlaceholder("View Full Report")}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                View Full Report
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Content Grid */}
      <section className="py-10">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Business Overview */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">
                    Business Overview
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {company.businessModel}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t border-border/50">
                  <div>
                    <span className="text-xs text-muted-foreground">CEO</span>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {company.ceo}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Employees</span>
                    <p className="font-mono text-sm font-semibold text-foreground mt-0.5">
                      {company.employees}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Headquarters</span>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {company.headquarters}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Financials */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">
                    Key Financials
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {[
                    { label: "Revenue", value: company.revenue },
                    { label: "Net Income", value: company.netIncome },
                    { label: "Gross Margin", value: company.grossMargin },
                    { label: "Cash on Hand", value: company.cashOnHand },
                    { label: "Total Debt", value: company.totalDebt },
                    { label: "Employees", value: company.employees },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <span className="text-xs text-muted-foreground">
                        {metric.label}
                      </span>
                      <p className="font-mono text-base font-bold text-foreground mt-0.5">
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Use of Proceeds */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">
                    Use of Proceeds
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {company.useOfProceeds}
                </p>
              </div>

              {/* Risk Factors */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-foreground">
                    Key Risk Factors
                  </h2>
                </div>
                <ul className="space-y-3">
                  {company.riskFactors.map((risk, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm text-muted-foreground leading-relaxed"
                    >
                      <span className="font-mono text-xs text-amber-400/60 mt-0.5 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Competitive Landscape */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">
                    Competitive Landscape
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {company.competitiveLandscape}
                </p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Offering Summary */}
              <div className="p-6 rounded-xl bg-card border border-border/50 sticky top-20">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  Offering Summary
                </h2>
                <div className="space-y-4">
                  {[
                    { label: "Deal Size", value: company.dealSize, icon: DollarSign },
                    { label: "Proposed Range", value: company.proposedRange, icon: TrendingUp },
                    { label: "Exchange", value: company.exchange, icon: BarChart3 },
                    { label: "Filing Date", value: company.filingDate, icon: Calendar },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5 text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <span className="text-xs text-muted-foreground">
                    Lead Underwriters
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {company.leadUnderwriters.map((uw) => (
                      <span
                        key={uw}
                        className="px-2.5 py-1 rounded-md bg-secondary text-xs font-medium text-foreground"
                      >
                        {uw}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => handlePlaceholder("View SEC Filing")}
                  variant="outline"
                  className="w-full mt-5 border-border/60 text-foreground hover:bg-secondary"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View SEC Filing
                </Button>
              </div>

              {/* Filing History */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">
                    Filing History
                  </h2>
                </div>
                <div className="space-y-4">
                  {company.filingHistory.map((filing, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        {i < company.filingHistory.length - 1 && (
                          <div className="w-px flex-1 bg-border/50 mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-primary">
                            {filing.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {filing.date}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {filing.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Developments */}
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">
                    Recent Developments
                  </h2>
                </div>
                <ul className="space-y-3">
                  {company.recentDevelopments.map((dev, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-xs text-muted-foreground leading-relaxed"
                    >
                      <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                      {dev}
                    </li>
                  ))}
                </ul>
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
