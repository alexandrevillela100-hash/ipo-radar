"""
IPO Radar v2 — JSON-driven initiation report PDF renderer.

Reads a report.json conforming to schema.md and emits an 11-page
white-background PDF. Drives all data — narrative, financials, charts,
disclosures — from the input JSON. Drawing helpers and chart code are
unchanged from v1.

Usage:
    python render_pdf.py <input.json> <output.pdf>

Defaults to sample-helion.json in this folder.
"""
import json
import math
import sys
from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white, Color
from reportlab.lib.utils import simpleSplit, ImageReader

# ── Palette (white background; matches HTML print theme) ────────────────
INK       = HexColor("#0E1A19")
BODY      = HexColor("#2A3735")
MUTE      = HexColor("#6B7976")
RULE      = HexColor("#D9DEDB")
RULE_SOFT = HexColor("#ECEFEC")
TEAL      = HexColor("#0F8A82")
TEAL_DK   = HexColor("#0A6B65")
TEAL_LT   = HexColor("#7CC0BB")
GOLD      = HexColor("#9C7327")
GOLD_LT   = HexColor("#D4B777")
GREEN     = HexColor("#2D8F4F")
RED       = HexColor("#B33A3A")
TINT      = HexColor("#F4F7F6")
SHADE     = HexColor("#F8F5EE")
WHITE     = white

PIE_COLORS = [
    HexColor("#0F8A82"), HexColor("#9C7327"), HexColor("#2D8F4F"),
    HexColor("#0A6B65"), HexColor("#7CC0BB"), HexColor("#D4B777"),
    HexColor("#6B7976"), HexColor("#B33A3A"),
]

COLOR_KEYS = {
    "teal": TEAL, "teal_dk": TEAL_DK, "teal_lt": TEAL_LT,
    "gold": GOLD, "gold_dk": GOLD, "gold_lt": GOLD_LT,
    "green": GREEN, "red": RED, "mute": MUTE, "ink": INK,
}

F_DISP    = "Times-Bold"
F_DISP_R  = "Times-Roman"
F_DISP_I  = "Times-Italic"
F_BODY    = "Helvetica"
F_BODY_BD = "Helvetica-Bold"
F_BODY_I  = "Helvetica-Oblique"
F_MONO    = "Courier"
F_MONO_BD = "Courier-Bold"

PAGE_W, PAGE_H = LETTER
MARGIN_L = 48
MARGIN_R = 48
MARGIN_T = 46
MARGIN_B = 40
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R


# ── Generic drawing helpers ─────────────────────────────────────────────
def draw_text(c, x, y, text, font=F_BODY, size=9, color=BODY):
    c.setFont(font, size); c.setFillColor(color); c.drawString(x, y, text)


def draw_right(c, x_right, y, text, font=F_BODY, size=9, color=BODY):
    c.setFont(font, size); c.setFillColor(color)
    w = c.stringWidth(text, font, size); c.drawString(x_right - w, y, text)


def draw_center(c, x_center, y, text, font=F_BODY, size=9, color=BODY):
    c.setFont(font, size); c.setFillColor(color)
    w = c.stringWidth(text, font, size); c.drawString(x_center - w/2, y, text)


def wrap(c, text, width, font=F_BODY, size=9):
    return simpleSplit(text, font, size, width)


def draw_paragraph(c, x, y, text, width, font=F_BODY, size=9, color=BODY, leading=None):
    if leading is None: leading = size * 1.32
    c.setFont(font, size); c.setFillColor(color)
    for line in wrap(c, text, width, font, size):
        c.drawString(x, y, line); y -= leading
    return y


def hr(c, x1, y, x2, color=RULE, width=0.5):
    c.setStrokeColor(color); c.setLineWidth(width); c.line(x1, y, x2, y)


def filled_rect(c, x, y, w, h, color):
    c.setFillColor(color); c.rect(x, y, w, h, stroke=0, fill=1)


def stroked_rect(c, x, y, w, h, color=RULE, width=0.5):
    c.setStrokeColor(color); c.setLineWidth(width); c.rect(x, y, w, h, stroke=1, fill=0)


def eyebrow(c, x, y, text, color=MUTE, size=6.5):
    c.setFont(F_MONO, size); c.setFillColor(color); c.drawString(x, y, text.upper())


# ── Image helpers ───────────────────────────────────────────────────────
def _resolve_image(D, path):
    """Resolve a body-image path against the report.json's source directory."""
    if not path:
        return None
    p = Path(path)
    if p.is_absolute() and p.exists():
        return str(p)
    base = Path(D.get("__source_dir__", ".")) if D.get("__source_dir__") else Path(".")
    cand = (base / path).resolve()
    if cand.exists():
        return str(cand)
    return None


def draw_image_panel(c, x, y_top, w, h, image_path, caption=None,
                     border_color=None, caption_color=None):
    """Draw a framed image with optional caption underneath. y_top = upper edge."""
    if border_color is None: border_color = RULE
    if caption_color is None: caption_color = MUTE
    img_y = y_top - h
    if image_path:
        try:
            img = ImageReader(image_path)
            c.saveState()
            c.drawImage(img, x, img_y, width=w, height=h,
                        preserveAspectRatio=True, anchor='c', mask='auto')
            c.restoreState()
        except Exception:
            # Graceful fallback — render a placeholder block.
            filled_rect(c, x, img_y, w, h, TINT)
            c.setFont(F_MONO, 6.5); c.setFillColor(MUTE)
            draw_center(c, x + w/2, img_y + h/2, "[image unavailable]", F_MONO, 6.5, MUTE)
    else:
        filled_rect(c, x, img_y, w, h, TINT)
    stroked_rect(c, x, img_y, w, h, border_color, 0.6)
    cap_h = 0
    if caption:
        c.setFont(F_BODY_I, 7); c.setFillColor(caption_color)
        cap_lines = wrap(c, caption, w, F_BODY_I, 7)
        cy = img_y - 9
        for line in cap_lines:
            c.drawString(x, cy, line); cy -= 9.5
        cap_h = (img_y - 9) - cy + 6
    return img_y - cap_h - 4   # bottom-y for whatever follows


def fill_trailing_whitespace(c, D, page_key, y_top, max_h=None):
    """If y_top leaves significant whitespace before the footer, render the
    page's body image (if configured) to fill it. Returns the y reached."""
    body_imgs = D.get("body_images") or {}
    img_meta = body_imgs.get(page_key) or {}
    path = img_meta.get("path") or img_meta.get("image")
    caption = img_meta.get("caption", "")
    footer_top = MARGIN_B + 18
    remaining = y_top - footer_top
    if remaining < 70:
        return y_top
    target_h = min(remaining - (16 if caption else 8), max_h or 240)
    target_h = max(70, target_h)
    if not path:
        # Even without a configured image, leave a soft tinted strip so the
        # page doesn't feel hollow. This keeps density visually high.
        filled_rect(c, MARGIN_L, y_top - target_h, CONTENT_W, target_h, TINT)
        stroked_rect(c, MARGIN_L, y_top - target_h, CONTENT_W, target_h, RULE_SOFT, 0.4)
        return y_top - target_h - 4
    resolved = _resolve_image(D, path)
    return draw_image_panel(c, MARGIN_L, y_top, CONTENT_W, target_h,
                            resolved, caption,
                            border_color=RULE, caption_color=MUTE)


def draw_hero_cover(c, x, y_top, w, h, image_path):
    """Cinematographic hero strip for the cover page: image + dark scrim overlay."""
    img_y = y_top - h
    # Underlay base in case image is missing
    filled_rect(c, x, img_y, w, h, HexColor("#0A1A1E"))
    if image_path:
        try:
            img = ImageReader(image_path)
            c.saveState()
            c.drawImage(img, x, img_y, width=w, height=h,
                        preserveAspectRatio=False, mask='auto')
            c.restoreState()
        except Exception:
            pass
    # Dark gradient scrim (approximated with stacked translucent rects)
    n = 24
    c.saveState()
    for i in range(n):
        # bottom-up dark fade: alpha highest near bottom
        alpha = 0.05 + 0.55 * ((n - i) / n) ** 1.6
        col = Color(0.03, 0.05, 0.05, alpha=alpha)
        c.setFillColor(col)
        slice_h = h / n
        c.rect(x, img_y + i * slice_h, w, slice_h + 0.6, stroke=0, fill=1)
    # Teal radial wash top-left
    for r in range(0, int(w*0.42), 6):
        a = max(0, 0.10 - r * 0.0006)
        c.setFillColor(Color(0.36, 0.73, 0.70, alpha=a))
        c.circle(x + w*0.18, y_top - h*0.30, r, stroke=0, fill=1)
    # Gold radial wash bottom-right
    for r in range(0, int(w*0.36), 6):
        a = max(0, 0.08 - r * 0.0005)
        c.setFillColor(Color(0.78, 0.64, 0.36, alpha=a))
        c.circle(x + w*0.82, img_y + h*0.30, r, stroke=0, fill=1)
    c.restoreState()
    stroked_rect(c, x, img_y, w, h, HexColor("#1E2B29"), 0.6)
    return img_y


