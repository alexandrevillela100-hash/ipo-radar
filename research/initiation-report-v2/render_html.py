#!/usr/bin/env python3
"""
render_html.py - JSON-driven dark-Velocia HTML renderer for IPO Radar v2.

Reads a `report.json` conforming to schema.md and emits an 11-page HTML file
matching the visual language of `initiation-report-sample/helion-therapeutics.html`.

Usage:
    python3 render_html.py [input.json] [output.html]

Defaults:
    input.json  = sample-helion.json
    output.html = sample-helion.html
"""
import json
import sys
import math
from pathlib import Path

# --------------------------------------------------------------------------
# Velocia dark palette (kept identical to helion-therapeutics.html)
# --------------------------------------------------------------------------
PIE_COLORS = ["#3D938E", "#5BB9B3", "#7CCDC8", "#C8A45C", "#9F8242",
              "#5DBF7A", "#8A938F", "#E27474", "#5582B3", "#D4A574"]

FOOTBALL_COLOR_MAP = {
    "teal_dk": "#3D938E",
    "teal_lt": "#5BB9B3",
    "gold_dk": "#9F8242",
    "gold_lt": "#C8A45C",
    "mute":    "#8A938F",
}

RATING_COLOR = {
    "BUY":  "#5DBF7A",
    "HOLD": "#C8A45C",
    "SELL": "#E27474",
}

# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def esc(s):
    if s is None:
        return ""
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                  .replace("'", "&#39;").replace('"', "&quot;"))

def fmt_val(v):
    """Format a financial value for table display."""
    if isinstance(v, str):
        return esc(v)
    if isinstance(v, (int, float)):
        if v == 0:
            return "0.0"
        if v < 0:
            return f"({abs(v):.1f})"
        return f"{v:.1f}"
    return esc(str(v))


