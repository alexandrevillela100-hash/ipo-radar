import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Radar,
  Building2,
  FileText,
  BarChart3,
  ArrowLeft,
  Plus,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: stats } = trpc.company.stats.useQuery();
  const { data: companies } = trpc.company.list.useQuery();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader />
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Sign in Required</h2>
          <p className="text-muted-foreground mb-6">
            You need to sign in to access the admin dashboard.
          </p>
          <Button onClick={() => (window.location.href = getLoginUrl())}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You don't have admin privileges.
          </p>
          <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <div className="container py-6">
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Public Dashboard
          </Button>
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Admin Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              Manage IPO companies and SEC filings
            </p>
          </div>
          <Button
            onClick={() => setLocation("/admin/companies")}
            className="gap-2"
          >
            <Building2 className="h-4 w-4" />
            Manage Companies
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Total Companies
                  </p>
                  <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[oklch(0.75_0.12_80)]/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-[oklch(0.75_0.12_80)]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Upcoming
                  </p>
                  <p className="text-2xl font-bold">{stats?.upcoming ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[oklch(0.7_0.15_160)]/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-[oklch(0.7_0.15_160)]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Trading
                  </p>
                  <p className="text-2xl font-bold">{stats?.trading ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Quick List */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {!companies || companies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No companies yet. Add your first company to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {companies.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {c.ticker?.substring(0, 3) || c.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.industry || "—"} · {c.status}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setLocation(`/admin/companies/${c.id}/filings`)
                      }
                      className="gap-1 text-xs"
                    >
                      <FileText className="h-3 w-3" />
                      Filings
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminHeader() {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center h-16">
        <Link href="/">
          <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radar className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">IPO Radar</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Admin
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
