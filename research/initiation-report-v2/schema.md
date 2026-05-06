# Initiation Report — JSON Schema (v2)

The schema for `report.json` — the structured payload the renderer consumes to produce a v2 (Helion-style) IPO Radar initiation report. One file per filing.

This is a single JSON object with the top-level keys below. Every key marked **required** must be present (use `null` or `""` if value is unknown — the renderer falls back gracefully). Optional keys can be omitted entirely.

---

## Top-level shape

```jsonc
{
  "meta":          { ... },     // required
  "ipo":           { ... },     // required
  "rating":        { ... },     // required
  "factor_profile":{ ... },     // required
  "thesis_pros":   [ ... ],     // required, 4–6 bullets
  "thesis_cons":   [ ... ],     // required, 4–6 bullets
  "summary_paragraph": "...",   // required — 100–150 word elevator pitch
  "lede_quote":    "...",       // required — italic single-sentence Goldman-style PM Summary
  "financials":    { ... },     // required
  "operating_model_chart": { ... },  // optional — falls back to financials data
  "thesis":        [ ... ],     // required, 5 numbered items
  "company_overview": { ... },  // required
  "cap_table":     { ... },     // required for charts; optional otherwise
  "use_of_proceeds": [ ... ],   // optional
  "industry":      { ... },     // required
  "pipeline":      { ... },     // required (or "business_segments" for non-biotech)
  "competitive":   { ... },     // required
  "valuation":     { ... },     // required
  "risks":         [ ... ],     // required, 4–8 vectors
  "scenarios":     { ... },     // required — bull/base/bear weights
  "management":    { ... },     // required
  "disclosures":   { ... }      // required
}
```

---

## 1. `meta` (required)

Top-of-page metadata — drives the cover, headers, and footers on every page.

| Field | Type | Required | Notes |
|---|---|---|---|
| `report_date` | string | yes | "May 1, 2026" — display-formatted |
| `iso_report_date` | string | yes | "2026-05-01" — sortable |
| `company_name` | string | yes | "Helion Therapeutics, Inc." — full legal name |
| `company_short` | string | yes | "Helion" — used in body copy |
| `ticker` | string | yes | "HLON" |
| `exchange` | string | yes | "NASDAQ" \| "NYSE" \| "NYSE American" |
| `sector` | string | yes | "Biotechnology" |
| `subsector` | string | yes | "Inflammation & Immunology" |
| `country` | string | yes | "United States" |
| `analyst_name` | string | yes | "Alexandre Villela" |
| `firm_name` | string | yes | "Velocia Ventures" — defaults if omitted |
| `is_sample` | boolean | yes | If `true`, "Illustrative Sample" banners and disclaimers render |
| `cik` | string | no | "0001827997" |
| `accession_number` | string | no | "0001193125-24-XXXXXX" |
| `edgar_url` | string | no | Source filing URL (cited in disclosure appendix) |
| `hero_prompt` | string | no | 25–35 word DALL·E 3 subject prompt — wrapped by `generate-hero-image.js` STYLE_TEMPLATE. Describe ONE evocative subject tied to the company's core science/product (e.g. "A massive silicon wafer suspended mid-air with intricate microchip circuitry glowing teal and gold"). No people, no logos, no text. |
| `hero_image` | string | no | Relative path to the rendered hero image (e.g. `"./hero.png"`). Set automatically by `generate-hero-image.js` after a successful generation. The same `hero.png` is consumed by both the initiation report and the fact sheet — single DALL·E call per filing. If absent, both renderers fall back to a tinted radial-gradient placeholder. |
| `heroPrompt` / `heroImage` | string | no | camelCase aliases — both renderers accept either form. Pipeline writes camelCase; v2 schema prefers snake_case. |

## 2. `ipo` (required)