# --------------------------------------------------------------------------
# CSS (extracted verbatim from helion-therapeutics.html)
# --------------------------------------------------------------------------
CSS = """
:root{
  --bg-app:#050D0C;--bg-card:#0A1514;--bg-card-2:#0F1E1C;
  --ink:#E8EDE9;--body:#CDD6D1;--mute:#8A938F;
  --rule:#1E2B29;--rule-soft:#162422;
  --teal:#5BB9B3;--teal-dark:#3D938E;--teal-fill:rgba(91,185,179,.18);
  --gold:#C8A45C;--gold-soft:rgba(200,164,92,.18);
  --green:#5DBF7A;--red:#E27474;
  --tint:#11201F;--shade:#1A1812;
}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:var(--bg-app);color:var(--ink);
  font-family:'Barlow',-apple-system,Helvetica,Arial,sans-serif;font-weight:400;
  font-size:10.5pt;line-height:1.5;-webkit-font-smoothing:antialiased;}
.page{width:8.5in;min-height:11in;background:var(--bg-card);margin:0 auto 28px;
  padding:0.65in 0.7in 0.55in;position:relative;
  box-shadow:0 1px 0 rgba(91,185,179,.06),0 30px 80px -40px rgba(0,0,0,.7);
  border:1px solid var(--rule);}
.eyebrow{font-family:'DM Mono',Menlo,Consolas,monospace;font-size:7.5pt;
  letter-spacing:.18em;text-transform:uppercase;color:var(--mute);}
h1,h2,h3,h4{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;
  color:var(--ink);margin:0;line-height:1.15;}
h1{font-size:26pt;letter-spacing:-.01em;} h2{font-size:17pt;letter-spacing:-.005em;}
h3{font-size:13pt;}
h4{font-size:11pt;font-weight:600;font-family:'Barlow',sans-serif;
  text-transform:uppercase;letter-spacing:.08em;color:var(--ink);}
p{margin:0 0 8pt;color:var(--body);}
a{color:var(--teal);text-decoration:none;}
hr{border:0;border-top:1px solid var(--rule);margin:14pt 0;}
.rule-soft{border:0;border-top:1px solid var(--rule-soft);margin:10pt 0;}
.top-bar{display:flex;align-items:center;justify-content:space-between;
  padding-bottom:10pt;border-bottom:1px solid var(--ink);margin-bottom:14pt;}
.brand{font-family:'Cormorant Garamond',serif;font-size:14pt;font-weight:600;color:var(--ink);}
.brand .accent{color:var(--teal);}
.top-meta{font-family:'DM Mono',monospace;font-size:7.5pt;color:var(--mute);
  text-transform:uppercase;letter-spacing:.14em;}
.footer-bar{position:absolute;left:0.7in;right:0.7in;bottom:0.32in;
  display:flex;justify-content:space-between;font-family:'DM Mono',monospace;
  font-size:7pt;color:var(--mute);letter-spacing:.12em;text-transform:uppercase;
  border-top:1px solid var(--rule);padding-top:6pt;}
.footer-bar .center{flex:1;text-align:center;}
.footer-bar .right{text-align:right;}
.cover-grid{display:grid;grid-template-columns:1fr 230pt;gap:24pt;margin-top:6pt;
  position:relative;z-index:2;}
/* ── Cinematographic hero (matches fact-sheet treatment) ───────────────── */
.cover-hero{position:relative;border:1px solid var(--rule);border-radius:3px;
  overflow:hidden;margin:6pt 0 14pt;padding:18pt 20pt 16pt;
  min-height:230pt;display:flex;flex-direction:column;justify-content:flex-end;
  background:#0a1a1e;}
.cover-hero .hero-bg{position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;object-position:center;
  filter:saturate(1.05) contrast(1.05) brightness(0.78);z-index:0;}
.cover-hero .hero-scrim{position:absolute;inset:0;z-index:1;background:
  radial-gradient(circle at 18% 28%, rgba(91,185,179,0.28) 0%, transparent 48%),
  radial-gradient(circle at 84% 76%, rgba(200,164,92,0.22) 0%, transparent 52%),
  linear-gradient(to top, rgba(10,21,20,0.96) 0%, rgba(10,21,20,0.55) 48%, rgba(10,21,20,0.18) 100%);}
.cover-hero .hero-content{position:relative;z-index:2;}
.cover-hero h1{color:#fff;text-shadow:0 1px 14px rgba(0,0,0,0.35);}
.cover-hero .lede{color:#EAF1ED;text-shadow:0 1px 8px rgba(0,0,0,0.25);}
.cover-hero .summary{color:#D6DEDA;}
.rating-tag{display:inline-block;color:#06140C;font-family:'DM Mono',monospace;
  font-size:8pt;letter-spacing:.18em;padding:4pt 10pt;text-transform:uppercase;
  border-radius:1px;font-weight:500;}
.target{display:flex;gap:18pt;margin-top:14pt;align-items:baseline;}
.target .num{font-family:'Cormorant Garamond',serif;font-size:30pt;font-weight:600;color:var(--ink);}
.target .lab{font-family:'DM Mono',monospace;font-size:7.5pt;letter-spacing:.16em;
  text-transform:uppercase;color:var(--mute);}
.lede{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:15pt;
  line-height:1.35;color:var(--ink);margin:14pt 0 12pt;font-weight:500;}
.summary{font-size:10pt;line-height:1.6;color:var(--body);margin-bottom:10pt;}
.key-data{background:var(--bg-card-2);border-left:3px solid var(--teal);
  padding:14pt 16pt;font-size:9pt;}
.key-data .row{display:flex;justify-content:space-between;padding:4pt 0;
  border-bottom:1px solid var(--rule-soft);}
.key-data .row:last-child{border-bottom:0;}
.key-data .lab{color:var(--mute);font-family:'DM Mono',monospace;font-size:7.5pt;
  letter-spacing:.1em;text-transform:uppercase;}
.key-data .val{color:var(--ink);font-weight:500;text-align:right;}
.factor{margin-top:18pt;}
.factor-row{display:grid;grid-template-columns:96pt 1fr 26pt;align-items:center;
  gap:8pt;padding:5pt 0;}
.factor-row .lab{font-family:'DM Mono',monospace;font-size:7.5pt;letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink);}
.factor-bar{height:5pt;background:var(--rule);position:relative;border-radius:3pt;overflow:hidden;}
.factor-bar .fill{position:absolute;left:0;top:0;bottom:0;background:var(--teal);}
.factor-row .score{font-family:'DM Mono',monospace;font-size:7.5pt;color:var(--mute);text-align:right;}
.risks-cover{display:grid;grid-template-columns:1fr 1fr;gap:18pt;margin-top:14pt;}
.risk-col h4{margin-bottom:6pt;}
.risk-col ul{margin:0;padding-left:14pt;font-size:9pt;color:var(--body);line-height:1.5;}
.risk-col li{margin-bottom:4pt;}
.risk-col.pos h4{color:var(--green);border-bottom:1px solid var(--green);padding-bottom:4pt;}
.risk-col.neg h4{color:var(--red);border-bottom:1px solid var(--red);padding-bottom:4pt;}
table{width:100%;border-collapse:collapse;font-size:8.5pt;}
table.fin th{font-family:'DM Mono',monospace;font-size:6.5pt;letter-spacing:.12em;
  text-transform:uppercase;color:var(--mute);text-align:right;font-weight:500;
  border-bottom:1px solid var(--ink);padding:6pt 5pt;}
table.fin th:first-child{text-align:left;}
table.fin td{padding:3.5pt 5pt;text-align:right;border-bottom:1px solid var(--rule-soft);
  color:var(--body);font-size:8pt;}
table.fin td:first-child{text-align:left;color:var(--ink);}
table.fin tr.section td{font-family:'DM Mono',monospace;font-size:6.5pt;letter-spacing:.12em;
  text-transform:uppercase;color:var(--teal);padding-top:8pt;border-bottom:1px solid var(--rule);
  background:rgba(91,185,179,.04);}
table.fin tr.total td{font-weight:600;color:var(--ink);border-bottom:1px solid var(--ink);
  border-top:1px solid var(--rule);}
table.fin tr.subtotal td{color:var(--ink);font-weight:500;border-top:1px solid var(--rule-soft);}
table.comps{table-layout:fixed;}
table.comps th{font-family:'DM Mono',monospace;font-size:7pt;letter-spacing:.1em;
  text-transform:uppercase;color:var(--mute);text-align:right;font-weight:500;
  border-bottom:1px solid var(--ink);padding:6pt 5pt;}
table.comps th:first-child,table.comps th:last-child{text-align:left;}
table.comps td{padding:5pt;text-align:right;border-bottom:1px solid var(--rule-soft);
  font-size:8.5pt;color:var(--body);word-wrap:break-word;overflow-wrap:break-word;
  vertical-align:top;}
table.comps td:first-child{text-align:left;color:var(--ink);font-weight:500;width:22%;}
table.comps td:last-child{text-align:left;width:28%;}
table.comps tr.target td{background:var(--gold-soft);}
table.comps tr.target td:first-child{color:var(--gold);font-weight:600;}
.thesis-item{display:grid;grid-template-columns:28pt 1fr;gap:10pt;margin-bottom:13pt;
  padding-bottom:13pt;border-bottom:1px solid var(--rule-soft);}
.thesis-item:last-child{border-bottom:0;}
.thesis-num{font-family:'Cormorant Garamond',serif;font-size:22pt;font-weight:600;
  color:var(--teal);line-height:1;}
.thesis-body .lead{font-weight:600;color:var(--ink);font-size:10pt;}
.thesis-body p{font-size:9.5pt;line-height:1.55;margin:3pt 0 0;}
.section-head{display:flex;align-items:baseline;justify-content:space-between;
  margin:6pt 0 14pt;padding-bottom:8pt;border-bottom:1px solid var(--ink);}
.section-head .num{font-family:'DM Mono',monospace;font-size:8pt;letter-spacing:.18em;
  color:var(--mute);text-transform:uppercase;}
.two-col{column-count:2;column-gap:20pt;column-rule:1px solid var(--rule-soft);
  font-size:9.5pt;line-height:1.6;color:var(--body);}
.two-col p{margin:0 0 8pt;break-inside:avoid;}
.pull{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:12pt;
  color:var(--teal);border-top:1px solid var(--teal);border-bottom:1px solid var(--teal);
  padding:10pt 0;margin:8pt 0;line-height:1.4;break-inside:avoid;}
.callout{background:var(--bg-card-2);padding:11pt 13pt;border-left:2px solid var(--teal);
  font-size:9pt;color:var(--body);break-inside:avoid;margin:6pt 0;}
.callout h4{font-size:8pt;margin-bottom:4pt;color:var(--teal);}
.pipeline-row{display:grid;grid-template-columns:140pt 1fr 100pt;gap:12pt;align-items:center;
  padding:7pt 0;border-bottom:1px solid var(--rule-soft);}
.pipeline-row .asset{font-weight:600;color:var(--ink);font-size:9.5pt;}
.pipeline-row .asset .sub{display:block;font-weight:400;color:var(--mute);font-size:7pt;
  font-family:'DM Mono',monospace;letter-spacing:.06em;text-transform:uppercase;margin-top:2pt;}
.pipeline-row .stage{font-family:'DM Mono',monospace;font-size:7pt;color:var(--mute);
  text-transform:uppercase;letter-spacing:.1em;text-align:right;}
.stage-bar{height:9pt;background:var(--rule);border-radius:1pt;position:relative;}
.stage-bar .fill{position:absolute;left:0;top:0;bottom:0;
  background:linear-gradient(90deg,var(--teal-dark),var(--teal));border-radius:1pt;}
.stage-ticks{display:grid;font-family:'DM Mono',monospace;font-size:6.5pt;color:var(--mute);
  letter-spacing:.08em;text-transform:uppercase;margin-top:4pt;padding:0 1pt;}
.stage-ticks div:last-child{text-align:right;}
.chart-card{border:1px solid var(--rule);background:var(--bg-card-2);padding:12pt 14pt;
  border-radius:2px;margin-top:10pt;}
.chart-card .cap{font-family:'DM Mono',monospace;font-size:7pt;color:var(--mute);
  text-transform:uppercase;letter-spacing:.1em;margin-top:6pt;}
.chart-title{font-family:'DM Mono',monospace;font-size:7pt;letter-spacing:.16em;
  text-transform:uppercase;color:var(--mute);margin-bottom:8pt;}
.legend{display:flex;gap:18pt;font-family:'Barlow',sans-serif;font-size:8pt;color:var(--body);margin-top:6pt;}
.legend .swatch{display:inline-block;width:10pt;height:6pt;margin-right:5pt;vertical-align:middle;border-radius:1px;}
.legend .line{display:inline-block;width:14pt;height:2px;background:var(--gold);margin-right:5pt;vertical-align:middle;}
.disc-grid{column-count:2;column-gap:20pt;column-rule:1px solid var(--rule-soft);}
.disc-grid section{break-inside:avoid;margin-bottom:10pt;}
.disc-grid h4{font-size:8.5pt;color:var(--teal);margin-bottom:4pt;letter-spacing:.1em;}
.disc-grid p{font-size:8pt;line-height:1.5;margin:0 0 4pt;color:var(--body);}
.body-image{margin:14pt 0 0;border:1px solid var(--rule);border-radius:2px;
  overflow:hidden;background:var(--bg-card-2);position:relative;}
.body-image img{display:block;width:100%;height:auto;max-height:280pt;object-fit:cover;
  filter:saturate(1.05) contrast(1.05) brightness(0.92);}
.body-image .cap{font-family:'Cormorant Garamond',serif;font-style:italic;
  font-size:9.5pt;color:var(--mute);padding:6pt 12pt 10pt;line-height:1.4;
  border-top:1px solid var(--rule-soft);background:var(--bg-card-2);}
.sample-strip{background:var(--gold-soft);border-left:3px solid var(--gold);
  padding:8pt 12pt;font-family:'DM Mono',monospace;font-size:7.5pt;letter-spacing:.12em;
  text-transform:uppercase;color:var(--gold);margin-bottom:14pt;}
.sample-strip .body{display:block;text-transform:none;letter-spacing:0;font-family:'Barlow',sans-serif;
  font-size:8.5pt;color:var(--body);margin-top:3pt;}
.sample-banner{position:fixed;top:14pt;right:14pt;background:var(--gold);color:#0A0F08;
  font-family:'DM Mono',monospace;font-size:7pt;letter-spacing:.18em;padding:5pt 11pt;
  text-transform:uppercase;border-radius:1px;z-index:99;font-weight:500;}
@page{size:Letter;margin:0;}
@media print{
  html,body{background:#fff;color:#0E1A19;}
  .page{box-shadow:none;margin:0 auto;page-break-after:always;background:#fff;border:0;}
  .page:last-child{page-break-after:auto;}
  .sample-banner{position:absolute;}
}
"""

