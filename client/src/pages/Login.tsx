import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Radar, Eye, EyeOff, ArrowRight, Loader2, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";

type AuthTab = "login" | "register";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<AuthTab>("login");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const utils = trpc.useUtils();

  const loginMutation = trpc.emailAuth.login.useMutation({
    onSuccess: async (data) => {
      if (data.success) {
        toast.success("Welcome back!");
        await utils.auth.me.invalidate();
        setLocation("/app/calendar");
      } else {
        toast.error(data.error || "Login failed");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Login failed");
    },
  });

  const registerMutation = trpc.emailAuth.register.useMutation({
    onSuccess: async (data) => {
      if (data.success) {
        toast.success("Account created! Welcome to IPO Radar AI.");
        await utils.auth.me.invalidate();
        setLocation("/app/calendar");
      } else {
        toast.error(data.error || "Registration failed");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Registration failed");
    },
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setLocation("/app/calendar");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "login") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ email, password, name });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/10 via-background to-background items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.75_0.15_180/0.06),transparent_70%)]" />
        <div className="relative z-10 max-w-md px-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Radar className="w-7 h-7 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              IPO Radar <span className="text-primary">AI</span>
            </span>
          </div>
          <h2 className="text-3xl font-bold text-foreground leading-tight mb-4">
            Institutional-grade IPO intelligence, instantly.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Monitor SEC filings, track amendments, and get AI-generated
            first-look research — all in one platform.
          </p>
          <div className="mt-10 space-y-4">
            {[
              "Real-time SEC filing monitoring",
              "AI-powered initiation reports",
              "IPO calendar & market analytics",
              "Watchlists & custom alerts",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Radar className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground">
              IPO Radar <span className="text-primary">AI</span>
            </span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            {tab === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {tab === "login"
              ? "Sign in to access your IPO dashboard."
              : "Start tracking IPOs with institutional-grade tools."}
          </p>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg mb-8">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                tab === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                tab === "register"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-11 bg-secondary/30 border-border/50"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-secondary/30 border-border/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={tab === "register" ? "Min. 8 characters" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-secondary/30 border-border/50"
                  required
                  minLength={tab === "register" ? 8 : 1}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {tab === "login" ? "Sign In" : "Create Account"}
              {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {tab === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => setTab("register")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setTab("login")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline hover:text-muted-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-muted-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
