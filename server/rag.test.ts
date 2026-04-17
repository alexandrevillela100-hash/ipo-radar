import { describe, expect, it } from "vitest";
import { extractRelevantExcerpt, extractCitations } from "./rag";
import type { DocumentChunk, Filing } from "../drizzle/schema";

/**
 * Tests for the RAG engine's exported pure functions.
 * These test the actual implementation in rag.ts.
 */

describe("extractRelevantExcerpt", () => {
  it("extracts first sentences up to ~400 chars", () => {
    const text = "This is the first sentence about the company. This is the second sentence with more details. This is the third sentence about financials.";
    const excerpt = extractRelevantExcerpt(text);
    expect(excerpt).toContain("first sentence");
    expect(excerpt.length).toBeLessThanOrEqual(500);
  });

  it("handles very short text", () => {
    const text = "Short.";
    const excerpt = extractRelevantExcerpt(text);
    expect(excerpt).toBe("Short.");
  });

  it("truncates very long text with ellipsis", () => {
    const text = Array(20).fill(
      "This is a long sentence that contains important information about the company's business operations."
    ).join(" ");
    const excerpt = extractRelevantExcerpt(text);
    expect(excerpt.endsWith("...")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(500);
  });

  it("filters out very short sentences", () => {
    const text = "OK. Yes. The company reported revenue of $85 million for the fiscal year ending December 2025.";
    const excerpt = extractRelevantExcerpt(text);
    // Short sentences "OK." and "Yes." should be filtered, leaving the substantive one
    expect(excerpt).toContain("$85 million");
  });
});

describe("extractCitations", () => {
  // Create mock chunks that match the DocumentChunk type shape
  const chunks = [
    {
      id: 1,
      filingId: 1,
      companyId: 1,
      chunkIndex: 0,
      chunkText: "The company was founded in 2020 and operates in the technology sector. It provides cloud-based solutions for enterprise customers.",
      sectionLabel: "BUSINESS",
      tokenCount: 20,
      createdAt: new Date(),
    },
    {
      id: 2,
      filingId: 1,
      companyId: 1,
      chunkIndex: 1,
      chunkText: "Revenue for fiscal year 2025 was $85 million, representing a 40% increase year-over-year. Net loss was $12 million due to increased R&D spending.",
      sectionLabel: "FINANCIALS",
      tokenCount: 25,
      createdAt: new Date(),
    },
    {
      id: 3,
      filingId: 2,
      companyId: 1,
      chunkIndex: 0,
      chunkText: "Key risk factors include market competition from larger established players, regulatory changes in key markets, and dependence on key personnel.",
      sectionLabel: "RISK FACTORS",
      tokenCount: 22,
      createdAt: new Date(),
    },
  ] as DocumentChunk[];

  const filingsMap = new Map<number, Filing>([
    [1, {
      id: 1, companyId: 1, documentType: "S-1", documentName: "acme-s1.txt",
      fileUrl: "https://example.com/s1.txt", fileKey: "filings/1/s1.txt",
      fileSize: 1000, status: "ready", chunkCount: 2, errorMessage: null,
      uploadedAt: new Date(), processedAt: new Date(),
    } as Filing],
    [2, {
      id: 2, companyId: 1, documentType: "S-1/A", documentName: "acme-s1a.txt",
      fileUrl: "https://example.com/s1a.txt", fileKey: "filings/1/s1a.txt",
      fileSize: 800, status: "ready", chunkCount: 1, errorMessage: null,
      uploadedAt: new Date(), processedAt: new Date(),
    } as Filing],
  ]);

  it("extracts citations from [Source N] references", () => {
    const answer = "The company was founded in 2020 [Source 1] and had revenue of $85M [Source 2].";
    const citations = extractCitations(answer, chunks, filingsMap);

    expect(citations).toHaveLength(2);
    expect(citations[0].documentName).toBe("S-1 — acme-s1.txt");
    expect(citations[0].sectionLabel).toBe("BUSINESS");
    expect(citations[1].documentName).toBe("S-1 — acme-s1.txt");
    expect(citations[1].sectionLabel).toBe("FINANCIALS");
  });

  it("handles no citations gracefully", () => {
    const answer = "I don't have enough information to answer this question.";
    const citations = extractCitations(answer, chunks, filingsMap);
    expect(citations).toHaveLength(0);
  });

  it("deduplicates repeated source references", () => {
    const answer = "The company operates in tech [Source 1]. As mentioned [Source 1], it was founded in 2020.";
    const citations = extractCitations(answer, chunks, filingsMap);
    expect(citations).toHaveLength(1);
  });

  it("handles out-of-range source references", () => {
    const answer = "Some claim [Source 99] that doesn't exist.";
    const citations = extractCitations(answer, chunks, filingsMap);
    expect(citations).toHaveLength(0);
  });

  it("maps to correct filing documents across different filings", () => {
    const answer = "Risk factors include competition [Source 3].";
    const citations = extractCitations(answer, chunks, filingsMap);
    expect(citations).toHaveLength(1);
    expect(citations[0].documentName).toBe("S-1/A — acme-s1a.txt");
    expect(citations[0].sectionLabel).toBe("RISK FACTORS");
  });

  it("includes excerpt from the actual chunk text", () => {
    const answer = "The company was founded in 2020 [Source 1].";
    const citations = extractCitations(answer, chunks, filingsMap);
    expect(citations).toHaveLength(1);
    expect(citations[0].excerpt).toContain("founded in 2020");
  });

  it("handles multiple distinct sources in one answer", () => {
    const answer = "Founded in 2020 [Source 1], with $85M revenue [Source 2] and key risks [Source 3].";
    const citations = extractCitations(answer, chunks, filingsMap);
    expect(citations).toHaveLength(3);
    expect(citations[0].documentName).toContain("S-1");
    expect(citations[1].documentName).toContain("S-1");
    expect(citations[2].documentName).toContain("S-1/A");
  });

  it("handles unknown filing gracefully", () => {
    const chunksWithUnknown = [
      { ...chunks[0], filingId: 999 } as DocumentChunk,
    ];
    const answer = "Some info [Source 1].";
    const citations = extractCitations(answer, chunksWithUnknown, filingsMap);
    expect(citations).toHaveLength(1);
    expect(citations[0].documentName).toBe("Unknown Document");
  });
});