# --------------------------------------------------------------------------
# SVG chart helpers
# --------------------------------------------------------------------------
def body_image_html(D, key):
    """Emit a framed body image + caption for a given page key, if configured."""
    body_imgs = D.get("body_images") or {}
    info = body_imgs.get(key) or {}
    path = info.get("path") or info.get("image")
    if not path:
        return ""
    cap = info.get("caption", "")
    cap_html = f'<div class="cap">{esc(cap)}</div>' if cap else ""
    alt = info.get("prompt", key)
    return (f'<div class="body-image">'
            f'<img src="{esc(path)}" alt="{esc(alt)[:140]}"/>{cap_html}</div>')


def factor_profile_html(fp):
    """Return rows for the factor profile (1-10 score → 0-100% bar width)."""
    rows = []
    for k, v in fp.items():
        label = k.replace("_", " ").upper()
        pct = max(0, min(100, v * 10))
        rows.append(f'''<div class="factor-row"><span class="lab">{esc(label)}</span>
<div class="factor-bar"><div class="fill" style="width:{pct:.0f}%;"></div></div>
<span class="score">{v:.1f}</span></div>''')
    return "\n".join(rows)


def operating_model_svg(omc):
    """Stacked-bar + line chart for the operating model."""
    labels = omc["labels"]
    bar_a = omc["bar_a"]["values"]
    bar_b = omc["bar_b"]["values"]
    line  = omc["line"]["values"]
    n = len(labels)

    # determine y_max: max of (bar_a + bar_b) and line
    stacks = [a + b for a, b in zip(bar_a, bar_b)]
    line_vals = [abs(v) for v in line]
    raw_max = max(max(stacks), max(line_vals))
    # round up to a nice number
    if raw_max <= 100:    y_max = math.ceil(raw_max / 25) * 25
    elif raw_max <= 500:  y_max = math.ceil(raw_max / 100) * 100
    elif raw_max <= 2000: y_max = math.ceil(raw_max / 200) * 200
    else:                 y_max = math.ceil(raw_max / 500) * 500

    # Layout: x: 60 → 700, y: 20 → 180 (160pt height, 0 baseline at 180)
    # n bars equally spaced; bar_w fixed
    chart_w = 640
    bar_w = min(50, chart_w / n * 0.55)
    step = chart_w / n
    px = lambda i: 60 + step * (i + 0.5) - bar_w / 2
    py = lambda v: 180 - (v / y_max) * 160

    # gridline labels (5 ticks)
    grid_labels = []
    for i in range(5):
        v = y_max * (4 - i) / 4
        y = 20 + (i * 40)
        grid_labels.append(f'<line x1="60" y1="{y}" x2="700" y2="{y}" stroke="#162422"/>')
        grid_labels.append(f'<text x="55" y="{y+4}" text-anchor="end">${v:.0f}</text>')

    bars = []
    for i in range(n):
        a, b = bar_a[i], bar_b[i]
        x = px(i)
        # bottom = bar_a (R&D), stacked on top = bar_b
        a_h = (a / y_max) * 160
        b_h = (b / y_max) * 160
        bars.append(f'<rect x="{x:.1f}" y="{180 - a_h:.1f}" width="{bar_w}" height="{a_h:.1f}" fill="url(#rndGrad)"/>')
        bars.append(f'<rect x="{x:.1f}" y="{180 - a_h - b_h:.1f}" width="{bar_w}" height="{b_h:.1f}" fill="#5BB9B3" opacity="0.55"/>')

    # line points (x = bar center, y = py(line val))
    line_pts = " ".join(f"{60 + step * (i + 0.5):.1f},{py(line[i]):.1f}" for i in range(n))
    circles = "".join(
        f'<circle cx="{60 + step * (i + 0.5):.1f}" cy="{py(line[i]):.1f}" r="3.5"/>'
        for i in range(n)
    )

    x_labels = "".join(
        f'<text x="{60 + step * (i + 0.5):.1f}" y="200">{esc(labels[i])}</text>'
        for i in range(n)
    )

    return f'''<svg viewBox="0 0 720 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;">
<defs><linearGradient id="rndGrad" x1="0" x2="0" y1="0" y2="1">
<stop offset="0" stop-color="#5BB9B3"/><stop offset="1" stop-color="#3D938E"/></linearGradient></defs>
<g font-family="DM Mono, monospace" font-size="9" fill="#8A938F">
{chr(10).join(grid_labels)}
</g>
<g>{"".join(bars)}</g>
<polyline points="{line_pts}" fill="none" stroke="#C8A45C" stroke-width="2.4" stroke-linejoin="round"/>
<g fill="#C8A45C">{circles}</g>
<g font-family="DM Mono, monospace" font-size="9" fill="#8A938F" text-anchor="middle">{x_labels}</g>
</svg>'''


