import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  FileText,
  BarChart3,
  ChevronDown,
  Sparkles,
  BookOpen,
  Send,
} from "lucide-react";

/* ─── Demo Data ─────────────────────────────────────────────────────── */

interface Citation {
  doc: string;
  excerpt: string;
}

interface ChartBar {
  label: string;
  revenue: number;
  ebitdaMargin: number;
}

interface DemoStep {
  question: string;
  answer: string;
  citations: Citation[];
  chart?: ChartBar[];
  followUps: string[];
}

const DEMO_STEPS: DemoStep[] = [
  {
    question: "What are the key risk factors for this IPO?",
    answer:
      "Based on the S-1 filing, NovaTech AI faces several material risk factors:\n\n**1. Revenue Concentration** — 68% of revenue comes from three enterprise clients. Loss of any major customer could materially impact operations.\n\n**2. Regulatory Uncertainty** — The company operates in AI/ML markets subject to evolving regulations across the EU (AI Act) and US jurisdictions.\n\n**3. Negative Cash Flow** — The company has not achieved profitability, reporting net losses of $42.3M in FY2024 and $31.8M in FY2023.\n\n**4. Competitive Landscape** — Direct competition from well-capitalized incumbents including major cloud providers expanding AI offerings.",
    citations: [
      {
        doc: "S-1 Filing — Risk Factors (p. 24)",
        excerpt:
          '"We derived approximately 68% of our revenue from our three largest customers for the year ended December 31, 2024..."',
      },
      {
        doc: "S-1 Filing — Risk Factors (p. 31)",
        excerpt:
          '"We have incurred net losses of $42.3 million and $31.8 million for the fiscal years ended December 31, 2024 and 2023, respectively..."',
      },
    ],
    followUps: [
      "How will the IPO proceeds be used?",
      "Who are the lead underwriters?",
      "What is the company's competitive advantage?",
    ],
  },
  {
    question: "Show me revenue and EBITDA margin trends",
    answer:
      "Here are NovaTech AI's financial highlights from the S-1 filing:\n\nRevenue has grown at a **73% CAGR** over the past three years, from $28.4M in FY2022 to $85.1M in FY2024. However, EBITDA margins remain negative, improving from -89% to -38% as the company scales.\n\nManagement projects reaching EBITDA breakeven by Q3 2026 based on current growth trajectory and planned cost optimization initiatives.",
    citations: [
      {
        doc: "S-1 Filing — Financial Statements (p. 67)",
        excerpt:
          '"Total revenue increased 42% year-over-year to $85.1 million for the fiscal year ended December 31, 2024..."',
      },
      {
        doc: "S-1 Filing — Use of Proceeds (p. 42)",
        excerpt:
          '"We intend to use approximately 40% of the net proceeds for research and development, 30% for sales and marketing expansion..."',
      },
    ],
    chart: [
      { label: "FY2022", revenue: 28.4, ebitdaMargin: -89 },
      { label: "FY2023", revenue: 59.9, ebitdaMargin: -52 },
      { label: "FY2024", revenue: 85.1, ebitdaMargin: -38 },
      { label: "FY2025E", revenue: 118, ebitdaMargin: -15 },
    ],
    followUps: [
      "What are the comparable public companies?",
      "What is the expected valuation range?",
      "Break down the cost structure",
    ],
  },
];

/* ─── Typing Effect Hook ────────────────────────────────────────────── */

function useTypingEffect(text: string, speed: number = 35, startTyping: boolean = false) {
  const [displayed, setDisplayed] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!startTyping) {
      setDisplayed("");
      setIsDone(false);
      return;
    }
    setDisplayed("");
    setIsDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setIsDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, startTyping]);

  return { displayed, isDone };
}

/* ─── Mini Bar Chart ────────────────────────────────────────────────── */

