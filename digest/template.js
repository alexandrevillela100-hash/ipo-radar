/**
 * IPO Radar — daily digest email template.
 *
 * Pure-function HTML renderer. No I/O, no env vars, no Sanity calls — give
 * it a date and an array of filings, get back { subject, html, text }.
 * Keeping it pure means we can unit-test the rendering by piping fixture
 * data in, no network needed.
 *
 * Brand language is mirrored from ipo-radar-email-mockup.html: dark ink-
 * green page, Cormorant Garamond display, DM Mono uppercase eyebrows,
 * Barlow body, soft teal #5BB9B3 accent. Every styling decision matches
 * the original mockup's tokens so the daily digest reads as the same
 * publication as a single-filing announcement, just multi-event shaped.
 *
 * Email-rendering caveats baked in:
 *   - Tables for layout (Outlook ignores flex/grid).
 *   - Inline styles on every element (most clients strip <style>).
 *   - <style> block in <head> for @import-ed Google Fonts and media
 *     queries — Apple Mail / iOS Mail / Gmail web honour it; Outlook
 *     desktop falls back gracefully to the inline serif/sans/mono stacks.
 *   - 640px max-width container, 48px side padding (mockup parity).
 *   - color-scheme: dark — signals to Gmail/Apple not to invert in
 *     light-mode UI (we want the dark look in both modes).
 */

// ── Brand tokens (lifted verbatim from ipo-radar-email-mockup.html) ──
const COLOR = {
  bg:         '#0A1514',  // page background — deepest ink-green
  hairline:   '#1F2E2C',  // 1px dividers everywhere
  fg:         '#E8EDE9',  // primary text (headlines)
  body:       '#CDD6D1',  // body copy
  bodyMute:   '#A8B8B2',  // lead/dek text
  mute:       '#7A8B85',  // mono labels, metadata
  fineprint:  '#5A6964',  // disclaimer
  teal:       '#5BB9B3',  // primary accent (NOT the calendar's #03c8b5 —
                          // the email mockup uses a softer, more muted
                          // teal that reads better against the dark bg)
  tealInk:    '#0A1514',  // text on teal buttons
  gold:       '#C8A45C',  // amendments (parity with calendar; unused in daily)
  green:      '#59C280',  // pricing
  red:        '#D65A5A',  // withdrawals
};

// Filing type → chip accent. We render chips as bordered/coloured-text
// (not solid fills) — matches the mockup's understated pill style.
function chipAccent(filingType) {
  if (filingType === 'S-1' || filingType === 'F-1') return COLOR.teal;
  if (filingType === 'S-1/A' || filingType === 'F-1/A') return COLOR.gold;
  if (filingType === '424B') return COLOR.green;
  if (filingType === 'RW') return COLOR.red;
  return COLOR.mute;
}

function filingTypeLabel(t) {
  if (t === 'S-1') return 'Registration statement';
  if (t === 'F-1') return 'Foreign registration';
  if (t === 'S-1/A') return 'Amendment';
  if (t === 'F-1/A') return 'Foreign amendment';
  if (t === '424B') return 'Final prospectus';
  if (t === 'RW') return 'Withdrawal';
  return t;
}

// HTML escape so company names with `&` or `<` can't break the markup
// or the subject line.
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Date formatting ───────────────────────────────────────────────────
function formatLongDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[m - 1]} ${d}, ${y}`;
}
function formatShortDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}`;
}

// ── Subject line ──────────────────────────────────────────────────────
//
// Goal: under ~50 chars (mobile inboxes truncate), informative enough
// that the reader knows whether to open. Summarises by category rather
// than listing companies — listing names eats the char budget fast.
function makeSubject(date, filings) {
  const initials = filings.filter(function (f) {
    return f.filingType === 'S-1' || f.filingType === 'F-1';
  });
  const pricings = filings.filter(function (f) { return f.filingType === '424B'; });
  const withdrawals = filings.filter(function (f) { return f.filingType === 'RW'; });

  const parts = [];
  if (initials.length) {
    parts.push(`${initials.length} new IPO${initials.length === 1 ? '' : 's'}`);
  }
  if (pricings.length) {
    parts.push(`${pricings.length} pricing${pricings.length === 1 ? '' : 's'}`);
  }
  if (withdrawals.length) {
    parts.push(`${withdrawals.length} withdrawal${withdrawals.length === 1 ? '' : 's'}`);
  }
  const summary = parts.join(', ') || 'no events';
  return `IPO Radar — ${formatShortDate(date)}: ${summary}`;
}

