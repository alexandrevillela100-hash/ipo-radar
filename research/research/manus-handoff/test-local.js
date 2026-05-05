#!/usr/bin/env node
/**
 * Offline smoke test.
 *
 * Runs the whole renderer chain without touching EDGAR, Claude, or DALL-E.
 * Uses the golden sample-kestrel.json as the filing input and produces:
 *   · the initiation report (HTML + PDF)
 *   · the fact sheet (HTML)
 * in out/kstr/. If this works end-to-end, the only things left to prove
 * in your environment are:
 *   · EDGAR fetch (needs SEC_USER_AGENT set)
 *   · Claude call (needs ANTHROPIC_API_KEY set and credits)
 *   · DALL-E hero (needs OPENAI_API_KEY set; pipeline auto-skips if absent)
 *
 * Usage:
 *   npm install
 *   node test-local.js
 *
 * Expected output (success):
 *   out/kstr/filing.json
 *   out/kstr/kstr-initiation-report.html
 *   out/kstr/kstr-initiation-report.pdf     ← ~200 KB, should match the mockup
 *   out/kstr/kstr-fact-sheet.html           ← ~45 KB, opens with embedded chart
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const samplePath = path.join(__dirname, 'report-generator', 'sample-kestrel.json');
const outDir     = path.join(__dirname, 'out', 'kstr');

// Invoke run-pipeline.js with --skipClaude (offline JSON) and --skipImage
// (no DALL-E call). This actually exercises the pipeline glue, not just
// the renderers — so if --skipClaude / --skipImage / step ordering breaks
// in run-pipeline.js, this test catches it.
console.log('[test] running run-pipeline.js --skipClaude --skipImage ...');
execFileSync(
  'node',
  [
    path.join(__dirname, 'run-pipeline.js'),
    '--skipClaude', samplePath,
    '--skipImage',
    '--company',    'Kestrel Intelligence, Inc.',
    '--ticker',     'KSTR',
    '--exchange',   'NYSE (proposed)',
    '--industry',   'Enterprise AI',
    '--filingDate', 'Apr 8, 2026',
    '--editor',     'Alexandre Villela',
    '--url',        'https://www.sec.gov/Archives/edgar/data/0001/kstr-s1.htm',
    '--outDir',     outDir,
  ],
  { stdio: 'inherit' }
);

const html       = path.join(outDir, 'kstr-initiation-report.html');
const pdf        = path.join(outDir, 'kstr-initiation-report.pdf');
const factSheet  = path.join(outDir, 'kstr-fact-sheet.html');

let allOk = true;

if (fs.existsSync(html)) {
  console.log('[test] OK initiation HTML:', html, `(${fs.statSync(html).size} bytes)`);
} else {
  console.error('[test] FAIL — initiation HTML not produced');
  allOk = false;
}

if (fs.existsSync(pdf)) {
  console.log('[test] OK initiation PDF:', pdf, `(${fs.statSync(pdf).size} bytes)`);
} else {
  console.warn('[test] WARNING — initiation PDF not produced.');
  console.warn('[test] Install a renderer: npm install puppeteer  (recommended)');
  console.warn('[test] Or on Debian/Ubuntu: apt-get install -y libreoffice  (fallback)');
  allOk = false;
}

if (fs.existsSync(factSheet)) {
  const factSize = fs.statSync(factSheet).size;
  console.log('[test] OK fact sheet HTML:', factSheet, `(${factSize} bytes)`);
  // Quick integrity check: the renderer should leave no unfilled {{...}}
  // placeholders. If you see this fire, sample-kestrel.json or the
  // template lost a binding.
  const body = fs.readFileSync(factSheet, 'utf8');
  const stray = body.match(/\{\{[^}]+\}\}/g);
  if (stray) {
    console.error(`[test] FAIL — fact sheet has ${stray.length} unfilled placeholder(s):`, stray.slice(0, 3));
    allOk = false;
  }
} else {
  console.error('[test] FAIL — fact sheet HTML not produced');
  allOk = false;
}

if (!allOk) process.exit(1);
console.log('[test] SUCCESS. All three deliverables produced cleanly.');

console.log('\n[test] Pipeline core is healthy. Now run the real thing:');
console.log('  export ANTHROPIC_API_KEY=sk-ant-...');
console.log('  export SEC_USER_AGENT="IPO Radar research@velociaventures.com"');
console.log('  node run-pipeline.js \\');
console.log('    --url "https://www.sec.gov/Archives/edgar/data/.../example-s1.htm" \\');
console.log('    --company "Example, Inc." --ticker EXMP \\');
console.log('    --filingDate "May 12, 2026" --editor "Alexandre Villela"');
