import DashboardShell from "@/components/DashboardShell";
import { Link } from "wouter";
import { FileText, Brain, Download, Trash2, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const fakeSavedReports = [
  { id: "r1", companyName: "X-Energy, Inc.", cik: "0002088896", type: "AI First-Look", generatedDate: "2026-04-03", rating: "Moderate Buy", score: 72 },
  { id: "r2", companyName: "Magnum Ice Cream Co N.V.", cik: "0002071668", type: "AI First-Look", generatedDate: "2026-04-02", rating: "Buy", score: 81 },
  { id: "r3", companyName: "CGL Logistics Holdings", cik: "0002100001", type: "AI First-Look", generatedDate: "2026-04-01", rating: "Hold", score: 55 },
  { id: "r4", companyName: "Grayscale Bittensor Trust", cik: "0002100002", type: "AI First-Look", generatedDate: "2026-03-29", rating: "Speculative Buy", score: 63 },
  { id: "r5", companyName: "DUKE Robotics Corp.", cik: "0002100003", type: "AI First-Look", generatedDate: "2026-03-26", rating: "Hold", score: 48 },
  { id: "r6", companyName: "IceCure Medical Ltd.", cik: "0002100004", type: "AI First-Look", generatedDate: "2026-03-23", rating: "Moderate Buy", score: 69 },
  { id: "r7", companyName: "Yesway, Inc.", cik: "0002100005", type: "AI First-Look", generatedDate: "2026-03-28", rating: "Buy", score: 77 },
  { id: "r8", companyName: "Eagle Nuclear Energy Corp.", cik: "0002100006", type: "AI First-Look", generatedDate: "2026-03-20", rating: "Speculative Buy", score: 58 },
];

const ratingColors: Record<string, string> = {
  "Buy": "text-market-green",
  "Moderate Buy": "text-market-green",
  "Speculative Buy": "text-amber-400",
  "Hold": "text-muted-foreground",
  "Sell": "text-market-red",
};

export default function SavedReports() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-400" />
            Saved Reports
          </h1>
          <p className="text-sm text-muted-foreground">{fakeSavedReports.length} reports saved</p>
        </div>

        {/* Reports grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fakeSavedReports.map((report) => (
            <div key={report.id} className="bg-card border border-border/50 rounded-xl p-5 hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <span className="text-xs text-primary font-medium">{report.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toast("Feature coming soon", { description: "PDF download will be available soon." })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toast("Feature coming soon", { description: "Delete report will be available soon." })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-market-red transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-1">{report.companyName}</h3>

              <div className="flex items-center gap-3 mb-3">
                <span className={`text-sm font-medium ${ratingColors[report.rating] || "text-muted-foreground"}`}>
                  {report.rating}
                </span>
                <span className="text-xs text-muted-foreground">Score: {report.score}/100</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {report.generatedDate}
                </span>
                <Link href={`/report/${report.cik}`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1 h-7">
                    View Report <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
