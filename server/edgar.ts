/**
 * SEC EDGAR Fetcher Service
 * Communicates with EFTS Full-Text Search and Submissions API.
 */

const USER_AGENT = "IPORadarAI support@iporadar.ai";

let lastRequestTime = 0;
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 120) {
    await new Promise((resolve) => setTimeout(resolve, 120 - elapsed));
  }
  lastRequestTime = Date.now();

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(
      `SEC EDGAR API error: ${response.status} ${response.statusText} for ${url}`
    );
  }
  return response;
}

export interface EFTSHit {
  ciks: string[];
  displayNames: string[];
  form: string;
  fileType: string;
  fileDate: string;
  accessionNumber: string;
  bizLocations: string[];
  sics: string[];
  incStates: string[];
  fileDescription: string;
}

export interface EdgarCompanyData {
  cik: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  sic: string;
  sicDescription: string;
  stateOfIncorporation: string;
  entityType: string;
  fiscalYearEnd: string;
  businessAddress: {
    street1: string;
    city: string;
    stateOrCountry: string;
    zipCode: string;
  };
  recentFilings: {
    form: string;
    filingDate: string;
    accessionNumber: string;
    primaryDocument: string;
    primaryDocDescription: string;
  }[];
}

export async function searchRecentFilings(
  startDate: string,
  endDate: string,
  pageSize = 100
): Promise<EFTSHit[]> {
  const url =
    `https://efts.sec.gov/LATEST/search-index` +
    `?forms=S-1,F-1` +
    `&dateRange=custom` +
    `&startdt=${startDate}` +
    `&enddt=${endDate}` +
    `&from=0&size=${pageSize}`;

  console.log(`[EDGAR] Searching filings from ${startDate} to ${endDate}...`);

  const response = await rateLimitedFetch(url);
  const data = await response.json();

  const hits = data?.hits?.hits ?? [];
  const totalHits = data?.hits?.total?.value ?? 0;
  console.log(`[EDGAR] Found ${totalHits} total document hits, processing ${hits.length}...`);

  const mainFormTypes = new Set(["S-1", "S-1/A", "F-1", "F-1/A"]);
  const seen = new Set<string>();
  const results: EFTSHit[] = [];

  for (const hit of hits) {
    const src = hit._source;
    const fileType: string = src?.file_type ?? "";
    const accession: string = src?.adsh ?? "";

    if (mainFormTypes.has(fileType) && !seen.has(accession)) {
      seen.add(accession);
      results.push({
        ciks: src.ciks ?? [],
        displayNames: src.display_names ?? [],
        form: src.form ?? "",
        fileType: src.file_type ?? "",
        fileDate: src.file_date ?? "",
        accessionNumber: accession,
        bizLocations: src.biz_locations ?? [],
        sics: src.sics ?? [],
        incStates: src.inc_states ?? [],
        fileDescription: src.file_description ?? "",
      });
    }
  }

  console.log(`[EDGAR] Extracted ${results.length} unique main filings.`);
  return results;
}

export async function fetchCompanyData(
  cik: string
): Promise<EdgarCompanyData> {
  const paddedCik = cik.padStart(10, "0");
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

  console.log(`[EDGAR] Fetching company data for CIK ${paddedCik}...`);

  const response = await rateLimitedFetch(url);
  const data = await response.json();

  const recent = data?.filings?.recent ?? {};
  const forms: string[] = recent.form ?? [];
  const filingDates: string[] = recent.filingDate ?? [];
  const accessions: string[] = recent.accessionNumber ?? [];
  const primaryDocs: string[] = recent.primaryDocument ?? [];
  const descriptions: string[] = recent.primaryDocDescription ?? [];

  const ipoForms = new Set(["S-1", "S-1/A", "F-1", "F-1/A"]);
  const recentFilings = [];
  for (let i = 0; i < forms.length; i++) {
    if (ipoForms.has(forms[i])) {
      recentFilings.push({
        form: forms[i],
        filingDate: filingDates[i] ?? "",
        accessionNumber: accessions[i] ?? "",
        primaryDocument: primaryDocs[i] ?? "",
        primaryDocDescription: descriptions[i] ?? "",
      });
    }
  }

  const businessAddr = data?.addresses?.business ?? {};

  const result: EdgarCompanyData = {
    cik: data.cik ?? paddedCik,
    name: data.name ?? "Unknown",
    tickers: data.tickers ?? [],
    exchanges: data.exchanges ?? [],
    sic: data.sic ?? "",
    sicDescription: data.sicDescription ?? "",
    stateOfIncorporation: data.stateOfIncorporation ?? "",
    entityType: data.entityType ?? "",
    fiscalYearEnd: data.fiscalYearEnd ?? "",
    businessAddress: {
      street1: businessAddr.street1 ?? "",
      city: businessAddr.city ?? "",
      stateOrCountry: businessAddr.stateOrCountry ?? "",
      zipCode: businessAddr.zipCode ?? "",
    },
    recentFilings,
  };

  console.log(
    `[EDGAR] Company: ${result.name} | Ticker: ${result.tickers.join(",")} | ` +
      `IPO filings: ${recentFilings.length}`
  );

  return result;
}

export function buildFilingUrl(
  cik: string,
  accessionNumber: string,
  primaryDocument: string
): string {
  const paddedCik = cik.padStart(10, "0");
  const accNoDashes = accessionNumber.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${accNoDashes}/${primaryDocument}`;
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