def pie_svg(segments, title):
    """SVG pie with leader-line labels on the right, top, left."""
    cx, cy, r = 110, 110, 80
    paths = []
    labels = []
    angle = -90  # 12 o'clock start
    total_pct = sum(s["pct"] for s in segments)
    for i, seg in enumerate(segments):
        pct = seg["pct"]
        sweep = (pct / 100) * 360
        a1 = math.radians(angle)
        a2 = math.radians(angle + sweep)
        x1, y1 = math.cos(a1) * r, math.sin(a1) * r
        x2, y2 = math.cos(a2) * r, math.sin(a2) * r
        large_arc = 1 if sweep > 180 else 0
        color = PIE_COLORS[i % len(PIE_COLORS)]
        paths.append(
            f'<path d="M {x1:.2f},{y1:.2f} A {r},{r} 0 {large_arc},1 {x2:.2f},{y2:.2f} L 0,0 Z" fill="{color}"/>'
        )
        # label position: midpoint of arc, outside at r+25
        mid_angle = math.radians(angle + sweep / 2)
        lx = math.cos(mid_angle) * (r + 30) + cx
        ly = math.sin(mid_angle) * (r + 30) + cy
        text_anchor = "start" if math.cos(mid_angle) > 0.05 else ("end" if math.cos(mid_angle) < -0.05 else "middle")
        labels.append(
            f'<text x="{lx:.0f}" y="{ly:.0f}" text-anchor="{text_anchor}" font-family="Barlow,sans-serif" font-size="8" fill="#CDD6D1">{esc(seg["label"])} {pct:.1f}%</text>'
        )
        angle += sweep

    return f'''<div class="chart-card">
<div class="chart-title">{esc(title)}</div>
<svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;">
<g transform="translate({cx},{cy})">{"".join(paths)}</g>
{"".join(labels)}
</svg></div>'''


def football_field_svg(ff, ipo_mid, target):
    """Horizontal bar chart of valuation methodology ranges."""
    x_min = ff["x_min"]
    x_max = ff["x_max"]
    span = x_max - x_min
    px = lambda v: 60 + (v - x_min) * (640 / span)

    # gridlines: 7 ticks
    ticks = []
    for i in range(7):
        v = x_min + (span * i / 6)
        x = px(v)
        ticks.append(f'<line x1="{x:.0f}" y1="20" x2="{x:.0f}" y2="180" stroke="#162422"/>')
        ticks.append(f'<text x="{x:.0f}" y="198" text-anchor="middle">${v:.0f}</text>')

    # bars
    bars = []
    bar_h = 22
    n_methods = len(ff["ranges"])
    for i, r in enumerate(ff["ranges"]):
        y = 30 + i * 32
        x1 = px(r["low"])
        x2 = px(r["high"])
        color = FOOTBALL_COLOR_MAP.get(r.get("color", "teal_dk"), "#3D938E")
        bars.append(f'<rect x="{x1:.0f}" y="{y}" width="{x2-x1:.0f}" height="{bar_h}" fill="{color}"/>')
        bars.append(f'<text x="55" y="{y+15}" text-anchor="end" font-family="Barlow,sans-serif" font-weight="600" font-size="10" fill="#E8EDE9">{esc(r["method"])}</text>')
        bars.append(f'<text x="{x1+5:.0f}" y="{y-4}" font-family="DM Mono,monospace" font-size="8" fill="#8A938F">${r["low"]}</text>')
        bars.append(f'<text x="{x2+5:.0f}" y="{y-4}" font-family="DM Mono,monospace" font-size="8" fill="#8A938F">${r["high"]}</text>')

    # IPO mid (gold dashed) + target (teal solid)
    ipo_x = px(ipo_mid)
    tgt_x = px(target)
    overlay = f'''<line x1="{ipo_x:.0f}" y1="20" x2="{ipo_x:.0f}" y2="180" stroke="#C8A45C" stroke-width="2" stroke-dasharray="4,3"/>
<text x="{ipo_x:.0f}" y="14" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#C8A45C" font-weight="500">IPO MID ${ipo_mid}</text>
<line x1="{tgt_x:.0f}" y1="20" x2="{tgt_x:.0f}" y2="180" stroke="#5BB9B3" stroke-width="2.4"/>
<text x="{tgt_x:.0f}" y="14" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#5BB9B3" font-weight="500">TARGET ${target}</text>'''

    return f'''<div class="chart-card">
<div class="chart-title">Valuation football field ($/share)</div>
<svg viewBox="0 0 720 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;">
<g font-family="DM Mono, monospace" font-size="9" fill="#8A938F">{"".join(ticks)}</g>
{"".join(bars)}
{overlay}
</svg></div>'''


