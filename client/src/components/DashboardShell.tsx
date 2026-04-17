import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Eye,
  Bell,
  FileText,
  Settings,
  Radar,
  ArrowLeft,
} from "lucide-react";

const sidebarItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Watchlist", href: "/dashboard/watchlist", icon: Eye },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { label: "Saved Reports", href: "/dashboard/reports", icon: FileText },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border/50 flex-col bg-sidebar">
        <div className="p-4 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Radar className="w-4 h-4 text-primary" />
            </div>
            <span className="text-base font-bold text-foreground">
              IPO Radar <span className="text-primary">AI</span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm no-underline transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border/50">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground no-underline transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to site
          </Link>
        </div>
      </aside>

      {/* Mobile top bar for dashboard */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <Radar className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-foreground">
              IPO Radar <span className="text-primary">AI</span>
            </span>
          </Link>
        </div>
        <div className="flex overflow-x-auto px-2 pb-2 gap-1">
          {sidebarItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap no-underline transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:pt-0 pt-24">
        <div className="p-6 md:p-8 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
