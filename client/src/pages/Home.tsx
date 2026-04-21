import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import IPOCard from "@/components/IPOCard";
import SECIPOCard from "@/components/SECIPOCard";
import { ipoCompanies, marketStats as mockStats } from "@/lib/data";
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
  Database,
  Loader2,
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

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const thisWeek = filingsQuery.data.filter(
      (f) => f.filing.filingDate >= weekStr
    );
    const amendmentsWeek = filingsQuery.data.filter(
      (f) =>
        f.filing.formType.includes("/A") && f.filing.filingDate >= weekStr
    );
    const last30 = filingsQuery.data.filter(
      (f) => f.filing.filingDate >= monthStr
    );
    const activeIssuers30 = new Set(last30.map((f) => f.company.cik)).size;

    return {
      newFilingsThisWeek: thisWeek.length,
      amendmentsThisWeek: amendmentsWeek.length,
      filings30Days: last30.length,
      activeIssuers30Days: activeIssuers30,
    };
  }, [filingsQuery.data]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section — Velocia look: hyper-realistic photo, serif display, DM Mono eyebrow */}
      <section className="relative min-h-[88vh] flex flex-col justify-end pt-28 pb-24 overflow-hidden grain-overlay">
        {/* Hyper-realistic photo background */}
        <div className="vv-hero-bg" aria-hidden="true" />
        {/* Teal grid overlay */}
        <div className="vv-hero-grid" aria-hidden="true" />

        <div className="container relative z-10">
          <div className="max-w-3xl">
            <div className="vv-eyebrow mb-7">
              <Radar className="w-3 h-3 -mr-2 opacity-80" />
              SEC Filing Intelligence
            </div>
            <h1 className="vv-display text-[clamp(48px,7.5vw,104px)] text-foreground max-w-[900px] mb-8">
              See the IPO <em>before</em> the market does.
            </h1>
            <p className="text-[17px] sm:text-lg text-foreground/65 max-w-xl leading-[1.85] font-light mb-11">
              IPO Radar AI turns SEC filings into institutional-grade initiation
              reports — instantly. Monitor S-1 and F-1 filings, track amendments,
              and get AI-generated first-look research.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <button
                onClick={() => setLocation("/login")}
                className="vv-btn-primary"
              >
                Get Started Free
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setLocation("/sample-report")}
                className="vv-btn-outline"
              >
                See a Sample Report
              </button>
            </div>
            <p className="mt-8 font-mono text-[11px] text-muted-foreground tracking-[0.14em] uppercase">
              Free tier
              <span className="mx-3 opacity-40">·</span>
              Pro $49/mo
              <span className="mx-3 opacity-40">·</span>
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Trust/Proof Bar — concrete source proof in DM Mono */}
      <section className="border-y border-border/40 bg-card/40">
        <div className="container py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {[
              { label: "Source", value: "SEC EDGAR (official)" },
              { label: "Coverage", value: "S-1 · S-1/A · F-1 · F-1/A" },
              { label: "Latency", value: "Minutes after publication" },
              { label: "Method", value: "Structured extraction, zero fabrication" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="font-mono text-[9px] text-primary uppercase tracking-[0.22em] opacity-80">
                  {item.label}
                </span>
                <span className="font-mono text-[11px] text-foreground/85 tracking-[0.06em]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Market Snapshot Strip */}
      <section className="py-20" style={{ background: "oklch(0.18 0.015 195)" }}>
        <div className="container">
          <div className="vv-eyebrow mb-4">
            <Zap className="w-3 h-3 -mr-2 opacity-80" />
            What's Happening Now
            {hasRealData && (
              <span className="ml-1 px-2 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-400 text-[9px] font-semibold tracking-[0.16em]">
                LIVE
              </span>
            )}
          </div>
          <h2 className="vv-section-title text-[clamp(32px,3.2vw,48px)] text-foreground mb-4 max-w-2xl">
            A live window into <em>S-1 &amp; F-1</em> activity.
          </h2>
          <p className="text-[15px] text-muted-foreground mb-10 max-w-xl font-light leading-[1.75]">
            {hasRealData
              ? "The last 30 days of registration activity, pulled directly from SEC EDGAR and structured for institutional workflows."
              : "Sample snapshot of a typical week across U.S. and foreign private IPO issuers. Connect to see live numbers."}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "New Filings",
                window: "This week",
                value: liveStats
                  ? liveStats.newFilingsThisWeek
                  : mockStats.newFilingsThisWeek,
                icon: FileText,
              },
              {
                label: "Amendments",
                window: "This week",
                value: liveStats
                  ? liveStats.amendmentsThisWeek
                  : mockStats.amendmentsDetected,
                icon: GitCompare,
              },
              {
                label: hasRealData ? "Active Issuers" : "Likely Launches",
                window: hasRealData ? "Last 30 days" : "Near-term",
                value: liveStats
                  ? liveStats.activeIssuers30Days
                  : mockStats.likelyNearTermLaunches,
                icon: TrendingUp,
              },
              {
                label: hasRealData ? "Filings Indexed" : "Material Changes",
                window: hasRealData ? "Last 30 days" : "Tracked",
                value: liveStats
                  ? liveStats.filings30Days
                  : mockStats.materialChanges,
                icon: hasRealData ? Database : AlertTriangle,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="relative p-7 border border-border/60 bg-popover/40 hover:border-primary/30 transition-colors"
                style={{ borderRadius: "2px" }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <stat.icon className="w-3.5 h-3.5 text-primary opacity-70" />
                  <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.18em]">
                    {stat.label}
                  </span>
                </div>
                <p className="font-serif text-5xl font-light text-foreground leading-none">
                  {stat.value}
                </p>
                <p className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-[0.2em] mt-4">
                  {stat.window}
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
        <section className="py-24">
          <div className="container">
            <div className="flex items-end justify-between mb-12">
              <div>
                <div className="vv-eyebrow mb-5">
                  <TrendingUp className="w-3 h-3 -mr-2 opacity-80" />
                  Coming Soon
                </div>
                <h2 className="vv-section-title text-[clamp(32px,3.2vw,48px)] text-foreground mb-3">
                  Upcoming <em>IPOs</em>
                </h2>
                <p className="text-[15px] text-muted-foreground max-w-xl font-light leading-[1.75]">
                  Companies that recently filed S-1 or F-1 — preparing to go public.
                </p>
              </div>
              <Link
                href="/ipos"
                className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-primary hover:text-primary/80 tracking-[0.16em] uppercase no-underline transition-colors"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
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
        <section className="py-24 border-t border-border/40" style={{ background: "oklch(0.17 0.013 195)" }}>
          <div className="container">
            <div className="flex items-end justify-between mb-12">
              <div>
                <div className="vv-eyebrow mb-5">
                  <FileText className="w-3 h-3 -mr-2 opacity-80" />
                  Recently Active
                </div>
                <h2 className="vv-section-title text-[clamp(32px,3.2vw,48px)] text-foreground mb-3">
                  Recent <em>IPOs</em>
                </h2>
                <p className="text-[15px] text-muted-foreground max-w-xl font-light leading-[1.75]">
                  Companies with recent amendments or advancing through the IPO process.
                </p>
              </div>
              <Link
                href="/ipos"
                className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-primary hover:text-primary/80 tracking-[0.16em] uppercase no-underline transition-colors"
              >
                Browse all
                <ArrowRight className="w-3.5 h-3.5" />
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
        <section className="py-24">
          <div className="container">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="vv-eyebrow mb-5">
                  <TrendingUp className="w-3 h-3 -mr-2 opacity-80" />
                  Sample Set
                </div>
                <h2 className="vv-section-title text-[clamp(32px,3.2vw,48px)] text-foreground mb-3">
                  Upcoming <em>IPOs</em>
                </h2>
                <p className="text-[15px] text-muted-foreground max-w-xl font-light leading-[1.75]">
                  Explore sample issuers preparing to go public. Real SEC data loads as it becomes available.
                </p>
              </div>
            </div>
            <div className="mb-6 p-4 border border-primary/20 bg-primary/[0.04]" style={{ borderRadius: "2px" }}>
              <p className="font-mono text-[10px] text-primary/90 uppercase tracking-[0.14em]">
                ⓘ &nbsp;Showing sample data while live SEC ingestion is running.
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
      <section className="py-24 border-t border-border/40">
        <div className="container">
          <div className="text-center mb-14">
            <div className="vv-eyebrow mb-5 justify-center">
              The Pipeline
            </div>
            <h2 className="vv-section-title text-[clamp(32px,3.5vw,52px)] text-foreground mb-4">
              From SEC filing to <em>institutional research</em>.
            </h2>
            <p className="text-[15px] text-muted-foreground max-w-xl mx-auto font-light leading-[1.75]">
              Four automated steps, zero manual handoffs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                className="relative p-7 bg-card border border-border/60 group hover:border-primary/40 transition-all"
                style={{ borderRadius: "2px" }}
              >
                <span className="font-mono text-[10px] text-primary/60 tracking-[0.2em]">
                  {item.step} —
                </span>
                <div className="mt-5 mb-4">
                  <item.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-2xl font-medium text-foreground mb-3 leading-tight">
                  {item.title}
                </h3>
                <p className="text-[13.5px] text-muted-foreground leading-relaxed font-light">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Features */}
      <section className="py-24 border-t border-border/40" style={{ background: "oklch(0.17 0.013 195)" }}>
        <div className="container">
          <div className="text-center mb-14">
            <div className="vv-eyebrow mb-5 justify-center">
              Capabilities
            </div>
            <h2 className="vv-section-title text-[clamp(32px,3.5vw,52px)] text-foreground mb-4">
              Built for <em>IPO intelligence</em>.
            </h2>
            <p className="text-[15px] text-muted-foreground max-w-xl mx-auto font-light leading-[1.75]">
              Every feature designed to give you an edge in tracking and analyzing IPO filings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                className="p-7 bg-card/80 border border-border/60 hover:border-primary/30 transition-all group"
                style={{ borderRadius: "2px" }}
              >
                <div className="w-10 h-10 flex items-center justify-center mb-5 border border-primary/25 bg-primary/5 group-hover:bg-primary/10 transition-colors" style={{ borderRadius: "2px" }}>
                  <feature.icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-xl font-medium text-foreground mb-3 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-[13.5px] text-muted-foreground leading-relaxed font-light">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why We're Different */}
      <section className="py-24 border-t border-border/40">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="vv-eyebrow mb-5 justify-center">
              The Difference
            </div>
            <h2 className="vv-section-title text-[clamp(32px,3.5vw,52px)] text-foreground mb-5">
              Why we&rsquo;re <em>different</em>.
            </h2>
            <p className="text-[16px] text-muted-foreground leading-[1.85] font-light">
              Traditional IPO sites give you calendars, listings, and news. IPO Radar AI
              gives you{" "}
              <span className="text-primary font-normal italic font-serif text-[17px]">
                filing ingestion, structured extraction, amendment analysis,
                AI-generated reports, and workflow alerts
              </span>
              {" "}— all from the primary source.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-14 max-w-4xl mx-auto">
            <div className="p-7 border border-border/60 bg-card" style={{ borderRadius: "2px" }}>
              <h3 className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.22em] mb-5">
                Traditional IPO Sites
              </h3>
              <ul className="space-y-3.5">
                {[
                  "Calendar-based listings",
                  "News aggregation",
                  "Basic company profiles",
                  "Manual research required",
                  "No filing analysis",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-[14px] text-muted-foreground font-light"
                  >
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-7 border border-primary/30 bg-primary/5" style={{ borderRadius: "2px" }}>
              <h3 className="font-mono text-[10px] text-primary uppercase tracking-[0.22em] mb-5">
                IPO Radar AI
              </h3>
              <ul className="space-y-3.5">
                {[
                  "Direct SEC filing ingestion",
                  "Structured data extraction",
                  "Amendment diff analysis",
                  "AI-generated first-look reports",
                  "Real-time workflow alerts",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-[14px] text-foreground font-light"
                  >
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Target Users */}
      <section className="py-24 border-t border-border/40" style={{ background: "oklch(0.17 0.013 195)" }}>
        <div className="container">
          <div className="text-center mb-12">
            <div className="vv-eyebrow mb-5 justify-center">
              Who It&rsquo;s For
            </div>
            <h2 className="vv-section-title text-[clamp(32px,3.5vw,52px)] text-foreground">
              Built for <em>institutional</em> professionals.
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {[
              "Hedge Funds & Long-Only Investors",
              "Family Offices",
              "Investment Banks & ECM Teams",
              "Corporate Development",
              "IR & Advisory Firms",
            ].map((user) => (
              <div
                key={user}
                className="px-5 py-3 bg-card border border-border/60 font-mono text-[11px] text-foreground tracking-[0.08em]"
                style={{ borderRadius: "2px" }}
              >
                {user}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common Questions */}
      <section className="py-24 border-t border-border/40">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <div className="vv-eyebrow mb-5 justify-center">
              FAQ
            </div>
            <h2 className="vv-section-title text-[clamp(32px,3.5vw,52px)] text-foreground text-center mb-14">
              Common <em>questions</em>.
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
      <section
        className="py-28 border-t border-border/40 relative overflow-hidden"
        style={{ background: "oklch(0.17 0.02 195)" }}
      >
        {/* Giant serif watermark — Velocia signature */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none select-none font-serif"
          style={{
            top: "-40px",
            right: "-30px",
            fontSize: "320px",
            fontWeight: 300,
            color: "var(--primary)",
            opacity: 0.028,
            lineHeight: 1,
            letterSpacing: "-0.05em",
          }}
        >
          IR
        </div>
        <div className="container relative">
          <div className="max-w-2xl mx-auto text-center">
            <div className="vv-eyebrow mb-6 justify-center">
              Get Started
            </div>
            <h2 className="vv-section-title text-[clamp(36px,4.5vw,68px)] text-foreground mb-5">
              Get ahead of the <em>IPO market</em>.
            </h2>
            <p className="text-[16px] text-muted-foreground font-light leading-[1.85] mb-10 max-w-lg mx-auto">
              Join the professionals who see filings first.
            </p>
            <div className="flex flex-wrap justify-center gap-5">
              <button onClick={() => setLocation("/login")} className="vv-btn-primary">
                Get Started Free
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setLocation("/login")} className="vv-btn-outline">
                Create Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-14" style={{ background: "oklch(0.14 0.012 195)" }}>
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Radar className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              <span className="font-serif text-[17px] font-medium text-foreground tracking-wide">
                IPO Radar <span className="text-primary italic font-light">AI</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-7">
              {["Product", "Coverage", "Reports", "Pricing", "Contact", "Terms", "Privacy"].map(
                (item) => (
                  <button
                    key={item}
                    onClick={() => handlePlaceholder(item)}
                    className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em] hover:text-primary transition-colors"
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground/50 mt-10 text-center tracking-[0.06em] leading-relaxed max-w-2xl mx-auto">
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
