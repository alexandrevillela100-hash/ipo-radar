#!/usr/bin/env python3
"""
IPO Radar — Fact Sheet renderer (v2).

Reads a v2 filing.json (the same artifact the long-form initiation report
consumes) and writes a single self-contained HTML page — the one-pager
fact sheet. HTML only, no PDF.

Design parity with the existing fact sheet (Cormorant Garamond + DM Mono +
Barlow, dark teal palette) so it visually reads as the same publication
as the long-form report. Section list:

  1. Hero        — company name, ticker, exchange, filing date, hero image
  2. Brief       — lede + bull/bear cases (mirrors thesis_pros / thesis_cons)
  3. Risks       — top 5 risks from the long-form report
  4. Offering    — IPO details panel (price, deal size, lock-up, etc.)
  5. CTA         — links to the long-form Initiation Report (HTML + PDF)

Sections 6 (financials chart), 7 (peer comparables table), 8 (timeline)
exist in the long-form report's reference design but are intentionally
omitted from this v2 fact sheet — kept simple for the first pass. Easy
to add later by lifting from render_html.py once the field mapping is
nailed down.

Generation rule (per Ale): the fact sheet is generated from the SAME
filing.json the long-form report consumes — never from the S-1 directly.
This guarantees the two artifacts are consistent (same Claude extraction,
single source of truth) and prevents hallucination drift.

Usage:
  python3 render_factsheet.py <filing.json> <output.html>

Image references in the output HTML use the same relative paths as the
long-form report (`./hero.png`). The publish step (publish-report.js)
rewrites them to Sanity CDN URLs alongside the long-form report's image
src= rewrites.
"""

import sys
import json
import html
from pathlib import Path
from datetime import datetime


# ─── Tokens (lifted verbatim from cbrs-fact-sheet.html) ───────────────

