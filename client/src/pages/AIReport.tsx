import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  FileText,
  Shield,
  Target,
  Zap,
  Building2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const severityColors: Record<string, string> = {
  High: "text-red-400 bg-red-400/10 border-red-400/20",
  Medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

const ratingColors: Record<string, string> = {
  Favorable: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Neutral: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Cautious: "text-red-400 bg-red-400/10 border-red-400/20",
};

const sectionIcons: Record<string, any> = {
  "Business Overview": Building2,
  "Market Opportunity": Target,
  "Financial Analysis": BarChart3,
  "IPO Valuation Assessment": TrendingUp,
  "Risk Factors": Shield,
};

export default function AIReport() {
  const params = useParams<{ cik: string }>();
  const cik = params.cik || "";

  // Fetch company data for context
  const companyQuery = trpc.edgar.company.useQuery(
    { cik },
    { enabled: !!cik }
  );

  // AI report generation mutation
  const generateMutation = trpc.aiReport.generate.useMutation();

  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = () => {
    setHasGenerated(true);
    generateMutation.mutate({ cik });
  };

  const report = generateMutation.data?.success
    ? generateMutation.data.report
    : null;
  const error = generateMutation.data?.success === false
    ? generateMutation.data.error
    : null;

  const company = companyQuery.data;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-4xl">
          {/* Back link */}
          <Link
            href={cik ? `/ipo/${cik}` : "/ipos"}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground no-underline mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Company
          </Link>

          {/* Report Header */}
          <div className="bg-card border border-border/50 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                AI First-Look Report
              </span>
              {report && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Generated{" "}
                  {new Date(report.generatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-1">
              {company?.name || report?.companyName || `Company CIK: ${cik}`}
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {report
                ? `${report.ticker} · ${report.industry}`
                : company
                  ? `${company.ticker || "TBD"} · ${company.sicDescription || "N/A"}`
                  : "Loading..."}
            </p>

            {/* Rating badge — only show when report is generated */}
            {report?.verdict && (
              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    ratingColors[report.verdict.rating] ||
                    "text-muted-foreground bg-secondary/50 border-border"
                  }`}
                >
                  {report.verdict.rating === "Favorable" && (
                    <TrendingUp className="w-5 h-5" />
                  )}
                  {report.verdict.rating === "Cautious" && (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                  {report.verdict.rating === "Neutral" && (
                    <BarChart3 className="w-5 h-5" />
                  )}
                  <span className="text-lg font-bold">
                    {report.verdict.rating}
                  </span>
                </div>
              </div>
            )}

            {/* Generate button — show when not yet generated */}
            {!hasGenerated && (
              <Button
                size="lg"
                onClick={handleGenerate}
                className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2"
              >
                <Brain className="w-5 h-5" />
                Generate AI Report
              </Button>
            )}
          </div>

          {/* Loading state */}
          {generateMutation.isPending && (
            <div className="bg-card border border-border/50 rounded-xl p-12 mb-6 flex flex-col items-center gap-4">
              <div className="relative">
                <Brain className="w-12 h-12 text-primary/30" />
                <Loader2 className="w-8 h-8 text-primary animate-spin absolute top-2 left-2" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Generating AI Report...
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Our AI is analyzing SEC filing data and generating an
                institutional-grade initiation report. This typically takes
                15-30 seconds.
              </p>
              <div className="flex gap-2 text-xs text-muted-foreground/60">
                <span className="animate-pulse">
                  Analyzing company profile...
                </span>
              </div>
            </div>
          )}

          {/* Error state */}
          {(error || generateMutation.isError) && (
            <div className="bg-card border border-red-500/20 rounded-xl p-8 mb-6 flex flex-col items-center gap-3">
              <AlertTriangle className="w-10 h-10 text-red-400" />
              <h3 className="text-lg font-semibold text-foreground">
                Report Generation Failed
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                {error ||
                  generateMutation.error?.message ||
                  "An unexpected error occurred. Please try again."}
              </p>
              <Button
                variant="outline"
                onClick={handleGenerate}
                className="gap-2 mt-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Generated Report Content */}
          {report && (
            <>
              {/* AI-generated notice */}
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg mb-6">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-xs text-primary">
                  This report was generated by AI based on SEC filing data for{" "}
                  {report.companyName}. Analysis is hypothetical and for
                  informational purposes only.
                </span>
              </div>

              {/* Executive Summary */}
              <div className="bg-card border border-border/50 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Executive Summary
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {report.executiveSummary}
                </p>
              </div>

              {/* Report Sections */}
              {report.sections?.map(
                (
                  section: { title: string; content: string },
                  i: number
                ) => {
                  const Icon = sectionIcons[section.title] || FileText;
                  return (
                    <div
                      key={i}
                      className="bg-card border border-border/50 rounded-xl p-6 mb-6"
                    >
                      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Icon className="w-5 h-5 text-primary" />
                        {section.title}
                      </h2>
                      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {section.content}
                      </div>
                    </div>
                  );
                }
              )}

              {/* Risk Cards */}
              {report.risks && report.risks.length > 0 && (
                <div className="bg-card border border-border/50 rounded-xl p-6 mb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Key Risk Factors
                  </h2>
                  <div className="flex flex-col gap-3">
                    {report.risks.map(
                      (
                        risk: {
                          title: string;
                          severity: string;
                          description: string;
                        },
                        j: number
                      ) => (
                        <div
                          key={j}
                          className={`p-3 rounded-lg border ${
                            severityColors[risk.severity] ||
                            "text-muted-foreground bg-secondary/50 border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase">
                              {risk.severity}
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {risk.title}
                            </span>
                          </div>
                          <p className="text-xs opacity-80">
                            {risk.description}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Verdict */}
              {report.verdict && (
                <div className="bg-card border-2 border-primary/30 rounded-xl p-6 mb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Investment Verdict
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <p className="text-xs text-muted-foreground mb-1">
                        Rating
                      </p>
                      <p
                        className={`text-lg font-bold ${
                          report.verdict.rating === "Favorable"
                            ? "text-emerald-400"
                            : report.verdict.rating === "Cautious"
                              ? "text-red-400"
                              : "text-amber-400"
                        }`}
                      >
                        {report.verdict.rating}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <p className="text-xs text-muted-foreground mb-1">
                        Company
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {report.companyName}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {report.verdict.summary}
                  </p>
                </div>
              )}

              {/* Regenerate button */}
              <div className="flex justify-center mb-6">
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Report
                </Button>
              </div>
            </>
          )}

          {/* Disclaimer */}
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
              This report is generated by AI and is for informational purposes
              only. It does not constitute investment advice. Always conduct your
              own due diligence and consult with a qualified financial advisor
              before making investment decisions.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
