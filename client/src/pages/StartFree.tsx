import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  Radar,
  Mail,
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  BarChart3,
  Bell,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function StartFree() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const signupMutation = trpc.signup.register.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.isNew) {
        toast.success("Welcome to IPO Radar AI!", {
          description: "Your account has been created successfully.",
        });
      } else {
        toast.info("Welcome back!", {
          description: "This email is already registered.",
        });
      }
    },
    onError: (error) => {
      toast.error("Registration failed", {
        description: error.message || "Please try again.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid email", {
        description: "Please enter a valid email address.",
      });
      return;
    }

    signupMutation.mutate({ email: email.trim(), source: "start-free" });
  };

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  const benefits = [
    {
      icon: FileText,
      title: "SEC Filing Alerts",
      description: "Get notified when new S-1 and F-1 filings hit EDGAR",
    },
    {
      icon: Zap,
      title: "AI-Powered Reports",
      description: "Instant first-look analysis of every IPO filing",
    },
    {
      icon: BarChart3,
      title: "Market Intelligence",
      description: "Track sector trends and IPO pipeline activity",
    },
    {
      icon: Bell,
      title: "Custom Watchlists",
      description: "Build and monitor your personal IPO watchlist",
    },
    {
      icon: Shield,
      title: "Filing Diff Viewer",
      description: "Compare S-1 amendments side by side",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Registration Form */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Radar className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                  Free Account
                </span>
              </div>

              {!submitted ? (
                <>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
                    Start tracking IPOs{" "}
                    <span className="text-primary">for free</span>
                  </h1>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    Enter your email to create a free account. No credit card
                    required. Get instant access to SEC filing intelligence.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-12 text-base bg-card border-border/60"
                          required
                          autoFocus
                        />
                      </div>
                      <Button
                        type="submit"
                        size="lg"
                        disabled={signupMutation.isPending || !email.trim()}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12 px-6 whitespace-nowrap"
                      >
                        {signupMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Get Started Free
                        {!signupMutation.isPending && (
                          <ArrowRight className="w-4 h-4 ml-2" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      By signing up, you agree to our{" "}
                      <Link
                        href="/terms"
                        className="text-primary hover:underline"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="text-primary hover:underline"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </form>
                </>
              ) : (
                <div className="text-center lg:text-left">
                  <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-6 mx-auto lg:mx-0">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
                    You're in!
                  </h1>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    Welcome to IPO Radar AI. Your free account is ready. Start
                    exploring the latest SEC filings and AI-powered reports.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      size="lg"
                      onClick={() => setLocation("/ipos")}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    >
                      Browse IPOs
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setLocation("/")}
                      className="border-border/60 text-foreground hover:bg-secondary font-semibold"
                    >
                      Back to Home
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Benefits */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                What you get with a free account
              </h3>
              {benefits.map((benefit, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border/30 hover:border-primary/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-0.5">
                      {benefit.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