| Field | Type | Required | Notes |
|---|---|---|---|
| `size_total` | string | yes | "$150M" — gross primary issuance |
| `share_count` | string | yes | "10M shrs" |
| `price_range_low` | number | yes | 14 |
| `price_range_high` | number | yes | 16 |
| `price_mid` | number | yes | 15 — usually `(low+high)/2` |
| `post_ipo_market_cap` | string | yes | "~$1.05B" |
| `post_ipo_cash` | string | yes | "~$290M" |
| `implied_ev` | string | yes | "~$760M" |
| `cash_runway` | string | yes | "~3 yrs" |
| `bookrunners` | string | yes | "MS, GS, Cowen" — comma-separated |
| `lockup_days` | number | yes | 180 |
| `pricing_window` | string | yes | "Wk of May 18, 2026" |
| `green_shoe` | string | no | "1.5M additional shares" |

## 3. `rating` (required)

| Field | Type | Required | Notes |
|---|---|---|---|
| `label` | string | yes | "BUY" \| "HOLD" \| "SELL" |
| `target_12mo` | number | yes | 22 (in $/share) |
| `implied_return_pct` | number | yes | 47 (positive=upside, negative=downside) |
| `bull_case` | number | yes | 32 |
| `bear_case` | number | yes | 9 |

## 4. `factor_profile` (required)

Six 0–10 scores driving the cover bar chart.

```jsonc
{
  "clinical_de_risk": 7.8,        // for biotech; rename for tech: "tech_de_risk"
  "market_size":      8.5,
  "competitive_moat": 5.5,
  "capital_efficiency": 7.0,
  "insider_quality":  8.8,
  "valuation_entry":  7.2
}
```

The renderer reads these as a generic 6-row bar chart. For non-biotech, the schema accepts arbitrary 6 keys — the renderer just uses the keys as labels.

## 5. `thesis_pros` / `thesis_cons` (required)

Each is an array of strings — one bullet per item, 4–6 items each. Markdown not supported; plain text only.

```jsonc
"thesis_pros": [
  "Best-in-class Phase 2b efficacy in UC at the lowest reported dose...",
  "Clean cardiovascular & hepatic safety profile...",
  ...
]
```

## 6. `summary_paragraph` / `lede_quote` (required)

- `lede_quote`: one italicized sentence, typically 25–40 words, capturing the core thesis. Goldman-style PM Summary.
- `summary_paragraph`: 100–150 words covering business, lead asset/product, key opportunity, and entry-point framing.

## 7. `financials` (required)

Dense IB-style P&L + cash flow + balance sheet + operating metrics. Renderer expects 7 columns (3 historical, 4 forecast — or whatever fits the table).

```jsonc
{
  "fiscal_year_end": "December 31",
  "currency": "USD",
  "unit": "millions",
  "columns": ["2024A", "2025A", "2026E", "2027E", "2028E", "2029E", "2030E"],
  "sections": [
    {
      "title": "Income Statement",
      "rows": [
        { "label": "Collaboration revenue", "values": [0.0, 0.0, 0.0, 0.0, 0.0, 15.0, 40.0], "style": "normal" },
        { "label": "Total revenue",         "values": [0.0, 0.0, 0.0, 0.0, 0.0, 15.0, 125.0], "style": "total" },
        { "label": "Gross margin %",        "values": ["nm", "nm", "nm", "nm", "nm", "100.0%", "93.2%"], "style": "normal" },
        ...
      ]
    },
    { "title": "Cash Flow Statement (summary)", "rows": [...] },
    { "title": "Balance Sheet (period end)",    "rows": [...] },
    { "title": "Pipeline & Operating Metrics",  "rows": [...] }
  ],
  "source_note": "Source: S-1 (file 333-274XXX); 2024–25A audited; 2026–30E IPO Radar estimates."
}
```

`style` values: `"normal"` | `"total"` (bold + double rule) | `"subtotal"` (bold + single rule) | `"section"` (eyebrow row, no values).

`values` accepts numbers OR strings. Strings render as-is (useful for "nm", percentages, stage labels like "Ph 3 init").

## 8. `operating_model_chart` (optional)

Drives the bar+line chart on page 3. If omitted, renderer derives from `financials` rows tagged with `"chart_role"`.

