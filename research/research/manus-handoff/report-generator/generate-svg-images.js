#!/usr/bin/env node
/**
 * IPO Radar — body & hero image generator (Claude SVG, one-platform).
 *
 * Reads filing.json and, for each `body_images.<key>.prompt` (and the
 * top-level `meta.hero_prompt`), asks Claude to emit a self-contained
 * SVG that matches the Velocia editorial look — dark obsidian field,
 * teal accents, warm gold highlights. The SVG is written next to
 * filing.json, then rasterised to PNG via cairosvg so ReportLab can
 * embed it in the PDF (ImageReader doesn't grok SVG).
 *
 * After generation, filing.json is patched in place:
 *   meta.hero_image = "./hero.png"
 *   meta.heroImage  = "./hero.png"             (v1 alias for renderers)
 *   body_images[key].path = "./<key>.png"
 *   body_images[key].svg_path = "./<key>.svg"  (kept around for HTML)
 *
 * Idempotent: if `<key>.png` already exists, that key is skipped unless
 * --force is passed. Keeps cost down (~$0.01 per image, 5 images per
 * filing) and lets editors re-run after JSON tweaks without re-billing.
 *
 * Usage:
 *   node generate-svg-images.js --filing path/to/filing.json --out path/to/outDir/
 *
 * Flags:
 *   --filing path     filing.json with meta.hero_prompt + body_images   (required)
 *   --out path        directory to write *.svg / *.png to                (required)
 *   --force           regenerate even if PNG already exists
 *   --only key,key    only generate these keys (e.g. "hero,industry")
 *   --skip            no-op; emit a message and exit 0
 *
 * Env:
 *   ANTHROPIC_API_KEY   required unless --skip
 *   ANTHROPIC_MODEL     default "claude-sonnet-4-6"
 *   PYTHON              default "python3" (used to rasterise SVG → PNG)
 */

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ------------------------- ARGS -------------------------

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
    console.error(`[generate-svg-images] missing required --${name}`);
    process.exit(2);
  }
  return args[name];
}

// ------------------------- HOUSE STYLE -------------------------

/**
 * The same brand DNA as generate-hero-image.js but expressed as SVG
 * directives. Claude is good at composing layered <defs> gradients,
 * <filter> blurs, and abstract geometric shapes; it cannot produce
 * photorealistic SVG. We lean into that — abstract editorial geometry
 * over hyperrealism. The look is consistent with the dark Velocia site.
 */
const SYSTEM_PROMPT = `You are an editorial illustrator for Velocia Ventures' IPO research reports.

Generate ONE self-contained SVG that matches the brief. Strict rules:

PALETTE — use these exact colours and no others:
  background  #0B1410  (obsidian, the canvas — fills the whole viewBox)
  surface     #122019  (slightly lighter for layered shapes)
  rule        #1F3328  (subtle dividers)
  teal-light  #34D8AB
  teal        #00C896  (primary brand accent)
  teal-dark   #007F62
  gold        #D4AF37  (sparingly — highlights only, never fields)
  white       #F5F7F6  (typography only, never fills)
  muted       #6E8B7E  (secondary text, faint shapes)

COMPOSITION:
  - Solid #0B1410 background filling the entire viewBox.
  - Abstract editorial geometry only — no people, no faces, no logos, no readable text.
  - Layered geometric shapes (circles, hexagons, polylines, gradients, beziers) that
    metaphorically evoke the brief. Think "1970s Citi annual report cover meets
    modern data-viz" — clean, restrained, expensive-looking.
  - Use radial gradients and Gaussian blur filters for atmospheric depth.
  - Maximum ~12 shape elements. Minimal but layered.
  - 16:9 aspect — match the viewBox the brief gives you exactly.
  - NO bitmap images, NO <image> hrefs, NO external font references.

OUTPUT FORMAT:
  Reply with the raw SVG only — start with <svg ...> and end with </svg>.
  No prose, no markdown fences, no commentary. Just the SVG.

The SVG must be valid XML: every tag closed, attributes quoted, no JS, no scripts.`;

// ------------------------- CLAUDE CALL -------------------------

