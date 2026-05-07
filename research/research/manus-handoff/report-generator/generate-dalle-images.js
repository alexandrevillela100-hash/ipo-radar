#!/usr/bin/env node
/**
 * IPO Radar — DALL-E image generator (hero + body images).
 *
 * Reads a filing.json that has v2-shape image prompts and generates
 * hyperrealistic editorial images via OpenAI's DALL-E 3 endpoint:
 *
 *   filing.meta.hero_prompt        → ./hero.png  (1792x1024 widescreen)
 *   filing.body_images.<key>.prompt → ./<key>.png (1792x1024 widescreen)
 *
 * The same `STYLE_TEMPLATE` wrap from the legacy generate-hero-image.js is
 * applied to every prompt so the entire report shares one consistent look:
 * teal + obsidian palette, cinematic studio lighting, editorial 3D render.
 *
 * After each image lands on disk, filing.json is patched in place with
 * the resolved relative paths, mirroring exactly what generate-svg-images.js
 * does — so the v1 and v2 renderers don't need to know which generator ran.
 *
 * Cost: at default quality "standard" 1792x1024, each image is ~$0.08.
 * A full run with 1 hero + 4 body images is ~$0.40. Set OPENAI_QUALITY=hd
 * to bump to ~$0.60 if you want sharper results.
 *
 * Idempotent: skips images that already exist on disk unless --force is set.
 *
 * Usage:
 *   node generate-dalle-images.js --filing path/to/filing.json --out path/to/outDir/
 *
 * Flags:
 *   --filing path     filing.json with meta.hero_prompt + body_images   (required)
 *   --out path        directory to write images to                       (required)
 *   --force           regenerate even if PNGs already exist
 *   --skip            no-op; emit a message and exit 0
 *
 * Env:
 *   OPENAI_API_KEY    required unless --skip
 *   OPENAI_MODEL      default "dall-e-3"
 *   OPENAI_QUALITY    default "standard" ("hd" doubles cost)
 *   OPENAI_SIZE       default "1792x1024" (widescreen — also valid: 1024x1024, 1024x1792)
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
    console.error(`[generate-dalle-images] missing required --${name}`);
    process.exit(2);
  }
  return args[name];
}

// ------------------------- HOUSE STYLE -------------------------

/**
 * The brand look — same wrap used by the legacy hero-only script.
 * Claude supplies the SUBJECT (the falcon, the DNA helix, the solar farm);
 * this template adds lighting + palette + composition so every IPO Radar
 * image looks like the same publication.
 *
 * Edit this string if the visual identity ever changes — single point of
 * truth for image house style.
 */
const STYLE_TEMPLATE = (subject) => [
  subject.trim().replace(/\.$/, '') + '.',
  'Hyperrealistic 3D render, photorealistic materials and textures.',
  'Cinematic studio lighting with strong rim light and warm gold accent highlights.',
  'Deep teal and obsidian-black color grade, subtle atmospheric haze in the background.',
  'Shallow depth of field, ultra-sharp focal subject, softly blurred background.',
  'Editorial business-magazine composition, 16:9 widescreen.',
  'No text, no logos, no watermarks, no people in frame.',
].join(' ');

// ------------------------- OPENAI CALL -------------------------

async function generateImage(prompt, sizeOverride) {
  const apiKey  = process.env.OPENAI_API_KEY;
  const model   = process.env.OPENAI_MODEL   || 'dall-e-3';
  const quality = process.env.OPENAI_QUALITY || 'standard';
  const size    = sizeOverride || process.env.OPENAI_SIZE || '1792x1024';

  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
      quality,
      response_format: 'url',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI image API ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const url = data && data.data && data.data[0] && data.data[0].url;
  if (!url) throw new Error('OpenAI response had no image URL: ' + JSON.stringify(data).slice(0, 500));
  return url;
}

async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

// ------------------------- TASK BUILDER -------------------------

/**
 * Build the list of (key, subject, dest) tuples we need to render.
 * Reads both v2 (hero_prompt, body_images.<key>.prompt) and v1
 * (heroPrompt) field shapes so we work with either schema.
 */