CSS = """
:root {
  --bg:          #080e10;
  --bg-b:        #0d1a1c;
  --bg-c:        #111f22;
  --bg-surface:  #132022;
  --bg-surface2: #1a2c30;
  --ink:         #e2edeb;
  --ink-dim:     #a9c3bf;
  --ink-muted:   #78a49f;
  --teal:        #03C8B5;
  --teal-dim:    #038a7c;
  --gold:        #c8a45c;
  --red:         #d65a5a;
  --green:       #59c280;
  --border:      rgba(120, 164, 159, 0.22);
  --border-soft: rgba(120, 164, 159, 0.10);
  --font-serif:  'Cormorant Garamond', Georgia, serif;
  --font-sans:   'Barlow', system-ui, sans-serif;
  --font-mono:   'DM Mono', ui-monospace, monospace;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink);
  font-family: var(--font-sans); line-height: 1.6; -webkit-font-smoothing: antialiased; }
a { color: var(--teal); text-decoration: none; }
a:hover { color: #5fe3d2; }
h1,h2,h3,h4 { font-family: var(--font-serif); font-weight: 300; letter-spacing: -0.01em; margin: 0; }
.mono { font-family: var(--font-mono); }

/* ── Crumb ───────────────────────────────────────────── */
.crumb { max-width: 1280px; margin: 24px auto 0; padding: 0 32px;
  font-family: var(--font-mono); font-size: 11px; color: var(--ink-muted);
  text-transform: uppercase; letter-spacing: 0.14em; }
.crumb span { color: var(--ink-dim); }

/* ── Hero ────────────────────────────────────────────── */
.hero { position: relative; max-width: 1280px; margin: 18px auto 0; padding: 0 32px; }
.hero-card { position: relative; border: 1px solid var(--border); border-radius: 4px;
  overflow: hidden; min-height: 420px; display: flex; align-items: flex-end;
  background: #0a1a1e; }
.hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  object-position: center; filter: saturate(1.05) contrast(1.05) brightness(0.85); z-index: 0; }
.hero-scrim { position: absolute; inset: 0; z-index: 1; background:
  radial-gradient(circle at 20% 25%, rgba(3,200,181,0.22) 0%, transparent 45%),
  radial-gradient(circle at 85% 75%, rgba(200,164,92,0.16) 0%, transparent 50%),
  linear-gradient(to top, rgba(8,14,16,0.96) 0%, rgba(8,14,16,0.60) 45%, rgba(8,14,16,0.18) 100%); }
.hero-content { z-index: 2; position: relative; padding: 40px 44px 32px; width: 100%; }
.hero-tags { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.tag { font-family: var(--font-mono); font-size: 11px; padding: 5px 10px;
  text-transform: uppercase; letter-spacing: 0.12em; border-radius: 2px; }
.tag-industry { background: rgba(3,200,181,0.12); color: var(--teal); border: 1px solid rgba(3,200,181,0.32); }
.tag-stage    { background: rgba(200,164,92,0.10); color: var(--gold);  border: 1px solid rgba(200,164,92,0.28); }
.hero h1 { font-size: 60px; line-height: 1.04; margin-bottom: 6px; }
.hero h1 em { font-style: italic; color: var(--teal-dim); }
.hero-sub { display: flex; gap: 22px; align-items: baseline; flex-wrap: wrap;
  color: var(--ink-dim); font-size: 14px; margin-top: 8px; }
.hero-sub .ticker { font-family: var(--font-mono); font-size: 18px; color: var(--teal);
  letter-spacing: 0.08em; }
.hero-sub .sep { opacity: 0.3; }
.hero-sub .exch { font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.06em; }

/* ── Main grid ───────────────────────────────────────── */
.main { max-width: 1280px; margin: 0 auto; padding: 40px 32px 60px;
  display: grid; grid-template-columns: 1fr 360px; gap: 40px; }
.section + .section { margin-top: 44px; }
.section-head { display: flex; align-items: baseline; justify-content: space-between;
  padding-bottom: 12px; margin-bottom: 18px; border-bottom: 1px solid var(--border-soft); }
.section-head h2 { font-size: 28px; }
.section-head .eyebrow { font-family: var(--font-mono); font-size: 11px; color: var(--ink-muted);
  text-transform: uppercase; letter-spacing: 0.16em; }
.lede { font-family: var(--font-serif); font-style: italic; font-size: 22px; line-height: 1.5;
  color: var(--ink-dim); max-width: 66ch; }
.body-p { font-size: 15px; color: var(--ink-dim); margin: 12px 0; }
.body-p strong { color: var(--ink); font-weight: 500; }

/* ── Bull / Bear ─────────────────────────────────────── */
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12px; }
.summary-card { background: var(--bg-b); border: 1px solid var(--border-soft); padding: 20px;
  border-radius: 3px; }
.summary-card h4 { font-size: 12px; font-family: var(--font-mono); text-transform: uppercase;
  letter-spacing: 0.14em; color: var(--teal); margin-bottom: 10px; }
.summary-card.bear h4 { color: var(--gold); }
.summary-card ul { margin: 0; padding-left: 18px; }
.summary-card li { font-size: 13.5px; color: var(--ink-dim); margin-bottom: 8px; }

/* ── Risks ───────────────────────────────────────────── */
.risk-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.risk { display: grid; grid-template-columns: 32px 1fr; gap: 16px; align-items: start;
  padding: 16px 20px; background: var(--bg-b); border-left: 2px solid var(--gold);
  border-radius: 2px; }
.risk-num { font-family: var(--font-mono); font-size: 20px; color: var(--gold); line-height: 1; }
.risk h4 { font-family: var(--font-sans); font-size: 14px; font-weight: 600; color: var(--ink);
  margin-bottom: 4px; }
.risk p { margin: 0; font-size: 13px; color: var(--ink-dim); }

/* ── Right rail ──────────────────────────────────────── */
.rail > .panel + .panel { margin-top: 18px; }
.panel { background: var(--bg-b); border: 1px solid var(--border-soft); border-radius: 3px;
  padding: 22px 22px 20px; }
.panel h3 { font-family: var(--font-mono); font-size: 11px; color: var(--teal);
  text-transform: uppercase; letter-spacing: 0.16em; margin-bottom: 14px; padding-bottom: 10px;
  border-bottom: 1px solid var(--border-soft); }
dl.kv { margin: 0; display: grid; grid-template-columns: 1fr auto; row-gap: 11px; column-gap: 12px; }
dl.kv dt { font-size: 13px; color: var(--ink-muted); }
dl.kv dd { margin: 0; font-family: var(--font-mono); font-size: 13px; color: var(--ink); text-align: right; }
dl.kv dd .hl { color: var(--teal); }
.panel-cta { display: flex; flex-direction: column; gap: 10px; text-align: center;
  background: linear-gradient(180deg, rgba(3,200,181,0.10), rgba(3,200,181,0.02));
  border: 1px solid rgba(3,200,181,0.35); }
.panel-cta h3 { color: var(--teal); }
.panel-cta p { font-size: 13px; color: var(--ink-dim); margin: 0 0 6px; }
.btn { display: inline-block; padding: 12px 18px; font-family: var(--font-mono); font-size: 12px;
  text-transform: uppercase; letter-spacing: 0.14em; border-radius: 2px; text-align: center; }
.btn-primary { background: var(--teal); color: var(--bg); border: 1px solid var(--teal); }
.btn-primary:hover { background: #5fe3d2; }
.btn-ghost { background: transparent; color: var(--teal); border: 1px solid rgba(3,200,181,0.35); }
.btn-ghost:hover { border-color: var(--teal); }
.filing-link { display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border: 1px solid var(--border-soft); border-radius: 2px;
  font-family: var(--font-mono); font-size: 12px; color: var(--ink-dim); }
.filing-link:hover { border-color: var(--teal); color: var(--teal); }
.filing-link .arrow { color: var(--ink-muted); }

/* ── Footer ──────────────────────────────────────────── */
footer.site { border-top: 1px solid var(--border-soft); background: var(--bg-b); padding: 32px;
  margin-top: 36px; }
footer.site .foot-inner { max-width: 1280px; margin: 0 auto; display: flex;
  justify-content: space-between; gap: 32px; font-family: var(--font-mono); font-size: 11px;
  color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.12em; flex-wrap: wrap; }
footer.site .disc { max-width: 640px; font-family: var(--font-sans); font-size: 11px;
  color: var(--ink-muted); text-transform: none; letter-spacing: 0; line-height: 1.6; }

@media (max-width: 1080px) {
  .main { grid-template-columns: 1fr; }
  .summary-grid { grid-template-columns: 1fr; }
  .hero h1 { font-size: 42px; }
}

@media print {
  @page { size: Letter; margin: 12mm 14mm; }
  html, body { background: #ffffff !important; color: #0a1a1e !important; font-size: 10pt; }
  .crumb, .panel-cta, footer.site { display: none !important; }
  .hero-card { background: #ffffff !important; border: none !important;
    border-bottom: 2px solid #0a7268 !important; min-height: auto !important;
    border-radius: 0 !important; }
  .hero-bg, .hero-scrim { display: none !important; }
  .hero h1 { color: #0a1a1e !important; font-size: 28pt; }
  .main { display: block !important; padding: 0 !important; max-width: 100% !important; }
  .summary-card, .panel, .risk { background: #ffffff !important;
    border: 1px solid #cfd8d6 !important; color: #0a1a1e !important; }
}
"""


