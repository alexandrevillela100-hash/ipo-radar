# IPO Radar — Daily Digest

Sends a daily email summarising yesterday's SEC filings to a list of
subscribers. Decoupled from the EDGAR poller so failures don't cascade.

## What it does

Once a day at 11:00 UTC (~7am ET, before market open), a GitHub Actions
cron runs `digest/send-digest.js`. The script:

1. Computes "yesterday" in US/Eastern time.
2. Queries Sanity for filings on that date.
3. Filters to **trigger types only**: `S-1`, `F-1`, `424B`, `RW`.
4. **If zero matching filings, exits silently with no email sent.**
   Most weekdays will have at least one event; days with nothing
   material to report don't generate noise.
5. Renders the digest HTML using `template.js` (Velocia-branded,
   email-safe markup, plain-text fallback).
6. Sends via the Resend REST API to all addresses in
   `DIGEST_RECIPIENTS`.

## Trigger rule (and why)

| Filing type   | Daily?   | Why                                              |
| ------------- | -------- | ------------------------------------------------ |
| `S-1`, `F-1`  | yes      | New IPO — material, infrequent, worth surfacing. |
| `424B`        | yes      | Pricing announcement — IPO is going to trade.    |
| `RW`          | yes      | Withdrawal — company pulled the offering.        |
| `S-1/A`, `F-1/A` | **no**   | Amendments are noisy. They roll into the weekly. |

The rule is enforced in two places — the GROQ query and a JS filter —
on purpose. Future maintainers can grep `DAILY_TRIGGER_TYPES` and find
both enforcement points.

## Files

| Path                       | Purpose                                          |
| -------------------------- | ------------------------------------------------ |
| `digest/send-digest.js`    | Main script. Sanity query + Resend send.         |
| `digest/template.js`       | Pure HTML renderer. No I/O. Safe to unit test.   |
| `.github/workflows/send-digest.yml` | Daily cron at 11:00 UTC.                |

## Required GitHub secrets

Add these in the `ipo-radar` repo settings → **Secrets and variables**
→ **Actions**:

| Secret              | What it is                                            |
| ------------------- | ----------------------------------------------------- |
| `SANITY_PROJECT_ID` | Already set for the poller. Reused.                   |
| `SANITY_DATASET`    | Already set for the poller. Reused.                   |
| `RESEND_API_KEY`    | From [resend.com](https://resend.com) → API Keys.     |
| `DIGEST_RECIPIENTS` | Comma-separated email list, e.g. `a@x.com,b@y.com`.   |

Optional secrets:

| Secret           | Default                                       | Set when |
| ---------------- | --------------------------------------------- | -------- |
| `DIGEST_FROM`    | `IPO Radar <onboarding@resend.dev>`           | After verifying a sending domain in Resend, set to `IPO Radar <digest@iporadar.com>`. |
| `FACTSHEET_BASE` | `https://iporadar-jxwaypt6.manus.space`       | When the Fact Sheet renderer is moved off Manus and onto our own infra. |

## Local testing

You can dry-run the whole thing without sending any email:

```bash
# Render and log yesterday's digest, no send.
SANITY_PROJECT_ID=8896dke9 SANITY_DATASET=production \
  npm run digest:dry

# Render a specific past day (useful when nothing happened yesterday).
SANITY_PROJECT_ID=8896dke9 SANITY_DATASET=production \
  node digest/send-digest.js --date 2026-04-30 --dryRun

# Live send to a single test address (override DIGEST_RECIPIENTS).
SANITY_PROJECT_ID=8896dke9 SANITY_DATASET=production \
  RESEND_API_KEY=re_... \
  node digest/send-digest.js --to me@example.com
```

## Manual triggering from GitHub

If you want to send (or re-send) a specific day's digest by hand:

1. Open the **Actions** tab in the `ipo-radar` repo on GitHub.
2. Click **Daily digest** in the left sidebar.
3. Click **Run workflow** (top-right).
4. Optional: enter a date (`YYYY-MM-DD`) to digest a specific day.
5. Optional: tick the dry-run box if you want to preview without sending.
6. Click **Run workflow**.

## Adding or removing recipients

Edit the `DIGEST_RECIPIENTS` GitHub secret. The value is a single
comma-separated string with no spaces:

```
alice@example.com,bob@example.com,carol@example.com
```

No code changes required — the next scheduled run picks up the change.

## Future migrations

- **Verified sending domain** — once `iporadar.com` is verified in
  Resend, set `DIGEST_FROM` and the from-address moves off the
  shared `resend.dev` domain. Better deliverability, no code change.
- **Beehiiv / managed newsletter** — if subscriber growth justifies
  paying for Beehiiv Scale, swap `sendViaResend()` in
  `send-digest.js` for a Beehiiv Posts API call. The template and
  trigger logic don't change.
- **Insourced Fact Sheets** — when we host Fact Sheets at
  `iporadar.com/ipo/{slug}` instead of Manus, set the `FACTSHEET_BASE`
  secret. No code change.
