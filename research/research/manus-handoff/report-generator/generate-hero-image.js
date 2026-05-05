#!/usr/bin/env node
/**
 * IPO Radar — hero image generator.
 *
 * Takes a filing.json that has `meta.heroPrompt` populated by Claude and
 * generates a 1792x1024 hero image via OpenAI's DALL-E 3 HD endpoint.
 *
 * The image is written to `<outDir>/hero.png` and the filing JSON is
 * patched in place so that `meta.heroImage` points at `./hero.png`
 * (relative path — both the initiation report and the fact sheet sit in
 * the same out folder, so a relative reference works for both).
 *
 * Idempotent: if `<outDir>/hero.png` already exists we skip the API call
 * unless `--force` is passed. This matters for cost (~$0.08 / call) and
 * for editor re-runs after JSON tweaks.
 *
 * Usage:
 *   node generate-hero-image.js --filing path/to/filing.json --out path/to/outDir/
 *
 * Flags:
 *   --filing path     filing.json that includes meta.heroPrompt           (required)
 *   --out path        directory to write hero.png to                      (required)
 *   --force           regenerate even if hero.png already exists
 *   --skip            no-op; emit a message and exit 0 (for orchestrators
 *                     that always invoke this step but want to disable it)
 *
 * Env:
 *   OPENAI_API_KEY    required unless --skip is set
 *   OPENAI_MODEL      default "dall-e-3"
 *   OPENAI_QUALITY    default "hd"   ("standard" is half the price)
 *   OPENAI_SIZE       default "1792x1024" (16:9 — matches the hero crop)
 *
 * The "house style" wrapping is locked in this file, intentionally. Claude
 * supplies the subject of the image (the falcon, the DNA helix, the solar
 * farm) — we add the lighting / palette / aesthetic so every hero feels
 * like the same publication. If the editor wants a different look across
 * the whole product they edit STYLE_TEMPLATE here, not the per-filing JSON.
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
    console.error(`[generate-hero-image] missing required --${name}`);
    process.exit(2);
  }
  return args[name];
}

// ------------------------- HOUSE STYLE -------------------------

/**
 * The brand look: teal + obsidian + warm gold accents, cinematic lighting,
 * editorial magazine register. Claude gives us SUBJECT; we wrap it with
 * the look so every IPO Radar hero matches.
 *
 * If the look ever needs to change (different palette, painterly style,
 * etc.), this string is the single point of edit.
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

async function generateImage(prompt) {
  const apiKey  = process.env.OPENAI_API_KEY;
  const model   = process.env.OPENAI_MODEL   || 'dall-e-3';
  const quality = process.env.OPENAI_QUALITY || 'hd';
  const size    = process.env.OPENAI_SIZE    || '1792x1024';

  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  console.log(`[generate-hero-image] model=${model} quality=${quality} size=${size}`);
  console.log(`[generate-hero-image] prompt (${prompt.length} chars): ${prompt.slice(0, 140)}…`);

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

// ------------------------- MAIN -------------------------

async function main() {
  if (args.skip) {
    console.log('[generate-hero-image] --skip set, doing nothing');
    process.exit(0);
  }

  const filingPath = requireArg('filing');
  const outDir     = requireArg('out');

  const filing = JSON.parse(fs.readFileSync(filingPath, 'utf8'));
  const meta   = filing.meta || {};
  const ticker = (meta.ticker || 'unknown').toLowerCase();

  if (!meta.heroPrompt || typeof meta.heroPrompt !== 'string' || meta.heroPrompt.trim().length < 10) {
    console.error('[generate-hero-image] filing.meta.heroPrompt is missing or too short. Cannot generate image.');
    console.error('  Expected a 25–35 word subject prompt produced by Claude (see filing-schema.md).');
    process.exit(2);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const heroPath = path.join(outDir, 'hero.png');

  if (fs.existsSync(heroPath) && !args.force) {
    console.log(`[generate-hero-image] ${heroPath} already exists; skipping (pass --force to regenerate)`);
    // Still patch filing.json so meta.heroImage points at the existing file.
    if (filing.meta.heroImage !== './hero.png') {
      filing.meta.heroImage = './hero.png';
      fs.writeFileSync(filingPath, JSON.stringify(filing, null, 2));
      console.log(`[generate-hero-image] patched ${filingPath} → meta.heroImage = "./hero.png"`);
    }
    process.exit(0);
  }

  const fullPrompt = STYLE_TEMPLATE(meta.heroPrompt);

  let imageUrl;
  try {
    imageUrl = await generateImage(fullPrompt);
  } catch (e) {
    console.error(`[generate-hero-image] generation failed for ${ticker}: ${e.message}`);
    // Don't kill the pipeline — the renderer falls back to the Unsplash
    // placeholder when meta.heroImage is missing. Surface it loudly though.
    process.exit(1);
  }

  const bytes = await downloadToFile(imageUrl, heroPath);
  console.log(`[generate-hero-image] wrote ${heroPath} (${bytes.toLocaleString()} bytes)`);

  filing.meta.heroImage = './hero.png';
  fs.writeFileSync(filingPath, JSON.stringify(filing, null, 2));
  console.log(`[generate-hero-image] patched ${filingPath} → meta.heroImage = "./hero.png"`);
}

main().catch((e) => {
  console.error('[generate-hero-image] failed:', e.stack || e.message || e);
  process.exit(1);
});
