# IPO Radar — initiation report generator

Takes a structured JSON description of an S-1 filing and produces a
branded, paginated HTML + PDF report that matches the Velocia mockup.

This is the deterministic "render" half of the pipeline. The upstream
"read" half — turning a raw S-1 into this JSON — is handled by Claude
(see `claude-prompt.md`).

## Directory layout

```
report-generator/
├── README.md               ← you are here
├── filing-schema.md        ← the JSON contract every filing must match
├── claude-prompt.md        ← system + user prompts for the LLM step
├── report-template.html    ← the HTML mockup with {{placeholder}} tokens
├── generate-report.js      ← Node script: JSON + template → HTML + PDF
├── sample-kestrel.json     ← golden sample that reproduces the mockup
└── out/                    ← rendered outputs (gitignored in real repo)
    ├── kstr-initiation-report.html
    └── kstr-initiation-report.pdf
```

## Quick start

```bash
# 1. Render the Kestrel sample (should match the original mockup):
node generate-report.js

# 2. Render any other filing:
node generate-report.js --filing path/to/filing.json --out path/to/out/

# 3. Skip the PDF step (HTML only, faster):
node generate-report.js --no-pdf
```

No dependencies beyond Node itself for HTML generation. PDF rendering
tries Puppeteer first; if Puppeteer isn't installed, it falls back to
LibreOffice (`soffice`). Install one or the other on the box that runs
the cron:

```bash
# Production (pixel-accurate):
npm install puppeteer

# Fallback (ships with LibreOffice, text-accurate but strips CSS):
apt-get install -y libreoffice
```

## How the templating works

The template engine is ~60 lines inside `generate-report.js`. Supported
syntax:

| Token                              | Meaning                                                    |
| ---------------------------------- | ---------------------------------------------------------- |
| `{{path.to.value}}`                | Substitute scalar; dotted paths allowed                    |
| `{{{path}}}`                       | Alias for above (we don't HTML-escape — content is trusted) |
| `{{#each path}}…{{/each}}`         | Iterate array; inside, item fields become local            |
| `{{#if path}}…{{/if}}`             | Conditional                                                |
| `{{#if path}}…{{else}}…{{/if}}`    | Conditional with else branch                               |
| `{{@i}}`                           | 1-based index, zero-padded ("01")                          |
| `{{@first}} / {{@last}} / {{@notLast}}` | Iteration position flags                              |
| `{{this}}`                         | Current item (for scalar arrays)                           |

A small pre-render enrichment step adds derived fields:
- `meta.year` from `meta.reportDate`
- `severityClass` on each risk (maps "High"/"Medium"/"Low" → CSS class)
- `cells` on each financial row (wraps values so the template can decide
  per-cell highlighting)

## Full pipeline

```
┌──────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌──────────────────┐
│  EDGAR RSS feed  │──▶│ Fetch S-1 text  │──▶│  Claude API     │──▶│  filing.json     │
│  (new S-1s)      │   │ + peer data     │   │  (see prompt)   │   │                  │
└──────────────────┘   └─────────────────┘   └─────────────────┘   └────────┬─────────┘
                                                                            │
                                                                            ▼
                                                   ┌─────────────────────────────────────┐
                                                   │  generate-report.js                 │
                                                   │  · loads template                   │
                                                   │  · enriches (severity, cells, …)    │
                                                   │  · renders HTML                     │
                                                   │  · renders PDF (puppeteer/soffice)  │
                                                   └────────┬────────────────────────────┘
                                                            │
                                  ┌─────────────────────────┴─────────────────────────┐
                                  ▼                                                     ▼
                        {ticker}-report.html                                  {ticker}-report.pdf
                        (web preview, Sanity embed)                           (email attach, Drive)
```

## Where each file fits

- **Phase 2 (this directory)**: everything needed to go from `filing.json`
  to rendered HTML + PDF. Deterministic, unit-testable, no secrets.
- **Phase 3 (not yet built)**: the EDGAR watcher, the Claude call, the
  editor approval loop, the delivery step. These can live wherever is
  convenient — the generator doesn't care.

## Regenerating the sample

`sample-kestrel.json` is the golden test case. It should reproduce the
original mockup that ships alongside this bundle
(`initiation-report-mockup.html`). If you change the template, re-run:

```bash
node generate-report.js
```

and diff `out/kstr-initiation-report.html` against the original mockup to
check nothing regressed.
