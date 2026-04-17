import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Calendar,
  Newspaper,
  BarChart3,
  Filter,
  Radar,
  ArrowLeft,
  Eye,
  Bell,
  FileText,
  Settings,
  LogOut,
  Search,
  ChevronDown,
  Crown,
  CreditCard,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getLoginUrl } from "@/const";
import SearchDialog from "./SearchDialog";
import { trpc } from "@/lib/trpc";

const mainNav = [
  { label: "IPO Calendar", href: "/app/calendar", icon: Calendar },
  { label: "IPO News", href: "/app/news", icon: Newspaper },
  { label: "IPO Stats", href: "/app/stats", icon: BarChart3 },
  { label: "Screens", href: "/app/screens", icon: Filter },
];

const userNav = [
  { label: "Watchlist", href: "/dashboard/watchlist", icon: Eye },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { label: "Saved Reports", href: "/dashboard/reports", icon: FileText },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function SubscriptionBadge() {
  const { isAuthenticated } = useAuth();
  const { data: billing } = trpc.billing.status.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: 1,
  });

  const isPro =
    billing &&
    (billing.tier === "pro" || billing.tier === "enterprise") &&
    (billing.status === "active" || billing.status === "trialing");

  const isTrialing = billing?.status === "trialing";

  if (isPro) {
    return (
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Crown className="w-4 h-4 text-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-400">
              {billing.tier === "enterprise" ? "Enterprise" : "Pro"}
              {isTrialing && " Trial"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-2">
      <Link
        href="/pricing"
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors no-underline group"
      >
        <Crown className="w-4 h-4 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-primary">Free Plan</p>
          <p className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">Upgrade to Pro</p>
        </div>
      </Link>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center animate-pulse">
            <Radar className="w-5 h-5 text-primary" />
          </div>
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  return (
    <>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-60 border-r border-border/50 flex-col bg-sidebar fixed inset-y-0 left-0 z-40">
          {/* Logo */}
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

          {/* Search */}
          <div className="px-3 pt-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground rounded-lg border border-border/50 hover:bg-sidebar-accent/50 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground/60">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Main Nav */}
          <nav className="flex-1 p-3 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-3 mb-1">
              Market Data
            </span>
            {mainNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm no-underline transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-primary font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-primary" : ""}`} />
                  {item.label}
                </Link>
              );
            })}

            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-3 mt-4 mb-1">
              My Account
            </span>
            {userNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm no-underline transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-primary font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-primary" : ""}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Subscription Status */}
          <SubscriptionBadge />

          {/* Footer */}
          <div className="p-3 border-t border-border/50">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground no-underline transition-colors rounded-lg hover:bg-sidebar-accent/50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to site
            </Link>
            <div className="relative mt-2">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user?.email || ""}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-xl py-1 z-50">
                  <button
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between h-14 px-4">
            <Link href="/" className="flex items-center gap-2 no-underline">
              <Radar className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-foreground">
                IPO Radar <span className="text-primary">AI</span>
              </span>
            </Link>
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          <div className="flex overflow-x-auto px-2 pb-2 gap-1">
            {mainNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap no-underline transition-colors ${
                    active
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
        <main className="flex-1 md:ml-60 md:pt-0 pt-24">
          <div className="p-6 md:p-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