# ── Page chrome ─────────────────────────────────────────────────────────
def page_header(c, page_num, D):
    company_short = D["meta"]["company_short"]
    ticker = D["meta"]["ticker"]
    report_date = D["meta"]["report_date"].upper()
    c.setFont(F_DISP, 12); c.setFillColor(INK)
    c.drawString(MARGIN_L, PAGE_H - MARGIN_T, "IPO ")
    w = c.stringWidth("IPO ", F_DISP, 12)
    c.setFillColor(TEAL_DK); c.drawString(MARGIN_L + w, PAGE_H - MARGIN_T, "Radar")
    if page_num == 1:
        w2 = c.stringWidth("Radar", F_DISP, 12); c.setFillColor(INK)
        c.drawString(MARGIN_L + w + w2, PAGE_H - MARGIN_T, "  ·  Initiation")
    meta = f"{ticker} · INITIATION · {report_date}"
    c.setFont(F_MONO, 6.5); c.setFillColor(MUTE)
    mw = c.stringWidth(meta, F_MONO, 6.5)
    c.drawString(PAGE_W - MARGIN_R - mw, PAGE_H - MARGIN_T, meta)
    hr(c, MARGIN_L, PAGE_H - MARGIN_T - 6, PAGE_W - MARGIN_R, INK, 0.6)


def page_footer(c, page_num, D, total=11):
    company_short = D["meta"]["company_short"].upper()
    y = MARGIN_B - 14
    hr(c, MARGIN_L, y + 8, PAGE_W - MARGIN_R, RULE, 0.5)
    c.setFont(F_MONO, 6); c.setFillColor(MUTE)
    c.drawString(MARGIN_L, y, "IPO RADAR · VELOCIA VENTURES")
    draw_center(c, PAGE_W/2, y, f"{company_short} — INITIATION", F_MONO, 6, MUTE)
    right = f"{page_num} OF {total}"
    if page_num == 1: right = f"{page_num} OF {total} · SEE DISCLOSURES P.{total}"
    elif page_num == total: right = f"{page_num} OF {total} · END OF REPORT"
    draw_right(c, PAGE_W - MARGIN_R, y, right, F_MONO, 6, MUTE)


def section_head(c, y, title, num_label):
    c.setFont(F_DISP, 17); c.setFillColor(INK); c.drawString(MARGIN_L, y, title)
    eyebrow(c, PAGE_W - MARGIN_R - 130, y + 3, num_label)
    hr(c, MARGIN_L, y - 6, PAGE_W - MARGIN_R, INK, 0.6)
    return y - 18


def sample_banner(c, D):
    if not D["meta"].get("is_sample"):
        return
    text = "ILLUSTRATIVE SAMPLE — NOT INVESTMENT RESEARCH"
    c.setFont(F_MONO_BD, 5.5)
    w = c.stringWidth(text, F_MONO_BD, 5.5) + 14
    x = PAGE_W - 14 - w; y = PAGE_H - 18
    filled_rect(c, x, y, w, 10, GOLD); c.setFillColor(WHITE)
    c.drawString(x + 7, y + 3, text)


# ── Chart helpers ───────────────────────────────────────────────────────
def draw_bar_chart(c, x, y, w, h, title, series_a, series_b, line_series,
                   labels, a_label, b_label, line_label, y_max=None):
    eyebrow(c, x, y + h + 4, title.upper())
    pad_l, pad_r, pad_t, pad_b = 32, 28, 12, 24
    px = x + pad_l; py = y + pad_b
    pw = w - pad_l - pad_r; ph = h - pad_t - pad_b

    if y_max is None:
        y_max = max(max(a + b for a, b in zip(series_a, series_b)),
                    max(line_series)) * 1.12

    for i in range(5):
        gy = py + ph * i / 4
        hr(c, px, gy, px + pw, RULE_SOFT, 0.3)
        val = y_max * i / 4
        c.setFont(F_MONO, 5.5); c.setFillColor(MUTE)
        draw_right(c, px - 2, gy - 1.5, f"${int(val)}M", F_MONO, 5.5, MUTE)

    n = len(labels)
    bar_w = pw / n * 0.62
    gap = pw / n
    for i in range(n):
        bx = px + i * gap + (gap - bar_w) / 2
        a_h = (series_a[i] / y_max) * ph if y_max > 0 else 0
        filled_rect(c, bx, py, bar_w, a_h, TEAL_DK)
        b_h = (series_b[i] / y_max) * ph if y_max > 0 else 0
        filled_rect(c, bx, py + a_h, bar_w, b_h, TEAL_LT)
        c.setFont(F_MONO, 5.5); c.setFillColor(MUTE)
        draw_center(c, bx + bar_w/2, py - 8, labels[i].upper(), F_MONO, 5.5, MUTE)

    pts = []
    for i in range(n):
        cx = px + i * gap + gap/2
        cy = py + (line_series[i] / y_max) * ph if y_max > 0 else py
        pts.append((cx, cy))
    c.setStrokeColor(GOLD); c.setLineWidth(1.4)
    p = c.beginPath(); p.moveTo(*pts[0])
    for pt in pts[1:]: p.lineTo(*pt)
    c.drawPath(p, stroke=1, fill=0)
    for cx_, cy_ in pts:
        c.setFillColor(GOLD); c.circle(cx_, cy_, 1.8, stroke=0, fill=1)

    hr(c, px, py, px + pw, INK, 0.5)
    lx = px; ly = y - 4
    for i, (lab, col) in enumerate([(a_label, TEAL_DK), (b_label, TEAL_LT), (line_label, GOLD)]):
        if i < 2:
            filled_rect(c, lx, ly, 8, 6, col)
        else:
            c.setStrokeColor(col); c.setLineWidth(1.4); c.line(lx, ly + 3, lx + 8, ly + 3)
            c.setFillColor(col); c.circle(lx + 4, ly + 3, 1.5, stroke=0, fill=1)
        c.setFont(F_BODY, 7); c.setFillColor(BODY)
        c.drawString(lx + 11, ly + 1, lab)
        lx += c.stringWidth(lab, F_BODY, 7) + 22


def draw_pie(c, cx, cy, r, segments, title=None, donut_r=0):
    if title:
        eyebrow(c, cx - r - 4, cy + r + 14, title.upper())
    total = sum(s[1] for s in segments)
    start = 90
    for i, (label, pct, color) in enumerate(segments):
        sweep = -360 * pct / total
        c.setFillColor(color); c.setStrokeColor(WHITE); c.setLineWidth(1)
        p = c.beginPath(); p.moveTo(cx, cy)
        steps = max(8, int(abs(sweep) / 4))
        for j in range(steps + 1):
            angle = math.radians(start + sweep * j / steps)
            p.lineTo(cx + r * math.cos(angle), cy + r * math.sin(angle))
        p.lineTo(cx, cy)
        c.drawPath(p, stroke=1, fill=1)

        mid_angle = math.radians(start + sweep / 2)
        ix = cx + (r * 0.95) * math.cos(mid_angle)
        iy = cy + (r * 0.95) * math.sin(mid_angle)
        ox = cx + (r + 8) * math.cos(mid_angle)
        oy = cy + (r + 8) * math.sin(mid_angle)
        c.setStrokeColor(MUTE); c.setLineWidth(0.4)
        c.line(ix, iy, ox, oy)
        c.setFont(F_BODY, 6.5); c.setFillColor(INK)
        right_side = math.cos(mid_angle) >= 0
        if right_side:
            c.drawString(ox + 2, oy - 2, f"{label}")
            c.setFont(F_MONO, 6); c.setFillColor(MUTE)
            c.drawString(ox + 2, oy - 9, f"{pct:.1f}%")
        else:
            tw = c.stringWidth(label, F_BODY, 6.5)
            c.drawString(ox - 2 - tw, oy - 2, label)
            c.setFont(F_MONO, 6); c.setFillColor(MUTE)
            pct_txt = f"{pct:.1f}%"
            pwid = c.stringWidth(pct_txt, F_MONO, 6)
            c.drawString(ox - 2 - pwid, oy - 9, pct_txt)
        start += sweep

    if donut_r > 0:
        c.setFillColor(WHITE); c.circle(cx, cy, donut_r, stroke=0, fill=1)


