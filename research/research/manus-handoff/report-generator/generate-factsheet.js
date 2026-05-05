#!/usr/bin/env node
/**
 * IPO Radar fact-sheet generator.
 *
 * Renders the per-IPO summary "fact sheet" (the page an analyst pulls up
 * for a Monday meeting). Reads a filing.json, applies a small enrichment
 * pass to compute SVG chart geometry, fills the {{placeholder}} template,
 * and writes HTML.
 *
 * PDF export is intentionally client-side (window.print() with a print
 * stylesheet) for v1 — no Puppeteer dependency on this path. If/when we
 * want server-side fact-sheet PDFs, the same renderPdf() in
 * generate-report.js can be lifted over.
 *
 * Usage:
 *   node generate-factsheet.js --filing ./sample-kestrel.json [--out ./out] [--template ./fact-sheet-template.html]
 *
 * Template engine (same as generate-report.js):
 *   {{path.to.value}}            scalar substitution (no HTML escaping)
 *   {{#each path}}…{{/each}}     iterate; exposes item fields plus
 *                                {{this}}, {{@i}}, {{@index}},
 *                                {{@first}}, {{@last}}, {{@notLast}}
 *   {{#if path}}…{{else}}…{{/if}}  conditional render
 *
 * Fields the template assumes are present (after enrichment):
 *   meta.*               — already on filing.json
 *   company.name         — already on filing.json
 *   summary.bull[]       — added in v1.1
 *   summary.bear[]       — added in v1.1
 *   timeline.events[]    — added in v1.1; .statusClass added by enricher
 *   discoveryCard.*      — added in v1.1
 *   chartData.points[]   — enricher adds .x, .y, .h, .gmDot, .ebDot, etc.
 *   chartData.gmPolyline — enricher computes "x,y x,y …" polyline string
 *   chartData.ebPolyline — same for EBITDA margin
 *   chartData.dividerX   — x-coord where projection divider sits (or null)
 *   valuation.comps.{rows,subject,sourceNote}  — for the peer table
 *   risks.items[]        — for the risk strip (uses .title and .body)
 */

const fs   = require('fs');
const path = require('path');

// ─── Arg parsing ────────────────────────────────────────────────────────
function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const HERE          = __dirname;
const FILING_PATH   = path.resolve(arg('--filing',   path.join(HERE, 'sample-kestrel.json')));
const TEMPLATE_PATH = path.resolve(arg('--template', path.join(HERE, 'fact-sheet-template.html')));
const OUT_DIR       = path.resolve(arg('--out',      path.join(HERE, 'out')));

if (!fs.existsSync(FILING_PATH))   die(`filing JSON not found: ${FILING_PATH}`);
if (!fs.existsSync(TEMPLATE_PATH)) die(`template not found: ${TEMPLATE_PATH}`);
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Load + enrich + render ─────────────────────────────────────────────
const filing   = JSON.parse(fs.readFileSync(FILING_PATH, 'utf8'));
const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
const enriched = enrich(filing);
const html     = render(template, enriched);

const outFile = path.join(OUT_DIR, `${slug(filing.meta.ticker)}-fact-sheet.html`);
fs.writeFileSync(outFile, html);
console.log(`[generate-factsheet] HTML → ${outFile} (${html.length.toLocaleString()} chars)`);