# --------------------------------------------------------------------------
# Pages
# --------------------------------------------------------------------------
def page_cover(D):
    m, ipo, r = D["meta"], D["ipo"], D["rating"]
    rating_color = RATING_COLOR.get(r["label"], "#8A938F")
    short = m["company_short"]
    pros = "\n".join(f"<li>{esc(p)}</li>" for p in D["thesis_pros"])
    cons = "\n".join(f"<li>{esc(p)}</li>" for p in D["thesis_cons"])
    impl = r["implied_return_pct"]
    impl_color = "var(--green)" if impl > 0 else ("var(--red)" if impl < 0 else "var(--mute)")
    impl_str = f"+{impl}%" if impl > 0 else f"{impl}%"
    # Cinematographic hero — same source file as the fact sheet (./hero.png by convention)
    hero_image = m.get("hero_image") or m.get("heroImage") or "./hero.png"
    hero_alt = f"Thematic background — {m.get('subsector','')} {m.get('sector','')}".strip()
    return f'''<section class="page">
<div class="top-bar"><div class="brand">IPO <span class="accent">Radar</span> &nbsp;·&nbsp; Initiation</div>
<div class="top-meta">{esc(m["report_date"])} &nbsp;·&nbsp; {esc(m["firm_name"])} Research</div></div>
<div class="eyebrow">{esc(m["sector"])} · {esc(m["subsector"])} · {esc(m["country"])}</div>
<div class="cover-hero">
<img class="hero-bg" src="{esc(hero_image)}" alt="{esc(hero_alt)}" onerror="this.style.display='none'"/>
<div class="hero-scrim"></div>
<div class="hero-content">
<div style="display:flex;align-items:center;gap:10pt;">
<span class="rating-tag" style="background:{rating_color};">{esc(r["label"])}</span>
<span class="eyebrow" style="color:#CDD6D1;">Initiating coverage</span></div>
<h1 style="margin-top:8pt;">{esc(m["company_name"])} <span style="color:#CDD6D1;font-weight:400;font-size:14pt;">({esc(m["exchange"])}: {esc(m["ticker"])})</span></h1>
<p class="lede" style="margin:10pt 0 6pt;">{esc(D["lede_quote"])}</p>
</div></div>
<div class="cover-grid"><div>
<div class="target">
<div><div class="lab">12-mo Price Target</div><div class="num">${r["target_12mo"]:.2f}</div></div>
<div><div class="lab">IPO Price (mid)</div><div class="num" style="color:var(--mute);">${ipo["price_mid"]:.2f}</div></div>
<div><div class="lab">Implied Return</div><div class="num" style="color:{impl_color};">{impl_str}</div></div>
</div>
<p class="summary" style="margin-top:14pt;">{esc(D["summary_paragraph"])}</p>
</div><div>
<div class="key-data">
<div class="row"><span class="lab">Ticker</span><span class="val">{esc(m["exchange"])}: {esc(m["ticker"])}</span></div>
<div class="row"><span class="lab">Sector</span><span class="val">{esc(m["sector"][:14])} / {esc(m["subsector"][:9])}</span></div>
<div class="row"><span class="lab">IPO Size</span><span class="val">{esc(ipo["size_total"])} ({esc(ipo["share_count"])})</span></div>
<div class="row"><span class="lab">Range</span><span class="val">${ipo["price_range_low"]} – ${ipo["price_range_high"]}</span></div>
<div class="row"><span class="lab">Post-IPO Mkt Cap</span><span class="val">{esc(ipo["post_ipo_market_cap"])}</span></div>
<div class="row"><span class="lab">Post-IPO Cash</span><span class="val">{esc(ipo["post_ipo_cash"])}</span></div>
<div class="row"><span class="lab">Implied EV</span><span class="val">{esc(ipo["implied_ev"])}</span></div>
<div class="row"><span class="lab">Cash Runway</span><span class="val">{esc(ipo["cash_runway"])}</span></div>
<div class="row"><span class="lab">Bookrunners</span><span class="val">{esc(ipo["bookrunners"])}</span></div>
<div class="row"><span class="lab">Lock-up</span><span class="val">{ipo["lockup_days"]} days</span></div>
<div class="row"><span class="lab">Pricing</span><span class="val">{esc(ipo["pricing_window"])}</span></div>
</div>
<div class="factor"><div class="eyebrow" style="margin-bottom:8pt;">IPO Radar Factor Profile</div>
{factor_profile_html(D["factor_profile"])}
</div></div></div>
<hr/>
<div class="risks-cover">
<div class="risk-col pos"><h4>Why we like it</h4><ul>{pros}</ul></div>
<div class="risk-col neg"><h4>Key risks</h4><ul>{cons}</ul></div>
</div>
<div class="footer-bar"><div>IPO Radar · {esc(m["firm_name"])}</div>
<div class="center">{esc(short)} — Initiation</div>
<div class="right">1 of 11 · See Disclosures p.11</div></div>
</section>'''


def page_financials(D):
    m, fin = D["meta"], D["financials"]
    short = m["company_short"]
    cols = fin["columns"]
    th_html = f"<th>${fin['unit'].title()[:1]}M, FYE {fin['fiscal_year_end'].split()[0][:3]}</th>" + "".join(f"<th>{esc(c)}</th>" for c in cols)
    rows_html = []
    for sec in fin["sections"]:
        rows_html.append(f'<tr class="section"><td colspan="{len(cols)+1}">{esc(sec["title"])}</td></tr>')
        for r in sec["rows"]:
            cls = r.get("style", "normal")
            cls_attr = f' class="{cls}"' if cls in ("section","total","subtotal") else ""
            cells = "".join(f"<td>{fmt_val(v)}</td>" for v in r["values"])
            rows_html.append(f'<tr{cls_attr}><td>{esc(r["label"])}</td>{cells}</tr>')
    return f'''<section class="page">
<div class="top-bar"><div class="brand">IPO <span class="accent">Radar</span></div>
<div class="top-meta">{esc(m["ticker"])} · Initiation · {esc(m["report_date"])}</div></div>
<div class="section-head"><h2>Financial Snapshot &amp; Operating Model</h2><span class="num">02 / {esc(short)}</span></div>
<div class="eyebrow" style="margin-bottom:8pt;">Income statement, balance sheet, cash flow &amp; key metrics (US${esc(fin['unit'])}, FYE {esc(fin['fiscal_year_end'])})</div>
<table class="fin"><thead><tr>{th_html}</tr></thead><tbody>
{"".join(rows_html)}
</tbody></table>
<p style="font-size:7pt;color:var(--mute);margin-top:6pt;font-family:'DM Mono',monospace;letter-spacing:.06em;">{esc(fin.get("source_note",""))}</p>
<div class="footer-bar"><div>IPO Radar · {esc(m["firm_name"])}</div>
<div class="center">{esc(short)} — Initiation</div>
<div class="right">2 of 11</div></div>
</section>'''


def page_thesis(D):
    m = D["meta"]; short = m["company_short"]
    items = []
    for i, t in enumerate(D["thesis"], 1):
        items.append(f'''<div class="thesis-item">
<div class="thesis-num">{i}</div>
<div class="thesis-body"><div class="lead">{esc(t["lead"])}</div>
<p>{esc(t["body"])}</p></div></div>''')
    intro = f"We initiate {esc(short)} at <strong style=\"color:var(--ink);\">{esc(D['rating']['label'])}</strong> with a 12-month price target of <strong style=\"color:var(--ink);\">${D['rating']['target_12mo']}</strong>. Our thesis rests on the five pillars below, in order of conviction."
    omc = D.get("operating_model_chart")
    chart_html = ""
    if omc:
        chart_html = f'''<div class="chart-card">
<div class="chart-title">{esc(omc["title"])}</div>
{operating_model_svg(omc)}
<div class="legend">
<span><span class="swatch" style="background:#3D938E;"></span>{esc(omc["bar_a"]["label"])}</span>
<span><span class="swatch" style="background:#5BB9B3;opacity:.55;"></span>{esc(omc["bar_b"]["label"])}</span>
<span><span class="line"></span>{esc(omc["line"]["label"])}</span></div></div>'''
    return f'''<section class="page">
<div class="top-bar"><div class="brand">IPO <span class="accent">Radar</span></div>
<div class="top-meta">{esc(m["ticker"])} · Initiation · {esc(m["report_date"])}</div></div>
<div class="section-head"><h2>Investment Thesis</h2><span class="num">03 / {esc(short)}</span></div>
<p style="font-size:9.5pt;line-height:1.6;">{intro}</p>
{"".join(items)}
{chart_html}
<div class="footer-bar"><div>IPO Radar · {esc(m["firm_name"])}</div>
<div class="center">{esc(short)} — Initiation</div>
<div class="right">3 of 11</div></div>
</section>'''