```jsonc
{
  "title": "R&D + G&A burn ($M) and ending cash position ($M), 2024A–2030E",
  "labels": ["2024A","2025A","2026E","2027E","2028E","2029E","2030E"],
  "bar_a": { "label": "R&D expense",      "values": [34.5, 42.8, 72.0, 118.0, 135.0, 110.0, 95.0] },
  "bar_b": { "label": "G&A + S&M",        "values": [8.2, 11.4, 18.0, 25.0, 38.0, 63.0, 110.0] },
  "line":  { "label": "Ending cash",      "values": [178.5, 145.3, 289.8, 161.6, -2.2, 75.0, 30.0] }
}
```

## 9. `thesis` (required, 5 items)

```jsonc
[
  { "lead": "Phase 2b efficacy is genuinely best-in-class.",
    "body": "HLN-001 delivered a 32% clinical remission rate at week 12 (vs 9% placebo, p<0.001)..." },
  ...
]
```

5 items recommended; renderer accepts 3–7.

## 10. `company_overview` (required)

```jsonc
{
  "headline": "Founded to fix what the S1P class got wrong",
  "paragraphs": ["...", "...", "...", "...", "..."]   // 4–6 paragraphs, ~80 words each
}
```

## 11. `cap_table` (required for charts)

Two pies — pre-IPO and post-IPO. Each segment's `pct` should sum to 100.

```jsonc
{
  "pre_ipo": {
    "title": "Pre-IPO ownership ($720M YE 2025)",
    "segments": [
      { "label": "ARCH",          "pct": 25.0 },
      { "label": "Atlas",         "pct": 18.0 },
      { "label": "RTW",           "pct": 13.0 },
      { "label": "Janus",         "pct": 10.0 },
      { "label": "Other crossover","pct": 15.0 },
      { "label": "Mgmt & employees","pct": 11.0 },
      { "label": "Other early VCs","pct": 8.0 }
    ]
  },
  "post_ipo": { "title": "...", "segments": [...] }
}
```

## 12. `use_of_proceeds` (optional)

```jsonc
[
  { "amount": "$80M",  "pct": 53, "purpose": "HLN-001 Phase 3 program (HELIOS-2 induction + HELIOS-3 maintenance, total n=600)" },
  { "amount": "$25M",  "pct": 17, "purpose": "HLN-002 Phase 2 Crohn's induction (n=180)" },
  ...
]
```

## 13. `industry` (required)

```jsonc
{
  "headline": "An $18B inflammatory bowel disease market still dominated by injectable biologics",
  "paragraphs": ["...","...","...","...","..."],
  "pull_quote": "If HLN-001's Phase 2b efficacy and clean safety profile hold in Phase 3..."
}
```

5–7 paragraphs, two-column rendered.

## 14. `pipeline` (required for biotech) OR `business_segments` (for tech/other)

### Biotech form

```jsonc
{
  "headline": "Three programs across IBD and dermatology...",
  "stage_columns": ["Discovery","IND / Ph 1","Phase 2","Phase 3","Approval"],
  "rows": [
    { "asset": "HLN-001", "subtitle": "UC · S1P1/5 selective", "progress_pct": 72, "milestone": "Ph 3 init 3Q26" },
    { "asset": "HLN-002", "subtitle": "Crohn's · S1P1/5 long-acting", "progress_pct": 42, "milestone": "Ph 2 init 4Q26" },
    ...
  ],
  "design_sections": [
    { "heading": "HLN-001 Phase 3 design", "paragraphs": ["...","..."] },
    { "heading": "HLN-002 & HLN-003",      "paragraphs": ["...","..."] }
  ]
}
```

### Tech/other form

```jsonc
{
  "headline": "Three product lines across training, inference, and edge",
  "stage_columns": ["R&D","Beta","GA","Scale","Mature"],
  "rows": [
    { "asset": "WSE-3", "subtitle": "Wafer-scale training chip", "progress_pct": 80, "milestone": "Volume shipping" },
    ...
  ],
  "design_sections": [{ "heading": "Product roadmap", "paragraphs": ["...","..."] }]
}
```

## 15. `competitive` (required)

