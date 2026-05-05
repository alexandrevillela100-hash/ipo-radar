# IPO Radar — Filing input schema

The generator (`generate-report.js`) takes a single JSON object describing a
filing and produces an initiation-report HTML + PDF that match the Velocia
mockup. This doc is the contract between the LLM step (raw S-1 → JSON) and
the deterministic render step (JSON → report).

Every field marked **required** must be present; the generator does not invent
missing data. Inline `<em>…</em>` is allowed inside any *title* or *headline*
field for emphasis; everything else is plain text.

```ts
type Filing = {

  meta: {
    reportVersion: string;            // "1.1"
    reportDate: string;               // "Apr 21, 2026"
    filingType: string;               // "S-1" | "S-1/A" | "F-1"
    filingTypeLabel: string;          // "Registration statement"
    exchange: string;                 // "NYSE" | "NASDAQ"
    ticker: string;                   // "KSTR"
    tickerStatus: string;             // "proposed" | "confirmed"
    industry: string;                 // "Enterprise AI"
    filingUrl: string;                // EDGAR link
    filingDate: string;               // "Apr 8, 2026"
    editorName: string;               // "Alexandre Villela"
    approvalDate: string;             // "Apr 21, 2026"
    fiscalYearEnd: string;            // "January 31"

    // ── v1.1 fact-sheet additions ───────────────────────────────────
    status: "pre-pricing"             // initial S-1 filed, no price range
          | "amended"                 // S-1/A on file with range
          | "pricing-window"          // roadshow active
          | "trading"                 // post-IPO
          ;
    expectedPricingWindow?: string;   // "May 20–27, 2026" — optional, often computed
    heroImage?: string;               // "./hero.png"  or  "https://cdn.../hero.png"
    heroPrompt?: string;              // 25–35 word DALL-E subject (no style boilerplate)
  };

  company: {
    name: string;                     // "Kestrel Intelligence"
    tagline: string;                  // one serif-italic sentence under the name
  };

  offering: {
    size: string;                     // "Up to $400M"
    underwriters: string;             // "Goldman · Morgan Stanley · JPM"
  };

  verdict: {
    label: string;                    // "Neutral" | "Favorable" | "Cautious"
    confidence: string;               // "4 / 5 — Solid"
    favorableBelow: string;           // "$15 / share"
    neutralBetween: string;           // "$15 — $22 / share"
    cautiousAbove: string;            // "$22 / share"
  };

  fairValue: {
    low:  { price: string; cap: string };   // {"$14", "~$1.8B cap"}
    mid:  { price: string; cap: string };
    high: { price: string; cap: string };
    unit: string;                           // "per share, post-money"
  };

  executiveSummary: {
    title: string;                    // may contain <em>; "Our <em>take</em>"
    lead: string[];                   // 2–4 paragraphs
    keyPoints: Array<{                // exactly 5
      heading: string;                // may contain <em>
      body: string;
    }>;
  };

  businessOverview: {
    title: string;
    paragraphs: string[];             // 4–6 paragraphs
  };

  financialAnalysis: {
    title: string;
    lead: string;                     // one lead paragraph
    tableSourceNote: string;          // "Source: Kestrel S-1, filed…"
    tableColumns: string[];           // e.g. ["FY23","FY24","FY25"]
    tableRows: Array<{
      label: string;                  // "Revenue"
      values: string[];               // must match tableColumns length
      highlightLast?: boolean;        // tint the last column teal
      mutedRow?: boolean;             // growth % style (lighter text)
      smallLabel?: boolean;           // render label in uppercase micro-caps
    }>;
    narrative: Array<{                // bold lead-in + paragraph
      heading: string;                // "Revenue."
      body: string;
    }>;
  };

  marketOpportunity: {
    title: string;
    tam: { value: string; label: string };
    sam: { value: string; label: string };
    som: { value: string; label: string };
    narrative: Array<{ heading: string; body: string }>;
  };

  risks: {
    title: string;
    intro: string;
    items: Array<{
      title: string;
      severity: "High" | "Medium" | "Low";
      body: string;
      mitigation?: string;            // optional
    }>;
    keyRisk: string;                  // the "if we had to pick one" callout
  };

  valuation: {
    title: string;
    fairValueRangeNote?: string;      // free text above the range card
    dcf: {
      intro: string;
      rows: Array<{ label: string; value: string }>;
    };
    comps: {
      rows: Array<{                   // public comp peers
        peer: string; mktCap: string; growth: string; evRev: string;
      }>;
      median:  { peer: string; mktCap: string; growth: string; evRev: string };
      subject: { peer: string; mktCap: string; growth: string; evRev: string };
      sourceNote: string;
      narrative: string[];
    };
  };

  investmentVerdict: {
    title: string;
    points: Array<{ heading: string; body: string }>;  // typically 5
    closing: string;                  // serif-italic closing statement
  };

  paywall: {
    headline: string;
    blurb: string;
    tiles: Array<{ tag: string }>;    // "§4 · Market opportunity"
    pricing: string;                  // "IPO Radar Pro · $49 / month · cancel anytime"
  };

  // ── v1.1 fact-sheet additions ─────────────────────────────────────
  // Drives the per-IPO fact sheet (ipo-summary-mockup.html). The
  // initiation-report renderer ignores anything below; the fact-sheet
  // renderer requires summary, timeline, and discoveryCard.

  summary: {
    bull: string[];                   // 3–5 scannable "what the bull sees" bullets
    bear: string[];                   // 3–5 scannable "what the bear sees" bullets
  };

  timeline: {
    events: Array<{
      label: string;                  // "S-1 filed" | "Roadshow" | "Pricing window"
      date: string;                   // "Apr 8, 2026" or "Week of May 11"
      status: "done" | "current" | "future";
    }>;                               // typically 4–6 events; renderer picks the timeline strip
  };

  discoveryCard: {
    tagline: string;                  // ≤140-char one-liner for the homepage card
    sector: string;                   // "Enterprise AI" — used for filtering/grouping
    dealSize?: string;                // "$400M" — denormalized from offering for the card
    priceRange?: string;              // "$18–$22"  | "TBD"
    image?: string;                   // override; defaults to meta.heroImage
    badge?: "Filed" | "Amended" | "Pricing" | "Trading";
  };

  chartData: {                        // drives the historical+target chart on the fact sheet
    yAxisRevMax: number;              // $M ceiling for the left y-axis
    yAxisRevTicks: Array<{ value: number; label: string }>;
    yAxisMarginTicks: Array<{ value: number; label: string }>;  // right y-axis (%)
    points: Array<{
      year: string;                   // "FY22", "FY25e"
      revenue: number;                // $M
      grossMargin: number;            // %
      ebitdaMargin: number;           // % (can be negative)
      isTarget: boolean;              // true → dashed-bar styling, dimmed labels
    }>;                               // 3–5 entries; first target index becomes the divider
    sourceNote: string;               // "Historicals: S-1 SCFD. Targets: MD&A disclosures."
  };

};
```

