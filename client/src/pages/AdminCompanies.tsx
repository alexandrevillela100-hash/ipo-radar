import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Radar,
  ArrowLeft,
  Plus,
  FileText,
  Trash2,
  Building2,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export default function AdminCompanies() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: companies, isLoading } = trpc.company.list.useQuery();

  const createMutation = trpc.company.create.useMutation({
    onSuccess: () => {
      utils.company.list.invalidate();
      utils.company.stats.invalidate();
      setDialogOpen(false);
      toast.success("Company created successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.company.delete.useMutation({
    onSuccess: () => {
      utils.company.list.invalidate();
      utils.company.stats.invalidate();
      toast.success("Company deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader />
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">Admin access required.</p>
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
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Manage Companies</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Company</DialogTitle>
              </DialogHeader>
              <CompanyForm
                onSubmit={(data) => createMutation.mutate(data)}
                isSubmitting={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : !companies || companies.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No companies yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map((c: any) => (
              <Card key={c.id} className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {c.ticker?.substring(0, 3) || c.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.ticker || "—"} · {c.exchange || "—"} · {c.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setLocation(`/admin/companies/${c.id}/filings`)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Filings
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete ${c.name}?`)) {
                            deleteMutation.mutate({ id: c.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    ticker: "",
    exchange: "NASDAQ",
    status: "upcoming" as "upcoming" | "priced" | "trading" | "withdrawn",
    industry: "",
    sector: "",
    description: "",
    headquarters: "",
    founded: "",
    ceo: "",
    employees: "",
    website: "",
    priceLow: "",
    priceHigh: "",
    leadUnderwriter: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: form.name,
      ticker: form.ticker || undefined,
      exchange: form.exchange || undefined,
      status: form.status,
      industry: form.industry || undefined,
      sector: form.sector || undefined,
      description: form.description || undefined,
      headquarters: form.headquarters || undefined,
      founded: form.founded || undefined,
      ceo: form.ceo || undefined,
      employees: form.employees || undefined,
      website: form.website || undefined,
      priceLow: form.priceLow || undefined,
      priceHigh: form.priceHigh || undefined,
      leadUnderwriter: form.leadUnderwriter || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Company Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="e.g. Acme Corp"
          />
        </div>
        <div>
          <Label className="text-xs">Ticker</Label>
          <Input
            value={form.ticker}
            onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
            placeholder="e.g. ACME"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Exchange</Label>
          <Select value={form.exchange} onValueChange={(v) => setForm({ ...form, exchange: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NASDAQ">NASDAQ</SelectItem>
              <SelectItem value="NYSE">NYSE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select
            value={form.status}
            onValueChange={(v: any) => setForm({ ...form, status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="priced">Priced</SelectItem>
              <SelectItem value="trading">Trading</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Industry</Label>
          <Input
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            placeholder="e.g. Cybersecurity"
          />
        </div>
        <div>
          <Label className="text-xs">Sector</Label>
          <Input
            value={form.sector}
            onChange={(e) => setForm({ ...form, sector: e.target.value })}
            placeholder="e.g. Technology"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Description</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Brief company description"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">CEO</Label>
          <Input
            value={form.ceo}
            onChange={(e) => setForm({ ...form, ceo: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Headquarters</Label>
          <Input
            value={form.headquarters}
            onChange={(e) => setForm({ ...form, headquarters: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Price Low ($)</Label>
          <Input
            value={form.priceLow}
            onChange={(e) => setForm({ ...form, priceLow: e.target.value })}
            placeholder="18.00"
          />
        </div>
        <div>
          <Label className="text-xs">Price High ($)</Label>
          <Input
            value={form.priceHigh}
            onChange={(e) => setForm({ ...form, priceHigh: e.target.value })}
            placeholder="22.00"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Lead Underwriter</Label>
        <Input
          value={form.leadUnderwriter}
          onChange={(e) => setForm({ ...form, leadUnderwriter: e.target.value })}
          placeholder="e.g. Goldman Sachs"
        />
      </div>

      <Button type="submit" className="w-full" disabled={!form.name || isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Company"}
      </Button>
    </form>
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
