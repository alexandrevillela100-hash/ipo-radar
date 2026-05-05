# IPO Radar — Manus handoff bundle

Everything needed to run the IPO Radar initiation-report pipeline inside
Manus (or any Linux box with Node 18+). One EDGAR URL in, one branded
PDF out.

The intended flow:

```
EDGAR URL
  → run-pipeline.js (fetches S-1, strips, calls Claude)
  → filing.json
  → generate-hero-image.js   (DALL-E 3 → out/<ticker>/hero.png)
  → generate-report.js       (initiation report HTML + PDF)
  → generate-factsheet.js    (public fact sheet HTML)
```

One filing in → three deliverables out: the editorial initiation report
(with verdict, valuation, the works), the fact-only public fact sheet
(no opinions, embedded historical+target chart, bull/bear summary), and
a single hero image re-used by both — and eventually by the homepage
discovery card.

The pipeline uses its own free HTTP fetcher against sec.gov. You do not
need Manus's EDGAR tool — this is by design, because Manus's existing
EDGAR tool pulls only metadata (company name, CIK, SIC code, filing
dates) and generates *hypothetical* analysis from that, which is not
what IPO Radar is supposed to ship. This pipeline downloads the actual
S-1 text so Claude is working from the filing, not from the LLM's prior
about the company.

Cost per report: roughly **$0.32** at `claude-sonnet-4-6` plus **$0.08**
for one DALL-E 3 HD hero image, total under **$0.50/filing**. At Opus,
roughly $1.60 + $0.08. At a filing per day that's $15–$50/month — the
price of not shipping fabricated research.

## What's in the box

```
manus-handoff/
├── README.md                    ← you are here (operator setup)
├── MANUS-PROMPT.md              ← paste this into Manus to configure the agent
├── package.json                 ← Node deps (puppeteer, @anthropic-ai/sdk)
├── run-pipeline.js              ← end-to-end entrypoint (EDGAR → Claude → hero → reports)
├── test-local.js                ← offline smoke test (no API calls)
└── report-generator/            ← the deterministic render layer
    ├── README.md
    ├── filing-schema.md         ← JSON contract (v1.1 — adds fact-sheet fields)
    ├── claude-prompt.md         ← system + user prompts
    ├── report-template.html     ← initiation-report HTML with {{placeholders}}
    ├── fact-sheet-template.html ← public fact-sheet HTML with {{placeholders}}
    ├── generate-report.js       ← template engine + PDF renderer (initiation report)
    ├── generate-factsheet.js    ← chart-geometry enricher + fact-sheet renderer
    ├── generate-hero-image.js   ← DALL-E 3 module — one hero per filing, re-used everywhere
    └── sample-kestrel.json      ← golden test case (reproduces both mockups)
```

## First-time setup (10 minutes)

Do this on the machine Manus runs the pipeline on — either Manus's own
sandbox or a separate VM that Manus SSHes into.

**1. Install Node 18+** (check with `node --version`).

**2. Install the Node deps:**

```bash
cd manus-handoff
npm install
```

This pulls Puppeteer (~250 MB including its Chromium) and the Anthropic
SDK. If the machine can't install Puppeteer, the renderer falls back to
LibreOffice:

```bash
apt-get install -y libreoffice
```

LibreOffice is less pixel-accurate but handles our mockup well enough
for a draft.

**3. Set environment variables:**

```bash
export ANTHROPIC_API_KEY=sk-ant-...                                  # required
export SEC_USER_AGENT="IPO Radar research@velociaventures.com"       # required
export OPENAI_API_KEY=sk-...                                         # optional (DALL-E hero); pipeline auto-skips if absent
export ANTHROPIC_MODEL=claude-sonnet-4-6                             # optional (default sonnet)
```

SEC blocks requests with generic User-Agents and rejects anything that
doesn't include a real contact email. See
https://www.sec.gov/os/accessing-edgar-data.

**4. Run the offline smoke test:**

```bash
node test-local.js
```

This skips EDGAR, Claude, and DALL-E and just renders the Kestrel
sample. You should get all three outputs in `out/kstr/`:

- `kstr-initiation-report.pdf` (~200 KB)
- `kstr-initiation-report.html`
- `kstr-fact-sheet.html` (~45 KB; opens with embedded historical+target chart)

If that succeeds, the renderer chain and pipeline glue are healthy.

**5. Run the real pipeline on a filing:**

```bash
node run-pipeline.js \
  --url       "https://www.sec.gov/Archives/edgar/data/.../example-s1.htm" \
  --company   "Example, Inc." \
  --ticker    EXMP \
  --exchange  "NYSE (proposed)" \
  --industry  "Data Infrastructure" \
  --filingDate "May 12, 2026" \
  --editor    "Alexandre Villela"
```

Outputs land in `out/exmp/`:
- `filing.json` — the structured brief (the editor can hand-edit this and re-run the generator)
- `exmp-initiation-report.html`
- `exmp-initiation-report.pdf`

**Advanced — pre-extracted text.** If you've already pulled the S-1 out
to a local file (your own extraction pipeline, a cache, whatever), pass
`--s1File path/to/s1.txt` and the pipeline will skip the HTTP fetch.
Most users won't need this.

## Editor review loop

The pipeline stops at "draft ready." Every report needs the named human
review the footer disclosures promise.

A reasonable flow inside Manus:

1. Manus runs `run-pipeline.js` as soon as a new S-1 appears on EDGAR.
2. Manus emails/Slack-DMs the editor the PDF + a link to `filing.json`.
3. Editor tweaks `filing.json` if needed, then re-runs
   `node report-generator/generate-report.js --filing out/exmp/filing.json --out out/exmp/`
   (no Claude call, no EDGAR call — just a re-render).
