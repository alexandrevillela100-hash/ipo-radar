/**
 * Filing Text Ingestion Script
 * Downloads S-1 filing text from SEC EDGAR, chunks it, and stores in document_chunks.
 * 
 * Usage: node ingest-filing-text.mjs <companyCik>
 * Example: node ingest-filing-text.mjs 0000832489
 */
import mysql from 'mysql2/promise';
import https from 'https';
import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

const TARGET_CIK = process.argv[2] || '0000832489'; // Default: GeoVax Labs
const CHUNK_SIZE = 1500; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks
const USER_AGENT = 'IPORadarAI research@iporadar.ai';

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function stripHtml(html) {
  // Remove script and style tags entirely
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Replace <br>, <p>, <div>, <tr>, <li> with newlines
  text = text.replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, '\n');
  // Replace table cells with tabs
  text = text.replace(/<\s*(td|th)[^>]*>/gi, '\t');
  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/&rsquo;/gi, "'");
  text = text.replace(/&lsquo;/gi, "'");
  text = text.replace(/&rdquo;/gi, '"');
  text = text.replace(/&ldquo;/gi, '"');
  text = text.replace(/&mdash;/gi, '—');
  text = text.replace(/&ndash;/gi, '–');
  text = text.replace(/&#\d+;/g, '');
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

// Detect SEC filing sections
const SECTION_PATTERNS = [
  /^PROSPECTUS SUMMARY/i,
  /^SUMMARY$/i,
  /^RISK FACTORS/i,
  /^USE OF PROCEEDS/i,
  /^DIVIDEND POLICY/i,
  /^CAPITALIZATION/i,
  /^DILUTION/i,
  /^SELECTED FINANCIAL DATA/i,
  /^MANAGEMENT.S DISCUSSION AND ANALYSIS/i,
  /^BUSINESS$/i,
  /^MANAGEMENT$/i,
  /^EXECUTIVE COMPENSATION/i,
  /^CERTAIN RELATIONSHIPS/i,
  /^PRINCIPAL STOCKHOLDERS/i,
  /^PRINCIPAL SHAREHOLDERS/i,
  /^DESCRIPTION OF CAPITAL STOCK/i,
  /^DESCRIPTION OF SECURITIES/i,
  /^SHARES ELIGIBLE FOR FUTURE SALE/i,
  /^UNDERWRITING/i,
  /^PLAN OF DISTRIBUTION/i,
  /^LEGAL MATTERS/i,
  /^EXPERTS$/i,
  /^FINANCIAL STATEMENTS/i,
  /^INDEX TO FINANCIAL STATEMENTS/i,
  /^WHERE YOU CAN FIND MORE INFORMATION/i,
  /^ABOUT THIS PROSPECTUS/i,
  /^FORWARD.LOOKING STATEMENTS/i,
  /^INDUSTRY AND MARKET DATA/i,
  /^THE OFFERING/i,
];

function detectSection(line) {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 100) return null;
  for (const pattern of SECTION_PATTERNS) {
    if (pattern.test(trimmed)) return trimmed;
  }
  return null;
}

function chunkText(text, documentName) {
  const lines = text.split('\n');
  const chunks = [];
  let currentChunk = '';
  let currentSection = 'GENERAL';
  let chunkIndex = 0;

  for (const line of lines) {
    const section = detectSection(line);
    if (section) {
      currentSection = section;
    }

    currentChunk += line + '\n';

    if (currentChunk.length >= CHUNK_SIZE) {
      chunks.push({
        chunkIndex: chunkIndex++,
        chunkText: currentChunk.trim(),
        sectionLabel: currentSection,
        tokenCount: Math.ceil(currentChunk.length / 4),
        documentName,
      });

      // Keep overlap
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 5));
      currentChunk = overlapWords.join(' ') + '\n';
    }
  }

  // Final chunk
  if (currentChunk.trim().length > 50) {
    chunks.push({
      chunkIndex: chunkIndex++,
      chunkText: currentChunk.trim(),
      sectionLabel: currentSection,
      tokenCount: Math.ceil(currentChunk.length / 4),
      documentName,
    });
  }

  return chunks;
}