// Sanity: surface unfilled placeholders so the operator notices.
const leftovers = (html.match(/\{\{[^}]+\}\}/g) || []).filter(s => !/^\{\{!--/.test(s));
if (leftovers.length) {
  console.warn(`[generate-factsheet] WARN ${leftovers.length} unfilled placeholders:`,
    Array.from(new Set(leftovers)).slice(0, 8).join(', '));
}

// ════════════════════════════════════════════════════════════════════════
//                              IMPLEMENTATION
// ════════════════════════════════════════════════════════════════════════

function die(msg) { console.error(`[generate-factsheet] ${msg}`); process.exit(1); }
function slug(s)  { return String(s || 'fact-sheet').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// ─── Enrichment ─────────────────────────────────────────────────────────
function enrich(f) {
  const e = JSON.parse(JSON.stringify(f));

  e.meta.year = (e.meta.reportDate.match(/(19|20)\d{2}/) || [String(new Date().getFullYear())])[0];

  // Status badge label + tag class for the hero
  const statusMap = {
    'pre-pricing':    { label: 'Pre-pricing',    tagClass: 'tag-stage' },
    'amended':        { label: 'Amended',        tagClass: 'tag-stage' },
    'pricing-window': { label: 'Pricing window', tagClass: 'tag-fresh' },
    'trading':        { label: 'Trading',        tagClass: 'tag-fresh' },
  };
  const s = statusMap[e.meta.status] || statusMap['pre-pricing'];
  e.meta.statusLabel    = s.label;
  e.meta.statusTagClass = s.tagClass;

  // "Filed N days ago" — cheap derivation from filingDate
  e.meta.filedDaysAgoLabel = filedDaysAgo(e.meta.filingDate, e.meta.reportDate);

  // Timeline status → CSS class
  if (e.timeline && Array.isArray(e.timeline.events)) {
    e.timeline.events.forEach(ev => {
      ev.statusClass = ({ done: 'done', current: 'current', future: 'future' })[ev.status] || 'future';
    });
  }

  // Hero image fallback — if filing.meta.heroImage is missing, fall back
  // to a generic Unsplash for offline/dev. Production fills this from
  // generate-hero-image.js output.
  if (!e.meta.heroImage) {
    e.meta.heroImage = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1800&q=80';
  }

  // Chart geometry
  if (e.chartData && Array.isArray(e.chartData.points)) {
    enrichChart(e.chartData);
  }

  return e;
}

function filedDaysAgo(filingDate, reportDate) {
  if (!filingDate || !reportDate) return '';
  const a = new Date(filingDate);
  const b = new Date(reportDate);
  if (isNaN(a) || isNaN(b)) return '';
  const days = Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
  if (days === 0) return 'Filed today';
  if (days === 1) return 'Filed yesterday';
  return `Filed ${days} days ago`;
}

// ─── Chart geometry ─────────────────────────────────────────────────────
//
// SVG canvas: 900×340 viewBox, plot area x:60→840, y:40→280.
// Left axis: 0..yAxisRevMax in $M, mapped to y:280..40.
// Right axis: -60%..100% margins, mapped linearly with same y span.
//
function enrichChart(cd) {
  const X_LEFT = 60, X_RIGHT = 840;
  const Y_TOP  = 40, Y_BOTTOM = 280;
  const PLOT_H = Y_BOTTOM - Y_TOP;

  const n = cd.points.length;
  const xStep = (X_RIGHT - X_LEFT) / n;
  const barW  = Math.min(80, xStep * 0.42);

  const yMax = cd.yAxisRevMax || 200;
  const yMin = 0;
  const yRev = v => Y_BOTTOM - ((Math.max(yMin, v) - yMin) / (yMax - yMin)) * PLOT_H;

  // Margin axis: linear 100% → Y_TOP, -60% → Y_BOTTOM (matches mockup).
  const M_TOP = 100, M_BOT = -60;
  const yMargin = v => {
    const clamped = Math.max(M_BOT, Math.min(M_TOP, v));
    return Y_TOP + ((M_TOP - clamped) / (M_TOP - M_BOT)) * PLOT_H;
  };

  // Per-point geometry
  cd.points.forEach((p, i) => {
    p.cx     = X_LEFT + xStep * (i + 0.5);
    p.barX   = +(p.cx - barW / 2).toFixed(2);
    p.barW   = +barW.toFixed(2);
    p.barY   = +yRev(p.revenue).toFixed(2);
    p.barH   = +(Y_BOTTOM - p.barY).toFixed(2);
    p.barLabelY = +(p.barY - 5).toFixed(2);
    p.gmCY   = +yMargin(p.grossMargin).toFixed(2);
    p.gmLabelY = +(p.gmCY - 14).toFixed(2);   // a touch above the dot
    p.ebCY   = +yMargin(p.ebitdaMargin).toFixed(2);
    p.ebLabelY = +(p.ebCY + 14).toFixed(2);   // a touch below the dot
    p.ebClamped = p.ebitdaMargin < M_BOT;
    p.barRevenueLabel = formatRev(p.revenue, p.isTarget);
    p.gmLabel = `${Math.round(p.grossMargin)}%`;
    p.ebLabel = formatEbLabel(p.ebitdaMargin, p.ebClamped);
  });

  // Polylines as space-separated "x,y x,y …" strings
  cd.gmPolyline = cd.points.map(p => `${p.cx.toFixed(2)},${p.gmCY}`).join(' ');
  cd.ebPolyline = cd.points.map(p => `${p.cx.toFixed(2)},${p.ebCY}`).join(' ');

  // Projection divider: vertical line at the boundary between last historical
  // and first target. Null if no targets (chart shows historicals only).
  const firstTargetIdx = cd.points.findIndex(p => p.isTarget);
  cd.dividerX = firstTargetIdx > 0 ? +(X_LEFT + xStep * firstTargetIdx).toFixed(2) : null;
  cd.hasTargets = firstTargetIdx >= 0;

  // Axis ticks → svg-ready y coords
  cd.yAxisRevTicks.forEach(t => { t.y = +yRev(t.value).toFixed(2); });
  cd.yAxisMarginTicks.forEach(t => { t.y = +yMargin(t.value).toFixed(2); });
}

function formatRev(v, isTarget) {
  const s = String(Math.round(v));
  return isTarget ? `${s}e` : s;
}
function formatEbLabel(v, clamped) {
  if (clamped) return `${Math.round(v)}%↓`;
  if (v >= 0)  return `+${Math.round(v)}%`;
  return `${Math.round(v)}%`;          // already has minus
}

// ─── Template engine (same syntax as generate-report.js) ────────────────
function resolvePath(p, ctx) {
  if (p === 'this') return ctx.this !== undefined ? ctx.this : ctx;
  if (p.startsWith('@')) return ctx[p];
  const parts = p.split('.');
  let v = ctx;
  for (const part of parts) {
    if (v == null) return undefined;
    v = v[part];
  }
  return v;
}

function tokenize(src) {
  const tokens = [];
  const re = /\{\{\{?\s*([#/])?\s*([^}]+?)\s*\}?\}\}/g;
  let last = 0, m;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: src.slice(last, m.index) });
    const sigil = m[1]; const expr = m[2].trim();
    if (sigil === '#') {
      const [kw, ...rest] = expr.split(/\s+/);
      tokens.push({ type: 'open', keyword: kw, arg: rest.join(' ') });
    } else if (sigil === '/') {
      tokens.push({ type: 'close', keyword: expr });
    } else if (expr === 'else') {
      tokens.push({ type: 'else' });
    } else {
      tokens.push({ type: 'var', path: expr });
    }
    last = re.lastIndex;
  }
  if (last < src.length) tokens.push({ type: 'text', value: src.slice(last) });
  return tokens;
}

function parse(tokens) {
  let i = 0;
  function parseBlock(untilKeywords = []) {
    const nodes = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === 'close' && untilKeywords.includes(t.keyword)) return nodes;
      if (t.type === 'else') return nodes;
      if (t.type === 'text' || t.type === 'var') { nodes.push(t); i++; continue; }
      if (t.type === 'open') {
        if (t.keyword === 'each') {
          i++;
          const body = parseBlock(['each']);
          if (tokens[i] && tokens[i].type === 'close' && tokens[i].keyword === 'each') i++;
          nodes.push({ type: 'each', path: t.arg, body });
        } else if (t.keyword === 'if') {
          i++;
          const thenBody = parseBlock(['if']);
          let elseBody = null;
          if (tokens[i] && tokens[i].type === 'else') { i++; elseBody = parseBlock(['if']); }
          if (tokens[i] && tokens[i].type === 'close' && tokens[i].keyword === 'if') i++;
          nodes.push({ type: 'if', path: t.arg, thenBody, elseBody });
        } else {
          nodes.push({ type: 'text', value: '' }); i++;
        }
        continue;
      }
      i++;
    }
    return nodes;
  }
  return parseBlock([]);
}

function renderAst(nodes, ctx) {
  return nodes.map(n => {
    if (n.type === 'text') return n.value;
    if (n.type === 'var') {
      const v = resolvePath(n.path, ctx);
      return v == null || v === false ? '' : String(v);
    }
    if (n.type === 'if') {
      const v = resolvePath(n.path, ctx);
      const truthy = Array.isArray(v) ? v.length > 0 : !!v;
      return truthy ? renderAst(n.thenBody, ctx) : (n.elseBody ? renderAst(n.elseBody, ctx) : '');
    }
    if (n.type === 'each') {
      const arr = resolvePath(n.path, ctx) || [];
      return arr.map((item, idx) => {
        const itemCtx = {
          ...ctx,
          ...(item && typeof item === 'object' ? item : {}),
          this: item,
          '@index': idx,
          '@i':     String(idx + 1).padStart(2, '0'),
          '@first': idx === 0,
          '@last':  idx === arr.length - 1,
          '@notLast': idx !== arr.length - 1,
        };
        return renderAst(n.body, itemCtx);
      }).join('');
    }
    return '';
  }).join('');
}

function render(template, data) {
  return renderAst(parse(tokenize(template)), data);
}