def page_overview(D):
    m, co = D["meta"], D["company_overview"]
    short = m["company_short"]
    paras = "\n".join(f"<p>{esc(p)}</p>" for p in co["paragraphs"])
    pies = ""
    if "cap_table" in D:
        ct = D["cap_table"]
        pies = f'''<div style="display:grid;grid-template-columns:1fr 1fr;gap:18pt;margin-top:14pt;">
{pie_svg(ct["pre_ipo"]["segments"], ct["pre_ipo"]["title"])}
{pie_svg(ct["post_ipo"]["segments"], ct["post_ipo"]["title"])}
</div>'''
    uop = ""
    if "use_of_proceeds" in D:
        items = " ".join(f"{u['amount']} ({u['pct']}%) — {esc(u['purpose'])}." for u in D["use_of_proceeds"])
        uop = f'''<div class="callout" style="margin-top:14pt;">
<h4>Use of IPO proceeds</h4><p style="margin:0;">{items}</p></div>'''
    return f'''<section class="page">
<div class="top-bar"><div class="brand">IPO <span class="accent">Radar</span></div>
<div class="top-meta">{esc(m["ticker"])} · Initiation · {esc(m["report_date"])}</div></div>
<div class="section-head"><h2>Company Overview</h2><span class="num">04 / {esc(short)}</span></div>
<h3 style="margin-bottom:8pt;">{esc(co["headline"])}</h3>
<div class="two-col">{paras}</div>
{pies}
{uop}
{body_image_html(D, "company_overview")}
<div class="footer-bar"><div>IPO Radar · {esc(m["firm_name"])}</div>
<div class="center">{esc(short)} — Initiation</div>
<div class="right">4 of 11</div></div>
</section>'''


def page_industry(D):
    m, ind = D["meta"], D["industry"]
    short = m["company_short"]
    paras = []
    for i, p in enumerate(ind["paragraphs"]):
        paras.append(f"<p>{esc(p)}</p>")
        # insert pull quote roughly halfway
        if i == len(ind["paragraphs"]) // 2 and ind.get("pull_quote"):
            paras.append(f'<div class="pull">{esc(ind["pull_quote"])}</div>')
    return f'''<section class="page">
<div class="top-bar"><div class="brand">IPO <span class="accent">Radar</span></div>
<div class="top-meta">{esc(m["ticker"])} · Initiation · {esc(m["report_date"])}</div></div>
<div class="section-head"><h2>Industry &amp; Market Opportunity</h2><span class="num">05 / {esc(short)}</span></div>
<h3>{esc(ind["headline"])}</h3>
<div class="two-col" style="margin-top:8pt;">{"".join(paras)}</div>
{body_image_html(D, "industry")}
<div class="footer-bar"><div>IPO Radar · {esc(m["firm_name"])}</div>
<div class="center">{esc(short)} — Initiation</div>
<div class="right">5 of 11</div></div>
</section>'''


def page_pipeline(D):
    m = D["meta"]; short = m["company_short"]
    seg = D.get("pipeline") or D.get("business_segments")
    if not seg:
        return ""
    n_stages = len(seg["stage_columns"])
    stage_grid = f'<div class="stage-ticks" style="margin-bottom:6pt;grid-template-columns:repeat({n_stages},1fr);">' + "".join(
        f"<div>{esc(c)}</div>" for c in seg["stage_columns"]
    ) + "</div>"
    rows = []
    for r in seg["rows"]:
        rows.append(f'''<div class="pipeline-row">
<div class="asset">{esc(r["asset"])}<span class="sub">{esc(r["subtitle"])}</span></div>
<div class="stage-bar"><div class="fill" style="width:{r['progress_pct']}%;"></div></div>
<div class="stage">{esc(r["milestone"])}</div></div>''')
    sections = ""
    for ds in seg.get("design_sections", []):
        body = "\n".join(f'<p style="font-size:9.5pt;">{esc(p)}</p>' for p in ds["paragraphs"])
        sections += f'<h4 style="color:var(--teal);margin-top:14pt;">{esc(ds["heading"])}</h4>\n{body}\n'
    return f'''<section class="page">
<div class="top-bar"><div class="brand">IPO <span class="accent">Radar</span></div>
<div class="top-meta">{esc(m["ticker"])} · Initiation · {esc(m["report_date"])}</div></div>
<div class="section-head"><h2>Product / Pipeline Strategy</h2><span class="num">06 / {esc(short)}</span></div>
<h3 style="margin-bottom:14pt;">{esc(seg["headline"])}</h3>
{stage_grid}
{"".join(rows)}
<div style="margin-top:18pt;">{sections}</div>
{body_image_html(D, "pipeline")}
<div class="footer-bar"><div>IPO Radar · {esc(m["firm_name"])}</div>
<div class="center">{esc(short)} — Initiation</div>
<div class="right">6 of 11</div></div>
</section>'''


def page_competitive(D):
    m, c = D["meta"], D["competitive"]
    short = m["company_short"]
    th_html = "".join(f"<th>{esc(col)}</th>" for col in c["table_columns"])
    rows_html = []
    for r in c["rows"]:
        cls = ' class="target"' if r.get("highlight") else ""
        cells = "".join(f"<td>{esc(v)}</td>" for v in r["values"])
        rows_html.append(f"<tr{cls}>{cells}</tr>")
    diff_quads = "".join(
        f'<div class="callout"><h4>{esc(d["heading"])}</h4><p style="margin:0;">{esc(d["body"])}</p></div>'
        for d in c.get("differentiation", [])
    )
    return f'''<section class="page">
<div class="top-bar"><div class="brand">IPO <span class="accent">Radar</span></div>
<div class="top-meta">{esc(m["ticker"])} · Initiation · {esc(m["report_date"])}</div></div>
<div class="section-head"><h2>Competitive Landscape</h2><span class="num">07 / {esc(short)}</span></div>
<h3>{esc(c["headline"])}</h3>
<p style="font-size:9.5pt;margin-top:8pt;">{esc(c.get("intro_paragraph",""))}</p>
<table class="comps" style="margin-top:10pt;"><thead><tr>{th_html}</tr></thead><tbody>
{"".join(rows_html)}
</tbody></table>
<p style="font-size:7pt;color:var(--mute);font-family:'DM Mono',monospace;letter-spacing:.06em;margin-top:6pt;">{esc(c.get("footnote",""))}</p>
<h3 style="margin-top:18pt;">How {esc(short)} differentiates</h3>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14pt;margin-top:8pt;">
{diff_quads}
</div>
<div class="footer-bar"><div>IPO Radar · {esc(m["firm_name"])}</div>
<div class="center">{esc(short)} — Initiation</div>
<div class="right">7 of 11</div></div>
</section>'''


