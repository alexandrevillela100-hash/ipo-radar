import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Demo Scenarios ────────────────────────────────────────────────── */

interface Scenario {
  tab: string;
  question: string;
  answer: string;
}

const SCENARIOS: Scenario[] = [
  {
    tab: "Risk Analysis",
    question:
      "What are the key risk factors in NovaTech AI's S-1 filing that investors should evaluate?",
    answer:
      'Risk analysis complete. 4 material risk factors identified: Revenue Concentration — 68% of revenue from three enterprise clients (S-1, p. 24). Regulatory Uncertainty — operations subject to evolving EU AI Act and US regulations. Negative Cash Flow — net losses of $42.3M (FY2024) and $31.8M (FY2023). Competitive Pressure — direct competition from well-capitalized cloud providers expanding AI offerings. Full risk assessment with severity ratings saved to your workspace.',
  },
  {
    tab: "Financial Deep Dive",
    question:
      "Show me revenue growth and EBITDA margin trends from the S-1 with forward estimates",
    answer:
      "Financial analysis complete. Revenue CAGR of 73% over three years: $28.4M (FY2022) → $59.9M (FY2023) → $85.1M (FY2024). EBITDA margins improving: -89% → -52% → -38%. Management projects breakeven by Q3 2026. Gross margin stable at 71-74%. R&D spend at 45% of revenue, declining from 62%. IPO proceeds allocation: 40% R&D, 30% sales expansion, 20% working capital, 10% potential acquisitions.",
  },
  {
    tab: "Competitive Landscape",
    question:
      "Map the competitive landscape for NovaTech AI's enterprise ML platform market",
    answer:
      "Competitive mapping complete. 3 tiers identified: Direct Competitors — DataRobot ($1.2B valuation), H2O.ai ($1.7B), C3.ai (NYSE: AI, $3.1B market cap). Adjacent Threats — AWS SageMaker, Google Vertex AI, Azure ML expanding into mid-market. Differentiation — NovaTech's edge in on-premise deployment and regulatory compliance tooling. Market size: $14.2B (2024) growing to $38.6B (2028). NovaTech's estimated share: 0.6%. Full competitive matrix with positioning analysis generated.",
  },
];

const CYCLE_INTERVAL = 7000;
const TYPING_SPEED = 18;

/* ─── Typing Hook ───────────────────────────────────────────────────── */

function useTypingEffect(text: string, speed: number, start: boolean) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!start) {
      setDisplayed("");
      setDone(false);
      return;
    }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, start]);

  return { displayed, done };
}

/* ─── Main Component ────────────────────────────────────────────────── */

export default function ConversationalDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const [phase, setPhase] = useState<"loading" | "typing" | "done">("loading");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenario = SCENARIOS[activeTab];

  // Phase transitions
  useEffect(() => {
    setPhase("loading");
    const t = setTimeout(() => setPhase("typing"), 1200);
    return () => clearTimeout(t);
  }, [activeTab]);

  const { displayed, done } = useTypingEffect(
    scenario.answer,
    TYPING_SPEED,
    phase === "typing" || phase === "done"
  );

  useEffect(() => {
    if (done) setPhase("done");
  }, [done]);

  // Auto-cycle
  useEffect(() => {
    if (phase !== "done") return;
    timerRef.current = setTimeout(() => {
      setActiveTab((prev) => (prev + 1) % SCENARIOS.length);
    }, CYCLE_INTERVAL);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase]);

  const handleTabClick = (idx: number) => {
    if (idx === activeTab) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveTab(idx);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-2 px-4 sm:px-0">
      {/* ── Tab Bar ─────────────────────────────────────────────── */}
      <div className="flex border-b border-border/40">
        {SCENARIOS.map((s, i) => (
          <button
            key={s.tab}
            onClick={() => handleTabClick(i)}
            className={`
              flex-1 py-3 text-[13px] sm:text-sm font-medium tracking-wide transition-all duration-200 cursor-pointer
              border-b-2 -mb-[1px]
              ${
                i === activeTab
                  ? "text-primary border-primary"
                  : "text-muted-foreground/60 border-transparent hover:text-muted-foreground"
              }
            `}
          >
            {s.tab}
          </button>
        ))}
      </div>

      {/* ── Chat Area ───────────────────────────────────────────── */}
      <div className="mt-0 rounded-b-xl bg-card/60 border border-t-0 border-border/30 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="p-5 space-y-4"
          >
            {/* User message */}
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-primary"
                >
                  <path
                    d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <p className="text-[13px] sm:text-sm text-foreground/80 leading-relaxed pt-1 italic">
                {scenario.question}
              </p>
            </div>

            {/* AI response */}
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center mt-0.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-primary"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-h-[60px] pt-1">
                {phase === "loading" ? (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary/60"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[12px] sm:text-[13px] text-primary/60 font-medium">
                      Analyzing...
                    </span>
                  </div>
                ) : (
                  <p className="text-[13px] sm:text-sm text-foreground/70 leading-relaxed">
                    {displayed}
                    {!done && (
                      <span className="inline-block w-[2px] h-[14px] bg-primary/70 ml-0.5 animate-pulse align-text-bottom" />
                    )}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
