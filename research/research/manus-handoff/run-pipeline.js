#!/usr/bin/env node
/**
 * IPO Radar — end-to-end pipeline entry point.
 *
 * Given an EDGAR S-1 URL (and a pinch of metadata), this script:
 *   1. Downloads the S-1 from EDGAR (or reads --s1File).
 *   2. Strips it to the sections Claude actually needs.
 *   3. Asks Claude (sonnet-4-6) to produce filing JSON matching our schema.
 *   4. Writes filing.json.
 *   5. Generates the hero image via DALL-E 3 (one image per filing — re-used
 *      by both the initiation report and the fact sheet).
 *   6. Renders the initiation report (HTML + PDF).
 *   7. Renders the fact sheet (HTML; PDF is client-side via window.print()).
 *   8. (--v2) Renders the v2 Goldman/Citi-style 11-page initiation report
 *      via the Python renderers in `initiation-report-v2/`. This consumes
 *      the SAME `filing.json` (the v2 schema is a superset of v1) and writes
 *      `{ticker}-v2-report.html` and `{ticker}-v2-report.pdf`. v2 is opt-in
 *      while v1 remains the production default — flip the default when v2
 *      is signed off.
 *
 * Outputs land in ./out/{ticker}/:
 *    filing.json                          ← structured brief (editor hand-edits)
 *    hero.png                             ← DALL-E hero (skipped if no key)
 *    {ticker}-initiation-report.html
 *    {ticker}-initiation-report.pdf
 *    {ticker}-fact-sheet.html             ← public fact sheet, no editorial verdict
 *    {ticker}-v2-report.html              ← v2 dark-Velocia HTML  (only if --v2)
 *    {ticker}-v2-report.pdf               ← v2 white-bg IB-style PDF (only if --v2)
 *
 * Usage (inside Manus, recommended — Manus already has an EDGAR import
 * capability, so hand us a local text file and we skip the fetch step):
 *   node run-pipeline.js \
 *     --s1File /path/to/s1-text-from-manus.txt \
 *     --company "Kestrel Intelligence, Inc." \
 *     --ticker KSTR \
 *     --exchange "NYSE (proposed)" \
 *     --industry "Data Infrastructure" \
 *     --filingDate "May 12, 2026" \
 *     --editor "Alexandre Villela" \
 *     --url "https://www.sec.gov/Archives/edgar/data/.../example-s1.htm"    // optional, just for citation
 *
 * Usage (standalone — we'll fetch from EDGAR ourselves, requires SEC_USER_AGENT):
 *   node run-pipeline.js \
 *     --url https://www.sec.gov/Archives/edgar/data/.../example-s1.htm \
 *     --company "..." --ticker ... --filingDate "..." --editor "..."
 *
 * Flags:
 *   --s1File path         pre-extracted S-1 text file (bypasses our EDGAR fetch). Preferred.
 *   --url URL             EDGAR link; used to fetch the S-1 if --s1File is absent. Always logged in the output as the citation.
 *   --facts path          supplementary-facts.txt (peer comps, editor bias, etc.)
 *   --skipClaude path     load a pre-made filing.json, skip the LLM. Offline/debug.
 *   --skipImage           skip DALL-E hero generation (renderer falls back to Unsplash placeholder).
 *   --outDir path         default: ./out/{ticker}/
 *   --v2                  also render the v2 11-page initiation report (Python renderers).
 *   --v2only              skip v1 renderers; only run v2. Useful while v2 is the focus.
 *   --skipV2              don't run v2 even if --v2only/--v2 is otherwise inferred.
 *
 * Required env:
 *   ANTHROPIC_API_KEY       — your Anthropic key (get one at console.anthropic.com).
 * Optional env:
 *   OPENAI_API_KEY          — for DALL-E hero generation. Without it, hero step auto-skips.
 *   OPENAI_MODEL            — defaults to "dall-e-3".
 *   OPENAI_QUALITY          — "hd" (default, $0.08) or "standard" ($0.04).
 *   OPENAI_SIZE             — defaults to "1792x1024".
 *   SEC_USER_AGENT          — required only if we have to fetch from EDGAR ourselves (no --s1File).
 *   ANTHROPIC_MODEL         — defaults to "claude-sonnet-4-6". Use "claude-opus-4-6" to splurge.
 *   MAX_S1_CHARS            — cap on S-1 text fed to Claude; default 260000 (~65k tokens).
 */

const fs            = require('fs');
const path          = require('path');
const https         = require('https');
const { execFileSync } = require('child_process');

// ------------------------- CLI ARGS -------------------------

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) {
      const key = k.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        a[key] = true;
      } else {
        a[key] = next;
        i++;
      }
    }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));

