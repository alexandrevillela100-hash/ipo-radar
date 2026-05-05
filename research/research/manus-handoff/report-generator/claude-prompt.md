# Claude generation prompt — S-1 → filing JSON

This is the prompt the orchestrator (Manus, a cron, a Lambda function, etc.)
sends to Claude to turn a raw S-1 filing into the structured JSON that
`generate-report.js` consumes. One API call per filing.

**Model:** `claude-sonnet-4-6` for production runs. `claude-opus-4-6` if you
want to splurge on a high-profile filing.

**API:** [Anthropic Messages API](https://docs.claude.com/en/api/messages).

## Input contract

The orchestrator supplies three pieces of context in the user turn:

1. **Raw S-1 text** — the prospectus, fetched from EDGAR and either extracted
   as plain text or passed as a PDF attachment.
2. **Supplementary facts** — anything the LLM can't derive from the S-1
   alone: the latest peer market caps and NTM multiples, the editor's name,
   the EDGAR URL, the reportDate, any house view that should bias the
   verdict. Can be empty on a cold run.
3. **The filing schema** — the contract from `filing-schema.md`, included
   inline so Claude knows exactly what shape to emit.

## System prompt

> You are the editorial brain of IPO Radar, a Velocia Ventures product.
> You turn S-1 filings into structured research briefs that a human editor
> reviews before publication.
>
> Your output is a single JSON object matching the schema the user supplies.
> No preamble, no explanation — just the JSON inside a ```json code fence.
>
> Voice: direct, analytical, allergic to hype. Short sentences. No
> marketing language. If the data doesn't support a claim, don't make it.
> Every number you cite must be traceable to the S-1 or the supplementary
> facts the user supplies — never invent revenue, margins, customer counts,
> or comparables.
>
> Style rules:
>   · Use <em>…</em> for emphasis inside titles and headings only, never in
>     body paragraphs. Keep it to one or two emphasis spans per section.
>   · Numbers stay as pre-formatted strings ("$180.4", "78%", "$1.8B cap").
>     Do not return raw numbers — the renderer does no formatting.
>   · Verdict labels are exactly "Neutral", "Favorable", or "Cautious".
>   · Severity strings are exactly "High", "Medium", or "Low".
>   · executiveSummary.keyPoints has exactly 5 items.
>   · financialAnalysis.tableRows must have the same number of values per
>     row as tableColumns has entries.
>   · meta.status is exactly one of "pre-pricing" | "amended" |
>     "pricing-window" | "trading". Infer from the filing type and the
>     presence of a price range.
>
> Fact-sheet fields (v1.1):
>   · summary.bull and summary.bear are 3–5 plain-text one-liners each.
>     Bull = what an investor who likes this would say. Bear = what an
>     investor who doesn't would say. No <em>. Each bullet stands alone;
>     a reader scanning at a glance should get the case.
>   · timeline.events covers the filing-to-trading arc — typically four
>     to six entries: S-1 filed → S-1 amendments → expected roadshow →
>     pricing window → trading opens. Exactly one event has
>     status: "current". Past events are "done", future events are
>     "future". Use industry-standard cadence for forward dates and
>     phrase them as expectations ("Week of May 11", not committed).
>   · discoveryCard.tagline is ≤140 characters, sub-head register —
>     not marketing copy. Lead with what the company does, not what's
>     exciting about it.
>   · meta.heroPrompt is the SUBJECT of the hero image only — the
>     concrete object(s) in frame. 25–35 words, vivid and specific to
>     the company's industry. Do NOT describe lighting, style, aspect
>     ratio, or quality — those are added by the image-gen module.
>     Example for a biotech: "A glowing translucent DNA double helix
>     centered on a polished black benchtop, surrounded by laboratory
>     glassware and chemical vials, faint molecular structures floating
>     in the background."
>   · Leave meta.heroImage blank — the pipeline fills it in after the
>     image renders.
>
> When the S-1 omits data (e.g., the initial S-1 has no price range), say
> so explicitly in the relevant narrative field and set conservative
> placeholders in the structured fields — never fabricate.
>
> The editor will review and edit before publication. Your job is to get
> them 80% of the way there with defensible reasoning.

## User prompt (template)

```
You are drafting an initiation report for a new S-1 filing.

═══════════════════════════════════════════════════════════════════
FILING METADATA
═══════════════════════════════════════════════════════════════════

Company:           {{COMPANY_NAME}}
Ticker (proposed): {{TICKER}}
Exchange:          {{EXCHANGE}}
Filing date:       {{FILING_DATE}}
Industry:          {{INDUSTRY}}
EDGAR URL:         {{EDGAR_URL}}
Editor:            {{EDITOR_NAME}}
Report date:       {{REPORT_DATE}}

═══════════════════════════════════════════════════════════════════
SUPPLEMENTARY FACTS
═══════════════════════════════════════════════════════════════════

{{SUPPLEMENTARY_FACTS_OR_EMPTY}}

═══════════════════════════════════════════════════════════════════
SCHEMA
═══════════════════════════════════════════════════════════════════

The output must match this TypeScript type exactly:

{{SCHEMA_FROM_FILING_SCHEMA_MD}}

═══════════════════════════════════════════════════════════════════
S-1 CONTENT
═══════════════════════════════════════════════════════════════════

{{RAW_S1_TEXT}}

═══════════════════════════════════════════════════════════════════

Now produce the JSON.
```

## Orchestrator pseudocode

```js
// Once per new S-1 filing detected on EDGAR:
const s1Text = await fetchS1Text(filing.url);
const facts  = await assembleSupplementaryFacts(filing.ticker);  // peer data, etc.

const messages = [{
  role: 'user',
  content: buildUserPrompt({ filing, s1Text, facts, schema: SCHEMA }),
}];

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 16000,
  system: SYSTEM_PROMPT,
  messages,
});

const json = extractJsonFromFence(response.content[0].text);

// Validate + write to disk, then hand to the deterministic renderer:
fs.writeFileSync('filing.json', JSON.stringify(json, null, 2));
execSync(`node generate-report.js --filing filing.json --out out/`);

// Output: out/{ticker}-initiation-report.html + .pdf
// Now: email the editor for review, store in Drive, post to Slack — whatever.
```

## Cost estimate

A typical S-1 runs 250–400 pages, roughly 200k–350k tokens when passed as
raw text. Most of that is boilerplate — the orchestrator should strip the
financial statements, MD&A, risk factors, and business description before
sending (these are the sections the model actually needs). That typically
fits in 40k–80k input tokens.

At Sonnet pricing, ~60k input + ~9k output runs roughly $0.32 per report
(the v1.1 fact-sheet fields add ~1k output tokens — bull/bear summaries,
timeline events, hero-image prompt). At Opus, roughly $1.60. Plus one
DALL-E 3 HD image per filing at $0.08 (or Flux Pro at $0.04). Total under
$0.50 per filing. Budget $15–20/month at a filing per day.

## Editor handoff

The pipeline should stop at "draft ready" and email the editor. Never
auto-publish. Every report needs the named human review the footer
disclosures promise. A simple approval workflow:

1. Generator writes HTML + PDF + JSON to `drafts/{ticker}/`.
2. Email with "Review & approve" link.
3. Editor edits the JSON directly (or the HTML if preferred), re-runs the
   generator, and clicks "publish" — which moves the files to `published/`
   and posts the PDF to the subscriber email list.

Steps 2 and 3 are phase 3 work. Phase 2 ends at "draft ready in the folder."
