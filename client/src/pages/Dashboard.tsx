import DashboardShell from "@/components/DashboardShell";
import { Link } from "wouter";
import { Eye, Bell, FileText, Star, TrendingUp, Calendar, ArrowRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const fakeWatchlist = [
  { name: "X-Energy, Inc.", sector: "Energy", status: "S-1/A Filed", date: "Apr 3", change: "Amendment" },
  { name: "Magnum Ice Cream Co N.V.", sector: "Food & Beverage", status: "F-1 Filed", date: "Apr 2", change: "New Filing" },
  { name: "CGL Logistics Holdings", sector: "Transportation", status: "F-1 Filed", date: "Apr 1", change: "New Filing" },
];

const fakeAlerts = [
  { type: "filing", message: "X-Energy, Inc. filed an S-1/A amendment", time: "2 hours ago" },
  { type: "price", message: "New S-1 filing: Grayscale Bittensor Trust", time: "5 hours ago" },
  { type: "report", message: "AI Report ready for Magnum Ice Cream Co N.V.", time: "1 day ago" },
];

export default function Dashboard() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back. Here's your IPO activity overview.</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Watchlist</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">12</p>
            <p className="text-xs text-market-green">+3 this week</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Active Alerts</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">5</p>
            <p className="text-xs text-muted-foreground">2 unread</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">Saved Reports</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">8</p>
            <p className="text-xs text-muted-foreground">3 this month</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-market-green" />
              <span className="text-xs text-muted-foreground">New IPOs Today</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">4</p>
            <p className="text-xs text-market-green">+2 vs yesterday</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Watchlist preview */}
          <div className="bg-card border border-border/50 rounded-xl">
            <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                Watchlist
              </h2>
              <Link href="/dashboard/watchlist">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-border/20">
              {fakeWatchlist.map((item, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sector}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.change === "Amendment" ? "bg-amber-500/15 text-amber-400" : "bg-primary/15 text-primary"
                    }`}>
                      {item.change}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent alerts */}
          <div className="bg-card border border-border/50 rounded-xl">
            <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                Recent Alerts
              </h2>
              <Link href="/dashboard/alerts">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-border/20">
              {fakeAlerts.map((alert, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/ipos">
              <Button variant="outline" size="sm" className="gap-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Browse IPOs
              </Button>
            </Link>
            <Link href="/calendar">
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="w-3.5 h-3.5" />
                IPO Calendar
              </Button>
            </Link>
            <Link href="/compare">
              <Button variant="outline" size="sm" className="gap-2">
                <BarChart3 className="w-3.5 h-3.5" />
                Compare Companies
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