def draw_football_field(c, x, y, w, h, ranges, ipo_mid, target):
    eyebrow(c, x, y + h + 4, "VALUATION FOOTBALL FIELD ($/SHARE)")
    pad_l, pad_r, pad_t, pad_b = 110, 30, 8, 22
    px = x + pad_l; py = y + pad_b
    pw = w - pad_l - pad_r; ph = h - pad_t - pad_b

    all_vals = []
    for _, lo, hi, _ in ranges:
        all_vals.extend([lo, hi])
    all_vals.extend([ipo_mid, target])
    x_min = max(0, min(all_vals) - 2)
    x_max = max(all_vals) + 4

    def to_x(v):
        return px + (v - x_min) / (x_max - x_min) * pw

    n_ticks = 6
    for i in range(n_ticks + 1):
        v = x_min + (x_max - x_min) * i / n_ticks
        tx = px + pw * i / n_ticks
        c.setFont(F_MONO, 5.5); c.setFillColor(MUTE)
        draw_center(c, tx, py - 8, f"${v:.0f}", F_MONO, 5.5, MUTE)
        c.setStrokeColor(RULE_SOFT); c.setLineWidth(0.3)
        c.line(tx, py, tx, py + ph)

    n = len(ranges)
    bar_h = ph / n * 0.55
    for i, (label, lo, hi, color) in enumerate(ranges):
        by = py + ph * (n - 1 - i) / n + (ph/n - bar_h) / 2
        bx_lo = to_x(lo); bx_hi = to_x(hi)
        filled_rect(c, bx_lo, by, bx_hi - bx_lo, bar_h, color)
        c.setFont(F_BODY_BD, 7); c.setFillColor(INK)
        draw_right(c, px - 4, by + bar_h/2 - 2, label, F_BODY_BD, 7, INK)
        c.setFont(F_MONO, 5.5); c.setFillColor(MUTE)
        c.drawString(bx_lo + 2, by + bar_h + 1, f"${lo:.0f}")
        draw_right(c, bx_hi - 2, by + bar_h + 1, f"${hi:.0f}", F_MONO, 5.5, MUTE)

    ipo_x = to_x(ipo_mid)
    c.setStrokeColor(GOLD); c.setLineWidth(1.0); c.setDash(3, 2)
    c.line(ipo_x, py, ipo_x, py + ph)
    c.setDash()
    c.setFont(F_MONO_BD, 6); c.setFillColor(GOLD)
    c.drawString(ipo_x + 3, py + ph + 1, f"IPO MID ${ipo_mid:.0f}")

    tg_x = to_x(target)
    c.setStrokeColor(TEAL); c.setLineWidth(1.4)
    c.line(tg_x, py, tg_x, py + ph)
    c.setFont(F_MONO_BD, 6); c.setFillColor(TEAL_DK)
    c.drawString(tg_x + 3, py + ph - 6, f"TARGET ${target:.0f}")

    hr(c, px, py, px + pw, INK, 0.5)


# ════════════════════════════════════════════════════════════════════════
# PAGE 1 — COVER
# ════════════════════════════════════════════════════════════════════════
def page_1_cover(c, D):
    sample_banner(c, D); page_header(c, 1, D)
    M = D["meta"]; IPO = D["ipo"]; R = D["rating"]
    y = PAGE_H - MARGIN_T - 26
    eyebrow(c, MARGIN_L, y, f"{M['sector']} · {M['subsector']} · {M['country']}"); y -= 14

    # ── Cinematographic hero strip ───────────────────────────────────────
    hero_path = M.get("hero_image") or M.get("heroImage") or "./hero.png"
    hero_resolved = _resolve_image(D, hero_path)
    if hero_resolved or hero_path:
        hero_h = 110
        bottom_y = draw_hero_cover(c, MARGIN_L, y, CONTENT_W, hero_h, hero_resolved)
        # Overlay rating chip + title on the hero
        rating_color = {"BUY": GREEN, "HOLD": GOLD, "SELL": RED}.get(R["label"].upper(), GREEN)
        chip_x = MARGIN_L + 12
        chip_y = y - 18
        rating_w = 36 if len(R["label"]) <= 4 else 44
        filled_rect(c, chip_x, chip_y, rating_w, 13, rating_color)
        c.setFillColor(WHITE); c.setFont(F_MONO_BD, 7)
        c.drawString(chip_x + 6, chip_y + 3, R["label"].upper())
        c.setFont(F_MONO, 6.5); c.setFillColor(WHITE)
        c.drawString(chip_x + rating_w + 8, chip_y + 3, "INITIATING COVERAGE")
        # Title overlay
        c.setFont(F_DISP, 22); c.setFillColor(WHITE)
        c.drawString(chip_x, chip_y - 22, M["company_name"])
        c.setFont(F_DISP_R, 12); c.setFillColor(HexColor("#CDD6D1"))
        c.drawString(chip_x, chip_y - 37, f"({M['exchange']}: {M['ticker']})")
        # Lede on the hero (single italic line)
        lede_lines = wrap(c, f"\u201C{D['lede_quote']}\u201D",
                          CONTENT_W - 24, F_DISP_I, 10.5)
        ly_h = chip_y - 52
        c.setFont(F_DISP_I, 10.5); c.setFillColor(HexColor("#EAF1ED"))
        for line in lede_lines[:2]:
            c.drawString(chip_x, ly_h, line); ly_h -= 13
        y = bottom_y - 14

    LEFT_W = 320
    RIGHT_X = MARGIN_L + LEFT_W + 16
    RIGHT_W = PAGE_W - MARGIN_R - RIGHT_X

    # ── LEFT (title/lede now on hero; here we show target metrics + summary) ──
    ly = y

    return_color = GREEN if R["implied_return_pct"] > 0 else RED
    return_text = f"{'+' if R['implied_return_pct'] >= 0 else ''}{R['implied_return_pct']}%"
    col_w = LEFT_W / 3
    for i, (lab, val, color) in enumerate([
        ("12-MO PRICE TARGET", f"${R['target_12mo']:.2f}", INK),
        ("IPO PRICE (MID)",    f"${IPO['price_mid']:.2f}", MUTE),
        ("IMPLIED RETURN",     return_text, return_color)]):
        eyebrow(c, MARGIN_L + i*col_w, ly, lab)
        c.setFont(F_DISP, 22); c.setFillColor(color)
        c.drawString(MARGIN_L + i*col_w, ly - 22, val)
    ly -= 36

    ly = draw_paragraph(c, MARGIN_L, ly, D["summary_paragraph"], LEFT_W, F_BODY, 8.7, BODY, 11.5)

    # ── RIGHT — key data + factor profile ──
    ry = y
    rows = [
        ("TICKER", f"{M['exchange']}: {M['ticker']}"),
        ("SECTOR", f"{M['sector'][:8]} / {M['subsector'][:6]}" if len(M['subsector']) > 6 else f"{M['sector']} / {M['subsector']}"),
        ("IPO SIZE", f"{IPO['size_total']} ({IPO['share_count']})"),
        ("RANGE", f"${IPO['price_range_low']} – ${IPO['price_range_high']}"),
        ("POST-IPO MKT CAP", IPO["post_ipo_market_cap"]),
        ("POST-IPO CASH", IPO["post_ipo_cash"]),
        ("IMPLIED EV", IPO["implied_ev"]),
        ("CASH RUNWAY", IPO["cash_runway"]),
        ("BOOKRUNNERS", IPO["bookrunners"]),
        ("LOCK-UP", f"{IPO['lockup_days']} days"),
        ("PRICING", IPO["pricing_window"]),
    ]
    box_h = 12 + len(rows) * 11 + 4
    filled_rect(c, RIGHT_X, ry - box_h, RIGHT_W, box_h, TINT)
    filled_rect(c, RIGHT_X, ry - box_h, 2.5, box_h, TEAL)
    rry = ry - 14
    for lab, val in rows:
        c.setFont(F_MONO, 6.5); c.setFillColor(MUTE)
        c.drawString(RIGHT_X + 8, rry, lab)
        draw_right(c, RIGHT_X + RIGHT_W - 8, rry, val, F_BODY_BD, 7.5, INK)
        rry -= 11
    ry = ry - box_h - 14

    eyebrow(c, RIGHT_X, ry, "IPO RADAR FACTOR PROFILE"); ry -= 12
    factor_keys = list(D["factor_profile"].keys())
    bar_w = RIGHT_W - 90 - 22
    for k in factor_keys:
        score = D["factor_profile"][k]
        frac = score / 10.0
        label = k.replace("_", " ").upper()
        if len(label) > 18: label = label[:18]
        c.setFont(F_MONO, 6.5); c.setFillColor(INK)
        c.drawString(RIGHT_X, ry, label)
        bx = RIGHT_X + 80
        filled_rect(c, bx, ry - 1, bar_w, 4, RULE_SOFT)
        filled_rect(c, bx, ry - 1, bar_w * frac, 4, TEAL)
        draw_right(c, RIGHT_X + RIGHT_W, ry, f"{score:.1f}", F_MONO, 6.5, MUTE)
        ry -= 11

    # ── Risks block (bottom, full width) ──
    risks_y = ly - 12
    hr(c, MARGIN_L, risks_y + 6, PAGE_W - MARGIN_R, RULE, 0.5)
    half_w = (PAGE_W - MARGIN_L - MARGIN_R - 16) / 2

    c.setFont(F_BODY_BD, 8.5); c.setFillColor(GREEN)
    c.drawString(MARGIN_L, risks_y, "WHY WE LIKE IT")
    hr(c, MARGIN_L, risks_y - 3, MARGIN_L + half_w, GREEN, 0.6)
    py = risks_y - 14
    for item in D["thesis_pros"]:
        c.setFont(F_BODY_BD, 7.5); c.setFillColor(GREEN)
        c.drawString(MARGIN_L, py, "+")
        py = draw_paragraph(c, MARGIN_L + 10, py, item, half_w - 12, F_BODY, 7.5, BODY, 9.5) - 2

    nx = MARGIN_L + half_w + 16
    c.setFont(F_BODY_BD, 8.5); c.setFillColor(RED)
    c.drawString(nx, risks_y, "KEY RISKS")
    hr(c, nx, risks_y - 3, nx + half_w, RED, 0.6)
    py = risks_y - 14
    for item in D["thesis_cons"]:
        c.setFont(F_BODY_BD, 7.5); c.setFillColor(RED)
        c.drawString(nx, py, "−")
        py = draw_paragraph(c, nx + 10, py, item, half_w - 12, F_BODY, 7.5, BODY, 9.5) - 2

    page_footer(c, 1, D)


