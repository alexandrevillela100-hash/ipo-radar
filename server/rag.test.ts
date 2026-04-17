import { describe, expect, it } from "vitest";
import { extractCitations } from "./rag";

describe("extractCitations", () => {
  it("extracts citations from DOC markers in LLM response", () => {
    const answer =
      "The company reported revenue of $10M [DOC:S-1 Filing|Financial Statements] and plans to expand [DOC:S-1 Filing|Use of Proceeds].";
    const chunks = [
      {
        documentName: "S-1 Filing",
        sectionLabel: "Financial Statements",
        chunkText:
          "Revenue for the fiscal year ended December 31, 2025 was approximately $10 million, representing a 45% increase from the prior year.",
      },
      {
        documentName: "S-1 Filing",
        sectionLabel: "Use of Proceeds",
        chunkText:
          "We intend to use the net proceeds from this offering for general corporate purposes, including working capital and potential acquisitions.",
      },
    ];

    const citations = extractCitations(answer, chunks);

    expect(citations).toHaveLength(2);
    expect(citations[0].documentName).toBe("S-1 Filing");
    expect(citations[0].sectionLabel).toBe("Financial Statements");
    expect(citations[0].excerpt).toContain("Revenue for the fiscal year");
    expect(citations[1].documentName).toBe("S-1 Filing");
    expect(citations[1].sectionLabel).toBe("Use of Proceeds");
    expect(citations[1].excerpt).toContain("net proceeds");
  });

  it("deduplicates citations with the same doc and section", () => {
    const answer =
      "Point A [DOC:S-1|Risk Factors]. Point B [DOC:S-1|Risk Factors]. Point C [DOC:S-1|Business].";
    const chunks = [
      {
        documentName: "S-1",
        sectionLabel: "Risk Factors",
        chunkText: "Risk factor content here.",
      },
      {
        documentName: "S-1",
        sectionLabel: "Business",
        chunkText: "Business description here.",
      },
    ];

    const citations = extractCitations(answer, chunks);

    expect(citations).toHaveLength(2);
    expect(citations[0].sectionLabel).toBe("Risk Factors");
    expect(citations[1].sectionLabel).toBe("Business");
  });

  it("returns empty array when no citations are present", () => {
    const answer = "This is a response with no citation markers.";
    const chunks = [
      { documentName: "S-1", sectionLabel: "General", chunkText: "Some text." },
    ];

    const citations = extractCitations(answer, chunks);
    expect(citations).toHaveLength(0);
  });

  it("handles citations with no matching chunk gracefully", () => {
    const answer = "Some claim [DOC:Unknown Doc|Unknown Section].";
    const chunks = [
      { documentName: "S-1", sectionLabel: "General", chunkText: "Some text." },
    ];

    const citations = extractCitations(answer, chunks);
    expect(citations).toHaveLength(1);
    expect(citations[0].documentName).toBe("Unknown Doc");
    expect(citations[0].excerpt).toBe(""); // No matching chunk
  });

  it("truncates long excerpts to 200 chars with ellipsis", () => {
    const longText = "A".repeat(300);
    const answer = "Claim [DOC:S-1|Risk Factors].";
    const chunks = [
      {
        documentName: "S-1",
        sectionLabel: "Risk Factors",
        chunkText: longText,
      },
    ];

    const citations = extractCitations(answer, chunks);
    expect(citations).toHaveLength(1);
    expect(citations[0].excerpt.length).toBe(203); // 200 + "..."
    expect(citations[0].excerpt.endsWith("...")).toBe(true);
  });
});
