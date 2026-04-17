import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Radar, Target, Shield, Users, Brain, BarChart3 } from "lucide-react";

const values = [
  { icon: Shield, title: "Transparency", description: "We believe every investor deserves access to the same quality of analysis that institutional players have. Our AI reports are built on publicly available SEC data — no black boxes." },
  { icon: Brain, title: "AI-First", description: "We leverage cutting-edge language models to read, analyze, and synthesize S-1 filings in seconds — work that would take a human analyst days to complete." },
  { icon: Target, title: "Accuracy", description: "Every data point traces back to an official SEC filing. We clearly label simulated data and AI-generated analysis so you always know what's real." },
  { icon: Users, title: "Accessibility", description: "From retail investors to institutional analysts, our platform is designed to be intuitive and useful regardless of your experience level." },
];

const milestones = [
  { date: "Q1 2026", event: "IPO Radar AI founded" },
  { date: "Q1 2026", event: "SEC EDGAR integration completed" },
  { date: "Q2 2026", event: "AI First-Look Report engine launched" },
  { date: "Q2 2026", event: "Public beta release" },
  { date: "Q3 2026", event: "Pro tier and API access (planned)" },
  { date: "Q4 2026", event: "Enterprise offering (planned)" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Radar className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">Our Mission</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Democratizing IPO Intelligence
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              IPO Radar AI transforms raw SEC filings into actionable investment intelligence,
              giving every investor the tools that were once reserved for Wall Street.
            </p>
          </div>

          {/* Story */}
          <div className="bg-card border border-border/50 rounded-xl p-8 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Our Story</h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
              <p>
                The IPO market has always been opaque. When a company files an S-1 with the SEC, the document
                can be hundreds of pages long — filled with legal language, financial tables, and risk disclosures
                that take experienced analysts days to parse. Retail investors are left at a disadvantage, often
                relying on headlines and social media for their IPO research.
              </p>
              <p>
                IPO Radar AI was built to change that. By combining real-time SEC EDGAR data feeds with advanced
                AI analysis, we can generate comprehensive initiation reports in seconds — the same type of
                analysis that investment banks charge thousands of dollars to produce.
              </p>
              <p>
                Our platform monitors every S-1, F-1, and related amendment filed with the SEC, automatically
                extracting key data points and generating AI-powered First-Look Reports that cover business
                analysis, financial metrics, market opportunity, risk assessment, and valuation.
              </p>
            </div>
          </div>

          {/* Values */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-6 text-center">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {values.map((value, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <value.icon className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">{value.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-card border border-border/50 rounded-xl p-8 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-6">Roadmap</h2>
            <div className="space-y-4">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${i < 3 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    {i < milestones.length - 1 && <div className="w-px h-8 bg-border/30" />}
                  </div>
                  <div className="-mt-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{m.date}</span>
                    <p className={`text-sm font-medium ${i < 3 ? "text-foreground" : "text-muted-foreground"}`}>
                      {m.event}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data sources */}
          <div className="bg-card border border-border/50 rounded-xl p-8">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Data Sources
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              All data on IPO Radar AI comes from official, publicly available sources:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><strong className="text-foreground">SEC EDGAR</strong> — Electronic Data Gathering, Analysis, and Retrieval system. All S-1, F-1, and related filings.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><strong className="text-foreground">EDGAR Full-Text Search (EFTS)</strong> — Real-time search of all SEC filings by form type, date, and content.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><strong className="text-foreground">EDGAR Submissions API</strong> — Company profiles, filing histories, and SIC industry classifications.</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
