import { Link } from "wouter";
import { Radar } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/50 mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 no-underline mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Radar className="w-4 h-4 text-primary" />
              </div>
              <span className="text-base font-bold text-foreground">
                IPO Radar <span className="text-primary">AI</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered IPO intelligence. Turning SEC filings into institutional-grade insights.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Product</h4>
            <div className="flex flex-col gap-2">
              <Link href="/ipos" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">Browse IPOs</Link>
              <Link href="/calendar" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">IPO Calendar</Link>
              <Link href="/sectors" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">Sectors</Link>
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">Pricing</Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Resources</h4>
            <div className="flex flex-col gap-2">
              <Link href="/digest" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">Weekly Digest</Link>
              <Link href="/sample-report" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">Sample Report</Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">About Us</Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">Contact</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Legal</h4>
            <div className="flex flex-col gap-2">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">Privacy Policy</Link>
              <Link href="/disclaimer" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">Disclaimer</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} IPO Radar AI. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Data sourced from SEC EDGAR. Not investment advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
