import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Radar, Menu, X, Search, Bell } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import SearchDialog from "./SearchDialog";

const publicNav = [
  { label: "Home", href: "/" },
  { label: "Browse IPOs", href: "/ipos" },
  { label: "Calendar", href: "/calendar" },
  { label: "Sectors", href: "/sectors" },
  { label: "Pricing", href: "/pricing" },
];

const authNav = [
  { label: "Home", href: "/" },
  { label: "Browse IPOs", href: "/ipos" },
  { label: "Calendar", href: "/calendar" },
  { label: "Sectors", href: "/sectors" },
  { label: "Digest", href: "/digest" },
];

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = isAuthenticated ? authNav : publicNav;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Radar className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              IPO Radar <span className="text-primary">AI</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`px-3 py-2 text-sm rounded-md transition-colors no-underline ${
                  location === item.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50 flex items-center gap-2"
              title="Search (⌘K)"
            >
              <Search className="w-4 h-4" />
              <span className="text-xs text-muted-foreground/60 hidden lg:inline">
                <kbd className="px-1.5 py-0.5 rounded bg-secondary/60 text-[10px] font-mono">
                  ⌘K
                </kbd>
              </span>
            </button>

            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard/alerts"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50 relative"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary hover:bg-primary/30 transition-colors"
                  >
                    {user?.name?.[0] || "U"}
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-10 w-48 bg-card border border-border rounded-lg shadow-xl py-1 z-50">
                      <Link
                        href="/app/calendar"
                        className="block px-4 py-2 text-sm text-foreground hover:bg-secondary/50 no-underline"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        My Dashboard
                      </Link>
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-foreground hover:bg-secondary/50 no-underline"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Overview
                      </Link>
                      <Link
                        href="/dashboard/watchlist"
                        className="block px-4 py-2 text-sm text-foreground hover:bg-secondary/50 no-underline"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Watchlist
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        className="block px-4 py-2 text-sm text-foreground hover:bg-secondary/50 no-underline"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <hr className="border-border my-1" />
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-secondary/50"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors no-underline"
                >
                  Log in
                </Link>
                <Button
                  size="sm"
                  onClick={() => setLocation("/login")}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-muted-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl pb-4">
            <div className="container flex flex-col gap-1 pt-3">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`px-3 py-2.5 text-sm text-left rounded-md no-underline ${
                    location === item.href
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  setSearchOpen(true);
                  setMobileOpen(false);
                }}
                className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground text-left rounded-md hover:bg-secondary/50 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
              <div className="flex gap-3 mt-3 px-3">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="text-sm text-muted-foreground no-underline"
                      onClick={() => setMobileOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                    >
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-sm text-muted-foreground no-underline"
                      onClick={() => setMobileOpen(false)}
                    >
                      Log in
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => {
                        setLocation("/login");
                        setMobileOpen(false);
                      }}
                      className="bg-primary text-primary-foreground font-semibold"
                    >
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Global Search Dialog */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
