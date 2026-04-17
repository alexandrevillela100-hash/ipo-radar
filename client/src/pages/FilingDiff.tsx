import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link, useParams } from "wouter";
import { ArrowLeft, FileText, Plus, Minus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fake diff data for demonstration
const fakeDiffSections = [
  {
    title: "Cover Page",
    changes: [
      { type: "modified", field: "Filing Date", old: "March 15, 2026", new: "April 3, 2026" },
      { type: "modified", field: "Amendment Number", old: "N/A", new: "Amendment No. 1" },
    ],
  },
  {
    title: "Risk Factors",
    changes: [
      { type: "added", text: "We face additional risks related to recent changes in international trade policies that may affect our supply chain and increase costs of raw materials." },
      { type: "modified", field: "Regulatory Risk", old: "We are subject to various regulatory requirements.", new: "We are subject to various regulatory requirements, including recently proposed SEC climate disclosure rules that may increase our compliance costs." },
    ],
  },
  {
    title: "Use of Proceeds",
    changes: [
      { type: "modified", field: "Estimated Net Proceeds", old: "$180 million", new: "$210 million" },
      { type: "added", text: "Approximately $30 million of net proceeds will be allocated to international expansion in the European market." },
    ],
  },
  {
    title: "Financial Statements",
    changes: [
      { type: "modified", field: "Revenue (FY 2025)", old: "$145.2 million", new: "$152.8 million (updated)" },
      { type: "modified", field: "Net Loss (FY 2025)", old: "($23.1 million)", new: "($19.4 million) (revised)" },
      { type: "removed", text: "Interim financial statements for Q3 2025 have been removed and replaced with audited full-year 2025 results." },
    ],
  },
  {
    title: "Dilution",
    changes: [
      { type: "modified", field: "Shares Outstanding (post-IPO)", old: "45,000,000", new: "48,500,000" },
      { type: "modified", field: "IPO Price Range", old: "$14.00 - $16.00", new: "$15.00 - $17.00" },
    ],
  },
  {
    title: "Underwriting",
    changes: [
      { type: "added", text: "Citigroup has been added as a co-manager for the offering." },
      { type: "modified", field: "Underwriting Discount", old: "7.0%", new: "6.5%" },
    ],
  },
];

export default function FilingDiff() {
  const params = useParams<{ cik: string }>();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-5xl">
          {/* Back link */}
          <Link href={params.cik ? `/ipo/${params.cik}` : "/ipos"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground no-underline mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Company
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Filing Diff Viewer
            </h1>
            <p className="text-muted-foreground mb-4">
              Compare changes between the original S-1 filing and the latest amendment (S-1/A).
            </p>

            {/* Version selector */}
            <div className="flex items-center gap-4 bg-card border border-border/50 rounded-xl p-4">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1">Original Filing</label>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">S-1 — March 15, 2026</span>
                </div>
              </div>
              <div className="text-muted-foreground text-lg">→</div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1">Amendment</label>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-foreground">S-1/A — April 3, 2026</span>
                </div>
              </div>
            </div>
          </div>

          {/* Simulated data badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-6">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-400">Simulated diff data for demonstration. Real diff parsing will be available in a future release.</span>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground font-mono">6</p>
              <p className="text-xs text-muted-foreground">Sections Changed</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-market-green font-mono">3</p>
              <p className="text-xs text-muted-foreground">Additions</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-market-red font-mono">1</p>
              <p className="text-xs text-muted-foreground">Removals</p>
            </div>
          </div>

          {/* Diff sections */}
          <div className="flex flex-col gap-6">
            {fakeDiffSections.map((section, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border/30 bg-secondary/20">
                  <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                </div>
                <div className="p-5 flex flex-col gap-3">
                  {section.changes.map((change: any, j: number) => (
                    <div key={j}>
                      {change.type === "modified" && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">{change.field}</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-lg bg-market-red/5 border border-market-red/20">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Minus className="w-3 h-3 text-market-red" />
                                <span className="text-[10px] text-market-red font-medium">REMOVED</span>
                              </div>
                              <p className="text-sm text-foreground/80 line-through">{change.old}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-market-green/5 border border-market-green/20">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Plus className="w-3 h-3 text-market-green" />
                                <span className="text-[10px] text-market-green font-medium">ADDED</span>
                              </div>
                              <p className="text-sm text-foreground">{change.new}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {change.type === "added" && (
                        <div className="p-2.5 rounded-lg bg-market-green/5 border border-market-green/20">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Plus className="w-3 h-3 text-market-green" />
                            <span className="text-[10px] text-market-green font-medium">NEW CONTENT</span>
                          </div>
                          <p className="text-sm text-foreground">{change.text}</p>
                        </div>
                      )}
                      {change.type === "removed" && (
                        <div className="p-2.5 rounded-lg bg-market-red/5 border border-market-red/20">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Minus className="w-3 h-3 text-market-red" />
                            <span className="text-[10px] text-market-red font-medium">REMOVED</span>
                          </div>
                          <p className="text-sm text-foreground/80 line-through">{change.text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
