/**
 * Filing Indexer — Downloads SEC filing text from EDGAR and chunks it
 * for the RAG pipeline. Called by the admin "Index Filing" endpoint.
 */

import { getDb } from "./db";
import { filings, documentChunks, companies } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

const SEC_USER_AGENT = "IPORadarAI admin@iporadar.ai";

// ─── Text Extraction ────────────────────────────────────────────────────────

/**
 * Fetch the filing index page from EDGAR and find the primary document URL.
 */
async function findPrimaryDocumentUrl(filingUrl: string): Promise<string | null> {
  try {
    const res = await fetch(filingUrl, {
      headers: { "User-Agent": SEC_USER_AGENT },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Look for the primary document link (usually .htm or .txt)
    const patterns = [
      /href="(\/Archives\/edgar\/data\/[^"]+\.htm)"/gi,
      /href="([^"]+\.htm)"/gi,
    ];

    for (const pattern of patterns) {
      const matches = Array.from(html.matchAll(pattern));
      for (const m of matches) {
        const href = m[1];
        // Skip index files and R-files
        if (
          href.includes("-index") ||
          href.includes("R1.htm") ||
          href.includes("R2.htm") ||
          href.includes("FilingSummary")
        )
          continue;
        // Prefer S-1 documents
        if (href.toLowerCase().includes("s-1") || href.toLowerCase().includes("s1")) {
          return href.startsWith("/") ? `https://www.sec.gov${href}` : href;
        }
      }
      // If no S-1 specific file, take the first non-index .htm
      for (const m of matches) {
        const href = m[1];
        if (
          !href.includes("-index") &&
          !href.includes("R1.htm") &&
          !href.includes("R2.htm") &&
          !href.includes("FilingSummary")
        ) {
          return href.startsWith("/") ? `https://www.sec.gov${href}` : href;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("[Indexer] Failed to fetch filing index:", error);
    return null;
  }
}

/**
 * Download and extract text from a filing HTML document.
 */
async function downloadFilingText(url: string): Promise<string | null> {
  try {
    // Rate limit: SEC asks for max 10 requests/sec
    await new Promise((r) => setTimeout(r, 200));

    const res = await fetch(url, {
      headers: { "User-Agent": SEC_USER_AGENT },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Strip HTML tags and clean up
    let text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#\d+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    return text.length > 100 ? text : null;
  } catch (error) {
    console.error("[Indexer] Failed to download filing text:", error);
    return null;
  }
}

// ─── Section Detection ──────────────────────────────────────────────────────

const SECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bPROSPECTUS SUMMARY\b/i, label: "Prospectus Summary" },
  { pattern: /\bRISK FACTORS\b/i, label: "Risk Factors" },
  { pattern: /\bUSE OF PROCEEDS\b/i, label: "Use of Proceeds" },
  { pattern: /\bDIVIDEND POLICY\b/i, label: "Dividend Policy" },
  { pattern: /\bCAPITALIZATION\b/i, label: "Capitalization" },
  { pattern: /\bDILUTION\b/i, label: "Dilution" },
  { pattern: /\bSELECTED FINANCIAL DATA\b/i, label: "Selected Financial Data" },
  {
    pattern: /\bMANAGEMENT'?S? DISCUSSION AND ANALYSIS\b/i,
    label: "Management Discussion & Analysis",
  },
  { pattern: /\bBUSINESS\b/i, label: "Business" },
  { pattern: /\bMANAGEMENT\b/i, label: "Management" },
  { pattern: /\bEXECUTIVE COMPENSATION\b/i, label: "Executive Compensation" },
  {
    pattern: /\bPRINCIPAL STOCKHOLDERS\b/i,
    label: "Principal Stockholders",
  },
  {
    pattern: /\bCERTAIN RELATIONSHIPS\b/i,
    label: "Certain Relationships & Related Transactions",
  },
  {
    pattern: /\bDESCRIPTION OF (?:CAPITAL )?STOCK\b/i,
    label: "Description of Capital Stock",
  },
  { pattern: /\bUNDERWRITING\b/i, label: "Underwriting" },
  { pattern: /\bLEGAL MATTERS\b/i, label: "Legal Matters" },
  { pattern: /\bEXPERTS\b/i, label: "Experts" },
  {
    pattern: /\bFINANCIAL STATEMENTS\b/i,
    label: "Financial Statements",
  },
];

function detectSection(text: string): string | null {
  // Check the first 200 chars for section headers
  const head = text.substring(0, 200);
  for (const { pattern, label } of SECTION_PATTERNS) {
    if (pattern.test(head)) return label;
  }
  return null;
}

// ─── Chunking ───────────────────────────────────────────────────────────────

interface Chunk {
  chunkText: string;
  sectionLabel: string;
  chunkIndex: number;
  tokenCount: number;
}

function chunkText(fullText: string, maxChunkSize = 1500): Chunk[] {
  const chunks: Chunk[] = [];
  const paragraphs = fullText.split(/(?:\.\s{2,}|\n\s*\n)/);
  let currentChunk = "";
  let currentSection = "General";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed || trimmed.length < 10) continue;

    // Check for section header
    const detected = detectSection(trimmed);
    if (detected) currentSection = detected;

    if (currentChunk.length + trimmed.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        chunkText: currentChunk.trim(),
        sectionLabel: currentSection,
        chunkIndex: chunkIndex++,
        tokenCount: Math.ceil(currentChunk.length / 4),
      });
      currentChunk = "";
    }

    currentChunk += (currentChunk ? " " : "") + trimmed;
  }

  // Push remaining text
  if (currentChunk.trim().length > 20) {
    chunks.push({
      chunkText: currentChunk.trim(),
      sectionLabel: currentSection,
      chunkIndex: chunkIndex++,
      tokenCount: Math.ceil(currentChunk.length / 4),
    });
  }

  return chunks;
}