4. Editor says "ship it"; Manus uploads the PDF to Drive, emails
   subscribers, and posts to the IPO Radar Slack channel.

Nothing auto-publishes. Ever.

## How Manus should trigger it

Two reasonable modes, pick one:

**Mode A — Manual trigger** (start here). You message Manus:

> New S-1: https://www.sec.gov/Archives/.../foo-s1.htm, ticker FOO, filing date May 12 2026. Please generate the initiation report and email me the PDF.

Manus reads MANUS-PROMPT.md, runs the command, waits, emails you the PDF.

**Mode B — EDGAR watcher** (later). Manus polls
`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=S-1&dateb=&owner=include&count=40&output=atom`
every N hours, detects new entries, and runs the pipeline on each.
Still emails the editor for review before delivery. Reuse whatever
metadata-watch code already exists in the prior Manus build — just
don't reuse the metadata-only LLM generation path; route new filings
through this pipeline instead.

Mode A proves the content pipeline works end-to-end before you add the
cron. Start there.

## Known caveats / gotchas

- **SEC User-Agent**: required. The pipeline sets no default — if
  `SEC_USER_AGENT` is unset or looks generic, EDGAR returns 403.
- **S-1 token count**: a raw S-1 is 200k–350k tokens. `run-pipeline.js`
  auto-strips to prospectus summary + risk factors + MD&A + business +
  selected financial data + use of proceeds (typically 60k–80k tokens).
  If Claude's JSON looks thin, raise `MAX_S1_CHARS` (default 260000).
- **No peer multiples in the S-1**: NTM multiples for `valuation.peers`
  aren't in the filing. Either pass them via `--facts
  supplementary-facts.txt` (see `report-generator/claude-prompt.md` for
  format) or let the editor fill them in `filing.json` before
  re-rendering. A free-ish fallback is yfinance LTM, which the editor
  has to convert/sanity-check.
- **Verdict is LLM-generated**: the editor should always challenge the
  verdict string. It's drafted, not pronounced.
- **Cost**: ~$0.30 per report at Sonnet, ~$1.50 at Opus. At one filing
  per day that's $10–$45/month — well below hosting cost.

## Files Manus is allowed to modify

Only `filing.json` and anything under `out/`. The template, schema, and
prompts are source-controlled — changes go through git, not through the
agent.

## Troubleshooting

| Symptom                              | Likely cause                              | Fix                                                          |
| ------------------------------------ | ----------------------------------------- | ------------------------------------------------------------ |
| `HTTP 403` fetching EDGAR            | Missing or generic User-Agent             | Set `SEC_USER_AGENT` with a real contact email               |
| `ANTHROPIC_API_KEY` error            | Env var unset                             | `export ANTHROPIC_API_KEY=...`                               |
| Pipeline prints "PDF not produced"   | Neither puppeteer nor soffice installed   | `npm install puppeteer` or `apt-get install libreoffice`     |
| Report has blank sections            | Claude returned incomplete JSON           | Check `claude-raw.txt` in cwd; raise `MAX_S1_CHARS`          |
| Peer table has zeros / dashes        | No supplementary facts supplied           | Pass `--facts path/to/supplementary-facts.txt`               |
| Numbers don't match the S-1          | Section got truncated by the stripper     | Raise `MAX_S1_CHARS`; if still wrong, inspect claude-raw.txt |
| Font doesn't match the mockup        | No internet on render host                | Fonts load from Google Fonts; allowlist fonts.googleapis.com |

## Where this code lives long-term

This bundle is a handoff copy. The source of truth should be a git
repository (e.g. `velocia/ipo-radar-pipeline`). Manus pulls the repo,
installs deps, and runs the scripts. That way `report-template.html`
edits ship through normal review, not by editing files inside Manus.

## Future work — hybrid extraction (Phase 4)

The current pipeline reads the full S-1 prose and has Claude do both
extraction *and* narrative synthesis. That's fine at ~$0.30/report,
but it has two weaknesses: (1) every dollar we spend re-tokenizes
prose we've seen before, and (2) financial numbers go through an LLM
pass, which is the part most likely to drift.

The planned upgrade is a hybrid:

- **Code parses the S-1's XBRL attachments.** Every S-1 on EDGAR ships
  with a structured XBRL bundle alongside the HTML — standardized XML
  tagging of revenue, gross margin, operating cash flow, customer
  counts, segment breakdowns, etc. Pulling those with a Node or
  Python parser is free and reliable.
- **Claude receives pre-extracted numbers + the prose sections** and
  is asked only to write the narrative (executive summary, business
  overview, risks, verdict). No financial-table reasoning.
- **Estimated cost:** $0.10–$0.20 per report. Financial accuracy goes
  up because numbers come from structured data, not regex.

The hints that this was already being planned on Manus's side —
`ingest-filing-text.mjs` and the `document_chunks` table in their
schema — are exactly the scaffolding we'd build on. Not for Phase 2.
Just flagging the target.

Other future-phase work we've explicitly punted on:

- EDGAR watcher (Mode B above) with dedup by accession number.
- Peer comp data: paid (FactSet / Bloomberg) vs. free (yfinance LTM)
  vs. editor-provided. Pick one after the editor gives feedback on
  how often they actually touch that section.
- One-click "approve & publish" button (Slack app? Sanity workflow?).
- Sanity embed of the HTML so the web version stays in sync with the
  PDF.