```jsonc
{
  "headline": "A crowded field — but the relevant comparison is narrower than it looks",
  "intro_paragraph": "...",
  "table_columns": ["Asset","Sponsor","Class","Status","Ph3 Rem*","2025 Sales","Key Liability"],
  "rows": [
    { "values": ["Rinvoq (upadacitinib)","AbbVie","JAK1 inh.","Approved","33%","$1.8B","Boxed warning (CV, malig.)"], "highlight": false },
    { "values": ["HLN-001","Helion","S1P1/5 (selective)","Ph 3 (3Q26)","32% (Ph2b)","—","Single asset; Ph 3 binary"], "highlight": true },
    ...
  ],
  "footnote": "* Reported clinical remission rate at week 8–12 induction primary endpoint.",
  "differentiation": [
    { "heading": "vs other S1Ps (Velsipity, Zeposia)", "body": "Higher Phase 2b remission rate at lower dose..." },
    ...4 quadrants
  ]
}
```

## 16. `valuation` (required)

The biggest single section — drives the football field, SOTP table, and M&A precedents table on page 8.

```jsonc
{
  "headline": "$22 12-month price target — risk-adjusted SOTP triangulated against M&A and trading comps",
  "intro_paragraph": "...",

  "football_field": {
    "x_min": 7,
    "x_max": 39,
    "ipo_mid": 15,
    "target": 22,
    "ranges": [
      { "method": "Risk-adj SOTP NPV",     "low": 18, "high": 26, "color": "teal_dk" },
      { "method": "Peer EV/cash multiple", "low": 14, "high": 20, "color": "teal_lt" },
      { "method": "M&A precedents",        "low": 19, "high": 35, "color": "gold_dk" },
      { "method": "Analyst consensus",     "low": 17, "high": 24, "color": "gold_lt" },
      { "method": "Bull/Bear scenario",    "low":  9, "high": 32, "color": "mute" }
    ]
  },

  "sotp": {
    "title": "Sum-of-the-parts (illustrative) · US$M unless noted",
    "rows": [
      { "label": "HLN-001 (UC, risk-adj. NPV)",       "value_m": 750, "value_per_share": "$10.50/sh" },
      { "label": "HLN-002 (Crohn's, risk-adj. NPV)",  "value_m": 280, "value_per_share": "$4.00/sh"  },
      { "label": "Net cash (post-IPO)",                "value_m": 290, "value_per_share": "$4.10/sh"  },
      { "label": "Total NAV / Price target",           "value_m": 1540,"value_per_share": "$22.00/sh", "style": "total" }
    ],
    "footnote": "70.0M shares; HLN-001 PoS 60%; WACC 12%; terminal 5× peak sales."
  },

  "ma_precedents": {
    "title": "Selected immunology M&A precedents",
    "table_columns": ["Target","Buyer","Year","EV ($B)"],
    "rows": [
      { "values": ["Prometheus Bio","Merck","2023","10.8"] },
      ...
    ],
    "median_label": "Median (n=6)",
    "median_value": "$3.6B",
    "footnote": "Implied take-out multiple at median: 4.7× post-IPO EV."
  },

  "recommendation_pull_quote": "Initiate at Buy with a 12-month price target of $22..."
}
```

## 17. `risks` (required, 4–8 items)

```jsonc
[
  { "heading": "Clinical risk — Phase 3 binary outcome",
    "body": "HELIOS-2 induction primary endpoint (week 12 clinical remission)..." },
  ...
]
```

## 18. `scenarios` (required)

```jsonc
{
  "bull":  { "target": 32, "probability_pct": 30, "description": "Phase 3 primary endpoint hit with effect size ≥ Phase 2b..." },
  "base":  { "target": 22, "probability_pct": 50, "description": "Phase 3 interim positive; HLN-002 progresses..." },
  "bear":  { "target": 9,  "probability_pct": 20, "description": "Phase 3 misses primary endpoint..." },
  "weighted_target": 21.4
}
```

## 19. `management` (required)

