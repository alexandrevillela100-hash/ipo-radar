import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { Calendar, Clock, TrendingUp, BarChart3, AlertTriangle, Newspaper } from "lucide-react";

const fakeArticles = [
  {
    id: "q1-2026-review",
    title: "Q1 2026 IPO Market Review: A Strong Start Despite Macro Headwinds",
    excerpt: "The first quarter of 2026 saw 47 new IPO filings, a 23% increase over Q4 2025. Technology and healthcare sectors led the way, while fintech companies showed renewed investor appetite after a two-year drought.",
    category: "Market Review",
    date: "April 2, 2026",
    readTime: "8 min",
    trending: true,
  },
  {
    id: "ai-ipos-2026",
    title: "The AI IPO Wave: Which Companies Are Ready for Public Markets?",
    excerpt: "With over a dozen AI-focused companies filing S-1s in early 2026, we analyze which have the fundamentals to sustain post-IPO performance and which may be riding the hype cycle.",
    category: "Sector Analysis",
    date: "March 28, 2026",
    readTime: "12 min",
    trending: true,
  },
  {
    id: "sec-rule-changes",
    title: "SEC Proposes New Disclosure Requirements for IPO Candidates",
    excerpt: "The SEC's proposed amendments to Regulation S-K would require enhanced climate risk disclosures and cybersecurity incident reporting in S-1 filings. Here's what it means for upcoming IPOs.",
    category: "Regulatory",
    date: "March 22, 2026",
    readTime: "6 min",
    trending: false,
  },
  {
    id: "spac-vs-traditional",
    title: "SPAC vs. Traditional IPO: 2026 Performance Comparison",
    excerpt: "After the SPAC boom and bust, we compare the 12-month performance of companies that went public via SPAC versus traditional IPO in 2024-2025. The data tells a nuanced story.",
    category: "Research",
    date: "March 15, 2026",
    readTime: "10 min",
    trending: false,
  },
  {
    id: "biotech-pipeline",
    title: "Biotech IPO Pipeline: 15 Companies to Watch in Q2 2026",
    excerpt: "From gene therapy to GLP-1 competitors, the biotech IPO pipeline is packed with innovation. We profile the most promising candidates and their clinical-stage assets.",
    category: "Sector Analysis",
    date: "March 10, 2026",
    readTime: "15 min",
    trending: false,
  },
  {
    id: "ipo-pricing-guide",
    title: "Understanding IPO Pricing: A Guide for Retail Investors",
    excerpt: "How do underwriters set the IPO price range? What does it mean when a deal is 'priced above range'? We break down the mechanics of IPO pricing in plain language.",
    category: "Education",
    date: "March 5, 2026",
    readTime: "7 min",
    trending: false,
  },
];

const categoryColors: Record<string, string> = {
  "Market Review": "bg-primary/15 text-primary",
  "Sector Analysis": "bg-purple-500/15 text-purple-400",
  "Regulatory": "bg-amber-500/15 text-amber-400",
  "Research": "bg-blue-500/15 text-blue-400",
  "Education": "bg-green-500/15 text-green-400",
};

export default function MarketCommentary() {
  const featured = fakeArticles[0];
  const rest = fakeArticles.slice(1);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Newspaper className="w-8 h-8 text-primary" />
              Market Commentary
            </h1>
            <p className="text-muted-foreground">
              Expert analysis, sector insights, and educational content about the IPO market.
            </p>
          </div>

          {/* Featured article */}
          <Link
            href={`/commentary/${featured.id}`}
            className="block bg-card border border-border/50 rounded-xl overflow-hidden mb-8 group hover:border-primary/30 transition-all duration-300 no-underline"
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="aspect-video md:aspect-auto bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <BarChart3 className="w-20 h-20 text-primary/30" />
              </div>
              <div className="p-6 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[featured.category] || "bg-secondary text-muted-foreground"}`}>
                    {featured.category}
                  </span>
                  {featured.trending && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-market-green/15 text-market-green text-xs font-medium">
                      <TrendingUp className="w-3 h-3" />
                      Trending
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-3">
                  {featured.title}
                </h2>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {featured.excerpt}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {featured.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {featured.readTime}
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Article grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map((article) => (
              <Link
                key={article.id}
                href={`/commentary/${article.id}`}
                className="group bg-card border border-border/50 rounded-xl p-5 hover:border-primary/30 transition-all duration-300 no-underline flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[article.category] || "bg-secondary text-muted-foreground"}`}>
                    {article.category}
                  </span>
                  {article.trending && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-market-green/15 text-market-green text-xs font-medium">
                      <TrendingUp className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
                  {article.excerpt}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {article.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {article.readTime}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
