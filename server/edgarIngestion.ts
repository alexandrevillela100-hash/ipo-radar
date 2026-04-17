/**
 * EDGAR Ingestion Service
 * Orchestrates the full pipeline:
 *   1. Search EDGAR for recent S-1/F-1 filings
 *   2. For each new filing, fetch company details
 *   3. Store company + filing data in the database
 */

import {
  searchRecentFilings,
  fetchCompanyData,
  daysAgo,
  today,
} from "./edgar";
import {
  upsertCompany,
  insertFilingIfNew,
  getCompanyByCik,
  getStats,
} from "./db";

export interface IngestionResult {
  searchedFrom: string;
  searchedTo: string;
  filingsFound: number;
  newFilingsStored: number;
  companiesProcessed: number;
  errors: string[];
}

export async function runIngestion(
  lookbackDays = 30
): Promise<IngestionResult> {
  const startDate = daysAgo(lookbackDays);
  const endDate = today();
  const errors: string[] = [];

  console.log(
    `[Ingestion] Starting ingestion for ${startDate} to ${endDate}...`
  );

  let filingHits;
  try {
    filingHits = await searchRecentFilings(startDate, endDate);
  } catch (error: any) {
    console.error("[Ingestion] Failed to search EDGAR:", error.message);
    return {
      searchedFrom: startDate,
      searchedTo: endDate,
      filingsFound: 0,
      newFilingsStored: 0,
      companiesProcessed: 0,
      errors: [`Search failed: ${error.message}`],
    };
  }

  let newFilingsStored = 0;
  const companiesProcessed = new Set<string>();

  for (const hit of filingHits) {
    const cik = hit.ciks[0];
    if (!cik) {
      errors.push(`Filing ${hit.accessionNumber} has no CIK, skipping.`);
      continue;
    }

    try {
      if (!companiesProcessed.has(cik)) {
        const existing = await getCompanyByCik(cik);
        if (!existing) {
          const companyData = await fetchCompanyData(cik);
          await upsertCompany({
            cik: cik,
            name: companyData.name,
            ticker: companyData.tickers[0] ?? null,
            exchange: companyData.exchanges[0] ?? null,
            sic: companyData.sic,
            sicDescription: companyData.sicDescription,
            stateOfIncorporation: companyData.stateOfIncorporation,
            businessAddress: companyData.businessAddress.street1,
            businessCity: companyData.businessAddress.city,
            businessState: companyData.businessAddress.stateOrCountry,
            businessZip: companyData.businessAddress.zipCode,
            fiscalYearEnd: companyData.fiscalYearEnd,
            entityType: companyData.entityType,
          });
          console.log(`[Ingestion] Stored company: ${companyData.name} (CIK ${cik})`);
        }
        companiesProcessed.add(cik);
      }

      const filingStatus = hit.fileType.includes("/A") ? "Amended" : "Filed";
      const accNoDashes = hit.accessionNumber.replace(/-/g, "");
      const paddedCik = cik.padStart(10, "0");
      const filingUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${accNoDashes}/`;

      const wasNew = await insertFilingIfNew({
        accessionNumber: hit.accessionNumber,
        companyCik: cik,
        formType: hit.fileType,
        filingDate: hit.fileDate,
        primaryDocument: null,
        primaryDocDescription: hit.fileDescription || null,
        filingUrl,
        filingStatus,
      });

      if (wasNew) {
        newFilingsStored++;
        console.log(
          `[Ingestion] New filing: ${hit.fileType} from ${hit.displayNames[0] ?? "Unknown"} (${hit.fileDate})`
        );
      }
    } catch (error: any) {
      const msg = `Error processing CIK ${cik} / ${hit.accessionNumber}: ${error.message}`;
      console.error(`[Ingestion] ${msg}`);
      errors.push(msg);
    }
  }

  const stats = await getStats();
  console.log(
    `[Ingestion] Complete. New filings: ${newFilingsStored}. ` +
      `DB totals: ${stats.companies} companies, ${stats.filings} filings.`
  );

  return {
    searchedFrom: startDate,
    searchedTo: endDate,
    filingsFound: filingHits.length,
    newFilingsStored,
    companiesProcessed: companiesProcessed.size,
    errors,
  };
}