// ── Section grouping ──────────────────────────────────────────────────
function groupSections(filings) {
  const initials = filings.filter(function (f) {
    return f.filingType === 'S-1' || f.filingType === 'F-1';
  });
  const pricings = filings.filter(function (f) { return f.filingType === '424B'; });
  const withdrawals = filings.filter(function (f) { return f.filingType === 'RW'; });
  const cmp = function (a, b) {
    return (a.companyName || '').localeCompare(b.companyName || '');
  };
  return [
    { title: 'New IPO Filings',       filings: initials.slice().sort(cmp) },
    { title: 'Pricing Announcements', filings: pricings.slice().sort(cmp) },
    { title: 'Withdrawals',           filings: withdrawals.slice().sort(cmp) },
  ].filter(function (s) { return s.filings.length > 0; });
}

// ── Preheader (inbox preview text) ────────────────────────────────────
function makePreheader(filings) {
  const initials = filings.filter(function (f) {
    return f.filingType === 'S-1' || f.filingType === 'F-1';
  });
  const pricings = filings.filter(function (f) { return f.filingType === '424B'; });
  const withdrawals = filings.filter(function (f) { return f.filingType === 'RW'; });
  const bits = [];
  if (initials.length === 1) bits.push(`${initials[0].companyName} files for IPO`);
  else if (initials.length > 1) bits.push(`${initials.length} new IPO filings`);
  if (pricings.length) bits.push(`${pricings.length} pricing${pricings.length === 1 ? '' : 's'}`);
  if (withdrawals.length) bits.push(`${withdrawals.length} withdrawal${withdrawals.length === 1 ? '' : 's'}`);
  return bits.join(' · ');
}

// ── Plain-text fallback ───────────────────────────────────────────────
function renderText(date, filings, factSheetBase) {
  const lines = [];
  lines.push(`IPO RADAR — ${formatLongDate(date).toUpperCase()}`);
  lines.push('');
  const sections = groupSections(filings);
  for (const sec of sections) {
    lines.push(`${sec.title.toUpperCase()} (${sec.filings.length})`);
    lines.push('');
    for (const f of sec.filings) {
      const meta = [f.ticker, f.exchange !== 'UNKNOWN' ? f.exchange : null, f.industry].filter(Boolean).join(' · ');
      lines.push(`  ${f.companyName}`);
      if (meta) lines.push(`    ${meta}`);
      lines.push(`    ${f.filingType} — ${filingTypeLabel(f.filingType)}`);
      if (f.reportSlug) lines.push(`    Fact Sheet: ${factSheetBase}/ipo/${encodeURIComponent(f.reportSlug)}`);
      lines.push(`    Source: ${f.edgarUrl}`);
      lines.push('');
    }
  }
  lines.push('—');
  lines.push('IPO Radar · a Velocia Ventures product');
  lines.push('Tracked daily from SEC EDGAR. Reply to this email with feedback.');
  return lines.join('\n');
}

// ── HTML fragments ────────────────────────────────────────────────────

