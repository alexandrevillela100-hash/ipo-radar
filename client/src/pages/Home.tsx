import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import IPOCard from "@/components/IPOCard";
import SECIPOCard from "@/components/SECIPOCard";
import ConversationalDemo from "@/components/ConversationalDemo";
import { ipoCompanies, marketStats as mockStats } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Radar,
  FileSearch,
  GitCompare,
  Bell,
  BarChart3,
  Shield,
  ArrowRight,
  TrendingUp,
  FileText,
  AlertTriangle,
  Zap,
  RefreshCw,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";

/*
 * Design: Dark Terminal Luxe
 * - Deep charcoal base, slate card surfaces
 * - Teal primary accent, muted gold highlights
 * - DM Sans headings, JetBrains Mono for financial data
 * - Airbnb-style card grid for Upcoming IPOs
 *
 * Data: Hybrid approach
 * - Real SEC data from EDGAR (fetched via tRPC)
 * - Mock data as fallback / showcase examples
 */

/* ─── FAQ Accordion Item ─────────────────────────────────────────────── */
function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border/40 first:border-t first:border-border/40">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left group cursor-pointer"
      >
        <span
          className={`text-[15px] sm:text-base font-medium transition-colors duration-200 pr-4 ${
            isOpen ? "text-primary" : "text-foreground group-hover:text-primary"
          }`}
        >
          {question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={`shrink-0 w-5 h-5 flex items-center justify-center transition-colors duration-200 ${
            isOpen ? "text-primary" : "text-muted-foreground group-hover:text-primary"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 0.5V13.5M0.5 7H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm sm:text-[15px] text-muted-foreground leading-relaxed pr-10">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const handlePlaceholder = (label: string) => {
    toast("Feature coming soon", {
      description: `${label} will be available in a future release.`,
    });
  };

  // ─── Real SEC Data ──────────────────────────────────────────────────────
  const filingsQuery = trpc.edgar.filings.useQuery();
  const statsQuery = trpc.edgar.stats.useQuery();
  const ingestMutation = trpc.edgar.ingest.useMutation({
    onSuccess: (result) => {
      // Refetch data after ingestion
      filingsQuery.refetch();
      statsQuery.refetch();
      toast.success("SEC sync complete", {
        description: `Found ${result.filingsFound} filings, stored ${result.newFilingsStored} new ones. ${result.errors.length > 0 ? `${result.errors.length} errors.` : ""}`,
      });
    },
    onError: (error) => {
      toast.error("SEC sync failed", {
        description: error.message,
      });
    },
  });

  // Deduplicate filings: show only the most recent filing per company
  const uniqueFilings = useMemo(() => {
    if (!filingsQuery.data) return [];
    const seen = new Set<string>();
    return filingsQuery.data.filter((item) => {
      if (seen.has(item.company.cik)) return false;
      seen.add(item.company.cik);
      return true;
    });
  }, [filingsQuery.data]);

  const hasRealData = uniqueFilings.length > 0;
  const dbStats = statsQuery.data ?? { companies: 0, filings: 0 };

  // Split filings into Upcoming (initial filings) and Recent (amendments)
  const upcomingIPOs = useMemo(() => {
    return uniqueFilings.filter(
      (item) => !item.filing.formType.includes("/A")
    );
  }, [uniqueFilings]);

  const recentIPOs = useMemo(() => {
    return uniqueFilings.filter(
      (item) => item.filing.formType.includes("/A")
    );
  }, [uniqueFilings]);

  // Compute live market stats from real data
  const liveStats = useMemo(() => {
    if (!filingsQuery.data || filingsQuery.data.length === 0) return null;

    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekStr = oneWeekAgo.toISOString().slice(0, 10);

    const thisWeek = filingsQuery.data.filter(
      (f) => f.filing.filingDate >= weekStr
    );
    const amendments = filingsQuery.data.filter(
      (f) =>
        f.filing.formType.includes("/A") && f.filing.filingDate >= weekStr
    );

    return {
      newFilingsThisWeek: thisWeek.length,
      amendmentsDetected: amendments.length,
      totalCompanies: dbStats.companies,
      totalFilings: dbStats.filings,
    };
  }, [filingsQuery.data, dbStats]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 overflow-hidden grain-overlay">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.75_0.15_180/0.08),transparent_60%)]" />
        <div className="container relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Radar className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                SEC Filing Intelligence
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-foreground">
              See the IPO{" "}
              <span className="text-primary">before</span>{" "}
              the market does.
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              IPO Radar AI turns SEC filings into institutional-grade initiation
              reports — instantly. Monitor S-1 and F-1 filings, track amendments,
              and get AI-generated first-look research.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button
                size="lg"
                onClick={() => setLocation("/login")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base px-6"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/sample-report")}
                className="border-border/60 text-foreground hover:bg-secondary font-semibold text-base px-6"
              >
                Request Sample Report
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust/Proof Bar */}
      <section className="border-y border-border/50 bg-secondary/30">
        <div className="container py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-muted-foreground font-medium tracking-wide">
            {[
              "Monitors S-1, S-1/A, F-1, F-1/A",
              "SEC-powered source ingestion",
              "Amendment tracking",
              "AI-generated first-look reports",
              "Watchlists & alerts",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary/60" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conversational AI Demo */}
      <ConversationalDemo />

      {/* SEC Sync Control Bar */}
      <section className="py-6 border-b border-border/50">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  SEC EDGAR Data Pipeline
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasRealData
                    ? `${dbStats.companies} companies · ${dbStats.filings} filings in database`
                    : "No data synced yet — click Sync to fetch live SEC filings"}
                </p>
              </div>
            </div>
            <Button
              onClick={() => ingestMutation.mutate({ lookbackDays: 30 })}
              disabled={ingestMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {ingestMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing with SEC...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync with SEC
                </>
              )}
            </Button>
          </div>

          {/* Ingestion result banner */}
          {ingestMutation.isSuccess && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-emerald-300">
                Last sync: {ingestMutation.data.filingsFound} filings found,{" "}
                {ingestMutation.data.newFilingsStored} new,{" "}
                {ingestMutation.data.companiesProcessed} companies processed.
              </span>
            </div>
          )}
          {ingestMutation.isError && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs text-red-300">
                Sync error: {ingestMutation.error.message}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Market Snapshot Strip */}
      <section className="py-10">
        <div className="container">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-primary tracking-wide uppercase">
              What's Happening Now
            </h2>
            {hasRealData && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
                Live
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "New Filings This Week",
                value: liveStats
                  ? liveStats.newFilingsThisWeek
                  : mockStats.newFilingsThisWeek,
                icon: FileText,
                color: "text-blue-400",
              },
              {
                label: "Amendments Detected",
                value: liveStats
                  ? liveStats.amendmentsDetected
                  : mockStats.amendmentsDetected,
                icon: GitCompare,
                color: "text-amber-400",
              },
              {
                label: hasRealData ? "Companies Tracked" : "Likely Near-Term Launches",
                value: liveStats
                  ? liveStats.totalCompanies
                  : mockStats.likelyNearTermLaunches,
                icon: TrendingUp,
                color: "text-emerald-400",
              },
              {
                label: hasRealData ? "Total Filings" : "Material Changes",
                value: liveStats
                  ? liveStats.totalFilings
                  : mockStats.materialChanges,
                icon: hasRealData ? Database : AlertTriangle,
                color: hasRealData ? "text-primary" : "text-red-400",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground font-medium">
                    {stat.label}
                  </span>
                </div>
                <p className="font-mono text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Loading state */}
      {filingsQuery.isLoading && (
        <section className="py-20">
          <div className="container flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">
              Loading SEC filings...
            </span>
          </div>
        </section>
      )}

      {/* Upcoming IPOs — Companies with recent initial filings (S-1, F-1) */}
      {upcomingIPOs.length > 0 && (
        <section className="py-12">
          <div className="container">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">
                    Coming Soon
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  Upcoming IPOs
                </h2>
                <p className="text-muted-foreground mt-1.5">
                  Companies that recently filed S-1 or F-1 — preparing to go public.
                </p>
              </div>
              <Link
                href="/ipos"
                className="hidden sm:flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-semibold transition-colors no-underline"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingIPOs.slice(0, 6).map((item, i) => (
                <SECIPOCard
                  key={item.filing.accessionNumber}
                  data={item}
                  index={i}
                />
              ))}
            </div>
            <div className="flex justify-center mt-8 sm:hidden">
              <Link
                href="/ipos"
                className="flex items-center gap-1.5 text-sm text-primary font-semibold no-underline"
              >
                View all upcoming
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Recent IPOs — Companies with amendments or later-stage filings */}
      {recentIPOs.length > 0 && (
        <section className="py-12 border-t border-border/50 bg-secondary/10">
          <div className="container">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-3">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400 tracking-wide uppercase">
                    Recently Active
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  Recent IPOs
                </h2>
                <p className="text-muted-foreground mt-1.5">
                  Companies with recent amendments or advancing through the IPO process.
                </p>
              </div>
              <Link
                href="/ipos"
                className="hidden sm:flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-semibold transition-colors no-underline"
              >
                Browse all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentIPOs.slice(0, 6).map((item, i) => (
                <SECIPOCard
                  key={item.filing.accessionNumber}
                  data={item}
                  index={i}
                />
              ))}
            </div>
            <div className="flex justify-center mt-8 sm:hidden">
              <Link
                href="/ipos"
                className="flex items-center gap-1.5 text-sm text-primary font-semibold no-underline"
              >
                Browse all IPOs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Mock data fallback (shown when no real data) */}
      {!hasRealData && !filingsQuery.isLoading && (
        <section className="py-12">
          <div className="container">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  Upcoming IPOs
                </h2>
                <p className="text-muted-foreground mt-1.5">
                  Explore the latest SEC filings and discover companies preparing to go public.
                </p>
              </div>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-300">
                Showing sample data. Click <strong>"Sync with SEC"</strong>{" "}
                above to load real IPO filings from SEC EDGAR.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ipoCompanies.map((company, i) => (
                <IPOCard key={company.id} company={company} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-16 border-t border-border/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              How IPO Radar AI Works
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              From SEC filing to institutional-grade research in four automated steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Detect",
                description:
                  "Monitor new SEC IPO-related filings (S-1, F-1) in real time with automated polling.",
                icon: Radar,
              },
              {
                step: "02",
                title: "Structure",
                description:
                  "Extract issuer, offering, financial, and risk data into a usable structured schema.",
                icon: FileSearch,
              },
              {
                step: "03",
                title: "Compare",
                description:
                  "Identify what changed across amendments with side-by-side diff analysis.",
                icon: GitCompare,
              },
              {
                step: "04",
                title: "Deliver",
                description:
                  "Generate first-look reports, alerts, dashboards, and filing timelines automatically.",
                icon: Bell,
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-6 rounded-xl bg-card border border-border/50 group hover:border-primary/30 transition-all"
              >
                <span className="font-mono text-xs text-primary/50 font-semibold">
                  {item.step}
                </span>
                <div className="mt-3 mb-3">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Features */}
      <section className="py-16 border-t border-border/50 bg-secondary/20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Built for IPO Intelligence
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Every feature designed to give you an edge in tracking and analyzing IPO filings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "SEC Filing Monitor",
                description:
                  "Real-time monitoring of S-1, S-1/A, F-1, and F-1/A filings from SEC EDGAR with automated classification.",
                icon: Radar,
              },
              {
                title: "Amendment Diff Engine",
                description:
                  "Side-by-side comparison of filing versions highlighting material changes in pricing, financials, and risk factors.",
                icon: GitCompare,
              },
              {
                title: "AI First-Look Reports",
                description:
                  "Institutional-quality initiation reports generated automatically from structured filing data.",
                icon: FileSearch,
              },
              {
                title: "IPO Calendar Intelligence",
                description:
                  "Track filing timelines, expected pricing dates, and market windows with predictive signals.",
                icon: BarChart3,
              },
              {
                title: "Company Profiles",
                description:
                  "Comprehensive issuer pages with business overview, financials, offering details, and risk analysis.",
                icon: Shield,
              },
              {
                title: "Alerts & Watchlists",
                description:
                  "Custom watchlists with real-time alerts for new filings, amendments, and material changes.",
                icon: Bell,
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why We're Different */}
      <section className="py-16 border-t border-border/50">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Why We're Different
            </h2>
            <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
              Traditional IPO sites give you calendars, listings, and news. IPO Radar AI
              gives you{" "}
              <span className="text-primary font-semibold">
                filing ingestion, structured extraction, amendment analysis,
                AI-generated reports, and workflow alerts
              </span>
              — all from the primary source.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 max-w-4xl mx-auto">
            <div className="p-6 rounded-xl border border-border/50 bg-card">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Traditional IPO Sites
              </h3>
              <ul className="space-y-3">
                {[
                  "Calendar-based listings",
                  "News aggregation",
                  "Basic company profiles",
                  "Manual research required",
                  "No filing analysis",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-xl border border-primary/30 bg-primary/5">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                IPO Radar AI
              </h3>
              <ul className="space-y-3">
                {[
                  "Direct SEC filing ingestion",
                  "Structured data extraction",
                  "Amendment diff analysis",
                  "AI-generated first-look reports",
                  "Real-time workflow alerts",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Target Users */}
      <section className="py-16 border-t border-border/50 bg-secondary/20">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Built for Institutional Professionals
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "Hedge Funds & Long-Only Investors",
              "Family Offices",
              "Investment Banks & ECM Teams",
              "Corporate Development",
              "IR & Advisory Firms",
            ].map((user) => (
              <div
                key={user}
                className="px-5 py-3 rounded-xl bg-card border border-border/50 text-sm font-medium text-foreground"
              >
                {user}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common Questions */}
      <section className="py-20 border-t border-border/50">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight text-center mb-12">
              Common questions
            </h2>
            <div className="space-y-0">
              {[
                {
                  q: "What is IPO Radar AI and how does it work?",
                  a: "IPO Radar AI is an intelligence platform that monitors SEC EDGAR for S-1 and F-1 filings in near real-time. When a new IPO registration is detected, the system extracts structured financial data from the filing and generates an institutional-grade initiation report using AI. Every figure in the report comes directly from the SEC filing — nothing is estimated or inferred."
                },
                {
                  q: "Where does the financial data come from?",
                  a: "All financial data is sourced exclusively from SEC EDGAR — the official public repository of Securities and Exchange Commission filings. IPO Radar connects to the EDGAR EFTS (full-text search) and Submissions APIs to retrieve filings, company metadata, and XBRL financial data. The AI never fabricates financial figures; it only narrates and analyzes data that has been verified against the original filing."
                },
                {
                  q: "What types of SEC filings does IPO Radar track?",
                  a: "The platform tracks four filing types: S-1 (initial domestic IPO registration), S-1/A (amendments to domestic filings), F-1 (initial foreign private issuer registration), and F-1/A (amendments to foreign filings). This covers the full lifecycle of an IPO from initial registration through pricing, including every material amendment along the way."
                },
                {
                  q: "How are the AI initiation reports generated?",
                  a: "Reports follow a four-stage pipeline. First, the system collects raw filing data from SEC EDGAR. Second, it structures the data into a standardized package — financials, risk factors, use of proceeds, and business overview. Third, the LLM generates a section-by-section narrative using only the structured data as input. Finally, the system assembles the complete report with proper formatting and citations. The LLM is explicitly constrained to never invent financial data."
                },
                {
                  q: "Do I need a paid plan to use IPO Radar?",
                  a: "No. The Free tier gives you access to the IPO calendar, basic company profiles, and sector browsing. The Pro plan at $49 per month unlocks full AI-generated initiation reports, real-time filing alerts, watchlist functionality, amendment diff analysis, and priority data access. Enterprise pricing is available for teams that need API access, custom integrations, and dedicated support."
                },
                {
                  q: "How quickly are new filings detected?",
                  a: "IPO Radar monitors the SEC EDGAR EFTS API for new filings on a continuous basis. In practice, new S-1 and F-1 filings typically appear in the platform within minutes of being published on EDGAR. Amendment filings (S-1/A, F-1/A) are detected on the same schedule, and users with alerts enabled receive notifications as soon as a new filing is processed."
                },
                {
                  q: "Can I track specific companies or sectors?",
                  a: "Yes. The watchlist feature lets you follow specific companies and receive alerts when they file new documents or amend existing registrations. You can also browse by sector — the platform maps every company's SIC code to a human-readable sector classification. Custom alert rules let you filter by filing type, sector, or specific company, so you only see what matters to your workflow."
                },
              ].map((item, index) => (
                <FAQItem
                  key={index}
                  question={item.q}
                  answer={item.a}
                  isOpen={openFaqIndex === index}
                  onToggle={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 border-t border-border/50">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Get ahead of the IPO market.
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Join the professionals who see filings first.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Button
                size="lg"
                onClick={() => setLocation("/login")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base px-8"
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/login")}
                className="border-border/60 text-foreground hover:bg-secondary font-semibold text-base px-8"
              >
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 bg-secondary/20">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Radar className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                IPO Radar AI
              </span>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
              {["Product", "Coverage", "Reports", "Pricing", "Contact", "Terms", "Privacy"].map(
                (item) => (
                  <button
                    key={item}
                    onClick={() => handlePlaceholder(item)}
                    className="hover:text-foreground transition-colors"
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-6 text-center">
            SEC filings are monitored from official public sources. IPO Radar AI
            does not provide investment advice. All AI-generated content is for
            informational purposes only.
          </p>
        </div>
      </footer>

      {/* Global animation keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