# ─── Helpers ──────────────────────────────────────────────────────────

def esc(s):
    """HTML-escape — safe for company names with `&` / `<`."""
    if s is None:
        return ""
    return html.escape(str(s), quote=True)


def fmt_date(iso):
    """ISO 'YYYY-MM-DD' or 'Month D, YYYY' → 'Month D, YYYY'."""
    if not iso:
        return ""
    s = str(iso)
    # If already long-form, return as-is
    if "," in s:
        return s
    try:
        d = datetime.strptime(s, "%Y-%m-%d")
        return d.strftime("%b %-d, %Y") if hasattr(d, "strftime") else s
    except Exception:
        return s


def first_truthy(*vals):
    """Return the first non-empty value (skip None / '')."""
    for v in vals:
        if v not in (None, "", [], {}):
            return v
    return None


def get(d, *path, default=None):
    """Safe nested-dict access. get(filing, 'meta', 'company_name') etc."""
    cur = d
    for k in path:
        if isinstance(cur, dict):
            cur = cur.get(k)
        else:
            return default
        if cur is None:
            return default
    return cur if cur is not None else default


# ─── Section renderers ────────────────────────────────────────────────

def render_hero(filing):
    meta = get(filing, "meta", default={}) or {}
    company = first_truthy(meta.get("company_name"), meta.get("company")) or "Company"
    ticker = meta.get("ticker") or ""
    exchange = meta.get("exchange") or ""
    industry = first_truthy(meta.get("industry"), meta.get("sector"), meta.get("subsector")) or ""
    filing_date = first_truthy(meta.get("filing_date"), meta.get("filingDate")) or ""

    # Status — derive from filing or use a default
    status = (get(filing, "ipo", "status") or "Pre-pricing").strip() or "Pre-pricing"

    # Hero image — use Sanity-rewritten URL if available, else the local
    # ./hero.png path (publish-report.js rewrites this to the CDN URL).
    hero_image_path = first_truthy(meta.get("hero_image"), meta.get("heroImage"), "./hero.png")

    pricing_note = first_truthy(
        get(filing, "ipo", "expected_pricing"),
        get(filing, "ipo", "pricing_window"),
    )

    industry_tag = f'<span class="tag tag-industry">{esc(industry)}</span>' if industry else ""
    stage_tag = f'<span class="tag tag-stage">S-1 · {esc(status)}</span>'

    pricing_html = ""
    if pricing_note:
        pricing_html = (
            '<span class="sep">|</span>'
            f'<span>Expected pricing: {esc(pricing_note)}</span>'
        )

    return f"""
<section class="hero">
  <div class="hero-card">
    <img class="hero-bg" src="{esc(hero_image_path)}" alt="" onerror="this.style.display='none'" />
    <div class="hero-scrim"></div>
    <div class="hero-content">
      <div class="hero-tags">
        {industry_tag}
        {stage_tag}
      </div>
      <h1>{esc(company)}</h1>
      <div class="hero-sub">
        <span class="ticker">{esc(ticker)}</span>
        <span class="sep">|</span>
        <span class="exch">{esc(exchange)}</span>
        <span class="sep">|</span>
        <span>Filed {esc(fmt_date(filing_date))}</span>
        {pricing_html}
      </div>
    </div>
  </div>
</section>
"""