function requireArg(name) {
  if (!args[name]) {
    console.error(`missing required --${name}`);
    process.exit(2);
  }
  return args[name];
}

// ------------------------- HTTP -------------------------

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return httpGet(res.headers.location, headers).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('timeout')));
  });
}

// ------------------------- S-1 FETCH + STRIP -------------------------

async function fetchS1Text(url) {
  const ua = process.env.SEC_USER_AGENT || 'IPO Radar research@velociaventures.com';
  // SEC requires a real User-Agent with contact email, or it will 403.
  const buf = await httpGet(url, {
    'User-Agent': ua,
    'Accept-Encoding': 'gzip, deflate',
  });
  const html = buf.toString('utf8');
  // Cheap HTML → text: strip tags, collapse whitespace.
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

/**
 * S-1s are 250-400 pages. We don't need the exhibits or the shareholder
 * mechanics. Keep just the sections Claude actually reasons over.
 *
 * If we can't find headings reliably, we fall back to "first N chars" —
 * Claude can still do a reasonable job with the prospectus summary.
 */
function stripS1ToSections(text, maxChars) {
  const keepHeadings = [
    'PROSPECTUS SUMMARY',
    'RISK FACTORS',
    'MANAGEMENT\'S DISCUSSION AND ANALYSIS',
    'MANAGEMENT’S DISCUSSION AND ANALYSIS',
    'BUSINESS',
    'SELECTED FINANCIAL DATA',
    'SUMMARY CONSOLIDATED FINANCIAL DATA',
    'USE OF PROCEEDS',
  ];
  const stopHeadings = [
    'PRINCIPAL STOCKHOLDERS',
    'CERTAIN RELATIONSHIPS AND RELATED PARTY TRANSACTIONS',
    'DESCRIPTION OF CAPITAL STOCK',
    'UNDERWRITING',
    'LEGAL MATTERS',
    'EXPERTS',
    'WHERE YOU CAN FIND',
    'INDEX TO FINANCIAL STATEMENTS',
  ];
  const upper = text.toUpperCase();
  const slices = [];
  for (const h of keepHeadings) {
    const start = upper.indexOf(h);
    if (start < 0) continue;
    // Find the nearest stop heading after start.
    let end = text.length;
    for (const s of stopHeadings) {
      const stopAt = upper.indexOf(s, start + h.length);
      if (stopAt > 0 && stopAt < end) end = stopAt;
    }
    slices.push({ start, end, h });
  }
  // If we found nothing, use the first maxChars.
  if (!slices.length) return text.slice(0, maxChars);
  // Merge overlapping slices, keep in document order.
  slices.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const s of slices) {
    const prev = merged[merged.length - 1];
    if (prev && s.start <= prev.end) prev.end = Math.max(prev.end, s.end);
    else merged.push({ ...s });
  }
  let out = merged.map(({ start, end }) => text.slice(start, end)).join('\n\n');
  if (out.length > maxChars) out = out.slice(0, maxChars);
  return out;
}

// ------------------------- CLAUDE CALL -------------------------

function readSchema() {
  return fs.readFileSync(path.join(__dirname, 'report-generator', 'filing-schema.md'), 'utf8');
}