function MiniChart({ data, animate }: { data: ChartBar[]; animate: boolean }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  return (
    <div className="mt-4 p-4 rounded-lg bg-background/60 border border-border/40">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">
          Revenue ($M) & EBITDA Margin
        </span>
      </div>
      <div className="flex items-end gap-3 h-32">
        {data.map((d, i) => {
          const height = (d.revenue / maxRevenue) * 100;
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-muted-foreground">
                {d.ebitdaMargin > 0 ? "+" : ""}
                {d.ebitdaMargin}%
              </span>
              <motion.div
                className="w-full rounded-t-sm relative overflow-hidden"
                style={{ backgroundColor: d.label.includes("E") ? "oklch(0.75 0.15 180 / 0.3)" : "oklch(0.75 0.15 180 / 0.6)" }}
                initial={{ height: 0 }}
                animate={animate ? { height: `${height}%` } : { height: 0 }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
              >
                {d.label.includes("E") && (
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,oklch(0.75_0.15_180/0.15)_3px,oklch(0.75_0.15_180/0.15)_6px)]" />
                )}
              </motion.div>
              <div className="text-center">
                <span className="text-[10px] font-mono font-semibold text-foreground/90 block">
                  ${d.revenue}
                </span>
                <span className="text-[9px] text-muted-foreground">{d.label}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/30">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "oklch(0.75 0.15 180 / 0.6)" }} />
          <span className="text-[10px] text-muted-foreground">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[repeating-linear-gradient(45deg,transparent,transparent_1px,oklch(0.75_0.15_180/0.3)_1px,oklch(0.75_0.15_180/0.3)_2px)]" style={{ backgroundColor: "oklch(0.75 0.15 180 / 0.15)" }} />
          <span className="text-[10px] text-muted-foreground">Estimate</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Citation Badge ────────────────────────────────────────────────── */

function CitationBadge({ citations, show }: { citations: Citation[]; show: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-3"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-primary/80 hover:text-primary transition-colors cursor-pointer"
      >
        <BookOpen className="w-3 h-3" />
        {citations.length} source{citations.length > 1 ? "s" : ""} cited
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {citations.map((c, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-md bg-primary/5 border border-primary/10"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="w-3 h-3 text-primary/60" />
                    <span className="text-[10px] font-semibold text-primary/70">
                      {c.doc}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                    {c.excerpt}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Formatted Answer Text ─────────────────────────────────────────── */

function FormattedAnswer({ text }: { text: string }) {
  // Simple markdown-like rendering for bold and newlines
  const parts = text.split(/(\*\*[^*]+\*\*|\n\n|\n)/g);
  return (
    <div className="text-[13px] text-foreground/90 leading-relaxed">
      {parts.map((part, i) => {
        if (part === "\n\n") return <div key={i} className="h-3" />;
        if (part === "\n") return <br key={i} />;
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <span key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

/* ─── Main Demo Component ───────────────────────────────────────────── */

export default function ConversationalDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const [phase, setPhase] = useState<"typing-q" | "waiting" | "answer" | "done">("typing-q");
  const [showChart, setShowChart] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const step = DEMO_STEPS[activeStep];

  const { displayed: typedQuestion, isDone: questionDone } = useTypingEffect(
    step.question,
    40,
    phase === "typing-q"
  );

  // Auto-advance phases
  useEffect(() => {
    if (questionDone && phase === "typing-q") {
      const timer = setTimeout(() => setPhase("waiting"), 300);
      return () => clearTimeout(timer);
    }
  }, [questionDone, phase]);

  useEffect(() => {
    if (phase === "waiting") {
      const timer = setTimeout(() => setPhase("answer"), 1200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "answer") {
      const citTimer = setTimeout(() => setShowCitations(true), 600);
      const chartTimer = step.chart
        ? setTimeout(() => setShowChart(true), 900)
        : undefined;
      const followTimer = setTimeout(() => {
        setShowFollowUps(true);
        setPhase("done");
      }, 1500);
      return () => {
        clearTimeout(citTimer);
        if (chartTimer) clearTimeout(chartTimer);
        clearTimeout(followTimer);
      };
    }
  }, [phase, step.chart]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [phase, showChart, showCitations, showFollowUps]);

  // Auto-cycle between demo steps
  useEffect(() => {
    if (phase !== "done") return;
    const timer = setTimeout(() => {
      handleNextStep((activeStep + 1) % DEMO_STEPS.length);
    }, 6000);
    return () => clearTimeout(timer);
  }, [phase, activeStep]);

  const handleNextStep = useCallback((idx: number) => {
    setActiveStep(idx);
    setPhase("typing-q");
    setShowChart(false);
    setShowCitations(false);
    setShowFollowUps(false);
  }, []);

  return (
    <section className="py-16 sm:py-20">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">
              Conversational Intelligence
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Talk to the filing.{" "}
            <span className="text-primary">Get real answers.</span>
          </h2>
          <p className="mt-3 text-base text-muted-foreground max-w-2xl mx-auto">
            Ask any question about an IPO — risk factors, financials, competitive
            landscape — and get answers grounded entirely in SEC documents with
            full source citations.
          </p>
        </div>

        {/* Demo Chat Window */}
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xl shadow-black/20">
            {/* Chat Header */}
            <div className="px-5 py-3.5 border-b border-border/40 bg-secondary/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground block leading-tight">
                    NovaTech AI, Inc.
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    S-1 Filing · NASDAQ · Technology
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium">
                  Grounded in SEC filings
                </span>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="p-5 space-y-4 min-h-[340px] max-h-[440px] overflow-y-auto scrollbar-thin">
              {/* User Question */}
              <AnimatePresence mode="wait">
                {(phase === "typing-q" || phase === "waiting" || phase === "answer" || phase === "done") && (
                  <motion.div
                    key={`q-${activeStep}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-primary/15 border border-primary/20">
                      <p className="text-[13px] text-foreground">
                        {phase === "typing-q" ? typedQuestion : step.question}
                        {phase === "typing-q" && (
                          <span className="inline-block w-[2px] h-[14px] bg-primary ml-0.5 animate-pulse align-text-bottom" />
                        )}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Thinking Indicator */}
              {phase === "waiting" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 pl-1"
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary/50"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Searching filings...
                  </span>
                </motion.div>
              )}

              {/* AI Answer */}
              {(phase === "answer" || phase === "done") && (
                <motion.div
                  key={`a-${activeStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="pl-1"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-5 h-5 rounded-md bg-primary/15 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-[11px] font-semibold text-primary/70">
                      IPO Radar AI
                    </span>
                  </div>
                  <FormattedAnswer text={step.answer} />

                  {/* Chart */}
                  {step.chart && showChart && (
                    <MiniChart data={step.chart} animate={showChart} />
                  )}

                  {/* Citations */}
                  <CitationBadge citations={step.citations} show={showCitations} />
                </motion.div>
              )}

              {/* Follow-up Suggestions */}
              {showFollowUps && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="pt-2"
                >
                  <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold mb-2 block">
                    Suggested follow-ups
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {step.followUps.map((q, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          handleNextStep(
                            (activeStep + 1) % DEMO_STEPS.length
                          )
                        }
                        className="px-3 py-1.5 rounded-full bg-secondary/60 border border-border/40 text-[11px] text-foreground/80 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-200 cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Bar (decorative) */}
            <div className="px-5 py-3.5 border-t border-border/40 bg-secondary/20">
              <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-2.5 rounded-xl bg-background/60 border border-border/40 text-[13px] text-muted-foreground/50">
                  Ask about risk factors, financials, management...
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Send className="w-4 h-4 text-primary/50" />
                </div>
              </div>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 mt-5">
            {DEMO_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => handleNextStep(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  i === activeStep
                    ? "bg-primary w-6"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
