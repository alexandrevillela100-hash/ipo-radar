import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { Brain, CheckCircle, ArrowRight, FileText, Shield, BarChart3, TrendingUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const reportSections = [
  { title: "Executive Summary", description: "AI-generated investment thesis with overall rating and confidence score", icon: Brain, unlocked: true },
  { title: "Business Overview", description: "Company description, key differentiators, and competitive positioning", icon: FileText, unlocked: true },
  { title: "Financial Analysis", description: "Revenue, profitability, balance sheet, and cash flow analysis", icon: BarChart3, unlocked: true },
  { title: "Market Opportunity", description: "TAM/SAM/SOM analysis with competitive landscape mapping", icon: TrendingUp, unlocked: false },
  { title: "Risk Assessment", description: "Categorized risk factors with severity ratings and mitigation analysis", icon: Shield, unlocked: false },
  { title: "IPO Valuation", description: "DCF model, comparable analysis, and fair value range estimation", icon: TrendingUp, unlocked: false },
  { title: "Investment Verdict", description: "Final rating, price target, and key investment considerations", icon: CheckCircle, unlocked: false },
];

export default function SampleReport() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                AI-Powered Analysis
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Institutional-Grade IPO Reports,
              <br />
              <span className="text-primary">Generated in Seconds</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Our AI reads the full S-1 filing and produces a comprehensive initiation report
              covering business analysis, financials, risks, valuation, and an investment verdict.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/report/sample">
                <Button size="lg" className="gap-2">
                  <Brain className="w-4 h-4" />
                  View Sample Report
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="gap-2">
                  See Pricing
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Report sections preview */}
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-border/30 bg-secondary/20">
              <h2 className="text-lg font-semibold text-foreground">What's Inside Each Report</h2>
            </div>
            <div className="divide-y divide-border/20">
              {reportSections.map((section, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${section.unlocked ? "bg-primary/10" : "bg-secondary/50"}`}>
                    <section.icon className={`w-5 h-5 ${section.unlocked ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                  {section.unlocked ? (
                    <span className="text-xs text-market-green font-medium flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Free Preview
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      Pro
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground font-mono">30s</p>
              <p className="text-xs text-muted-foreground">Generation Time</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary font-mono">7</p>
              <p className="text-xs text-muted-foreground">Analysis Sections</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground font-mono">100%</p>
              <p className="text-xs text-muted-foreground">S-1 Coverage</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-market-green font-mono">Free</p>
              <p className="text-xs text-muted-foreground">Preview Access</p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-8">
            <h2 className="text-xl font-bold text-foreground mb-2">Ready to try it?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Browse upcoming IPOs and generate your first AI report for free.
            </p>
            <Link href="/ipos">
              <Button size="lg" className="gap-2">
                Explore IPOs
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
