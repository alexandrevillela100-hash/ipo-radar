#!/usr/bin/env node
/**
 * IPO Radar initiation-report generator.
 *
 * Input:   a filing JSON object (see filing-schema.md)
 * Output:  HTML (always) + PDF (if a renderer is available) in an --out dir.
 *
 * Usage:
 *   node generate-report.js --filing ./sample-kestrel.json [--out ./out] [--template ./report-template.html]
 *
 * The render step is a small homegrown templating engine that supports:
 *   {{path.to.value}}           scalar substitution
 *   {{{path}}}                  (alias for above — we don't HTML-escape)
 *   {{#each path}}…{{/each}}    iterate array; each iteration exposes the
 *                               item's fields plus {{@i}} (1-based, zero-padded),
 *                               {{@index}}, {{@first}}, {{@last}}, {{@notLast}},
 *                               and {{this}} for scalar arrays.
 *   {{#if path}}…{{/if}}        conditional render
 *   {{#if path}}…{{else}}…{{/if}}
 *
 * The generator also applies a pre-render enrichment pass that adds derived
 * fields the template needs (severity CSS class, highlighted financial cells,
 * copyright year), so the JSON input can stay minimal.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ─── Arg parsing ────────────────────────────────────────────────────────
function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const HERE = __dirname;
const FILING_PATH   = path.resolve(arg('--filing',   path.join(HERE, 'sample-kestrel.json')));
const TEMPLATE_PATH = path.resolve(arg('--template', path.join(HERE, 'report-template.html')));
const OUT_DIR       = path.resolve(arg('--out',      path.join(HERE, 'out')));
const SKIP_PDF      = process.argv.includes('--no-pdf');

if (!fs.existsSync(FILING_PATH))   die(`filing JSON not found: ${FILING_PATH}`);
if (!fs.existsSync(TEMPLATE_PATH)) die(`template not found: ${TEMPLATE_PATH}`);
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Load + validate ────────────────────────────────────────────────────
const filing = JSON.parse(fs.readFileSync(FILING_PATH, 'utf8'));
const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

validate(filing);

// ─── Enrich ─────────────────────────────────────────────────────────────
const enriched = enrich(filing);

// ─── Render HTML ────────────────────────────────────────────────────────
const html = render(template, enriched);
const htmlOut = path.join(OUT_DIR, `${slug(filing.meta.ticker)}-initiation-report.html`);
fs.writeFileSync(htmlOut, html);
console.log(`[generate-report] HTML → ${htmlOut} (${html.length.toLocaleString()} chars)`);

// ─── Render PDF ─────────────────────────────────────────────────────────
if (!SKIP_PDF) {
  const pdfOut = htmlOut.replace(/\.html$/, '.pdf');
  const ok = renderPdf(htmlOut, pdfOut);
  if (ok) {
    const size = fs.statSync(pdfOut).size;
    console.log(`[generate-report] PDF  → ${pdfOut} (${size.toLocaleString()} bytes)`);
  } else {
    console.warn('[generate-report] PDF step skipped — no renderer available');
  }
}

// ════════════════════════════════════════════════════════════════════════
//                             IMPLEMENTATION
// ════════════════════════════════════════════════════════════════════════

function die(msg) { console.error(`[generate-report] ${msg}`); process.exit(1); }
function slug(s)  { return String(s || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// ─── Validation — soft checks, warn but don't abort ─────────────────────
function validate(f) {
  const required = [
    'meta.reportDate', 'meta.ticker', 'company.name',
    'verdict.label', 'fairValue.mid.price',
    'executiveSummary.keyPoints', 'financialAnalysis.tableRows',
    'risks.items', 'valuation.dcf.rows', 'valuation.comps.rows',
    'investmentVerdict.points',
  ];
  const missing = required.filter(p => resolvePath(p, f) == null);
  if (missing.length) die(`filing is missing required fields:\n  - ${missing.join('\n  - ')}`);

  const kp = f.executiveSummary.keyPoints.length;
  if (kp !== 5) console.warn(`[generate-report] warn: executiveSummary.keyPoints has ${kp} items; template expects 5`);

  const cols = f.financialAnalysis.tableColumns.length;
  f.financialAnalysis.tableRows.forEach((r, i) => {
    if (r.values.length !== cols) {
      die(`financialAnalysis.tableRows[${i}] has ${r.values.length} values; expected ${cols}`);
    }
  });
}

// ─── Enrichment — derived fields the template reads ─────────────────────
function enrich(f) {
  const e = JSON.parse(JSON.stringify(f)); // deep clone

  // Copyright year, parsed from reportDate (e.g. "Apr 21, 2026")
  const y = (e.meta.reportDate.match(/(19|20)\d{2}/) || [])[0] || new Date().getFullYear();
  e.meta.year = String(y);

  // Severity → CSS class for risks
  const severityMap = { High: 'severity-high', Medium: 'severity-medium', Low: 'severity-low' };
  e.risks.items.forEach(r => { r.severityClass = severityMap[r.severity] || 'severity-medium'; });

  // Financial table: wrap each value in an object so the template can
  // decide per-cell highlighting. highlightLast rows teal the final cell.
  e.financialAnalysis.tableRows.forEach(row => {
    row.cells = row.values.map((v, i) => ({
      value: v,
      isLast: i === row.values.length - 1,
      shouldHighlight: !!row.highlightLast && i === row.values.length - 1,
    }));
  });

  return e;
}

// ─── Path resolution ────────────────────────────────────────────────────
function resolvePath(path, ctx) {
  if (path === 'this') return ctx.this !== undefined ? ctx.this : ctx;
  if (path.startsWith('@')) return ctx[path];
  const parts = path.split('.');
  let v = ctx;
  for (const p of parts) {
    if (v == null) return undefined;
    v = v[p];
  }
  return v;
}

// ─── Tokenizer — splits template into text / mustache nodes ─────────────
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

// ─── Parser — builds an AST from the token stream ───────────────────────
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
          // unknown block — emit literal
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

// ─── Renderer ───────────────────────────────────────────────────────────
function renderAst(nodes, ctx) {
  return nodes.map(n => {
    if (n.type === 'text') return n.value;
    if (n.type === 'var')  {
      const v = resolvePath(n.path, ctx);
      return v == null || v === false ? '' : String(v);
    }
    if (n.type === 'if') {
      const v = resolvePath(n.path, ctx);
      return v ? renderAst(n.thenBody, ctx) : (n.elseBody ? renderAst(n.elseBody, ctx) : '');
    }
    if (n.type === 'each') {
      const arr = resolvePath(n.path, ctx) || [];
      return arr.map((item, idx) => {
        const ii = idx + 1;
        const itemCtx = {
          ...ctx,
          ...(item && typeof item === 'object' ? item : {}),
          this: item,
          '@index': idx,
          '@i': String(ii).padStart(2, '0'),
          '@first': idx === 0,
          '@last': idx === arr.length - 1,
          '@notLast': idx !== arr.length - 1,
        };
        return renderAst(n.body, itemCtx);
      }).join('');
    }
    return '';
  }).join('');
}

function render(template, data) {
  const tokens = tokenize(template);
  const ast = parse(tokens);
  return renderAst(ast, data);
}

// ─── PDF renderer (puppeteer → LibreOffice fallback) ────────────────────
function renderPdf(htmlPath, pdfPath) {
  // Try puppeteer / puppeteer-core (the production path)
  try {
    const puppeteer = tryRequire('puppeteer') || tryRequire('puppeteer-core');
    if (puppeteer) return renderPdfViaPuppeteer(puppeteer, htmlPath, pdfPath);
  } catch (e) {
    console.warn('[generate-report] puppeteer errored, falling back:', e.message);
  }
  // Fallback: LibreOffice
  return renderPdfViaLibreOffice(htmlPath, pdfPath);
}

function tryRequire(name) { try { return require(name); } catch (_) { return null; } }

function renderPdfViaPuppeteer(puppeteer, htmlPath, pdfPath) {
  // Intentionally synchronous wrapper around an async ops burst via deasync?
  // Keep it async-clean: use the top-level await pattern via a child process.
  const code = `
    (async () => {
      const puppeteer = require(${JSON.stringify(require.resolve((tryRequire('puppeteer') ? 'puppeteer' : 'puppeteer-core')))});
      const fs = require('fs');
      const exe = process.env.CHROME_PATH
        || ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p => fs.existsSync(p));
      const opts = { headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] };
      if (exe) opts.executablePath = exe;
      const browser = await puppeteer.launch(opts);
      const page = await browser.newPage();
      await page.goto('file://' + ${JSON.stringify(htmlPath)}, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.emulateMediaType('print');
      try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (_) {}
      await page.pdf({
        path: ${JSON.stringify(pdfPath)},
        format: 'A4', printBackground: true, preferCSSPageSize: true,
        margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' },
      });
      await browser.close();
    })().catch(e => { console.error(e); process.exit(2); });
  `;
  const r = spawnSync(process.execPath, ['-e', code], { stdio: 'inherit' });
  return r.status === 0;
}

function renderPdfViaLibreOffice(htmlPath, pdfPath) {
  const outDir = path.dirname(pdfPath);
  const baseName = path.basename(htmlPath).replace(/\.[^.]+$/, '');
  const r = spawnSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', outDir, htmlPath], { stdio: 'pipe' });
  if (r.status !== 0) return false;
  const produced = path.join(outDir, `${baseName}.pdf`);
  if (produced !== pdfPath && fs.existsSync(produced)) fs.renameSync(produced, pdfPath);
  return fs.existsSync(pdfPath);
}