def render_brief(filing):
    """Executive brief: lede + bull/bear list."""
    lede = first_truthy(
        get(filing, "lede_quote"),
        get(filing, "summary_paragraph"),
        get(filing, "meta", "headline"),
    ) or ""

    pros = get(filing, "thesis_pros") or []
    cons = get(filing, "thesis_cons") or []

    def list_items(arr):
        items = []
        for item in arr[:5]:  # cap at 5 for one-pager fit
            if isinstance(item, dict):
                # Schema variants — try {body}, {text}, {summary}, or full string
                text = first_truthy(item.get("body"), item.get("text"), item.get("summary"))
                if not text:
                    # Fallback: serialise the dict's first string-y value
                    for v in item.values():
                        if isinstance(v, str) and len(v) > 10:
                            text = v
                            break
            else:
                text = str(item)
            if text:
                items.append(f"<li>{esc(text)}</li>")
        return "\n".join(items) if items else "<li>—</li>"

    return f"""
<section class="section">
  <div class="section-head">
    <h2>What this is</h2>
    <span class="eyebrow">Executive brief</span>
  </div>
  <p class="lede">{esc(lede)}</p>
  <div class="summary-grid">
    <div class="summary-card">
      <h4>What the bull sees</h4>
      <ul>
        {list_items(pros)}
      </ul>
    </div>
    <div class="summary-card bear">
      <h4>What the bear sees</h4>
      <ul>
        {list_items(cons)}
      </ul>
    </div>
  </div>
</section>
"""