function buildTasks(filing, outDir) {
  const tasks = [];
  const meta = filing.meta || {};

  // Hero — v2 (hero_prompt) preferred, v1 (heroPrompt) fallback.
  const heroSubject = (meta.hero_prompt || meta.heroPrompt || '').trim();
  if (heroSubject.length >= 10) {
    tasks.push({
      key: 'hero',
      subject: heroSubject,
      dest: path.join(outDir, 'hero.png'),
    });
  } else {
    console.warn('[generate-dalle-images] no usable hero prompt found; skipping hero');
  }

  // Body images — v2 only.
  const bodyImgs = filing.body_images || {};
  for (const [key, val] of Object.entries(bodyImgs)) {
    if (!val || typeof val.prompt !== 'string') continue;
    const subject = val.prompt.trim();
    if (subject.length < 10) continue;
    tasks.push({
      key,
      subject,
      dest: path.join(outDir, `${key}.png`),
    });
  }

  return tasks;
}

// ------------------------- MAIN -------------------------

async function main() {
  if (args.skip) {
    console.log('[generate-dalle-images] --skip set, doing nothing');
    process.exit(0);
  }

  const filingPath = requireArg('filing');
  const outDir     = requireArg('out');
  fs.mkdirSync(outDir, { recursive: true });

  let filing = JSON.parse(fs.readFileSync(filingPath, 'utf8'));
  const tasks = buildTasks(filing, outDir);

  if (tasks.length === 0) {
    console.warn('[generate-dalle-images] no image tasks; nothing to do');
    process.exit(0);
  }

  console.log(`[generate-dalle-images] ${tasks.length} image(s) to generate`);

  // DALL-E rate-limits aggressively; we run sequentially rather than in
  // parallel. Total runtime is ~30s/image, so 5 images ≈ 2.5 minutes.
  let completed = 0, failed = 0;
  for (const t of tasks) {
    if (fs.existsSync(t.dest) && !args.force) {
      console.log(`[generate-dalle-images] ${t.key}: ${t.dest} exists; skipping (pass --force to regenerate)`);
      completed++;
      continue;
    }

    const fullPrompt = STYLE_TEMPLATE(t.subject);
    console.log(`[generate-dalle-images] ${t.key}: generating (subject=${t.subject.slice(0, 80)}…)`);

    try {
      const url = await generateImage(fullPrompt);
      const bytes = await downloadToFile(url, t.dest);
      console.log(`[generate-dalle-images] ${t.key}: wrote ${t.dest} (${bytes.toLocaleString()} bytes)`);
      completed++;
    } catch (e) {
      console.error(`[generate-dalle-images] ${t.key}: FAILED — ${e.message}`);
      failed++;
    }
  }

  // Patch filing.json with the resolved paths so the renderers find them.
  // Mirrors generate-svg-images.js so v1 + v2 renderers see the same shape.
  let patched = false;
  for (const t of tasks) {
    if (!fs.existsSync(t.dest)) continue;
    const rel = `./${path.basename(t.dest)}`;
    if (t.key === 'hero') {
      filing.meta = filing.meta || {};
      if (filing.meta.hero_image !== rel) { filing.meta.hero_image = rel; patched = true; }
      if (filing.meta.heroImage  !== rel) { filing.meta.heroImage  = rel; patched = true; }   // v1 alias
    } else {
      filing.body_images = filing.body_images || {};
      filing.body_images[t.key] = filing.body_images[t.key] || {};
      if (filing.body_images[t.key].path !== rel) {
        filing.body_images[t.key].path = rel;
        patched = true;
      }
    }
  }
  if (patched) {
    fs.writeFileSync(filingPath, JSON.stringify(filing, null, 2));
    console.log(`[generate-dalle-images] patched ${filingPath} with image paths`);
  }

  console.log(`[generate-dalle-images] done — ${completed} ok, ${failed} failed`);
  // Don't exit non-zero on partial failure: the renderers fall back to
  // placeholder strips for any missing images, so partial output is better
  // than no output.
  process.exit(0);
}

main().catch((e) => {
  console.error('[generate-dalle-images] fatal:', e.stack || e.message || e);
  process.exit(1);
});