function renderFilingRow(f, factSheetBase, isLastInSection) {
  const accent = chipAccent(f.filingType);
  const label = filingTypeLabel(f.filingType);
  const factSheet = f.reportSlug ? `${factSheetBase}/ipo/${encodeURIComponent(f.reportSlug)}` : null;

  // Compact metadata line — "PYST · NASDAQ · Fintech"
  const meta = [];
  if (f.ticker) meta.push(esc(f.ticker));
  if (f.exchange && f.exchange !== 'UNKNOWN') meta.push(esc(f.exchange));
  if (f.industry) meta.push(esc(f.industry));
  const metaHtml = meta.length
    ? `<div style="margin-top:8px;font-family:'DM Mono',Menlo,Consolas,'Courier New',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${COLOR.mute};">${meta.join('&nbsp;·&nbsp;')}</div>`
    : '';

  // Action row: primary "View Fact Sheet" button (filled teal) when we
  // have a slug, plus a secondary "Source filing" mono link. When no
  // Fact Sheet exists, the EDGAR link stands alone reading "View on EDGAR".
  let actions = '';
  if (factSheet) {
    actions = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;">
        <tr>
          <td style="background-color:${COLOR.teal};border-radius:2px;">
            <a href="${esc(factSheet)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 18px;font-family:'DM Mono',Menlo,Consolas,'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLOR.tealInk};text-decoration:none;font-weight:500;">View fact sheet&nbsp;&nbsp;→</a>
          </td>
          <td style="padding-left:18px;">
            <a href="${esc(f.edgarUrl)}" target="_blank" rel="noopener noreferrer" style="font-family:'DM Mono',Menlo,Consolas,'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLOR.teal};text-decoration:none;border-bottom:1px solid rgba(91,185,179,0.35);padding-bottom:1px;">Source filing</a>
          </td>
        </tr>
      </table>
    `;
  } else {
    actions = `
      <div style="margin-top:18px;">
        <a href="${esc(f.edgarUrl)}" target="_blank" rel="noopener noreferrer" style="font-family:'DM Mono',Menlo,Consolas,'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLOR.teal};text-decoration:none;border-bottom:1px solid rgba(91,185,179,0.35);padding-bottom:1px;">View on EDGAR&nbsp;&nbsp;→</a>
      </div>
    `;
  }

  // Hairline divider between filings within a section. We skip it after
  // the last filing — the section itself ends with a heavier break.
  const divider = isLastInSection
    ? ''
    : `<tr><td style="padding: 28px 0 0 0;"><div style="height:1px;line-height:1px;font-size:0;background-color:${COLOR.hairline};">&nbsp;</div></td></tr>`;

  return `
    <tr>
      <td style="padding-top: 28px;">
        <span style="display:inline-block;font-family:'DM Mono',Menlo,Consolas,'Courier New',monospace;font-size:10px;letter-spacing:0.20em;text-transform:uppercase;color:${accent};padding:5px 9px;border:1px solid rgba(91,185,179,0.35);border-radius:2px;">
          ${esc(f.filingType)}&nbsp;·&nbsp;${esc(label)}
        </span>
        <h3 style="margin:14px 0 0 0;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-weight:300;font-size:26px;line-height:1.2;letter-spacing:-0.005em;color:${COLOR.fg};">
          ${esc(f.companyName)}
        </h3>
        ${metaHtml}
        ${actions}
      </td>
    </tr>
    ${divider}
  `;
}

function renderSection(section, factSheetBase, isLastSection) {
  const lastIdx = section.filings.length - 1;
  const rows = section.filings.map(function (f, i) {
    return renderFilingRow(f, factSheetBase, i === lastIdx);
  }).join('');

  // Section break: a slightly larger gap + hairline before the next
  // section (skipped after the very last section).
  const sectionBreak = isLastSection
    ? ''
    : `<tr><td style="padding: 44px 0 0 0;"><div style="height:1px;line-height:1px;font-size:0;background-color:${COLOR.hairline};">&nbsp;</div></td></tr>`;

  return `
    <tr>
      <td style="padding-top: 32px;">
        <div style="font-family:'DM Mono',Menlo,Consolas,'Courier New',monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COLOR.teal};">
          ${esc(section.title)}&nbsp;&nbsp;·&nbsp;&nbsp;${section.filings.length}
        </div>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          ${rows}
        </table>
      </td>
    </tr>
    ${sectionBreak}
  `;
}

// ── Main entry point ──────────────────────────────────────────────────

function renderDigest({ date, filings, factSheetBase }) {
  const sections = groupSections(filings);
  const lastIdx = sections.length - 1;
  const sectionsHtml = sections.map(function (s, i) {
    return renderSection(s, factSheetBase, i === lastIdx);
  }).join('');

  const subject = makeSubject(date, filings);
  const preheader = makePreheader(filings);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(subject)}</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">

<style>
  body, table, td, p, a, h1, h2, h3 { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${COLOR.bg}; }

  @media only screen and (max-width: 640px) {
    .container { width: 100% !important; }
    .px { padding-left: 28px !important; padding-right: 28px !important; }
    .h1 { font-size: 32px !important; line-height: 1.15 !important; }
  }

  .btn a:hover { background-color: rgba(91, 185, 179, 0.12) !important; }
</style>
</head>

<body style="margin:0;padding:0;background-color:${COLOR.bg};font-family:'Barlow','Helvetica Neue',Helvetica,Arial,sans-serif;color:${COLOR.body};">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COLOR.bg};">
    ${esc(preheader)}
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${COLOR.bg};">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="640" class="container" style="max-width:640px;width:100%;">

          <!-- ── Masthead ─────────────────────────────────────────── -->
          <tr>
            <td class="px" style="padding: 0 48px 32px 48px;border-bottom:1px solid ${COLOR.hairline};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="left" style="font-family:'DM Mono',Menlo,Consolas,'Courier New',monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COLOR.teal};font-weight:500;">
                    IPO&nbsp;Radar
                  </td>
                  <td align="right" style="font-family:'DM Mono',Menlo,Consolas,'Courier New',monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${COLOR.mute};">
                    Daily&nbsp;digest
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Date eyebrow ─────────────────────────────────────── -->
          <tr>
            <td class="px" style="padding: 44px 48px 0 48px;">
              <div style="font-family:'DM Mono',Menlo,Consolas,'Courier New',monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${COLOR.teal};">
                ${esc(formatLongDate(date))}
              </div>
            </td>
          </tr>

          <!-- ── Headline ─────────────────────────────────────────── -->
          <tr>
            <td class="px" style="padding: 18px 48px 0 48px;">
              <h1 class="h1" style="margin:0;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-weight:300;font-size:38px;line-height:1.1;letter-spacing:-0.01em;color:${COLOR.fg};">
                ${filings.length === 1 ? 'One filing' : `${filings.length} filings`} <em style="font-style:italic;color:${COLOR.teal};">tracked since yesterday</em>
              </h1>
            </td>
          </tr>

          <!-- ── Lead ─────────────────────────────────────────────── -->
          <tr>
            <td class="px" style="padding: 18px 48px 0 48px;">
              <p class="lead" style="margin:0;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:18px;line-height:1.55;font-style:italic;color:${COLOR.bodyMute};font-weight:400;">
                Initial filings, pricing announcements, and withdrawals from SEC EDGAR. Amendments are rolled into the weekly Week Ahead.
              </p>
            </td>
          </tr>

          <!-- ── Sections ─────────────────────────────────────────── -->
          <tr>
            <td class="px" style="padding: 0 48px 0 48px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${sectionsHtml}
              </table>
            </td>
          </tr>

          <!-- ── Footer divider ───────────────────────────────────── -->
          <tr>
            <td class="px" style="padding: 64px 48px 0 48px;">
              <div style="height:1px;line-height:1px;font-size:0;background-color:${COLOR.hairline};">&nbsp;</div>
            </td>
          </tr>

          <!-- ── Footer ───────────────────────────────────────────── -->
          <tr>
            <td class="px" style="padding: 28px 48px 40px 48px;">
              <p style="margin:0 0 14px 0;font-family:'DM Mono',Menlo,Consolas,'Courier New',monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${COLOR.mute};">
                IPO Radar &nbsp;·&nbsp; a Velocia Ventures product
              </p>
              <p style="margin:0 0 14px 0;font-family:'Barlow','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${COLOR.mute};">
                Tracked daily from SEC EDGAR. The digest fires only on days with material events — new IPO filings (S-1, F-1), pricing announcements (424B), or withdrawals (RW). Amendments roll into the weekly Week&nbsp;Ahead.
              </p>
              <p style="margin:0 0 20px 0;font-family:'Barlow','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${COLOR.mute};">
                Reply to this email with feedback.
                &nbsp;·&nbsp;
                <a href="https://velociaventures.com" style="color:${COLOR.teal};text-decoration:none;border-bottom:1px solid rgba(91,185,179,0.35);">Velocia Ventures</a>
              </p>
              <p style="margin:0;font-family:'Barlow','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.65;color:${COLOR.fineprint};font-style:italic;">
                This email is for informational purposes only and does not constitute investment advice, a solicitation, or an offer to buy or sell any security. Review the full filing on EDGAR before making any investment decision.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = renderText(date, filings, factSheetBase);
  return { subject, html, text };
}

module.exports = { renderDigest, makeSubject };