function readSystemPrompt() {
  const md = fs.readFileSync(path.join(__dirname, 'report-generator', 'claude-prompt.md'), 'utf8');
  // claude-prompt.md stores the system prompt as a blockquote under "## System prompt".
  const m = md.match(/## System prompt\s+([\s\S]*?)\n## /);
  if (!m) throw new Error('could not locate system prompt block in claude-prompt.md');
  return m[1]
    .split('\n')
    .map((l) => l.replace(/^>\s?/, ''))
    .join('\n')
    .trim();
}

function buildUserPrompt({ meta, facts, schema, s1Text }) {
  return [
    'You are drafting an initiation report for a new S-1 filing.',
    '',
    '═══════════════════════════════════════════════════════════════════',
    'FILING METADATA',
    '═══════════════════════════════════════════════════════════════════',
    '',
    `Company:           ${meta.company}`,
    `Ticker (proposed): ${meta.ticker}`,
    `Exchange:          ${meta.exchange}`,
    `Filing date:       ${meta.filingDate}`,
    `Industry:          ${meta.industry}`,
    `EDGAR URL:         ${meta.edgarUrl}`,
    `Editor:            ${meta.editor}`,
    `Report date:       ${meta.reportDate}`,
    '',
    '═══════════════════════════════════════════════════════════════════',
    'SUPPLEMENTARY FACTS',
    '═══════════════════════════════════════════════════════════════════',
    '',
    facts || '(none provided — rely on the S-1 alone and flag any missing peer data)',
    '',
    '═══════════════════════════════════════════════════════════════════',
    'SCHEMA',
    '═══════════════════════════════════════════════════════════════════',
    '',
    'The output must match this TypeScript type exactly:',
    '',
    schema,
    '',
    '═══════════════════════════════════════════════════════════════════',
    'S-1 CONTENT',
    '═══════════════════════════════════════════════════════════════════',
    '',
    s1Text,
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    'Now produce the JSON.',
  ].join('\n');
}

async function callClaude({ meta, facts, s1Text }) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const system = readSystemPrompt();
  const schema = readSchema();
  const user = buildUserPrompt({ meta, facts, schema, s1Text });

  console.log(`[claude] model=${model} system_chars=${system.length} user_chars=${user.length}`);
  const resp = await client.messages.create({
    model,
    max_tokens: 16000,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const text = resp.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  const fence = text.match(/```json\s*([\s\S]*?)```/);
  const jsonText = fence ? fence[1].trim() : text.trim();
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error('[claude] JSON parse failed. Raw response saved to claude-raw.txt');
    fs.writeFileSync('claude-raw.txt', text);
    throw e;
  }
}

// ------------------------- MAIN -------------------------

async function main() {
  if (args.help || args.h) {
    console.log(fs.readFileSync(__filename, 'utf8').match(/^\/\*\*([\s\S]*?)\*\//)[1]);
    process.exit(0);
  }

  const meta = {
    company:     requireArg('company'),
    ticker:      requireArg('ticker'),
    exchange:    args.exchange   || 'NYSE (proposed)',
    industry:    args.industry   || 'Unclassified',
    filingDate:  requireArg('filingDate'),
    edgarUrl:    args.url || '(not provided)',
    editor:      args.editor     || 'Editorial team',
    reportDate:  args.reportDate || new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
  };

  const outDir = args.outDir || path.join('out', meta.ticker.toLowerCase());
  fs.mkdirSync(outDir, { recursive: true });

  let filing;
  if (args.skipClaude) {
    console.log(`[pipeline] --skipClaude set, loading filing from ${args.skipClaude}`);
    filing = JSON.parse(fs.readFileSync(args.skipClaude, 'utf8'));
  } else {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY env var is required (or use --skipClaude for offline run)');
      process.exit(2);
    }
    if (!args.s1File && !args.url) {
      console.error('either --s1File (pre-extracted text) or --url (EDGAR link to fetch) is required');
      process.exit(2);
    }

    const maxChars = parseInt(process.env.MAX_S1_CHARS || '260000', 10);
    let s1Text;
    if (args.s1File) {
      // Preferred path inside Manus: Manus's EDGAR tool has already
      // fetched and extracted the filing into plain text. Just read it.
      const raw = fs.readFileSync(args.s1File, 'utf8');
      s1Text = raw.length > maxChars ? stripS1ToSections(raw, maxChars) : raw;
      console.log(`[pipeline] loaded S-1 from ${args.s1File} (${raw.length} chars → ${s1Text.length} after strip)`);
    } else {
      // Fallback: fetch ourselves. Used when running outside Manus.
      console.log(`[pipeline] fetching S-1 from ${args.url}`);
      const rawText = await fetchS1Text(args.url);
      s1Text = stripS1ToSections(rawText, maxChars);
      console.log(`[pipeline] stripped S-1 to ${s1Text.length} chars (raw: ${rawText.length})`);
    }

    const facts = args.facts ? fs.readFileSync(args.facts, 'utf8') : '';
    filing = await callClaude({ meta, facts, s1Text });
  }

  const filingPath = path.join(outDir, 'filing.json');
  fs.writeFileSync(filingPath, JSON.stringify(filing, null, 2));
  console.log(`[pipeline] wrote ${filingPath}`);

  // Step A — generate the hero image via DALL-E 3, before the renderers
  // run, so meta.heroImage is patched into filing.json and both the
  // initiation report and the fact sheet pick it up.
  //
  // The fact sheet uses the same hero, and (eventually) so does the
  // discovery card on the homepage — one image per filing, no waste.
  //
  // Skip cleanly if --skipImage is set OR OPENAI_API_KEY is missing OR
  // the filing has no heroPrompt yet (offline JSON without v1.1 fields).
  const heroScript = path.join(__dirname, 'report-generator', 'generate-hero-image.js');
  const skipImage =
    args.skipImage ||
    !process.env.OPENAI_API_KEY ||
    !filing.meta || !filing.meta.heroPrompt;
  if (skipImage) {
    if (args.skipImage) console.log('[pipeline] --skipImage set, skipping hero image generation');
    else if (!process.env.OPENAI_API_KEY) console.log('[pipeline] OPENAI_API_KEY not set, skipping hero image generation (renderer will use Unsplash fallback)');
    else console.log('[pipeline] filing has no meta.heroPrompt, skipping hero image generation');
  } else {
    console.log(`[pipeline] running ${heroScript}`);
    try {
      execFileSync('node', [heroScript, '--filing', filingPath, '--out', outDir], {
        stdio: 'inherit',
      });
    } catch (e) {
      // Image generation failures shouldn't kill the pipeline — the
      // renderer falls back to the Unsplash placeholder when heroImage
      // is missing. Log loudly so the editor notices.
      console.error('[pipeline] hero image generation failed; continuing with placeholder hero');
    }
    // Re-load filing in case the hero generator patched meta.heroImage.
    filing = JSON.parse(fs.readFileSync(filingPath, 'utf8'));
  }

  const tickerLc = meta.ticker.toLowerCase();

  // Step B — v1 initiation report (HTML + PDF). Skipped under --v2only.
  if (!args.v2only) {
    const reportGen = path.join(__dirname, 'report-generator', 'generate-report.js');
    console.log(`[pipeline] running ${reportGen}`);
    execFileSync('node', [reportGen, '--filing', filingPath, '--out', outDir], {
      stdio: 'inherit',
    });
  } else {
    console.log('[pipeline] --v2only set, skipping v1 initiation report');
  }

  // Step C — v1 fact sheet (HTML only). Always run — even under v2only,
  // the fact sheet is the v2-independent public-facing deliverable and
  // it consumes the same hero.png that the v2 cover hero uses.
  const factsheetGen = path.join(__dirname, 'report-generator', 'generate-factsheet.js');
  console.log(`[pipeline] running ${factsheetGen}`);
  execFileSync('node', [factsheetGen, '--filing', filingPath, '--out', outDir], {
    stdio: 'inherit',
  });

  // Step D — v2 initiation report (Python renderers). Opt-in via --v2 or --v2only.
  //
  // The v2 renderers consume the SAME filing.json (their schema is a superset
  // of v1, with extra `body_images`, `cap_table`, `factor_profile`, etc.).
  // Missing fields fall back to placeholders, so a v1-only filing.json will
  // still render — just sparser. This means the editor can run v2 alongside
  // v1 from day one without touching the extraction prompt.
  //
  // Both renderers expect to be invoked from the v2 directory and accept
  // (input.json, output.path) as positional args.
  const wantV2 = (args.v2 || args.v2only) && !args.skipV2;
  if (wantV2) {
    const v2Dir   = path.resolve(__dirname, '..', '..', 'initiation-report-v2');
    const v2Json  = path.join(outDir, 'filing.json');
    const v2Html  = path.resolve(outDir, `${tickerLc}-v2-report.html`);
    const v2Pdf   = path.resolve(outDir, `${tickerLc}-v2-report.pdf`);
    const python  = process.env.PYTHON || 'python3';
    const absJson = path.resolve(v2Json);

    if (!fs.existsSync(v2Dir)) {
      console.error(`[pipeline] v2 renderer dir not found: ${v2Dir}; skipping v2 step`);
    } else {
      // Copy hero + body images into outDir so v2's relative-path resolution
      // (which uses the JSON's directory as the root) finds them. The hero
      // image generator already writes hero.png into outDir; body images
      // are expected to live alongside filing.json. Editors who don't yet
      // have body_images defined just see the soft tinted-strip fallback.
      try {
        console.log(`[pipeline] running v2 HTML renderer (${python} render_html.py)`);
        execFileSync(python, ['render_html.py', absJson, v2Html], {
          cwd: v2Dir, stdio: 'inherit',
        });
        console.log(`[pipeline] running v2 PDF renderer (${python} render_pdf.py)`);
        execFileSync(python, ['render_pdf.py', absJson, v2Pdf], {
          cwd: v2Dir, stdio: 'inherit',
        });
      } catch (e) {
        console.error('[pipeline] v2 render step failed:', e.message);
        console.error('  v1 outputs (if produced) are unaffected. Inspect Python tracebacks above.');
      }
    }
  }

  console.log(`[pipeline] done.`);
  if (!args.v2only) {
    console.log(`  initiation report (v1): ${path.join(outDir, tickerLc + '-initiation-report.pdf')}`);
  }
  console.log(`  fact sheet:             ${path.join(outDir, tickerLc + '-fact-sheet.html')}`);
  if (wantV2) {
    console.log(`  initiation report (v2): ${path.join(outDir, tickerLc + '-v2-report.pdf')}`);
    console.log(`  initiation report (v2): ${path.join(outDir, tickerLc + '-v2-report.html')}`);
  }
  console.log(`  filing JSON:            ${filingPath}`);
}

main().catch((e) => {
  console.error('[pipeline] failed:', e.stack || e.message || e);
  process.exit(1);
});