async function findPrimaryDocument(filingUrl) {
  console.log(`  Fetching filing index: ${filingUrl}`);
  const indexHtml = await fetchUrl(filingUrl);
  
  // Look for the primary S-1 document (usually .htm or .html)
  const docPattern = /href="([^"]+\.(htm|html?))"[^>]*>/gi;
  let match;
  const candidates = [];
  
  while ((match = docPattern.exec(indexHtml)) !== null) {
    const href = match[1];
    // Skip R files (XBRL), ex- files (exhibits), and tiny files
    if (/^R\d+\.htm/i.test(href)) continue;
    if (/^ex-/i.test(href)) continue;
    if (/filing-main/i.test(href)) continue;
    candidates.push(href);
  }

  // Prefer files with s-1, s1, prospectus in the name
  const preferred = candidates.find(c => 
    /s-?1|prospectus|registration/i.test(c)
  );
  
  const doc = preferred || candidates[0];
  if (!doc) {
    console.log(`  No primary document found. Candidates: ${candidates.join(', ')}`);
    return null;
  }
  
  // Build full URL - handle both absolute and relative hrefs
  if (doc.startsWith('/') || doc.startsWith('http')) {
    // Absolute path - prepend domain
    return doc.startsWith('http') ? doc : `https://www.sec.gov${doc}`;
  }
  const baseUrl = filingUrl.endsWith('/') ? filingUrl : filingUrl + '/';
  return baseUrl + doc;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get company info
  const [companies] = await conn.execute(
    'SELECT id, cik, name FROM companies WHERE cik = ?', [TARGET_CIK]
  );
  
  if (companies.length === 0) {
    console.error(`Company with CIK ${TARGET_CIK} not found`);
    await conn.end();
    process.exit(1);
  }
  
  const company = companies[0];
  console.log(`\n=== Ingesting filings for: ${company.name} (CIK: ${company.cik}) ===\n`);
  
  // Get filings for this company
  const [filings] = await conn.execute(
    'SELECT id, accessionNumber, formType, filingDate, filingUrl FROM filings WHERE companyCik = ? ORDER BY filingDate DESC',
    [TARGET_CIK]
  );
  
  console.log(`Found ${filings.length} filings\n`);
  
  // Clear existing chunks for this company
  await conn.execute('DELETE FROM document_chunks WHERE companyCik = ?', [TARGET_CIK]);
  console.log('Cleared existing chunks for this company\n');
  
  let totalChunks = 0;
  
  for (const filing of filings) {
    console.log(`Processing: ${filing.formType} filed ${filing.filingDate}`);
    console.log(`  Filing URL: ${filing.filingUrl}`);
    
    try {
      // Find the primary document in the filing index
      const docUrl = await findPrimaryDocument(filing.filingUrl);
      if (!docUrl) {
        console.log(`  ⚠ Could not find primary document, skipping\n`);
        continue;
      }
      
      console.log(`  Primary document: ${docUrl}`);
      
      // Download the document
      console.log(`  Downloading...`);
      const html = await fetchUrl(docUrl);
      console.log(`  Downloaded ${(html.length / 1024).toFixed(0)} KB of HTML`);
      
      // Strip HTML to plain text
      const plainText = stripHtml(html);
      console.log(`  Extracted ${(plainText.length / 1024).toFixed(0)} KB of text`);
      
      if (plainText.length < 500) {
        console.log(`  ⚠ Text too short, skipping\n`);
        continue;
      }
      
      // Chunk the text
      const documentName = `${filing.formType} - ${filing.filingDate} (${filing.accessionNumber})`;
      const chunks = chunkText(plainText, documentName);
      console.log(`  Created ${chunks.length} chunks`);
      
      // Insert chunks into database
      for (const chunk of chunks) {
        await conn.execute(
          `INSERT INTO document_chunks (filingId, companyId, companyCik, chunkIndex, chunkText, sectionLabel, tokenCount, documentName) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [filing.id, company.id, company.cik, chunk.chunkIndex, chunk.chunkText, chunk.sectionLabel, chunk.tokenCount, chunk.documentName]
        );
      }
      
      totalChunks += chunks.length;
      console.log(`  ✓ Stored ${chunks.length} chunks\n`);
      
      // Be polite to SEC servers — wait 500ms between requests
      await new Promise(r => setTimeout(r, 500));
      
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}\n`);
    }
  }
  
  console.log(`\n=== Done! Total chunks stored: ${totalChunks} ===`);
  
  // Show section distribution
  const [sections] = await conn.execute(
    'SELECT sectionLabel, COUNT(*) as cnt FROM document_chunks WHERE companyCik = ? GROUP BY sectionLabel ORDER BY cnt DESC',
    [TARGET_CIK]
  );
  console.log('\nSection distribution:');
  sections.forEach(s => console.log(`  ${s.sectionLabel}: ${s.cnt} chunks`));
  
  await conn.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
