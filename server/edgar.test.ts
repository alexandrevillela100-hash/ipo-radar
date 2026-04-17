import { describe, expect, it } from "vitest";
import {
  searchRecentFilings,
  fetchCompanyData,
  buildFilingUrl,
  daysAgo,
  today,
} from "./edgar";

describe("EDGAR Helper Functions", () => {
  it("buildFilingUrl constructs correct SEC URL", () => {
    const url = buildFilingUrl(
      "1859836",
      "0001104659-26-035973",
      "tm2527636-7_s1.htm"
    );
    expect(url).toBe(
      "https://www.sec.gov/Archives/edgar/data/0001859836/000110465926035973/tm2527636-7_s1.htm"
    );
  });

  it("buildFilingUrl handles already-padded CIK", () => {
    const url = buildFilingUrl(
      "0001859836",
      "0001104659-26-035973",
      "tm2527636-7_s1.htm"
    );
    expect(url).toBe(
      "https://www.sec.gov/Archives/edgar/data/0001859836/000110465926035973/tm2527636-7_s1.htm"
    );
  });

  it("daysAgo returns a valid YYYY-MM-DD string", () => {
    const result = daysAgo(7);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Should be 7 days before today
    const expected = new Date();
    expected.setDate(expected.getDate() - 7);
    expect(result).toBe(expected.toISOString().slice(0, 10));
  });

  it("today returns today's date in YYYY-MM-DD format", () => {
    const result = today();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe("EDGAR EFTS Search API (live)", () => {
  it("searchRecentFilings returns an array of filing hits", async () => {
    // Search for filings from the last 7 days
    const startDate = daysAgo(7);
    const endDate = today();
    const results = await searchRecentFilings(startDate, endDate, 10);

    expect(Array.isArray(results)).toBe(true);
    // We expect at least some filings in any 7-day window
    // (but we don't assert a minimum count since it depends on SEC activity)

    if (results.length > 0) {
      const first = results[0];
      // Verify the structure of a hit
      expect(first.ciks).toBeDefined();
      expect(Array.isArray(first.ciks)).toBe(true);
      expect(first.accessionNumber).toBeDefined();
      expect(typeof first.accessionNumber).toBe("string");
      expect(first.fileType).toBeDefined();
      expect(["S-1", "S-1/A", "F-1", "F-1/A"]).toContain(first.fileType);
      expect(first.fileDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  }, 15000); // 15s timeout for network call
});

describe("EDGAR Submissions API (live)", () => {
  it("fetchCompanyData returns company metadata for a known CIK", async () => {
    // Use Magnum Ice Cream (CIK 0002071668) — a recent F-1 filer
    const data = await fetchCompanyData("2071668");

    expect(data.cik).toBeDefined();
    expect(data.name).toBeDefined();
    expect(typeof data.name).toBe("string");
    expect(data.name.length).toBeGreaterThan(0);
    expect(data.sic).toBeDefined();
    expect(data.businessAddress).toBeDefined();
    expect(data.businessAddress.city).toBeDefined();
    expect(Array.isArray(data.recentFilings)).toBe(true);
  }, 15000); // 15s timeout for network call
});