def page_valuation(D):
    m, val = D["meta"], D["valuation"]
    short = m["company_short"]
    ff = football_field_svg(val["football_field"], D["ipo"]["price_mid"], D["rating"]["target_12mo"])

    sotp_rows = []
    for r in val["sotp"]["rows"]:
        cls = ' class="total"' if r.get("style") == "total" else ""
        v_m = r.get("value_m")
        v_m_str = f"${v_m:,}" if isinstance(v_m, (int, float)) else "—"
        v_ps = r.get("value_per_share") or "—"
        sotp_rows.append(f'<tr{cls}><td>{esc(r.get("label") or "—")}</td><td>{v_m_str}</td><td>{esc(v_ps)}</td></tr>')
    
    impl = D["rating"]["implied_return_pct"]
    impl_color = "var(--green)" if impl > 0 else ("var(--red)" if impl < 0 else "var(--mute)")
    impl_str = f"+{impl}%" if impl > 0 else f"{impl}%"

    ma = val.get("ma_precedents", {})
    ma_th = "".join(f"<th>{esc(c)}</th>" for c in ma.get("table_columns", []))
    ma_rows = "".join(
        "<tr>" + "".join(f"<td>{esc(v)}</td>" for v in r["values"]) + "</tr>"
        for r in ma.get("rows", [])
    )
    ma_median = ma.get("median_value", "")
    ma_median_label = ma.get("median_label", "")

    return f'''<section class="page">
<div class="top-bar"><div class="brand">IPO <span class="accent">Radar</span></div>
<div class="top-meta">{esc(m["ticker"])} · Initiation · {esc(m["report_date"])}</div></div>
<div class="section-head"><h2>Valuation &amp; Recommendation</h2><span class="num">08 / {esc(short)}</span></div>
<h3>{esc(val["headline"])}</h3>
<p style="font-size:9.5pt;margin-top:8pt;">{esc(val.get("intro_paragraph",""))}</p>
{ff}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:18pt;margin-top:14pt;">
<div>
<div class="eyebrow">{esc(val["sotp"]["title"])}</div>
<table class="fin" style="margin-top:6pt;"><tbody>
{"".join(sotp_rows)}
<tr><td>vs IPO mid (${D["ipo"]["price_mid"]})</td><td>—</td><td style="color:{impl_color};">{impl_str}</td></tr>
</tbody></table>
<p style="font-size:7pt;color:var(--mute);font-family:'DM Mono',monospace;margin-top:4pt;">{esc(val["sotp"].get("footnote",""))}</p>
</div>
<div>
<div class="eyebrow">{esc(ma.get("title",""))}</div>
<table class="comps" style="margin-top:6pt;"><thead><tr>{ma_th}</tr></thead><tbody>
{ma_rows}
<tr class="total"><td>{esc(ma_median_label)}</td><td></td><td></td><td>{esc(ma_median)}</td></tr>
</tbody></table>
<p style="font-size:7pt;color:var(--mute);font-family:'DM Mono',monospace;margin-top:4pt;">{esc(ma.get("footnote",""))}</p>
</div>
</div>
<div class="pull" style="margin-top:14pt;">{esc(val.get("recommendation_pull_quote",""))}</div>
<div class="footer-bar"><div>IPO Radar · {esc(m["firm_name"])}</div>
<div class="center">{esc(short)} — Initiation</div>
<div class="right">8 of 11</div></div>
</section>'''


def page_risks(D):
    m = D["meta"]; short = m["company_short"]
    risks = "".join(
        f'<h4 style="color:var(--red);">{esc(r["heading"])}</h4>\n<p>{esc(r["body"])}</p>'
        for r in D["risks"]
    )
    sc = D["scenarios"]
    weighted = sc.get("weighted_target", D["rating"]["target_12mo"])
    callout = f'''<div class="callout" style="margin-top:14pt;">
<h4>Summary risk-adjusted scenario weighting</h4>
<p style="margin:0;font-size:8.5pt;">
<strong style="color:var(--green);">Bull (${sc["bull"]["target"]}, {sc["bull"]["probability_pct"]}% prob.):</strong> {esc(sc["bull"]["description"])}
<strong style="color:var(--ink);">Base (${sc["base"]["target"]}, {sc["base"]["probability_pct"]}% prob.):</strong> {esc(sc["base"]["description"])}
<strong style="color:var(--red);">Bear (${sc["bear"]["target"]}, {sc["bear"]["probability_pct"]}% prob.):</strong> {esc(sc["bear"]["description"])}
<span style="font-family:'DM Mono',monospace;font-size:7.5pt;color:var(--mute);">Probability-weighted target: ~${weighted}.</span>
</p></div>'''
    return f'''<section class="page">
<div class="top-bar"><div class="brand">IPO <span class="accent">Radar</span></div>
<div class="top-meta">{esc(m["ticker"])} · Initiation · {esc(m["report_date"])}</div></div>
<div class="section-head"><h2>Key Risks</h2><span class="num">09 / {esc(short)}</span></div>
<h3>Risk vectors framed against our ${D["rating"]["target_12mo"]} price target</h3>
<div style="margin-top:10pt;font-size:9.5pt;line-height:1.55;">{risks}</div>
{callout}
<div class="footer-bar"><div>IPO Radar · {esc(m["firm_name"])}</div>
<div class="center">{esc(short)} — Initiation</div>
<div class="right">9 of 11</div></div>
</section>'''


def page_management(D):
    m, mg = D["meta"], D["management"]
    short = m["company_short"]
    rows = "".join(
        f'<tr><td>{esc(p["name"])}</td><td>{esc(p["role"])}</td><td>{esc(p["background"])}</td><td>{esc(p["tenure"])}</td></tr>'
        for p in mg["leadership"]
    )
    return f'''<section class="page">
<div class="top-bar"><div class="brand">IPO <span class="accent">Radar</span></div>
<div class="top-meta">{esc(m["ticker"])} · Initiation · {esc(m["report_date"])}</div></div>
<div class="section-head"><h2>Management, Board &amp; Governance</h2><span class="num">10 / {esc(short)}</span></div>
<h3>Leadership</h3>
<table class="comps" style="margin-top:8pt;">
<thead><tr><th>Name</th><th>Role</th><th>Selected background</th><th>Tenure</th></tr></thead>
<tbody>{rows}</tbody></table>
<h3 style="margin-top:18pt;">Board of Directors</h3>
<p style="font-size:9.5pt;">{esc(mg.get("board_paragraph",""))}</p>
<h3 style="margin-top:14pt;">Compensation &amp; equity</h3>
<p style="font-size:9.5pt;">{esc(mg.get("compensation_paragraph",""))}</p>
<h3 style="margin-top:14pt;">Selling stockholders &amp; lock-ups</h3>
<p style="font-size:9.5pt;">{esc(mg.get("lockup_paragraph",""))}</p>
{body_image_html(D, "management")}
<div class="footer-bar"><div>IPO Radar · {esc(m["firm_name"])}</div>
<div class="center">{esc(short)} — Initiation</div>
<div class="right">10 of 11</div></div>
</section>'''