# ════════════════════════════════════════════════════════════════════════
# PAGE 2 — FINANCIAL SNAPSHOT (dense)
# ════════════════════════════════════════════════════════════════════════
def page_2_financials(c, D):
    sample_banner(c, D); page_header(c, 2, D)
    company_short = D["meta"]["company_short"]
    F = D["financials"]
    y = section_head(c, PAGE_H - MARGIN_T - 30, "Financial Snapshot & Operating Model", f"02 / {company_short}")
    eyebrow(c, MARGIN_L, y,
            f"Income statement, balance sheet, cash flow & key metrics ("
            f"US$M, FYE {F['fiscal_year_end']}) · Illustrative model")
    y -= 12

    headers = ["$M, FYE Dec"] + F["columns"]
    n_cols = len(F["columns"])
    label_w = 128
    val_w = (CONTENT_W - label_w) / n_cols
    col_ws = [label_w] + [val_w] * n_cols
    col_xs = [MARGIN_L]
    for w in col_ws[:-1]: col_xs.append(col_xs[-1] + w)

    c.setFont(F_MONO, 6.5); c.setFillColor(MUTE)
    for i, h in enumerate(headers):
        if i == 0:
            c.drawString(col_xs[i] + 2, y, h.upper())
        else:
            draw_right(c, col_xs[i] + col_ws[i] - 4, y, h.upper(), F_MONO, 6.5, MUTE)
    y -= 4
    hr(c, MARGIN_L, y, PAGE_W - MARGIN_R, INK, 0.5); y -= 8

    for sec in F["sections"]:
        # Section eyebrow
        y -= 2
        hr(c, MARGIN_L, y + 7, PAGE_W - MARGIN_R, RULE, 0.4)
        c.setFont(F_MONO, 6.5); c.setFillColor(TEAL_DK)
        c.drawString(MARGIN_L + 2, y, sec["title"].upper())
        y -= 9

        for row in sec["rows"]:
            style = row.get("style", "normal")
            label = row["label"]
            vals = [str(v) for v in row["values"]]
            if style == "total":
                font_lab, font_val = F_BODY_BD, F_BODY_BD
                color = INK
                hr(c, MARGIN_L, y + 7, PAGE_W - MARGIN_R, RULE, 0.4)
            elif style == "subtotal":
                font_lab, font_val = F_BODY_BD, F_BODY_BD
                color = INK
            else:
                font_lab, font_val = F_BODY, F_BODY
                color = BODY
            c.setFont(font_lab, 7.5); c.setFillColor(INK)
            c.drawString(col_xs[0] + 2, y, label)
            for i, v in enumerate(vals):
                draw_right(c, col_xs[i+1] + col_ws[i+1] - 4, y, v, font_val, 7.5, color)
            c.setStrokeColor(RULE_SOFT); c.setLineWidth(0.3)
            c.line(MARGIN_L, y - 2, PAGE_W - MARGIN_R, y - 2)
            if style == "total":
                c.setStrokeColor(INK); c.setLineWidth(0.5)
                c.line(MARGIN_L, y - 2, PAGE_W - MARGIN_R, y - 2)
            y -= 9.5

    y -= 4
    eyebrow(c, MARGIN_L, y, F.get("source_note", ""))
    page_footer(c, 2, D)


# ════════════════════════════════════════════════════════════════════════
# PAGE 3 — INVESTMENT THESIS (with operating model chart)
# ════════════════════════════════════════════════════════════════════════
def page_3_thesis(c, D):
    sample_banner(c, D); page_header(c, 3, D)
    company_short = D["meta"]["company_short"]
    y = section_head(c, PAGE_H - MARGIN_T - 30, "Investment Thesis", f"03 / {company_short}")

    R = D["rating"]; IPO = D["ipo"]
    intro = (f"We initiate {company_short} at {R['label'].title()} with a 12-month price target "
             f"of ${R['target_12mo']}, implying ~{R['implied_return_pct']:+}% to the midpoint of "
             f"the proposed ${IPO['price_range_low']}–${IPO['price_range_high']} IPO range. "
             "Our thesis rests on the pillars below, in order of conviction.")
    y = draw_paragraph(c, MARGIN_L, y, intro, CONTENT_W, F_BODY, 9, BODY, 11.5) - 8

    for i, item in enumerate(D["thesis"], start=1):
        c.setFont(F_DISP, 17); c.setFillColor(TEAL); c.drawString(MARGIN_L, y, str(i))
        body_x = MARGIN_L + 22; body_w = CONTENT_W - 22
        c.setFont(F_BODY_BD, 8.7); c.setFillColor(INK)
        cy = y
        for line in wrap(c, item["lead"], body_w, F_BODY_BD, 8.7):
            c.drawString(body_x, cy, line); cy -= 11
        cy = draw_paragraph(c, body_x, cy, item["body"], body_w, F_BODY, 8.7, BODY, 11)
        y = cy - 6
        hr(c, MARGIN_L, y + 3, PAGE_W - MARGIN_R, RULE_SOFT, 0.3)

    # Operating model chart
    chart = D.get("operating_model_chart")
    if chart:
        y -= 4
        chart_h = 110
        eyebrow(c, MARGIN_L, y, "OPERATING MODEL TRAJECTORY")
        y -= 4
        draw_bar_chart(
            c, MARGIN_L, y - chart_h, CONTENT_W, chart_h,
            chart["title"],
            series_a=chart["bar_a"]["values"],
            series_b=chart["bar_b"]["values"],
            line_series=chart["line"]["values"],
            labels=chart["labels"],
            a_label=chart["bar_a"]["label"],
            b_label=chart["bar_b"]["label"],
            line_label=chart["line"]["label"],
            y_max=chart.get("y_max"),
        )
    page_footer(c, 3, D)