## Invariants the generator assumes

- `executiveSummary.keyPoints` has exactly **5 items**. Fewer leaves gaps;
  more will render but break page-break heuristics.
- `financialAnalysis.tableRows[].values.length === tableColumns.length` for
  every row.
- Severity strings are exactly `"High"`, `"Medium"`, or `"Low"` —
  case-sensitive, used for CSS class selection.
- Numeric values are pre-formatted strings (`"$180.4"`, not `180.4`). The
  generator does not format numbers; the upstream step decides display.
- Inline emphasis uses `<em>` only. No other HTML is permitted in content
  strings.

## Fact-sheet rules (v1.1)

- `summary.bull` / `summary.bear` are plain-text bullets — no `<em>`. They
  show up as scannable lists; brevity matters more than rhetoric.
- `timeline.events` must be in chronological order. Exactly one event
  should have `status: "current"`; everything before it is `"done"`,
  everything after is `"future"`. If pricing has happened, mark
  "Trading opens" current and S-1 / amendments as done.
- `discoveryCard.tagline` is the one-liner the homepage card shows under
  the company name. It should read like a sub-head, not marketing copy.
  Example: "Closed-source inference platform for regulated enterprises."
- `meta.heroPrompt` is the **subject** of the image only — what's in the
  frame, not how it's rendered. Style is locked in code by
  `generate-hero-image.js`. Example:
  `"A glowing DNA double helix surrounded by laboratory glassware on a dark surface, soft chemical-vial silhouettes in the background"`.
- `meta.heroImage` is filled in by the pipeline after image generation;
  Claude should leave it blank (or omit). If the editor wants a specific
  image path, they can set it manually and the gen step will skip.
