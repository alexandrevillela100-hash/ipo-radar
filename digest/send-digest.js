#!/usr/bin/env node
/**
 * IPO Radar — daily digest sender.
 *
 * Queries Sanity for the previous day's filings, filters to "real events"
 * (S-1, F-1, 424B, RW — amendments are intentionally skipped to keep the
 * daily quiet), renders the email via template.js, and sends via Resend.
 *
 * Designed to run once a day from a GitHub Actions cron, the morning
 * after the EDGAR poller has populated Sanity.
 *
 * Behaviour:
 *   - Zero matching filings → log and exit 0 (silent no-op, no email).
 *   - --dryRun                → render and log subject + HTML preview, no send.
 *   - --date YYYY-MM-DD       → override which day to digest (default: yesterday).
 *   - --to "a@x.com,b@y.com"  → override recipient list (default: DIGEST_RECIPIENTS).
 *
 * Required env (always):
 *   SANITY_PROJECT_ID         e.g. "8896dke9"
 *   SANITY_DATASET            typically "production"
 *
 * Required env (only when actually sending):
 *   RESEND_API_KEY            from resend.com → API Keys
 *   DIGEST_RECIPIENTS         comma-separated email addresses
 *
 * Optional env:
 *   SANITY_API_VERSION        defaults to "2024-10-01"
 *   DIGEST_FROM               defaults to "IPO Radar <onboarding@resend.dev>"
 *                             (works without a verified domain — change once
 *                             you verify e.g. "digest@iporadar.com")
 *   FACTSHEET_BASE            defaults to "https://iporadar-jxwaypt6.manus.space"
 *
 * Usage:
 *   node send-digest.js                        # send yesterday's digest
 *   node send-digest.js --dryRun               # render + log, do not send
 *   node send-digest.js --date 2026-04-30      # send a specific day's digest
 *   node send-digest.js --to me@example.com    # override recipient list
 */

const { renderDigest } = require('./template');

// ─── Constants ────────────────────────────────────────────────────────

// The four "real event" filing types. Amendments (S-1/A, F-1/A) are
// deliberately excluded — they're rolled into the weekly Week Ahead so
// the daily stays quiet enough that subscribers actually read it.
const DAILY_TRIGGER_TYPES = ['S-1', 'F-1', '424B', 'RW'];

const DEFAULT_FACTSHEET_BASE = 'https://iporadar-jxwaypt6.manus.space';
const DEFAULT_FROM = 'IPO Radar <onboarding@resend.dev>';

// ─── Args ─────────────────────────────────────────────────────────────

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

// ─── Date helpers ─────────────────────────────────────────────────────

// "Yesterday" in US/Eastern — EDGAR is an Eastern-time agency, and the
// poller fires at 22:00 UTC (6pm ET) so by the time the digest runs the
// next morning, "yesterday" in ET is what subscribers expect to see.
function yesterdayEastern() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // Subtract 24h from "now" then format in ET. en-CA gives YYYY-MM-DD.
  const dayMs = 24 * 60 * 60 * 1000;
  return fmt.format(new Date(Date.now() - dayMs));
}

function targetDate() {
  if (args.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      console.error(`[send-digest] --date must be YYYY-MM-DD, got: ${args.date}`);
      process.exit(2);
    }
    return args.date;
  }
  return yesterdayEastern();
}

// ─── Env ──────────────────────────────────────────────────────────────

function envOrDie(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[send-digest] missing required env var: ${name}`);
    process.exit(2);
  }
  return v;
}

function recipientList() {
  if (args.to) {
    return String(args.to).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }
  const raw = process.env.DIGEST_RECIPIENTS;
  if (!raw) {
    console.error('[send-digest] missing DIGEST_RECIPIENTS env var (and no --to flag)');
    process.exit(2);
  }
  return raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

// ─── Sanity ───────────────────────────────────────────────────────────

let _sanityClient = null;
function getSanity() {
  if (_sanityClient) return _sanityClient;
  const { createClient } = require('@sanity/client');
  _sanityClient = createClient({
    projectId: envOrDie('SANITY_PROJECT_ID'),
    dataset: envOrDie('SANITY_DATASET'),
    apiVersion: process.env.SANITY_API_VERSION || '2024-10-01',
    // No token needed for read-only public data, and we don't write.
    useCdn: false, // fresh state — the poller may have written minutes ago.
    perspective: 'published',
  });
  return _sanityClient;
}

async function fetchFilingsForDate(date) {
  const client = getSanity();
  // Inline the trigger-type list as a parameter so the GROQ stays clean.
  const query = `*[_type == "filing" && filingDate == $date && filingType in $types]{
    _id,
    companyName,
    ticker,
    exchange,
    industry,
    filingType,
    filingDate,
    status,
    cik,
    accessionNumber,
    edgarUrl,
    reportSlug
  }`;
  return client.fetch(query, { date, types: DAILY_TRIGGER_TYPES });
}

// ─── Resend ───────────────────────────────────────────────────────────

async function sendViaResend({ apiKey, from, to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${body.slice(0, 500)}`);
  }
  let parsed = null;
  try { parsed = JSON.parse(body); } catch (_) { /* shrug */ }
  return parsed || { raw: body };
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const date = targetDate();
  console.log(`[send-digest] target date: ${date} (${args.date ? 'override' : 'yesterday in ET'})`);

  const all = await fetchFilingsForDate(date);
  console.log(`[send-digest] Sanity returned ${all.length} filing(s) on ${date}`);

  // The GROQ query already filters by filingType, but we double-check
  // here so future maintainers can grep for the rule and find both
  // enforcement points.
  const filings = all.filter(function (f) {
    return DAILY_TRIGGER_TYPES.indexOf(f.filingType) !== -1;
  });

  if (filings.length === 0) {
    console.log('[send-digest] no trigger-type filings — silent no-op, no email sent.');
    return;
  }

  const factSheetBase = process.env.FACTSHEET_BASE || DEFAULT_FACTSHEET_BASE;
  const { subject, html, text } = renderDigest({ date, filings, factSheetBase });

  console.log(`[send-digest] subject: ${subject}`);
  console.log(`[send-digest] sections: initial=${filings.filter(function (f) { return f.filingType === 'S-1' || f.filingType === 'F-1'; }).length}, pricing=${filings.filter(function (f) { return f.filingType === '424B'; }).length}, withdrawn=${filings.filter(function (f) { return f.filingType === 'RW'; }).length}`);

  if (args.dryRun) {
    console.log('[send-digest] --dryRun set; not sending.');
    console.log(`[send-digest] HTML length: ${html.length} chars, text length: ${text.length} chars.`);
    console.log('[send-digest] HTML preview (first 800 chars):');
    console.log(html.slice(0, 800));
    return;
  }

  const apiKey = envOrDie('RESEND_API_KEY');
  const from = process.env.DIGEST_FROM || DEFAULT_FROM;
  const to = recipientList();

  console.log(`[send-digest] sending to ${to.length} recipient(s) via Resend...`);
  const result = await sendViaResend({ apiKey, from, to, subject, html, text });
  console.log(`[send-digest] sent. Resend id: ${result.id || '(unknown)'}`);
}

main().catch(function (err) {
  console.error('[send-digest] failed:', err.stack || err.message || err);
  process.exit(1);
});