def render_risks(filing):
    """Top 5 risks — pulled from the long-form report's risks array."""
    risks = get(filing, "risks") or []
    if not risks:
        return ""

    rows = []
    for i, r in enumerate(risks[:5], start=1):
        if isinstance(r, dict):
            heading = first_truthy(r.get("heading"), r.get("title"), r.get("name")) or "Risk"
            body = first_truthy(r.get("body"), r.get("description"), r.get("text")) or ""
        else:
            heading = "Risk"
            body = str(r)
        rows.append(f"""
<div class="risk">
  <span class="risk-num">{i:02d}</span>
  <div>
    <h4>{esc(heading)}</h4>
    <p>{esc(body)}</p>
  </div>
</div>""")

    return f"""
<section class="section">
  <div class="section-head">
    <h2>Top risks</h2>
    <span class="eyebrow">Top 5 from the initiation report</span>
  </div>
  <div class="risk-grid">
    {''.join(rows)}
  </div>
</section>
"""


def render_offering_panel(filing):
    """Right-rail offering details — IPO mechanics."""
    meta = get(filing, "meta", default={}) or {}
    ipo = get(filing, "ipo", default={}) or {}

    ticker = meta.get("ticker") or "—"
    exchange = meta.get("exchange") or "—"
    industry = first_truthy(meta.get("industry"), meta.get("sector")) or "—"
    filing_type = first_truthy(meta.get("filing_type"), "S-1")
    filing_date = first_truthy(meta.get("filing_date"), meta.get("filingDate")) or "—"
    fye = ipo.get("fiscal_year_end") or "December 31"
    deal_size = first_truthy(ipo.get("deal_size"), ipo.get("size")) or "TBD"
    price_range = first_truthy(ipo.get("price_range"), ipo.get("range")) or "TBD"

    return f"""
<div class="panel">
  <h3>Offering details</h3>
  <dl class="kv">
    <dt>Ticker</dt>          <dd>{esc(ticker)}</dd>
    <dt>Exchange</dt>        <dd>{esc(exchange)}</dd>
    <dt>Industry</dt>        <dd>{esc(industry)}</dd>
    <dt>Filing type</dt>     <dd>{esc(filing_type)}</dd>
    <dt>Filing date</dt>     <dd>{esc(fmt_date(filing_date))}</dd>
    <dt>Fiscal year-end</dt> <dd>{esc(fye)}</dd>
    <dt>Deal size</dt>       <dd>{esc(deal_size)}</dd>
    <dt>Price range</dt>     <dd>{esc(price_range)}</dd>
  </dl>
</div>
"""


def render_underwriters_panel(filing):
    """Right-rail underwriters — list or single-line summary."""
    uw = first_truthy(
        get(filing, "ipo", "underwriters"),
        get(filing, "ipo", "bookrunners"),
        get(filing, "underwriters"),
    )
    if not uw:
        return ""

    if isinstance(uw, list):
        # Each entry might be a dict {name, role} or a plain string
        bits = []
        for u in uw:
            if isinstance(u, dict):
                bits.append(u.get("name") or "")
            else:
                bits.append(str(u))
        body = " · ".join(b for b in bits if b)
    else:
        body = str(uw)

    return f"""
<div class="panel">
  <h3>Underwriters</h3>
  <p style="font-size: 13px; color: var(--ink-dim); margin: 0;">{esc(body)}</p>
</div>
"""


