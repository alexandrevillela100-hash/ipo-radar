#!/usr/bin/env node
/**
 * IPO Radar — publish a rendered initiation report bundle to Sanity. (v2)
 *
 * v2 changes from the original publish-report.js:
 *   - Now also uploads the Fact Sheet HTML asset (factSheetHtmlAsset
 *     field on initiationReport doc), if present in the input directory.
 *   - Image src= rewriting now also rewrites <img> tags inside the fact
 *     sheet HTML, using the SAME image asset URLs as the long-form
 *     report (so both artifacts share the cinematographic hero).
 *
 * Reads a report directory (the output of run-pipeline.js + render_factsheet.py),
 * e.g. /research/research/manus-handoff/out/psus/ containing:
 *
 *   filing.json                  — extracted v2 schema
 *   <ticker>-v2-report.html      — rendered long-form HTML
 *   <ticker>-v2-report.pdf       — rendered long-form PDF
 *   <ticker>-v2-factsheet.html   — rendered one-pager HTML  (NEW)
 *   hero.png + body images       — assets referenced from BOTH HTMLs
 *
 * Pipeline:
 *   1. Upload each PNG (hero + body images) → Sanity image assets, collect URLs
 *   2. Rewrite <img src="./X.png"> in BOTH the long-form HTML and the fact
 *      sheet HTML to the matching Sanity CDN URLs
 *   3. Upload rewritten long-form HTML → Sanity file asset
 *   4. Upload rewritten fact sheet HTML → Sanity file asset (NEW)
 *   5. Upload PDF → Sanity file asset
 *   6. Look up the matching `filing` document by accessionNumber
 *   7. Upsert `initiationReport` doc (now with both htmlAsset and
 *      factSheetHtmlAsset fields populated)
 *   8. Patch the filing's reportSlug → calendar tile + digest start linking
 *
 * Idempotent: re-running with the same ticker overwrites assets and
 * patches the existing report doc in place. Use --dryRun to preview.
 *
 * Usage:
 *   node publish-report.js --in path/to/out/<ticker>/ [--dryRun]
 *
 * Required env (unchanged from v1):
 *   SANITY_PROJECT_ID    — defaults to "8896dke9"
 *   SANITY_DATASET       — defaults to "production"
 *   SANITY_API_VERSION   — defaults to "2024-10-01"
 *   SANITY_TOKEN         — write-scoped token. Required.
 */

const fs   = require('fs');
const path = require('path');

// ------------------------- ARGS -------------------------

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) {
      const key = k.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) { a[key] = true; }
      else { a[key] = next; i++; }
    }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
function requireArg(n) {
  if (!args[n]) { console.error(`[publish-report] missing required --${n}`); process.exit(2); }
  return args[n];
}

// ------------------------- SANITY CLIENT (no SDK) -------------------------

const PROJECT_ID  = process.env.SANITY_PROJECT_ID  || '8896dke9';
const DATASET     = process.env.SANITY_DATASET     || 'production';
const API_VERSION = process.env.SANITY_API_VERSION || '2024-10-01';
const TOKEN       = process.env.SANITY_TOKEN;

const API_BASE     = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}`;
const ASSETS_BASE  = `${API_BASE}/assets`;
const MUTATE_BASE  = `${API_BASE}/data/mutate/${DATASET}`;
const QUERY_BASE   = `${API_BASE}/data/query/${DATASET}`;

function authHeaders(extra = {}) {
  if (!TOKEN) throw new Error('SANITY_TOKEN is not set (write token required)');
  return { Authorization: `Bearer ${TOKEN}`, ...extra };
}

async function uploadAsset(kind, filePath, filename) {
  const buf = fs.readFileSync(filePath);
  const ct  = guessContentType(filePath);
  const url = `${ASSETS_BASE}/${kind}/${DATASET}?filename=${encodeURIComponent(filename)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': ct }),
    body: buf,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`asset upload ${res.status} for ${filename}: ${txt.slice(0, 500)}`);
  }
  const j = await res.json();
  return j.document;
}

function guessContentType(p) {
  const ext = path.extname(p).toLowerCase();
  switch (ext) {
    case '.png':  return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.svg':  return 'image/svg+xml';
    case '.html': return 'text/html; charset=utf-8';
    case '.pdf':  return 'application/pdf';
    case '.json': return 'application/json';
    default:      return 'application/octet-stream';
  }
}

async function query(groq, params = {}) {
  const url = `${QUERY_BASE}?query=${encodeURIComponent(groq)}` +
    Object.entries(params).map(([k, v]) =>
      `&%24${encodeURIComponent(k)}=${encodeURIComponent(JSON.stringify(v))}`).join('');
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`query ${res.status}: ${(await res.text()).slice(0, 500)}`);
  return (await res.json()).result;
}

async function mutate(mutations) {
  const res = await fetch(MUTATE_BASE, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ mutations }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`mutate ${res.status}: ${txt.slice(0, 500)}`);
  }
  return await res.json();
}