async function generateSvg({ subject, viewBox, label }) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  const userPrompt = `Image brief (${label}):
${subject}

viewBox: "0 0 ${viewBox.w} ${viewBox.h}"

Reply with the raw SVG only.`;

  console.log(`[generate-svg-images] ${label}: model=${model} subject="${subject.slice(0, 80)}…"`);

  const resp = await client.messages.create({
    model,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = resp.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  // Claude usually obeys "no fences" but be defensive.
  let svg = text.trim();
  const fence = svg.match(/```(?:xml|svg|html)?\s*([\s\S]*?)```/);
  if (fence) svg = fence[1].trim();

  const start = svg.indexOf('<svg');
  const end   = svg.lastIndexOf('</svg>');
  if (start < 0 || end < 0) {
    throw new Error(`Claude did not return a parseable SVG for ${label}: ${svg.slice(0, 200)}`);
  }
  return svg.slice(start, end + '</svg>'.length);
}

// ------------------------- SVG → PNG (cairosvg) -------------------------

function rasteriseSvgToPng({ svgPath, pngPath, width }) {
  const py = process.env.PYTHON || 'python3';
  // cairosvg is preinstalled in the workflow (added to pip install line);
  // for local dev: pip install cairosvg --break-system-packages
  const code = [
    'import sys, cairosvg',
    `cairosvg.svg2png(url=${JSON.stringify(svgPath)}, write_to=${JSON.stringify(pngPath)}, output_width=${width})`,
  ].join('; ');
  execFileSync(py, ['-c', code], { stdio: 'inherit' });
}

// ------------------------- TASK BUILDING -------------------------

/**
 * Hero is wider (1792x1024) so the cinematographic strip looks expansive.
 * Body images are framed panels in the document body — narrower 16:9 is fine.
 */
const VIEWBOX_HERO = { w: 1792, h: 1024 };
const VIEWBOX_BODY = { w: 1024, h: 576  };

function buildTasks(filing, outDir) {
  const meta = filing.meta || {};
  const tasks = [];

  // Hero — sourced from meta.hero_prompt (v2) or meta.heroPrompt (v1).
  const heroPrompt = meta.hero_prompt || meta.heroPrompt;
  if (heroPrompt && heroPrompt.trim().length >= 10) {
    tasks.push({
      key: 'hero',
      subject: heroPrompt.trim(),
      viewBox: VIEWBOX_HERO,
      svgPath: path.join(outDir, 'hero.svg'),
      pngPath: path.join(outDir, 'hero.png'),
      patch: (f) => {
        f.meta = f.meta || {};
        f.meta.hero_image = './hero.png';
        f.meta.heroImage  = './hero.png';   // v1 alias
      },
    });
  }

  // Body images — iterate filing.body_images.
  const bodyImgs = filing.body_images || {};
  for (const [key, info] of Object.entries(bodyImgs)) {
    if (!info || !info.prompt || info.prompt.trim().length < 10) continue;
    tasks.push({
      key,
      subject: info.prompt.trim(),
      viewBox: VIEWBOX_BODY,
      svgPath: path.join(outDir, `${key}.svg`),
      pngPath: path.join(outDir, `${key}.png`),
      patch: (f) => {
        f.body_images = f.body_images || {};
        f.body_images[key] = f.body_images[key] || {};
        f.body_images[key].path     = `./${key}.png`;
        f.body_images[key].svg_path = `./${key}.svg`;
      },
    });
  }

  return tasks;
}

// ------------------------- MAIN -------------------------

async function main() {
  if (args.skip) {
    console.log('[generate-svg-images] --skip set, doing nothing');
    process.exit(0);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[generate-svg-images] ANTHROPIC_API_KEY is not set; skipping image generation');
    process.exit(0);  // soft-skip — pipeline can continue with placeholder strips
  }

  const filingPath = requireArg('filing');
  const outDir     = requireArg('out');
  fs.mkdirSync(outDir, { recursive: true });

  let filing = JSON.parse(fs.readFileSync(filingPath, 'utf8'));
  let tasks = buildTasks(filing, outDir);

  if (args.only) {
    const wanted = new Set(String(args.only).split(',').map((s) => s.trim()));
    tasks = tasks.filter((t) => wanted.has(t.key));
  }

  if (!tasks.length) {
    console.log('[generate-svg-images] no image prompts found in filing.json; nothing to do');
    process.exit(0);
  }

  console.log(`[generate-svg-images] generating ${tasks.length} image(s): ${tasks.map((t) => t.key).join(', ')}`);

  // Run in parallel — each call is ~10-15s, no point serialising.
  const results = await Promise.allSettled(tasks.map(async (task) => {
    if (fs.existsSync(task.pngPath) && !args.force) {
      console.log(`[generate-svg-images] ${task.key}: ${task.pngPath} exists, skipping (--force to regenerate)`);
      return { task, ok: true, skipped: true };
    }
    try {
      const svg = await generateSvg({ subject: task.subject, viewBox: task.viewBox, label: task.key });
      fs.writeFileSync(task.svgPath, svg);
      console.log(`[generate-svg-images] ${task.key}: wrote ${task.svgPath} (${svg.length.toLocaleString()} bytes)`);
      try {
        rasteriseSvgToPng({ svgPath: task.svgPath, pngPath: task.pngPath, width: task.viewBox.w });
        console.log(`[generate-svg-images] ${task.key}: rasterised → ${task.pngPath}`);
      } catch (e) {
        console.error(`[generate-svg-images] ${task.key}: cairosvg rasterise failed: ${e.message}`);
        // SVG is still on disk; HTML will use it. PDF will fall back to placeholder strip.
        return { task, ok: true, pngFailed: true };
      }
      return { task, ok: true };
    } catch (e) {
      console.error(`[generate-svg-images] ${task.key}: ${e.message}`);
      return { task, ok: false, error: e.message };
    }
  }));

  // Patch filing.json with paths for every task whose PNG (or at least SVG)
  // was produced. We re-read here in case anything else mutated the file.
  filing = JSON.parse(fs.readFileSync(filingPath, 'utf8'));
  let patched = 0;
  for (const r of results) {
    const v = r.status === 'fulfilled' ? r.value : null;
    if (!v || !v.ok) continue;
    if (v.pngFailed) continue;     // don't lie about a PNG that doesn't exist
    v.task.patch(filing);
    patched++;
  }
  fs.writeFileSync(filingPath, JSON.stringify(filing, null, 2));
  console.log(`[generate-svg-images] patched ${patched} image path(s) into ${filingPath}`);

  const fails = results.filter((r) => r.status !== 'fulfilled' || !r.value.ok);
  if (fails.length) {
    console.error(`[generate-svg-images] ${fails.length} task(s) failed; pipeline continues with partial images`);
  }
}

main().catch((e) => {
  console.error('[generate-svg-images] failed:', e.stack || e.message || e);
  process.exit(1);
});
