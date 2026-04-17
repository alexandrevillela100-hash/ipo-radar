import { describe, expect, it } from "vitest";
import { chunkDocument, extractText, validateExtraction } from "./chunker";

describe("extractText", () => {
  it("handles plain text input", () => {
    const input = "This is a plain text SEC filing with important information.";
    const result = extractText(input);
    expect(result).toBe(input);
  });

  it("strips HTML tags and preserves paragraph structure", () => {
    const html = `<html><body>
      <h1>RISK FACTORS</h1>
      <p>Investing in our common stock involves a high degree of risk.</p>
      <p>You should carefully consider the following risks.</p>
    </body></html>`;
    const result = extractText(html);
    expect(result).toContain("RISK FACTORS");
    expect(result).toContain("high degree of risk");
    expect(result).toContain("carefully consider");
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("<h1>");
  });

  it("removes script and style blocks", () => {
    const html = `<html><body>
      <script>alert('xss')</script>
      <style>.red { color: red; }</style>
      <p>Important content here.</p>
    </body></html>`;
    const result = extractText(html);
    expect(result).toContain("Important content here");
    expect(result).not.toContain("alert");
    expect(result).not.toContain("color: red");
  });

  it("decodes HTML entities", () => {
    const html = "<p>Revenue &amp; profit &gt; $100M</p>";
    const result = extractText(html);
    expect(result).toContain("Revenue & profit > $100M");
  });
});

describe("validateExtraction", () => {
  it("rejects very short text", () => {
    const result = validateExtraction("Too short");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("too short");
  });

  it("accepts normal text", () => {
    const text = "This is a sufficiently long text that contains meaningful content about the company's business operations, financial performance, and risk factors. It should pass validation without any issues.";
    const result = validateExtraction(text);
    expect(result.valid).toBe(true);
  });

  it("rejects binary content", () => {
    const binary = "\x00\x01\x02\x03\x04\x05".repeat(100);
    const result = validateExtraction(binary);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("binary");
  });
});

describe("chunkDocument", () => {
  it("returns empty array for very short text", () => {
    const result = chunkDocument("Short.");
    expect(result).toEqual([]);
  });

  it("creates chunks from a longer document", () => {
    const paragraphs = [];
    for (let i = 0; i < 20; i++) {
      paragraphs.push(
        `Paragraph ${i + 1}: This is a substantial paragraph of text that discusses various aspects of the company's operations, financial performance, and strategic direction. It contains enough content to be meaningful for analysis and retrieval purposes.`
      );
    }
    const text = paragraphs.join("\n\n");
    const chunks = chunkDocument(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].chunkText.length).toBeGreaterThan(50);
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
  });

  it("detects section labels from S-1 headers", () => {
    // Build a document large enough to produce multiple chunks with different sections
    const riskContent = Array(10).fill(
      "Investing in our common stock involves a high degree of risk. You should carefully consider the following risks before making an investment decision. Each of these risks could materially and adversely affect our business, financial condition, and results of operations."
    ).join("\n\n");
    const proceedsContent = Array(10).fill(
      "We estimate that the net proceeds from this offering will be approximately $200 million. We intend to use the net proceeds from this offering for general corporate purposes, including working capital, operating expenses, and capital expenditures."
    ).join("\n\n");

    const text = `RISK FACTORS\n\n${riskContent}\n\nUSE OF PROCEEDS\n\n${proceedsContent}`;

    const chunks = chunkDocument(text);
    expect(chunks.length).toBeGreaterThan(1);

    // At least one chunk should have a section label
    const hasSectionLabel = chunks.some(c => c.sectionLabel !== null);
    expect(hasSectionLabel).toBe(true);

    // Check that RISK FACTORS is detected
    const hasRiskFactors = chunks.some(c => c.sectionLabel === "RISK FACTORS");
    expect(hasRiskFactors).toBe(true);
  });

  it("assigns sequential chunk indices", () => {
    const text = Array(30)
      .fill(
        "This is a paragraph with enough content to create multiple chunks when combined with other paragraphs in the document."
      )
      .join("\n\n");
    const chunks = chunkDocument(text);

    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunkIndex).toBe(i);
    }
  });
});