// ------------------------- HTML REWRITE -------------------------

function rewriteHtmlImageSrcs(html, keyToCdnUrl) {
  const re = /src="\.\/([^"]+\.png)"/g;
  const rewrites = [];
  const out = html.replace(re, (full, fname) => {
    const key = fname.replace(/\.png$/, '');
    const cdn = keyToCdnUrl[key];
    if (!cdn) return full;
    rewrites.push({ key, oldSrc: `./${fname}`, newSrc: cdn });
    return `src="${cdn}"`;
  });
  return { html: out, rewrites };
}

// ------------------------- MAIN -------------------------

async function main() {
  const inDir = requireArg('in');
  const dryRun = !!args.dryRun;

  if (!fs.existsSync(inDir) || !fs.statSync(inDir).isDirectory()) {
    console.error(`[publish-report] --in path is not a directory: ${inDir}`);
    process.exit(2);
  }

  const filingPath = path.join(inDir, 'filing.json');
  if (!fs.existsSync(filingPath)) {
    console.error(`[publish-report] filing.json not found in ${inDir}`);
    process.exit(2);
  }
  const filing = JSON.parse(fs.readFileSync(filingPath, 'utf8'));
  const meta = filing.meta || {};
  const ticker = (meta.ticker || '').trim();
  if (!ticker) { console.error('[publish-report] filing.meta.ticker missing'); process.exit(2); }
  const slug = ticker.toLowerCase();

  function findOne(patterns) {
    const files = fs.readdirSync(inDir);
    for (const re of patterns) {
      const m = files.find((f) => re.test(f));
      if (m) return path.join(inDir, m);
    }
    return null;
  }
  const htmlPath = findOne([new RegExp(`^${slug}-v2-report\\.html$`, 'i'), /-v2-report\.html$/i]);
  const pdfPath  = findOne([new RegExp(`^${slug}-v2-report\\.pdf$`,  'i'), /-v2-report\.pdf$/i]);
  // NEW — find the fact sheet HTML if it exists.
  const factSheetPath = findOne([
    new RegExp(`^${slug}-v2-factsheet\\.html$`, 'i'),
    /-v2-factsheet\.html$/i,
    /^factsheet\.html$/i,
  ]);

  if (!htmlPath || !fs.existsSync(htmlPath)) {
    console.error(`[publish-report] long-form HTML report not found in ${inDir}`); process.exit(2);
  }

  console.log(`[publish-report] ticker=${ticker} slug=${slug}`);
  console.log(`[publish-report] long-form html=${htmlPath}`);
  console.log(`[publish-report] long-form pdf=${pdfPath || '(none)'}`);
  console.log(`[publish-report] fact sheet html=${factSheetPath || '(none — skipping)'}`);

  const imageTasks = [];
  const heroFile = path.join(inDir, 'hero.png');
  if (fs.existsSync(heroFile)) imageTasks.push({ key: 'hero', file: heroFile });

  for (const k of Object.keys(filing.body_images || {})) {
    const f = path.join(inDir, `${k}.png`);
    if (fs.existsSync(f)) imageTasks.push({ key: k, file: f });
  }

  console.log(`[publish-report] images to upload: ${imageTasks.map((t) => t.key).join(', ') || '(none)'}`);

  if (dryRun) {
    console.log('[publish-report] --dryRun set, exiting before upload');
    return;
  }

  // ─── 1. Upload images ────────────────────────────────────────
  const keyToCdnUrl = {};
  const keyToAssetId = {};
  for (const t of imageTasks) {
    const fname = `${slug}-${t.key}.png`;
    console.log(`[publish-report] uploading image ${t.key} (${fname})`);
    const doc = await uploadAsset('images', t.file, fname);
    keyToCdnUrl[t.key]  = doc.url;
    keyToAssetId[t.key] = doc._id;
    console.log(`[publish-report]   → ${doc.url}`);
  }

  // ─── 2. Rewrite long-form HTML and upload ────────────────────
  const rawHtml = fs.readFileSync(htmlPath, 'utf8');
  const { html: rewrittenHtml, rewrites } = rewriteHtmlImageSrcs(rawHtml, keyToCdnUrl);
  console.log(`[publish-report] long-form: rewrote ${rewrites.length} <img src>`);

  const tmpHtml = path.join(inDir, `.publish-${slug}.html`);
  fs.writeFileSync(tmpHtml, rewrittenHtml);
  const htmlAsset = await uploadAsset('files', tmpHtml, `${slug}-v2-report.html`);
  fs.unlinkSync(tmpHtml);
  console.log(`[publish-report] uploaded long-form HTML: ${htmlAsset.url}`);

  // ─── 3. Rewrite fact sheet HTML and upload (NEW) ─────────────
  let factSheetAssetId = null;
  if (factSheetPath && fs.existsSync(factSheetPath)) {
    const rawFs = fs.readFileSync(factSheetPath, 'utf8');
    const { html: rewrittenFs, rewrites: fsRewrites } = rewriteHtmlImageSrcs(rawFs, keyToCdnUrl);
    console.log(`[publish-report] fact sheet: rewrote ${fsRewrites.length} <img src>`);

    const tmpFs = path.join(inDir, `.publish-${slug}-fs.html`);
    fs.writeFileSync(tmpFs, rewrittenFs);
    const fsAsset = await uploadAsset('files', tmpFs, `${slug}-v2-factsheet.html`);
    fs.unlinkSync(tmpFs);
    factSheetAssetId = fsAsset._id;
    console.log(`[publish-report] uploaded fact sheet HTML: ${fsAsset.url}`);
  }

  // ─── 4. Upload PDF ───────────────────────────────────────────
  let pdfAssetId = null;
  if (pdfPath && fs.existsSync(pdfPath)) {
    const pdfAsset = await uploadAsset('files', pdfPath, `${slug}-v2-report.pdf`);
    pdfAssetId = pdfAsset._id;
    console.log(`[publish-report] uploaded PDF: ${pdfAsset.url}`);
  }

  // ─── 5. Look up source filing ────────────────────────────────
  let filingRefId = null;
  const accession = meta.accession_number || meta.accessionNumber;
  if (accession) {
    const found = await query(
      `*[_type == "filing" && accessionNumber == $acc][0]{_id}`,
      { acc: accession }
    );
    if (found && found._id) {
      filingRefId = found._id;
      console.log(`[publish-report] linked to filing ${filingRefId} (accession=${accession})`);
    } else {
      console.warn(`[publish-report] no filing doc found for accession ${accession}`);
    }
  } else {
    console.warn('[publish-report] filing.json has no accession_number; cannot link to filing doc');
  }

  // ─── 6. Upsert the initiationReport document ─────────────────
  const reportId = `report-${slug}`;
  const heroAssetId = keyToAssetId['hero'] || null;
  const bodyImagesArr = Object.keys(keyToAssetId)
    .filter((k) => k !== 'hero')
    .map((k) => ({
      _key: k,
      _type: 'bodyImage',
      key: k,
      image: { _type: 'image', asset: { _type: 'reference', _ref: keyToAssetId[k] } },
    }));

  const headline = meta.headline || filing.lede_quote || '';
  const summary  = filing.summary_paragraph || '';
  const rating   = (filing.rating && filing.rating.label) || meta.rating || null;
  const ipo      = filing.ipo || {};
  const valuation = filing.valuation || {};

  const reportDoc = {
    _id: reportId,
    _type: 'initiationReport',
    ticker,
    companyName: meta.company_name || meta.company || '',
    slug: { _type: 'slug', current: slug },
    htmlAsset: { _type: 'file', asset: { _type: 'reference', _ref: htmlAsset._id } },
    ...(pdfAssetId ? { pdfAsset: { _type: 'file', asset: { _type: 'reference', _ref: pdfAssetId } } } : {}),
    // NEW — fact sheet HTML asset, if rendered
    ...(factSheetAssetId ? { factSheetHtmlAsset: { _type: 'file', asset: { _type: 'reference', _ref: factSheetAssetId } } } : {}),
    ...(heroAssetId ? { heroImage: { _type: 'image', asset: { _type: 'reference', _ref: heroAssetId } } } : {}),
    bodyImages: bodyImagesArr,
    headline,
    summary,
    ...(rating ? { rating: String(rating).toUpperCase() } : {}),
    ...(typeof valuation.price_target_12mo === 'number' ? { priceTarget: valuation.price_target_12mo } : {}),
    ...(typeof ipo.price_mid === 'number' ? { ipoPriceMid: ipo.price_mid } : {}),
    ...(typeof valuation.price_target_12mo === 'number' && typeof ipo.price_mid === 'number'
        ? { implicitReturnPct: Math.round(((valuation.price_target_12mo / ipo.price_mid) - 1) * 1000) / 10 }
        : {}),
    publishedAt: new Date().toISOString(),
    status: 'published',
    analystName: meta.analyst_name || 'Alexandre Villela',
    renderVersion: 'v2',
    ...(filingRefId ? { filing: { _type: 'reference', _ref: filingRefId } } : {}),
  };

  console.log(`[publish-report] upserting initiationReport ${reportId}`);
  await mutate([{ createOrReplace: reportDoc }]);

  // ─── 7. Patch the source filing's reportSlug ─────────────────
  if (filingRefId) {
    console.log(`[publish-report] patching filing.reportSlug → ${slug}`);
    await mutate([{ patch: { id: filingRefId, set: { reportSlug: slug } } }]);
  }

  const factSheetNote = factSheetAssetId ? ' + fact sheet' : '';
  console.log(`[publish-report] done — report${factSheetNote} published at /reports/${slug}`);
}

main().catch((e) => {
  console.error('[publish-report] fatal:', e.stack || e.message || e);
  process.exit(1);
});
