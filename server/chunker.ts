/**
 * Document chunking utility for SEC filings.
 * Splits text into overlapping chunks with section detection.
 * Preserves document structure for accurate section labeling.
 */

const CHUNK_SIZE = 1500; // ~375 tokens
const CHUNK_OVERLAP = 200;

// Common S-1 section headers
const SECTION_PATTERNS = [
  /^(?:PART\s+[IVX]+)/im,
  /^(?:ITEM\s+\d+[A-Z]?\.?\s*)/im,
  /^(?:PROSPECTUS SUMMARY)/im,
  /^(?:RISK FACTORS)/im,
  /^(?:USE OF PROCEEDS)/im,
  /^(?:DIVIDEND POLICY)/im,
  /^(?:CAPITALIZATION)/im,
  /^(?:DILUTION)/im,
  /^(?:SELECTED (?:CONSOLIDATED )?FINANCIAL DATA)/im,
  /^(?:MANAGEMENT'?S? DISCUSSION AND ANALYSIS)/im,
  /^(?:BUSINESS)/im,
  /^(?:MANAGEMENT)/im,
  /^(?:EXECUTIVE COMPENSATION)/im,
  /^(?:CERTAIN RELATIONSHIPS)/im,
  /^(?:PRINCIPAL (?:AND SELLING )?STOCKHOLDERS)/im,
  /^(?:DESCRIPTION OF (?:CAPITAL )?STOCK)/im,
  /^(?:SHARES ELIGIBLE FOR FUTURE SALE)/im,
  /^(?:UNDERWRITING)/im,
  /^(?:LEGAL MATTERS)/im,
  /^(?:EXPERTS)/im,
  /^(?:WHERE YOU CAN FIND (?:MORE|ADDITIONAL) INFORMATION)/im,
  /^(?:FINANCIAL STATEMENTS)/im,
  /^(?:TABLE OF CONTENTS)/im,
  /^(?:ABOUT THIS PROSPECTUS)/im,
  /^(?:INDUSTRY AND MARKET DATA)/im,
  /^(?:SUMMARY OF THE OFFERING)/im,
  /^(?:FORWARD.LOOKING STATEMENTS)/im,
  /^(?:OUR COMPANY)/im,
  /^(?:OUR BUSINESS)/im,
  /^(?:COMPETITIVE STRENGTHS)/im,
  /^(?:GROWTH STRATEG)/im,
];

function detectSection(text: string): string | null {
  // Check the first few lines for section headers
  const firstLines = text.split("\n").slice(0, 3).join("\n");
  for (const pattern of SECTION_PATTERNS) {
    const match = firstLines.match(pattern);
    if (match) {
      return match[0].trim().replace(/\s+/g, " ").toUpperCase();
    }
  }
  return null;
}

export interface TextChunk {
  chunkIndex: number;
  chunkText: string;
  sectionLabel: string | null;
  tokenCount: number;
}

/**
 * Chunk a document text into overlapping segments with section labels.
 * Preserves paragraph boundaries and section structure.
 */
export function chunkDocument(text: string): TextChunk[] {
  // Clean the text while preserving paragraph structure
  const cleanText = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")  // Collapse excessive newlines but keep paragraph breaks
    .replace(/[ \t]{2,}/g, " ")     // Collapse horizontal whitespace only
    .trim();

  if (!cleanText || cleanText.length < 50) return [];

  // Split into paragraphs, keeping short ones that might be section headers
  const rawParagraphs = cleanText.split(/\n\n+/).filter(p => p.trim().length > 0);
  // Merge short header paragraphs with the following paragraph
  const paragraphs: string[] = [];
  for (let i = 0; i < rawParagraphs.length; i++) {
    const trimmed = rawParagraphs[i].trim();
    if (trimmed.length <= 40 && detectSection(trimmed) !== null && i + 1 < rawParagraphs.length) {
      // This is a section header — merge with next paragraph
      paragraphs.push(trimmed + "\n\n" + rawParagraphs[i + 1].trim());
      i++; // skip next
    } else if (trimmed.length > 20) {
      paragraphs.push(trimmed);
    }
  }

  const chunks: TextChunk[] = [];
  let currentSection: string | null = null;
  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();

    // Detect section headers
    const detectedSection = detectSection(trimmedPara);
    if (detectedSection) {
      currentSection = detectedSection;
    }

    // If adding this paragraph would exceed chunk size, finalize current chunk
    if (currentChunk.length + trimmedPara.length > CHUNK_SIZE && currentChunk.length > 100) {
      chunks.push({
        chunkIndex,
        chunkText: currentChunk.trim(),
        sectionLabel: currentSection,
        tokenCount: Math.ceil(currentChunk.trim().length / 4),
      });
      chunkIndex++;

      // Start new chunk with overlap from end of previous
      const overlapText = currentChunk.slice(-CHUNK_OVERLAP);
      currentChunk = overlapText + "\n\n" + trimmedPara;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmedPara;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 50) {
    chunks.push({
      chunkIndex,
      chunkText: currentChunk.trim(),
      sectionLabel: currentSection,
      tokenCount: Math.ceil(currentChunk.trim().length / 4),
    });
  }

  return chunks;
}

/**
 * Extract plain text from raw file content.
 * Handles HTML-formatted SEC filings (common for EDGAR filings) and plain text.
 */
export function extractText(content: string): string {
  // Check if content looks like HTML
  const isHtml = /<\s*(html|body|div|p|table|span|head)\b/i.test(content);

  let text = content;

  if (isHtml) {
    // Remove script and style blocks entirely
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // Convert block-level elements to paragraph breaks
    text = text.replace(/<\/(p|div|h[1-6]|tr|li|blockquote|section|article)>/gi, "\n\n");
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/(td|th)>/gi, " | ");

    // Remove remaining HTML tags
    text = text.replace(/<[^>]+>/g, " ");
  }

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/gi, " ");

  // Normalize horizontal whitespace (preserve newlines for structure)
  text = text.replace(/[ \t]+/g, " ");
  // Normalize excessive newlines
  text = text.replace(/\n[ \t]*\n/g, "\n\n");
  text = text.replace(/\n{4,}/g, "\n\n\n");

  return text.trim();
}

/**
 * Validate that extracted text has meaningful content.
 */
export function validateExtraction(text: string): { valid: boolean; reason?: string } {
  if (!text || text.length < 100) {
    return { valid: false, reason: "Extracted text is too short (less than 100 characters)." };
  }

  // Check if it's mostly non-text (binary content that wasn't properly decoded)
  const nonPrintable = (text.match(/[^\x20-\x7E\n\r\t]/g) || []).length;
  if (nonPrintable / text.length > 0.3) {
    return { valid: false, reason: "Content appears to be binary/non-text. PDF files need to be converted to text before upload." };
  }

  return { valid: true };
}