// ─── Main Indexer ───────────────────────────────────────────────────────────

export interface IndexResult {
  success: boolean;
  filingId: number;
  chunksCreated: number;
  sections: string[];
  error?: string;
}

/**
 * Index a single filing: download text from EDGAR, chunk it, store in document_chunks.
 */
export async function indexFiling(filingId: number): Promise<IndexResult> {
  const db = await getDb();
  if (!db) {
    return { success: false, filingId, chunksCreated: 0, sections: [], error: "Database not available" };
  }

  // Get the filing record
  const [filing] = await db
    .select()
    .from(filings)
    .where(eq(filings.id, filingId))
    .limit(1);

  if (!filing) {
    return { success: false, filingId, chunksCreated: 0, sections: [], error: "Filing not found" };
  }

  // Get the company for this filing
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.cik, filing.companyCik))
    .limit(1);

  if (!company) {
    return { success: false, filingId, chunksCreated: 0, sections: [], error: "Company not found" };
  }

  // Check if already indexed
  const [existing] = await db
    .select({ count: sql<number>`count(*)` })
    .from(documentChunks)
    .where(eq(documentChunks.filingId, filingId));

  if (existing && existing.count > 0) {
    return {
      success: true,
      filingId,
      chunksCreated: existing.count,
      sections: [],
      error: "Already indexed",
    };
  }

  // Find the primary document URL
  const filingUrl = filing.filingUrl;
  if (!filingUrl) {
    return { success: false, filingId, chunksCreated: 0, sections: [], error: "No filing URL" };
  }

  const primaryDocUrl = await findPrimaryDocumentUrl(filingUrl);
  if (!primaryDocUrl) {
    return { success: false, filingId, chunksCreated: 0, sections: [], error: "Could not find primary document" };
  }

  // Download the filing text
  const text = await downloadFilingText(primaryDocUrl);
  if (!text) {
    return { success: false, filingId, chunksCreated: 0, sections: [], error: "Could not download filing text" };
  }

  // Chunk the text
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return { success: false, filingId, chunksCreated: 0, sections: [], error: "No meaningful chunks extracted" };
  }

  // Build document name from filing info
  const documentName = `${filing.formType} — ${(filing as any).description || filing.filingDate}`;

  // Insert chunks in batches
  const batchSize = 50;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    await db.insert(documentChunks).values(
      batch.map((chunk) => ({
        filingId,
        companyId: company.id,
        companyCik: company.cik,
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.chunkText,
        sectionLabel: chunk.sectionLabel,
        tokenCount: chunk.tokenCount,
        documentName,
      }))
    );
  }

  // Collect unique sections
  const sections = Array.from(new Set(chunks.map((c) => c.sectionLabel)));

  return {
    success: true,
    filingId,
    chunksCreated: chunks.length,
    sections,
  };
}

/**
 * Index all filings for a company.
 */
export async function indexAllFilingsForCompany(
  companyCik: string
): Promise<{ results: IndexResult[]; totalChunks: number }> {
  const db = await getDb();
  if (!db) return { results: [], totalChunks: 0 };

  const companyFilings = await db
    .select()
    .from(filings)
    .where(eq(filings.companyCik, companyCik));

  const results: IndexResult[] = [];
  let totalChunks = 0;

  for (const filing of companyFilings) {
    // Rate limit between filings
    await new Promise((r) => setTimeout(r, 500));
    const result = await indexFiling(filing.id);
    results.push(result);
    totalChunks += result.chunksCreated;
  }

  return { results, totalChunks };
}