def page_disclosures(D):
    m, d = D["meta"], D["disclosures"]
    short = m["company_short"]
    rd = d.get("rating_distribution", {})
    sample = ""
    if m.get("is_sample"):
        sample = f'''<div class="sample-strip">Illustrative sample — not investment research
<span class="body">This document is an illustrative sample demonstrating IPO Radar report format and structure. The company "{esc(m["company_name"])}", all financial and valuation data, the price target, and the rating are entirely fabricated. Any resemblance to actual companies or persons, living or dead, is coincidental.</span></div>'''
    return f'''<section class="page">
<div class="top-bar"><div class="brand">IPO <span class="accent">Radar</span></div>
<div class="top-meta">{esc(m["ticker"])} · Initiation · {esc(m["report_date"])}</div></div>
<div class="section-head"><h2>Disclosure Appendix</h2><span class="num">11 / {esc(short)}</span></div>
{sample}
<div class="disc-grid">
<section><h4>Analyst certification (Reg AC)</h4>
<p>I, {esc(m["analyst_name"])}, certify that the views expressed in this report accurately reflect my personal views about the subject company and securities. I further certify that no part of my compensation was, is, or will be directly or indirectly related to the specific recommendations or views expressed. Reg AC certification applies to all analysts contributing to research published by {esc(m["firm_name"])}.</p></section>
<section><h4>Beneficial ownership disclosure</h4>
<p>{esc(d.get("position_disclosure",""))}</p></section>
<section><h4>Investment banking relationships</h4>
<p>{esc(d.get("ib_relationships",""))}</p></section>
<section><h4>Rating system</h4>
<p>{esc(m["firm_name"])} uses a three-tier rating system: BUY (expected return &gt;15% over 12 months), HOLD (-10% to +15%), SELL (expected return &lt;−10%). Price targets reflect 12-month forward expectations and are derived from a combination of DCF, comparable companies, precedent transactions, and scenario analysis. Ratings and price targets are subject to revision without notice.</p></section>
<section><h4>Rating distribution ({esc(m["firm_name"])} coverage universe)</h4>
<p>As of report date, {esc(m["firm_name"])} coverage distribution: BUY {rd.get("buy_pct","—")}%, HOLD {rd.get("hold_pct","—")}%, SELL {rd.get("sell_pct","—")}%. Distribution among companies for which {esc(m["firm_name"])} has provided investment banking services in the past 12 months: not applicable (no IB relationships maintained).</p></section>
<section><h4>Price target methodology &amp; risks</h4>
<p>{esc(d.get("price_target_methodology",""))}</p></section>
<section><h4>General risk disclosures</h4>
<p>Investment in IPO securities involves significant risk, including risk of total loss of capital. Price volatility is materially elevated relative to broader equity markets. Past performance is not a reliable indicator of future results. Forward-looking statements in this report — including price targets, financial estimates, and milestone timing — are subject to risks and uncertainties that may cause actual outcomes to differ materially.</p></section>
<section><h4>Sources &amp; data providers</h4>
<p>Primary sources: U.S. Securities and Exchange Commission EDGAR system (S-1, S-1/A, 8-K, 10-K, DEF 14A); company investor presentations and conference call transcripts. Secondary sources: Capital IQ, FactSet, Bloomberg (capitalization, share price, comparable company data); industry research providers; ClinicalTrials.gov where applicable. All non-EDGAR sources are cited inline in production reports.</p></section>
<section><h4>Jurisdictional notices</h4>
<p>U.S.: This report is intended for institutional investors and qualified retail clients. EU/UK: Distribution restricted to professional clients and eligible counterparties under MiFID II. Japan: Distribution restricted to qualified institutional investors. Australia: Wholesale clients only. Canada: Distribution restricted to permitted clients under National Instrument 31-103. This report is not directed to persons in jurisdictions where its distribution would be unlawful.</p></section>
<section><h4>Conflicts management</h4>
<p>{esc(m["firm_name"])} maintains a research independence policy under which research analysts (a) are not supervised by, and do not report to, personnel responsible for investment banking or capital markets activities; (b) are not compensated based on specific investment banking transactions; (c) are subject to pre-publication review by Compliance for accuracy and conflicts but not for editorial direction. Personal trading by analysts in covered securities is restricted under blackout windows.</p></section>
</div>
<p style="font-size:7.5pt;color:var(--mute);margin-top:10pt;line-height:1.5;">Forward-Looking Statements: This report contains forward-looking statements within the meaning of Section 27A of the Securities Act of 1933 and Section 21E of the Securities Exchange Act of 1934. Forward-looking statements involve known and unknown risks, uncertainties, and other factors which may cause actual results, performance, or achievements to differ materially. {esc(m["firm_name"])} undertakes no obligation to update forward-looking statements except as required by applicable law.</p>
<p style="font-size:7pt;color:var(--mute);margin-top:6pt;font-family:'DM Mono',monospace;letter-spacing:.06em;">Copyright © 2026 {esc(m["firm_name"])}. All rights reserved. IPO Radar is a research product of {esc(m["firm_name"])}. Distribution outside intended recipients is prohibited. Source: {esc(m.get("edgar_url","SEC EDGAR"))}.</p>
<div class="footer-bar"><div>IPO Radar · {esc(m["firm_name"])}</div>
<div class="center">{esc(short)} — Initiation</div>
<div class="right">11 of 11 · End of report</div></div>
</section>'''


def render(D):
    m = D["meta"]
    title = f"IPO Radar — {m['company_name']} ({m['ticker']}) — Initiation"
    sample_banner = ""
    if m.get("is_sample"):
        sample_banner = '<div class="sample-banner">Illustrative Sample — Not Investment Research</div>'
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>{esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Barlow:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>
{sample_banner}
{page_cover(D)}
{page_financials(D)}
{page_thesis(D)}
{page_overview(D)}
{page_industry(D)}
{page_pipeline(D)}
{page_competitive(D)}
{page_valuation(D)}
{page_risks(D)}
{page_management(D)}
{page_disclosures(D)}
</body>
</html>'''


def main():
    inp = sys.argv[1] if len(sys.argv) > 1 else "sample-helion.json"
    out = sys.argv[2] if len(sys.argv) > 2 else "sample-helion.html"
    print(f"Reading: {inp}")
    D = json.loads(Path(inp).read_text())
    html = render(D)
    Path(out).write_text(html)
    print(f"Wrote: {out}")


if __name__ == "__main__":
    main()
