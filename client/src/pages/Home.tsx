import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Radar,
  TrendingUp,
  Building2,
  DollarSign,
  Calendar,
  Search,
  ArrowRight,
  BarChart3,
  Shield,
  Settings,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`status-${status} inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const filters = useMemo(
    () => ({
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: search || undefined,
    }),
    [statusFilter, search]
  );

  const { data: companies, isLoading } = trpc.company.list.useQuery(filters);
  const { data: stats } = trpc.company.stats.useQuery();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">IPO Radar</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/admin")}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Admin
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-border/30">
        <div className="container py-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Track the IPO Market
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Research upcoming and recent IPOs with AI-powered analysis grounded
              in SEC filings. Ask questions, explore risks, and make informed
              decisions.
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <StatCard
              label="Total IPOs"
              value={stats?.total ?? 0}
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <StatCard
              label="Upcoming"
              value={stats?.upcoming ?? 0}
              icon={<Calendar className="h-4 w-4" />}
              color="text-[oklch(0.75_0.12_80)]"
            />
            <StatCard
              label="Priced"
              value={stats?.priced ?? 0}
              icon={<DollarSign className="h-4 w-4" />}
              color="text-primary"
            />
            <StatCard
              label="Trading"
              value={stats?.trading ?? 0}
              icon={<TrendingUp className="h-4 w-4" />}
              color="text-[oklch(0.7_0.15_160)]"
            />
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="container py-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company name or ticker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-card">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="priced">Priced</SelectItem>
              <SelectItem value="trading">Trading</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Company List */}
      <section className="container pb-16">
        {isLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : !companies || companies.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No IPOs found matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {companies.map((company: any) => (
              <CompanyRow key={company.id} company={company} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={color || "text-muted-foreground"}>{icon}</span>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {label}
          </span>
        </div>
        <p className={`text-2xl font-bold ${color || "text-foreground"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function CompanyRow({ company }: { company: any }) {
  return (
    <Link href={`/company/${company.slug}`}>
      <Card className="bg-card/50 border-border/50 hover:border-primary/30 hover:bg-card/80 transition-all group">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            {/* Company Icon */}
            <div className="h-12 w-12 rounded-lg bg-primary/5 border border-border/50 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">
                {company.ticker
                  ? company.ticker.substring(0, 3)
                  : company.name.substring(0, 2).toUpperCase()}
              </span>
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {company.name}
                </h3>
                {company.ticker && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {company.ticker}
                  </span>
                )}
                <StatusBadge status={company.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {company.industry && <span>{company.industry}</span>}
                {company.exchange && (
                  <span className="font-mono text-xs">{company.exchange}</span>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="hidden md:flex items-center gap-6 shrink-0">
              <MetricCell
                label="Price Range"
                value={
                  company.priceActual
                    ? `$${company.priceActual}`
                    : company.priceLow && company.priceHigh
                    ? `$${company.priceLow}–$${company.priceHigh}`
                    : "—"
                }
              />
              <MetricCell
                label="Offering"
                value={formatCurrency(company.offeringSize)}
              />
              <MetricCell
                label={company.pricedDate ? "Priced" : "Expected"}
                value={formatDate(company.pricedDate || company.expectedDate)}
              />
            </div>

            {/* Arrow */}
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right min-w-[90px]">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