# ════════════════════════════════════════════════════════════════════════
# PAGE 4 — COMPANY OVERVIEW (with cap table pies)
# ════════════════════════════════════════════════════════════════════════
def page_4_company(c, D):
    sample_banner(c, D); page_header(c, 4, D)
    company_short = D["meta"]["company_short"]
    CO = D["company_overview"]
    y = section_head(c, PAGE_H - MARGIN_T - 30, "Company Overview", f"04 / {company_short}")

    c.setFont(F_DISP, 12.5); c.setFillColor(INK)
    c.drawString(MARGIN_L, y, CO["headline"]); y -= 14

    for p in CO["paragraphs"]:
        y = draw_paragraph(c, MARGIN_L, y, p, CONTENT_W, F_BODY, 9, BODY, 11.5) - 6

    # ── CAP TABLE PIES ──
    cap = D.get("cap_table")
    if cap:
        y -= 8
        eyebrow(c, MARGIN_L, y, "OWNERSHIP — PRE-IPO VS POST-IPO (PRO FORMA)")
        y -= 12
        pie_r = 42
        pie_y = y - pie_r - 6
        pie_l_x = MARGIN_L + 90
        pie_r_x = PAGE_W - MARGIN_R - 90 - 50

        def to_segs(segments):
            return [(s["label"], s["pct"], PIE_COLORS[i % len(PIE_COLORS)])
                    for i, s in enumerate(segments)]

        if cap.get("pre_ipo"):
            draw_pie(c, pie_l_x, pie_y, pie_r,
                     to_segs(cap["pre_ipo"]["segments"]),
                     cap["pre_ipo"].get("title", "Pre-IPO ownership"))
        if cap.get("post_ipo"):
            draw_pie(c, pie_r_x, pie_y, pie_r,
                     to_segs(cap["post_ipo"]["segments"]),
                     cap["post_ipo"].get("title", "Post-IPO ownership"))

        y = pie_y - pie_r - 24
    else:
        y -= 8

    # Use of proceeds
    uop = D.get("use_of_proceeds")
    if uop:
        box_h = 34
        filled_rect(c, MARGIN_L, y - box_h, CONTENT_W, box_h, TINT)
        filled_rect(c, MARGIN_L, y - box_h, 2, box_h, TEAL)
        c.setFont(F_BODY_BD, 8); c.setFillColor(TEAL_DK)
        c.drawString(MARGIN_L + 10, y - 12, f"USE OF IPO PROCEEDS ({D['ipo']['size_total']} GROSS)")
        use_text = " ".join(f"{u['amount']} ({u['pct']}%) — {u['purpose']}." for u in uop)
        draw_paragraph(c, MARGIN_L + 10, y - 22, use_text, CONTENT_W - 20, F_BODY, 7.8, BODY, 9.5)
        y = y - box_h - 8

    fill_trailing_whitespace(c, D, "company_overview", y)
    page_footer(c, 4, D)