```jsonc
{
  "leadership": [
    { "name": "Anna Reilly, MD, PhD", "role": "Co-Founder & CEO",
      "background": "Mass General Brigham (Director, Crohn's & Colitis Center); HMS faculty; >40 peer-reviewed pubs in IBD therapeutics",
      "tenure": "Since 2019" },
    ...
  ],
  "board_paragraph": "Board chair: Robert Nelsen (ARCH Venture Partners; >25 biotech IPOs as lead investor)...",
  "compensation_paragraph": "CEO 2025 total compensation: $1.2M base + bonus, $4.8M equity grants...",
  "lockup_paragraph": "No selling stockholders in the offering; all shares are primary issuance..."
}
```

## 20. `disclosures` (required)

```jsonc
{
  "rating_distribution": { "buy_pct": 48, "hold_pct": 41, "sell_pct": 11 },
  "ib_relationships": "Velocia Ventures has not provided investment banking services to {company_short} in the past 12 months...",
  "position_disclosure": "(a) Velocia Ventures holds no position in {ticker}; (b) the lead analyst holds no personal position...",
  "price_target_methodology": "Our $22 12-month price target reflects probability-weighted SOTP analysis..."
}
```

The renderer fills in standard boilerplate (Reg AC, jurisdictional notices, conflicts management, forward-looking statements, copyright) automatically — no need to provide.

## 21. `body_images` (optional)

Top-level dict, **page-keyed** — drops a framed image + italic caption into the trailing whitespace of any of the four narrative pages so density stays ≥85%. Each key is independently optional; the renderer falls back to a soft tinted strip if a key is absent. Image files live alongside `report.json` and are referenced by relative path. The same key set is consumed by both `render_html.py` and `render_pdf.py`.

```jsonc
{
  "company_overview": {
    "path":    "./img-company.png",       // relative to report.json
    "prompt":  "A close-up of a silicon wafer macro shot...",   // 25–35 word DALL·E subject
    "caption": "Wafer-scale integration: Cerebras' core technology bet."   // editorial italic copy
  },
  "industry":   { "path": "./img-industry.png",   "prompt": "...", "caption": "..." },
  "pipeline":   { "path": "./img-pipeline.png",   "prompt": "...", "caption": "..." },
  "management": { "path": "./img-management.png", "prompt": "...", "caption": "..." }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `path` | string | yes (if entry present) | Relative path to a 1400×700 (or 16:9) PNG/JPG. Renderer resolves against the JSON's directory. |
| `prompt` | string | no | The DALL·E 3 subject prompt that produced the image. Stored for re-generation / audit. |
| `caption` | string | no | Editorial italic caption rendered under the image. ~6–14 words. Omit for a clean uncaptioned panel. |

**Page-key reference**

| Key | Page in report | Visual brief |
|---|---|---|
| `company_overview` | Page 4 — Company Overview | Macro of the company's core technology, product, or operating environment |
| `industry` | Page 5 — Industry & Market | Wide shot of the industry context (datacenter, lab, factory floor, retail floor) |
| `pipeline` | Page 6 — Pipeline / Segments | The thing being built: assembly, manufacturing, R&D, lab process |
| `management` | Page 10 — Management | Boardroom / leadership setting (no people in frame — DALL·E house style is people-free) |

**House style** (enforced by `generate-hero-image.js` STYLE_TEMPLATE wrapper, applied to all body image prompts too if generated by the same pipeline): hyperrealistic 3D render, cinematic studio lighting, rim light + warm gold accents, deep teal & obsidian color grade, shallow depth of field, editorial business-magazine composition, no text/logos/people.

---

## Validation rules the renderer enforces

1. `factor_profile` values must be 0–10.
2. `cap_table.pre_ipo.segments` and `cap_table.post_ipo.segments` should sum to 100% ±0.5.
3. `valuation.football_field.target` must equal `rating.target_12mo`.
4. `valuation.football_field.ipo_mid` must equal `ipo.price_mid`.
5. `scenarios.bull/base/bear.probability_pct` must sum to 100.
6. `financials.columns` length must match every `values` array length in `sections.rows`.
7. If `meta.is_sample` is true, the renderer adds the gold "Illustrative Sample" banner and rewrites the disclosure boilerplate to disclose the sample status.

## Example file

See `sample-helion.json` in this folder for a complete example matching the locked Helion sample report.