def render_filings_panel(filing):
    edgar_url = first_truthy(
        get(filing, "meta", "edgar_url"),
        get(filing, "meta", "edgarUrl"),
    )
    if not edgar_url:
        return ""

    return f"""
<div class="panel">
  <h3>Filings</h3>
  <a class="filing-link" href="{esc(edgar_url)}" target="_blank" rel="noopener">
    <span>S-1 · EDGAR</span><span class="arrow">→</span>
  </a>
</div>
"""


def render_report_cta_panel(filing):
    """Right-rail CTA linking to the long-form Initiation Report."""
    ticker_lc = (get(filing, "meta", "ticker") or "").lower() or "report"

    return f"""
<div class="panel panel-cta">
  <h3>IPO Radar initiation report</h3>
  <p>Full grounded brief — the analysis behind this fact sheet.</p>
  <a class="btn btn-primary" href="/reports/{esc(ticker_lc)}">Open full report</a>
  <p style="font-size: 11px; color: var(--ink-muted); margin-top: 6px;">
    HTML on screen · PDF for download
  </p>
</div>
"""


def render_breadcrumb(filing):
    company = first_truthy(
        get(filing, "meta", "company_name"),
        get(filing, "meta", "company"),
    ) or ""
    filing_date = first_truthy(
        get(filing, "meta", "filing_date"),
        get(filing, "meta", "filingDate"),
    ) or ""
    return f"""
<div class="crumb">
  <a href="/">Calendar</a> / <a href="/">{esc(fmt_date(filing_date))}</a> / <span>{esc(company)}</span>
</div>
"""


def render_footer(filing):
    analyst = get(filing, "meta", "analyst_name") or "Alexandre Villela"
    return f"""
<footer class="site">
  <div class="foot-inner">
    <div>© 2026 Velocia Ventures · IPO Radar</div>
    <div class="disc">
      Research provided for informational purposes only. Not a solicitation
      or recommendation to buy or sell securities. All data sourced from
      public SEC filings; forward-looking figures are disclosed management
      targets from the registration statement. Reviewed and approved by
      {esc(analyst)} prior to distribution.
    </div>
    <div>v2 · fact-sheet</div>
  </div>
</footer>
"""


# ─── Main render ──────────────────────────────────────────────────────

def render_factsheet(filing):
    """Build the full HTML document from a v2 filing dict."""
    meta = get(filing, "meta", default={}) or {}
    title_company = first_truthy(meta.get("company_name"), meta.get("company")) or "Fact Sheet"
    ticker = meta.get("ticker") or ""
    title = f"{title_company} ({ticker}) — IPO Radar Fact Sheet" if ticker else title_company

    head = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Mono:wght@300;400;500&family=Barlow:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>{CSS}</style>
</head>"""

    body_inner = f"""
<body>

{render_breadcrumb(filing)}

{render_hero(filing)}

<main class="main">

  <div class="content">
    {render_brief(filing)}
    {render_risks(filing)}
  </div>

  <aside class="rail">
    {render_report_cta_panel(filing)}
    {render_offering_panel(filing)}
    {render_underwriters_panel(filing)}
    {render_filings_panel(filing)}
  </aside>

</main>

{render_footer(filing)}

</body>
</html>
"""

    return head + body_inner


# ─── CLI ──────────────────────────────────────────────────────────────

def main(argv):
    if len(argv) < 3:
        print(f"usage: {argv[0]} <filing.json> <output.html>", file=sys.stderr)
        return 2

    in_path = Path(argv[1])
    out_path = Path(argv[2])

    print(f"Reading: {in_path}")
    filing = json.loads(in_path.read_text(encoding="utf-8"))

    out_html = render_factsheet(filing)
    out_path.write_text(out_html, encoding="utf-8")
    print(f"Wrote: {out_path} ({len(out_html):,} chars)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