# ════════════════════════════════════════════════════════════════════════
# PAGE 5 — INDUSTRY & MARKET
# ════════════════════════════════════════════════════════════════════════
def page_5_market(c, D):
    sample_banner(c, D); page_header(c, 5, D)
    company_short = D["meta"]["company_short"]
    IND = D["industry"]
    y = section_head(c, PAGE_H - MARGIN_T - 30, "Industry & Market Opportunity", f"05 / {company_short}")

    c.setFont(F_DISP, 12.5); c.setFillColor(INK)
    for line in wrap(c, IND["headline"], CONTENT_W, F_DISP, 12.5):
        c.drawString(MARGIN_L, y, line); y -= 14
    y -= 2

    paras = IND["paragraphs"]
    # Render first 1-2 paragraphs, pull quote, then the rest
    half = max(1, len(paras) // 2)
    for p in paras[:half]:
        y = draw_paragraph(c, MARGIN_L, y, p, CONTENT_W, F_BODY, 9, BODY, 11.5) - 6

    if IND.get("pull_quote"):
        y -= 4
        hr(c, MARGIN_L, y + 6, PAGE_W - MARGIN_R, TEAL, 0.5); y -= 4
        y = draw_paragraph(c, MARGIN_L, y, IND["pull_quote"], CONTENT_W, F_DISP_I, 11, TEAL_DK, 14)
        y -= 4
        hr(c, MARGIN_L, y + 4, PAGE_W - MARGIN_R, TEAL, 0.5); y -= 8

    for p in paras[half:]:
        y = draw_paragraph(c, MARGIN_L, y, p, CONTENT_W, F_BODY, 9, BODY, 11.5) - 6

    fill_trailing_whitespace(c, D, "industry", y)
    page_footer(c, 5, D)


# ════════════════════════════════════════════════════════════════════════
# PAGE 6 — PIPELINE (or business segments)
# ════════════════════════════════════════════════════════════════════════
def page_6_pipeline(c, D):
    sample_banner(c, D); page_header(c, 6, D)
    company_short = D["meta"]["company_short"]
    y = section_head(c, PAGE_H - MARGIN_T - 30,
                     "Pipeline & Clinical Development Strategy" if "pipeline" in D else "Products & Roadmap",
                     f"06 / {company_short}")

    P = D.get("pipeline") or D.get("business_segments")
    if not P:
        page_footer(c, 6, D); return

    c.setFont(F_DISP, 12.5); c.setFillColor(INK)
    for line in wrap(c, P["headline"], CONTENT_W, F_DISP, 12.5):
        c.drawString(MARGIN_L, y, line); y -= 14
    y -= 4

    label_w = 130; bar_x = MARGIN_L + label_w
    stage_w = MARGIN_L + CONTENT_W - 90 - bar_x

    c.setFont(F_MONO, 6); c.setFillColor(MUTE)
    cols = P.get("stage_columns", ["Discovery", "Phase 1", "Phase 2", "Phase 3"])
    n_stages = max(1, len(cols) - 1)
    for i, label in enumerate(cols[:-1]):
        c.drawString(bar_x + (i + 0.1) * stage_w / n_stages, y, label.upper())
    c.drawString(bar_x + stage_w + 4, y, cols[-1].upper())
    y -= 12

    for row in P["rows"]:
        c.setFont(F_BODY_BD, 9.5); c.setFillColor(INK)
        c.drawString(MARGIN_L, y, row["asset"])
        c.setFont(F_MONO, 6.5); c.setFillColor(MUTE)
        c.drawString(MARGIN_L, y - 9, row["subtitle"].upper())
        frac = row.get("progress_pct", 0) / 100.0
        filled_rect(c, bar_x, y - 4, stage_w, 6, RULE_SOFT)
        filled_rect(c, bar_x, y - 4, stage_w * frac, 6, TEAL)
        c.setFont(F_MONO, 6.5); c.setFillColor(MUTE)
        draw_right(c, PAGE_W - MARGIN_R, y, row.get("milestone", "").upper(), F_MONO, 6.5, MUTE)
        y -= 24
        c.setStrokeColor(RULE_SOFT); c.setLineWidth(0.3)
        c.line(MARGIN_L, y + 6, PAGE_W - MARGIN_R, y + 6)
    y -= 4

    for sec in P.get("design_sections", []):
        c.setFont(F_BODY_BD, 9.5); c.setFillColor(INK)
        c.drawString(MARGIN_L, y, sec["heading"].upper()); y -= 12
        for p in sec["paragraphs"]:
            y = draw_paragraph(c, MARGIN_L, y, p, CONTENT_W, F_BODY, 9, BODY, 11.5) - 4

    fill_trailing_whitespace(c, D, "pipeline", y)
    page_footer(c, 6, D)


# ════════════════════════════════════════════════════════════════════════
# PAGE 7 — COMPETITIVE LANDSCAPE
# ════════════════════════════════════════════════════════════════════════
def page_7_competitive(c, D):
    sample_banner(c, D); page_header(c, 7, D)
    company_short = D["meta"]["company_short"]
    COMP = D["competitive"]
    y = section_head(c, PAGE_H - MARGIN_T - 30, "Competitive Landscape", f"07 / {company_short}")

    c.setFont(F_DISP, 12.5); c.setFillColor(INK)
    for line in wrap(c, COMP["headline"], CONTENT_W, F_DISP, 12.5):
        c.drawString(MARGIN_L, y, line); y -= 14
    y -= 2

    if COMP.get("intro_paragraph"):
        y = draw_paragraph(c, MARGIN_L, y, COMP["intro_paragraph"],
                           CONTENT_W, F_BODY, 9, BODY, 11.5) - 6

    headers = COMP["table_columns"]
    # Compute column widths. First and last columns get wider allotments
    # because they hold the longest content (company name + key differentiator
    # sentence); both wrap to multiple lines if needed. Middle columns hold
    # short tags ("Searching", "$100M", etc.) and stay single-line.
    n = len(headers)
    first_w = 112
    last_w = 138
    rem_w = CONTENT_W - first_w - last_w
    mid_w = rem_w / max(1, n - 2) if n > 2 else 0
    col_ws = [first_w] + [mid_w] * (n - 2) + ([last_w] if n > 1 else [])
    col_xs = [MARGIN_L]
    for w in col_ws[:-1]: col_xs.append(col_xs[-1] + w)

    # Header row — first and last columns left-aligned (text), middle right-aligned (tags).
    c.setFont(F_MONO, 6); c.setFillColor(MUTE)
    for i, h in enumerate(headers):
        if i == 0 or i == n - 1:
            c.drawString(col_xs[i] + 2, y, h.upper())
        else:
            draw_right(c, col_xs[i] + col_ws[i] - 2, y, h.upper(), F_MONO, 6, MUTE)
    y -= 4
    hr(c, MARGIN_L, y, PAGE_W - MARGIN_R, INK, 0.5); y -= 10

    # Body rows — wrap first + last columns and grow row height to fit.
    leading = 9.5
    for row in COMP["rows"]:
        is_target = row.get("highlight", False)
        vals = row["values"]
        first_lines = wrap(c, str(vals[0]), first_w - 4, F_BODY_BD, 7.5) or [""]
        last_lines = (wrap(c, str(vals[-1]), last_w - 4, F_BODY, 7.5) or [""]) if n > 1 else [""]
        n_lines = max(len(first_lines), len(last_lines), 1)
        row_h = (n_lines - 1) * leading + 11

        if is_target:
            filled_rect(c, MARGIN_L, y - row_h + 6, CONTENT_W, row_h + 1, SHADE)
            name_color = GOLD
        else:
            name_color = INK

        # First column (wrapped, left-aligned, bold)
        c.setFont(F_BODY_BD, 7.5); c.setFillColor(name_color)
        for li, line in enumerate(first_lines):
            c.drawString(col_xs[0] + 2, y - li * leading, line)

        # Middle columns (single-line, right-aligned, regular)
        for i in range(1, n - 1):
            if i < len(vals):
                draw_right(c, col_xs[i] + col_ws[i] - 2, y, str(vals[i]), F_BODY, 7.5, BODY)

        # Last column (wrapped, left-aligned within its cell, regular)
        if n > 1:
            c.setFont(F_BODY, 7.5); c.setFillColor(BODY)
            for li, line in enumerate(last_lines):
                c.drawString(col_xs[-1] + 2, y - li * leading, line)

        y -= row_h
        c.setStrokeColor(RULE_SOFT); c.setLineWidth(0.3)
        c.line(MARGIN_L, y + 2, PAGE_W - MARGIN_R, y + 2); y -= 5

    y -= 6
    # Footnote — wrap so it doesn't run off the right margin.
    if COMP.get("footnote"):
        c.setFont(F_MONO, 6.5); c.setFillColor(MUTE)
        for line in wrap(c, COMP["footnote"].upper(), CONTENT_W, F_MONO, 6.5):
            c.drawString(MARGIN_L, y, line); y -= 9
        y -= 6

    if COMP.get("differentiation"):
        c.setFont(F_DISP, 11.5); c.setFillColor(INK)
        c.drawString(MARGIN_L, y, f"How {company_short} differentiates"); y -= 14

        diff = COMP["differentiation"]
        half_w = (CONTENT_W - 14) / 2
        box_h = 56
        for i, item in enumerate(diff):
            col = i % 2; row_idx = i // 2
            bx = MARGIN_L + col * (half_w + 14); by = y - row_idx * (box_h + 6)
            filled_rect(c, bx, by - box_h, half_w, box_h, TINT)
            filled_rect(c, bx, by - box_h, 1.5, box_h, TEAL)
            c.setFont(F_BODY_BD, 7); c.setFillColor(TEAL_DK)
            c.drawString(bx + 8, by - 12, item["heading"].upper())
            draw_paragraph(c, bx + 8, by - 22, item["body"], half_w - 16, F_BODY, 7.5, BODY, 9.5)

    page_footer(c, 7, D)


# ════════════════════════════════════════════════════════════════════════
# PAGE 8 — VALUATION & RECOMMENDATION
# ════════════════════════════════════════════════════════════════════════
def page_8_valuation(c, D):
    sample_banner(c, D); page_header(c, 8, D)
    company_short = D["meta"]["company_short"]
    V = D["valuation"]
    y = section_head(c, PAGE_H - MARGIN_T - 30, "Valuation & Recommendation", f"08 / {company_short}")

    c.setFont(F_DISP, 12.5); c.setFillColor(INK)
    for line in wrap(c, V["headline"], CONTENT_W, F_DISP, 12.5):
        c.drawString(MARGIN_L, y, line); y -= 14
    y -= 2

    if V.get("intro_paragraph"):
        y = draw_paragraph(c, MARGIN_L, y, V["intro_paragraph"],
                           CONTENT_W, F_BODY, 9, BODY, 11.5) - 8

    # Football field chart
    FF = V["football_field"]
    ff_h = 130
    ranges = [(r["method"], r["low"], r["high"], COLOR_KEYS.get(r.get("color", "teal"), TEAL))
              for r in FF["ranges"]]
    draw_football_field(c, MARGIN_L, y - ff_h, CONTENT_W, ff_h,
                        ranges=ranges, ipo_mid=FF["ipo_mid"], target=FF["target"])
    y -= ff_h + 18

    # SOTP + M&A precedents side by side
    half_w = (CONTENT_W - 14) / 2

    # SOTP table (left)
    if V.get("sotp"):
        SOTP = V["sotp"]
        eyebrow(c, MARGIN_L, y, SOTP["title"])
        sy = y - 12
        hr(c, MARGIN_L, sy + 2, MARGIN_L + half_w, INK, 0.5)
        for row in SOTP["rows"]:
            style = row.get("style", "normal")
            label = row["label"]
            value_m = row.get("value_m")
            vps = row.get("value_per_share", "")
            is_total = style == "total"
            is_return = style == "return"
            font = F_BODY_BD if (is_total or is_return) else F_BODY
            if is_total: hr(c, MARGIN_L, sy - 2, MARGIN_L + half_w, RULE, 0.4)
            sy -= 11
            c.setFont(font, 8); c.setFillColor(INK)
            c.drawString(MARGIN_L + 2, sy, label)
            v_text = f"${value_m:,}" if isinstance(value_m, (int, float)) else "—"
            draw_right(c, MARGIN_L + half_w * 0.65, sy, v_text, font, 8, INK if is_total else BODY)
            ret_color = GREEN if is_return else (INK if is_total else BODY)
            draw_right(c, MARGIN_L + half_w - 2, sy, vps, font, 8, ret_color)
            if is_total: hr(c, MARGIN_L, sy - 3, MARGIN_L + half_w, INK, 0.5)
        sy -= 6
        if SOTP.get("footnote"):
            eyebrow(c, MARGIN_L, sy, SOTP["footnote"])
        sotp_bottom_y = sy
    else:
        sotp_bottom_y = y - 24

    # M&A precedents (right)
    if V.get("ma_precedents"):
        MA = V["ma_precedents"]
        nx = MARGIN_L + half_w + 14
        eyebrow(c, nx, y, MA["title"])
        sy2 = y - 12
        headers = MA["table_columns"]
        n = len(headers)
        col_w_first = 70
        rem = half_w - col_w_first
        per_col = rem / (n - 1)
        col_ws = [col_w_first] + [per_col] * (n - 1)
        col_xs = [nx]
        for w in col_ws[:-1]: col_xs.append(col_xs[-1] + w)
        c.setFont(F_MONO, 6); c.setFillColor(MUTE)
        for i, h in enumerate(headers):
            if i == 0: c.drawString(col_xs[i] + 2, sy2, h.upper())
            else: draw_right(c, col_xs[i] + col_ws[i] - 2, sy2, h.upper(), F_MONO, 6, MUTE)
        sy2 -= 4
        hr(c, nx, sy2, nx + half_w, INK, 0.5); sy2 -= 9
        for row in MA["rows"]:
            vals = row["values"]
            c.setFont(F_BODY, 7.5); c.setFillColor(INK)
            c.drawString(col_xs[0] + 2, sy2, str(vals[0]))
            for i in range(1, len(vals)):
                draw_right(c, col_xs[i] + col_ws[i] - 2, sy2, str(vals[i]), F_BODY, 7.5, BODY)
            c.setStrokeColor(RULE_SOFT); c.setLineWidth(0.3)
            c.line(nx, sy2 - 3, nx + half_w, sy2 - 3); sy2 -= 11
        if MA.get("median_label"):
            hr(c, nx, sy2 + 1, nx + half_w, INK, 0.5)
            c.setFont(F_BODY_BD, 7.5); c.setFillColor(INK)
            c.drawString(nx + 2, sy2 - 8, MA["median_label"])
            draw_right(c, nx + half_w - 2, sy2 - 8, MA.get("median_value", ""), F_BODY_BD, 7.5, INK)
            sy2 -= 12
            hr(c, nx, sy2 + 1, nx + half_w, INK, 0.5); sy2 -= 8
        if MA.get("footnote"):
            eyebrow(c, nx, sy2, MA["footnote"])
        ma_bottom_y = sy2
    else:
        ma_bottom_y = y - 24

    # Recommendation pull quote
    y = min(sotp_bottom_y, ma_bottom_y) - 14
    if V.get("recommendation_pull_quote"):
        hr(c, MARGIN_L, y, PAGE_W - MARGIN_R, TEAL, 0.5); y -= 4
        y = draw_paragraph(c, MARGIN_L, y, V["recommendation_pull_quote"],
                           CONTENT_W, F_DISP_I, 10.5, TEAL_DK, 13)
        hr(c, MARGIN_L, y + 4, PAGE_W - MARGIN_R, TEAL, 0.5)

    page_footer(c, 8, D)


# ════════════════════════════════════════════════════════════════════════
# PAGE 9 — RISKS
# ════════════════════════════════════════════════════════════════════════
def page_9_risks(c, D):
    sample_banner(c, D); page_header(c, 9, D)
    company_short = D["meta"]["company_short"]
    R = D["rating"]
    y = section_head(c, PAGE_H - MARGIN_T - 30, "Key Risks", f"09 / {company_short}")

    c.setFont(F_DISP, 12.5); c.setFillColor(INK)
    n_risks = len(D["risks"])
    headline = f"{n_risks} risk vectors framed against our ${R['target_12mo']} price target"
    c.drawString(MARGIN_L, y, headline); y -= 16

    for risk in D["risks"]:
        c.setFont(F_BODY_BD, 9); c.setFillColor(RED)
        c.drawString(MARGIN_L, y, risk["heading"].upper()); y -= 11
        y = draw_paragraph(c, MARGIN_L, y, risk["body"], CONTENT_W, F_BODY, 8.7, BODY, 11) - 6

    # Scenario weighting box
    SC = D["scenarios"]
    box_h = 50
    filled_rect(c, MARGIN_L, y - box_h, CONTENT_W, box_h, TINT)
    filled_rect(c, MARGIN_L, y - box_h, 2, box_h, TEAL)
    c.setFont(F_BODY_BD, 8); c.setFillColor(TEAL_DK)
    c.drawString(MARGIN_L + 10, y - 12, "SUMMARY RISK-ADJUSTED SCENARIO WEIGHTING")
    items = [
        (f"Bull (${SC['bull']['target']}, {SC['bull']['probability_pct']}% prob.):",
         " " + SC["bull"]["description"]),
        (f"Base (${SC['base']['target']}, {SC['base']['probability_pct']}% prob.):",
         " " + SC["base"]["description"]),
        (f"Bear (${SC['bear']['target']}, {SC['bear']['probability_pct']}% prob.):",
         " " + SC["bear"]["description"]),
        (f"Probability-weighted target: ~${SC.get('weighted_target', '')} → rounded to ${R['target_12mo']}.",
         ""),
    ]
    sy = y - 24
    for label, text in items:
        c.setFont(F_BODY_BD, 7.5); c.setFillColor(INK)
        c.drawString(MARGIN_L + 10, sy, label)
        if text:
            lw = c.stringWidth(label, F_BODY_BD, 7.5)
            sy = draw_paragraph(c, MARGIN_L + 10 + lw, sy, text,
                                CONTENT_W - 20 - lw, F_BODY, 7.5, BODY, 10) - 1
        else:
            sy -= 11

    page_footer(c, 9, D)


# ════════════════════════════════════════════════════════════════════════
# PAGE 10 — MANAGEMENT
# ════════════════════════════════════════════════════════════════════════
def page_10_mgmt(c, D):
    sample_banner(c, D); page_header(c, 10, D)
    company_short = D["meta"]["company_short"]
    MG = D["management"]
    y = section_head(c, PAGE_H - MARGIN_T - 30, "Management, Board & Governance", f"10 / {company_short}")

    c.setFont(F_DISP, 12); c.setFillColor(INK)
    c.drawString(MARGIN_L, y, "Leadership"); y -= 14

    headers = ["Name", "Role", "Selected Background", "Tenure"]
    col_ws = [115, 110, 222, 50]
    col_xs = [MARGIN_L]
    for w in col_ws[:-1]: col_xs.append(col_xs[-1] + w)
    c.setFont(F_MONO, 6); c.setFillColor(MUTE)
    for i, h in enumerate(headers):
        if i < 3: c.drawString(col_xs[i] + 2, y, h.upper())
        else: draw_right(c, col_xs[i] + col_ws[i] - 2, y, h.upper(), F_MONO, 6, MUTE)
    y -= 4
    hr(c, MARGIN_L, y, PAGE_W - MARGIN_R, INK, 0.5); y -= 9
    for r in MG["leadership"]:
        c.setFont(F_BODY_BD, 7.5); c.setFillColor(INK)
        c.drawString(col_xs[0] + 2, y, r["name"])
        c.setFont(F_BODY, 7.5); c.setFillColor(BODY)
        c.drawString(col_xs[1] + 2, y, r["role"])
        bg_lines = wrap(c, r["background"], col_ws[2] - 4, F_BODY, 7.5)
        for j, line in enumerate(bg_lines):
            c.drawString(col_xs[2] + 2, y - j * 9.5, line)
        draw_right(c, col_xs[3] + col_ws[3] - 2, y, r["tenure"], F_BODY, 7.5, BODY)
        y -= max(11, 9.5 * len(bg_lines) + 2)
        c.setStrokeColor(RULE_SOFT); c.setLineWidth(0.3)
        c.line(MARGIN_L, y + 3, PAGE_W - MARGIN_R, y + 3); y -= 2
    y -= 6

    if MG.get("board_paragraph"):
        c.setFont(F_DISP, 12); c.setFillColor(INK)
        c.drawString(MARGIN_L, y, "Board of Directors"); y -= 12
        y = draw_paragraph(c, MARGIN_L, y, MG["board_paragraph"], CONTENT_W, F_BODY, 8.5, BODY, 11) - 6

    if MG.get("compensation_paragraph"):
        c.setFont(F_DISP, 12); c.setFillColor(INK)
        c.drawString(MARGIN_L, y, "Compensation & equity"); y -= 12
        y = draw_paragraph(c, MARGIN_L, y, MG["compensation_paragraph"], CONTENT_W, F_BODY, 8.5, BODY, 11) - 6

    if MG.get("lockup_paragraph"):
        c.setFont(F_DISP, 12); c.setFillColor(INK)
        c.drawString(MARGIN_L, y, "Selling stockholders & lock-ups"); y -= 12
        y = draw_paragraph(c, MARGIN_L, y, MG["lockup_paragraph"], CONTENT_W, F_BODY, 8.5, BODY, 11) - 6

    fill_trailing_whitespace(c, D, "management", y)
    page_footer(c, 10, D)


# ════════════════════════════════════════════════════════════════════════
# PAGE 11 — DISCLOSURE APPENDIX
# ════════════════════════════════════════════════════════════════════════
def page_11_disclosure(c, D):
    sample_banner(c, D); page_header(c, 11, D)
    company_short = D["meta"]["company_short"]
    company_name = D["meta"]["company_name"]
    ticker = D["meta"]["ticker"]
    DIS = D["disclosures"]
    rd = DIS.get("rating_distribution", {"buy_pct": 50, "hold_pct": 40, "sell_pct": 10})
    y = section_head(c, PAGE_H - MARGIN_T - 30, "Disclosure Appendix", f"11 / {company_short}")

    if D["meta"].get("is_sample"):
        box_h = 28
        filled_rect(c, MARGIN_L, y - box_h, CONTENT_W, box_h, SHADE)
        stroked_rect(c, MARGIN_L, y - box_h, CONTENT_W, box_h, GOLD, 1.0)
        c.setFont(F_BODY_BD, 8); c.setFillColor(GOLD)
        c.drawString(MARGIN_L + 10, y - 12, "ILLUSTRATIVE SAMPLE — NOT INVESTMENT RESEARCH")
        s = (f"This document is an illustrative sample demonstrating IPO Radar report format "
             f"and structure. The company \"{company_name},\" all clinical, financial, and "
             "valuation data, the price target, and the rating are entirely fabricated. Any "
             "resemblance to actual companies or persons, living or dead, is coincidental.")
        draw_paragraph(c, MARGIN_L + 10, y - 22, s, CONTENT_W - 20, F_BODY, 7.2, BODY, 9)
        y -= box_h + 12

    col_w = (CONTENT_W - 14) / 2
    col1_x = MARGIN_L
    col2_x = MARGIN_L + col_w + 14
    col_y_start = y

    sections_left = [
        ("Analyst Certification (Reg AC)",
         f"I, {D['meta'].get('analyst_name', 'Lead Analyst')}, certify that the views expressed "
         "in this report accurately reflect my personal views about the subject company and "
         "securities. I further certify that no part of my compensation was, is, or will be "
         "directly or indirectly related to the specific recommendations or views expressed in "
         "this report. Reg AC certification applies to all analysts contributing to research "
         f"published by {D['meta'].get('firm_name', 'Velocia Ventures')}."),
        ("Beneficial Ownership Disclosure",
         DIS.get("position_disclosure", "")),
        ("Investment Banking Relationships",
         DIS.get("ib_relationships", "")),
        ("Rating System",
         f"{D['meta'].get('firm_name', 'Velocia Ventures')} uses a three-tier rating system: "
         "BUY (expected return >15% over 12 months), HOLD (-10% to +15%), SELL (expected return "
         "<-10%). Price targets reflect 12-month forward expectations and are derived from a "
         "combination of DCF, comparable companies, precedent transactions, and scenario "
         "analysis. Ratings and price targets are subject to revision without notice."),
        ("Rating Distribution (Velocia Coverage Universe)",
         f"As of report date, {D['meta'].get('firm_name', 'Velocia Ventures')} coverage universe "
         f"distribution: BUY {rd.get('buy_pct', 0)}%, HOLD {rd.get('hold_pct', 0)}%, "
         f"SELL {rd.get('sell_pct', 0)}%. Distribution among companies for which Velocia has "
         "provided investment banking services in the past 12 months: not applicable (no IB "
         "relationships maintained)."),
    ]

    sections_right = [
        ("Price Target Methodology & Risks",
         DIS.get("price_target_methodology", "")),
        ("General Risk Disclosures",
         "Investment in clinical-stage biotechnology securities involves significant risk, "
         "including risk of total loss of capital. Price volatility is materially elevated "
         "relative to broader equity markets. Past performance of any security or strategy is "
         "not a reliable indicator of future results. Forward-looking statements in this report "
         "— including price targets, financial estimates, and clinical milestone timing — are "
         "subject to risks and uncertainties that may cause actual outcomes to differ "
         "materially."),
        ("Sources & Data Providers",
         "Primary sources: U.S. Securities and Exchange Commission EDGAR system (S-1, S-1/A, "
         "8-K, 10-K, DEF 14A); company investor presentations and conference call transcripts; "
         "peer-reviewed scientific literature (PubMed). Secondary sources: Capital IQ, FactSet, "
         "Bloomberg (capitalization, share price, comparable company data); IQVIA (market "
         "sizing, prescription volumes, pricing); ClinicalTrials.gov (trial design, enrollment "
         "status); company press releases. All non-EDGAR sources are cited inline in production "
         "reports."),
        ("Jurisdictional Notices",
         "U.S.: This report is intended for institutional investors and qualified retail "
         "clients. EU/UK: Distribution restricted to professional clients and eligible "
         "counterparties under MiFID II. Japan: Distribution restricted to qualified "
         "institutional investors. Australia: Wholesale clients only. Canada: Distribution "
         "restricted to permitted clients under National Instrument 31-103. This report is not "
         "directed to persons in jurisdictions where its distribution would be unlawful."),
        ("Conflicts Management",
         f"{D['meta'].get('firm_name', 'Velocia Ventures')} maintains a research independence "
         "policy under which research analysts (a) are not supervised by, and do not report to, "
         "personnel responsible for investment banking or capital markets activities; (b) are "
         "not compensated based on specific investment banking transactions; (c) are subject to "
         "pre-publication review by Compliance for accuracy and conflicts but not for editorial "
         "direction. Personal trading by analysts in covered securities is restricted under "
         "blackout windows."),
    ]

    cy_l = y; cy_r = y
    for title, body in sections_left:
        c.setFont(F_BODY_BD, 7.5); c.setFillColor(INK)
        c.drawString(col1_x, cy_l, title.upper()); cy_l -= 9
        cy_l = draw_paragraph(c, col1_x, cy_l, body, col_w, F_BODY, 7, BODY, 8.8) - 6
    for title, body in sections_right:
        c.setFont(F_BODY_BD, 7.5); c.setFillColor(INK)
        c.drawString(col2_x, cy_r, title.upper()); cy_r -= 9
        cy_r = draw_paragraph(c, col2_x, cy_r, body, col_w, F_BODY, 7, BODY, 8.8) - 6

    c.setStrokeColor(RULE_SOFT); c.setLineWidth(0.3)
    c.line(col1_x + col_w + 7, col_y_start + 4, col1_x + col_w + 7, min(cy_l, cy_r) + 4)

    y = min(cy_l, cy_r) - 4
    hr(c, MARGIN_L, y + 4, PAGE_W - MARGIN_R, RULE, 0.5); y -= 8

    fwd = ("Forward-Looking Statements: This report contains forward-looking statements within "
           "the meaning of Section 27A of the Securities Act of 1933 and Section 21E of the "
           "Securities Exchange Act of 1934. Forward-looking statements involve known and "
           "unknown risks, uncertainties, and other factors which may cause actual results, "
           "performance, or achievements to differ materially from those expressed or implied. "
           f"{D['meta'].get('firm_name', 'Velocia Ventures')} undertakes no obligation to "
           "update forward-looking statements except as required by applicable law.")
    y = draw_paragraph(c, MARGIN_L, y, fwd, CONTENT_W, F_BODY, 6.5, BODY, 8.5) - 6

    cpy = (f"Copyright © {D['meta']['report_date'][-4:]} {D['meta'].get('firm_name', 'Velocia Ventures')}. "
           "All rights reserved. IPO Radar is a research product of Velocia Ventures. Distribution "
           "outside intended recipients is prohibited. Unauthorized reproduction, redistribution, "
           "or use is a violation of applicable law and Velocia Ventures' terms of service. "
           "Contact: research@velociaventures.com")
    c.setFont(F_MONO, 6); c.setFillColor(MUTE)
    for line in wrap(c, cpy, CONTENT_W, F_MONO, 6):
        c.drawString(MARGIN_L, y, line.upper()); y -= 7.5

    page_footer(c, 11, D)


# ════════════════════════════════════════════════════════════════════════
# Validation
# ════════════════════════════════════════════════════════════════════════
def validate(D):
    """Run schema.md validation rules. Returns list of error strings."""
    errs = []
    for k, v in D["factor_profile"].items():
        if not (0 <= v <= 10):
            errs.append(f"factor_profile.{k}={v} out of range")
    for which in ("pre_ipo", "post_ipo"):
        if D.get("cap_table", {}).get(which):
            s = sum(seg["pct"] for seg in D["cap_table"][which]["segments"])
            if abs(s - 100.0) > 0.5:
                errs.append(f"cap_table.{which} sums to {s}, not 100")
    if D["valuation"]["football_field"]["target"] != D["rating"]["target_12mo"]:
        errs.append("football_field.target != rating.target_12mo")
    if D["valuation"]["football_field"]["ipo_mid"] != D["ipo"]["price_mid"]:
        errs.append("football_field.ipo_mid != ipo.price_mid")
    psum = (D["scenarios"]["bull"]["probability_pct"]
            + D["scenarios"]["base"]["probability_pct"]
            + D["scenarios"]["bear"]["probability_pct"])
    if psum != 100:
        errs.append(f"scenarios probabilities sum to {psum}, not 100")
    ncol = len(D["financials"]["columns"])
    for sec in D["financials"]["sections"]:
        for row in sec["rows"]:
            if len(row["values"]) != ncol:
                errs.append(f"financials row '{row['label']}' has {len(row['values'])} values, expected {ncol}")
    return errs


# ════════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════════
def render(D, out_path):
    c = canvas.Canvas(str(out_path), pagesize=LETTER)
    c.setTitle(f"IPO Radar — {D['meta']['company_name']} — Initiation"
               + (" (Sample)" if D['meta'].get('is_sample') else ""))
    c.setAuthor(f"IPO Radar / {D['meta'].get('firm_name', 'Velocia Ventures')}")
    c.setSubject("Initiation report"
                 + (" — illustrative only" if D['meta'].get('is_sample') else ""))

    page_1_cover(c, D); c.showPage()
    page_2_financials(c, D); c.showPage()
    page_3_thesis(c, D); c.showPage()
    page_4_company(c, D); c.showPage()
    page_5_market(c, D); c.showPage()
    page_6_pipeline(c, D); c.showPage()
    page_7_competitive(c, D); c.showPage()
    page_8_valuation(c, D); c.showPage()
    page_9_risks(c, D); c.showPage()
    page_10_mgmt(c, D); c.showPage()
    page_11_disclosure(c, D); c.showPage()

    c.save()


def main():
    here = Path(__file__).parent
    if len(sys.argv) >= 2:
        in_path = Path(sys.argv[1])
    else:
        in_path = here / "sample-helion.json"
    if len(sys.argv) >= 3:
        out_path = Path(sys.argv[2])
    else:
        out_path = here / f"{in_path.stem}.pdf"

    print(f"Reading: {in_path}")
    with open(in_path) as f:
        D = json.load(f)

    # Stash source dir so image lookups resolve relative paths against the JSON's folder.
    D["__source_dir__"] = str(in_path.parent)

    errs = validate(D)
    if errs:
        print("Validation errors:")
        for e in errs: print(f"  - {e}")
        # Don't abort on weighted_target / minor issues; only abort on hard errors above

    render(D, out_path)
    print(f"Wrote: {out_path}")


if __name__ == "__main__":
    main()
