import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Radar,
  ArrowLeft,
  Building2,
  Globe,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  Briefcase,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Link, useParams } from "wouter";
import CompanyChat from "@/components/CompanyChat";

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(0)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`status-${status} inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function CompanyDetail() {
  const params = useParams<{ slug: string }>();
  const { data: company, isLoading } = trpc.company.getBySlug.useQuery(
    { slug: params.slug || "" },
    { enabled: !!params.slug }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 rounded-lg mb-6" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Company Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The company you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-6">
        {/* Back Link */}
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Company Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="h-14 w-14 rounded-xl bg-primary/10 border border-border/50 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary">
              {company.ticker
                ? company.ticker.substring(0, 3)
                : company.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
              {company.ticker && (
                <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {company.ticker}
                </span>
              )}
              <StatusBadge status={company.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {company.industry && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {company.industry}
                </span>
              )}
              {company.exchange && (
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {company.exchange}
                </span>
              )}
              {company.headquarters && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {company.headquarters}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Company Description */}
        {company.description && (
          <Card className="bg-card/50 border-border/50 mb-6">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {company.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Company Facts Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Company Facts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Offering Details */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Offering Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FactRow label="Price Range" value={
                  company.priceLow && company.priceHigh
                    ? `$${company.priceLow} – $${company.priceHigh}`
                    : "—"
                } />
                {company.priceActual && (
                  <FactRow label="IPO Price" value={`$${company.priceActual}`} highlight />
                )}
                <FactRow label="Shares Offered" value={
                  company.sharesOffered
                    ? company.sharesOffered.toLocaleString()
                    : "—"
                } />
                <FactRow label="Offering Size" value={formatCurrency(company.offeringSize)} />
                <FactRow label="Market Cap" value={formatCurrency(company.marketCap)} />
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Timeline & Exchange
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FactRow label="Exchange" value={company.exchange || "—"} />
                <FactRow label="Expected Date" value={formatDate(company.expectedDate)} />
                {company.pricedDate && (
                  <FactRow label="Priced Date" value={formatDate(company.pricedDate)} highlight />
                )}
                <FactRow label="Lead Underwriter" value={company.leadUnderwriter || "—"} />
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Company Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FactRow label="Industry" value={company.industry || "—"} />
                <FactRow label="Sector" value={company.sector || "—"} />
                <FactRow label="CEO" value={company.ceo || "—"} />
                <FactRow label="Employees" value={company.employees ? String(company.employees).toLocaleString() : "—"} />
                <FactRow label="Founded" value={company.founded || "—"} />
                {company.website && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Website</span>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Visit <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financials */}
            {(company.revenue || company.netIncome) && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Financials {company.fiscalYear ? `(FY${company.fiscalYear})` : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FactRow label="Revenue" value={formatCurrency(company.revenue)} />
                  <FactRow
                    label="Net Income"
                    value={formatCurrency(company.netIncome)}
                    highlight={!!(company.netIncome && company.netIncome > 0)}
                    negative={!!(company.netIncome && company.netIncome < 0)}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Conversational Chat Interface */}
        <CompanyChat
          companyId={company.id}
          companySlug={company.slug}
          companyName={company.name}
        />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center h-16">
        <Link href="/">
          <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radar className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">IPO Radar</h1>
          </div>
        </Link>
      </div>
    </header>
  );
}

function FactRow({
  label,
  value,
  highlight,
  negative,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-medium ${
          negative
            ? "text-[oklch(0.6_0.2_25)]"
            : highlight
            ? "text-[oklch(0.7_0.15_160)]"
            : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
