/**
 * SEC EDGAR API Client
 *
 * Provides direct access to SEC EDGAR's free, public APIs for:
 * - Company submissions (filings history, metadata)
 * - XBRL financial data (revenue, income, assets, etc.)
 * - Full-text search across all filings since 2001
 *
 * No API key required. Rate limit: 10 requests/second.
 * Must include User-Agent header with contact email.
 */

const EDGAR_BASE = "https://data.sec.gov";
const EFTS_BASE = "https://efts.sec.gov/LATEST";
const USER_AGENT = "IPORadarAI support@iporadar.ai";

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 110;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`EDGAR API error: ${res.status} ${res.statusText} for ${url}`);
  }

  return res;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EdgarCompanyInfo {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  stateOfIncorporation: string;
  fiscalYearEnd: string;
  filings: {
    recent: EdgarFilingSet;
  };
}

export interface EdgarFilingSet {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  acceptanceDateTime: string[];
  act: string[];
  form: string[];
  fileNumber: string[];
  filmNumber: string[];
  items: string[];
  size: number[];
  isXBRL: number[];
  isInlineXBRL: number[];
  primaryDocument: string[];
  primaryDocDescription: string[];
}

export interface EdgarFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
  primaryDocument: string;
  primaryDocDescription: string;
  size: number;
  isXBRL: boolean;
  edgarUrl: string;
}

export interface XBRLFact {
  end: string;
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  frame?: string;
}

export interface FinancialDataPoint {
  period: string;
  value: number;
  filingDate: string;
  form: string;
  fiscalYear: number;
  fiscalPeriod: string;
}

export interface CompanyFinancials {
  cik: string;
  companyName: string;
  revenue: FinancialDataPoint[];
  netIncome: FinancialDataPoint[];
  totalAssets: FinancialDataPoint[];
  totalLiabilities: FinancialDataPoint[];
  stockholdersEquity: FinancialDataPoint[];
  operatingIncome: FinancialDataPoint[];
  grossProfit: FinancialDataPoint[];
  eps: FinancialDataPoint[];
  sharesOutstanding: FinancialDataPoint[];
  cashAndEquivalents: FinancialDataPoint[];
  operatingCashFlow: FinancialDataPoint[];
  costOfRevenue: FinancialDataPoint[];
}

export interface SearchResult {
  id: string;
  entity_name: string;
  file_num: string;
  file_date: string;
  period_of_report: string;
  form_type: string;
  file_description: string;
  display_date_filed: string;
}

// ---------------------------------------------------------------------------
// CIK Lookup
// ---------------------------------------------------------------------------

export async function lookupCIK(ticker: string): Promise<string | null> {
  const res = await rateLimitedFetch(
    "https://www.sec.gov/files/company_tickers.json"
  );
  const data = await res.json();

  const upperTicker = ticker.toUpperCase();
  for (const key of Object.keys(data)) {
    if (data[key].ticker === upperTicker) {
      return String(data[key].cik_str).padStart(10, "0");
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Submissions API
// ---------------------------------------------------------------------------

export async function getCompanySubmissions(
  cik: string
): Promise<EdgarCompanyInfo> {
  const paddedCik = cik.padStart(10, "0");
  const res = await rateLimitedFetch(
    `${EDGAR_BASE}/submissions/CIK${paddedCik}.json`
  );
  return res.json();
}

export async function getRecentFilings(
  cik: string,
  formFilter?: string[]
): Promise<EdgarFiling[]> {
  const data = await getCompanySubmissions(cik);
  const recent = data.filings.recent;
  const paddedCik = cik.padStart(10, "0");

  const filings: EdgarFiling[] = [];
  for (let i = 0; i < recent.accessionNumber.length; i++) {
    if (formFilter && !formFilter.includes(recent.form[i])) continue;

    const accessionFormatted = recent.accessionNumber[i].replace(/-/g, "");
    filings.push({
      accessionNumber: recent.accessionNumber[i],
      filingDate: recent.filingDate[i],
      reportDate: recent.reportDate[i],
      form: recent.form[i],
      primaryDocument: recent.primaryDocument[i],
      primaryDocDescription: recent.primaryDocDescription[i],
      size: recent.size[i],
      isXBRL: recent.isXBRL[i] === 1,
      edgarUrl: `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${accessionFormatted}/${recent.primaryDocument[i]}`,
    });
  }

  return filings;
}

// ---------------------------------------------------------------------------
// XBRL Financial Data APIs
// ---------------------------------------------------------------------------

export async function getCompanyFacts(cik: string): Promise<any> {
  const paddedCik = cik.padStart(10, "0");
  const res = await rateLimitedFetch(
    `${EDGAR_BASE}/api/xbrl/companyfacts/CIK${paddedCik}.json`
  );
  return res.json();
}

export async function getCompanyConcept(
  cik: string,
  taxonomy: string,
  concept: string
): Promise<any> {
  const paddedCik = cik.padStart(10, "0");
  const res = await rateLimitedFetch(
    `${EDGAR_BASE}/api/xbrl/companyconcept/CIK${paddedCik}/${taxonomy}/${concept}.json`
  );
  return res.json();
}

function extractMetric(
  facts: any,
  concepts: string[],
  unit: string = "USD",
  annualOnly: boolean = true
): FinancialDataPoint[] {
  const results: FinancialDataPoint[] = [];
  const seen = new Set<string>();

  for (const concept of concepts) {
    for (const taxonomy of ["us-gaap", "ifrs-full"]) {
      const conceptData = facts?.facts?.[taxonomy]?.[concept];
      if (!conceptData) continue;

      const unitData = conceptData.units?.[unit] || conceptData.units?.["USD"];
      if (!unitData) continue;

      for (const fact of unitData as XBRLFact[]) {
        if (annualOnly && !["10-K", "20-F", "10-K/A", "20-F/A"].includes(fact.form)) continue;
        if (!fact.end) continue;

        const key = `${fact.end}-${fact.fy}-${fact.fp}`;
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          period: fact.end,
          value: fact.val,
          filingDate: fact.filed,
          form: fact.form,
          fiscalYear: fact.fy,
          fiscalPeriod: fact.fp,
        });
      }
    }
  }

  return results.sort(
    (a, b) => new Date(a.period).getTime() - new Date(b.period).getTime()
  );
}

export async function getCompanyFinancials(
  cik: string
): Promise<CompanyFinancials> {
  const data = await getCompanySubmissions(cik);
  const facts = await getCompanyFacts(cik);

  return {
    cik,
    companyName: data.name,
    revenue: extractMetric(facts, [
      "Revenues",
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "RevenueFromContractWithCustomerIncludingAssessedTax",
      "SalesRevenueNet",
      "Revenue",
    ]),
    netIncome: extractMetric(facts, [
      "NetIncomeLoss",
      "ProfitLoss",
      "NetIncomeLossAvailableToCommonStockholdersBasic",
    ]),
    totalAssets: extractMetric(facts, ["Assets"]),
    totalLiabilities: extractMetric(facts, [
      "Liabilities",
      "LiabilitiesAndStockholdersEquity",
    ]),
    stockholdersEquity: extractMetric(facts, [
      "StockholdersEquity",
      "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ]),
    operatingIncome: extractMetric(facts, [
      "OperatingIncomeLoss",
      "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
    ]),
    grossProfit: extractMetric(facts, ["GrossProfit"]),
    eps: extractMetric(facts, [
      "EarningsPerShareBasic",
      "EarningsPerShareDiluted",
    ], "USD/shares"),
    sharesOutstanding: extractMetric(facts, [
      "CommonStockSharesOutstanding",
      "EntityCommonStockSharesOutstanding",
      "WeightedAverageNumberOfShareOutstandingBasicAndDiluted",
    ], "shares"),
    cashAndEquivalents: extractMetric(facts, [
      "CashAndCashEquivalentsAtCarryingValue",
      "Cash",
      "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
    ]),
    operatingCashFlow: extractMetric(facts, [
      "NetCashProvidedByUsedInOperatingActivities",
      "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
    ]),
    costOfRevenue: extractMetric(facts, [
      "CostOfRevenue",
      "CostOfGoodsAndServicesSold",
    ]),
  };
}

// ---------------------------------------------------------------------------
// EDGAR Full-Text Search (EFTS)
// ---------------------------------------------------------------------------

export async function searchFilings(params: {
  query: string;
  forms?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<SearchResult[]> {
  const urlParams = new URLSearchParams();
  urlParams.set("q", params.query);
  if (params.forms?.length) urlParams.set("forms", params.forms.join(","));
  if (params.startDate) urlParams.set("startdt", params.startDate);
  if (params.endDate) urlParams.set("enddt", params.endDate);

  const res = await rateLimitedFetch(
    `${EFTS_BASE}/search-index?${urlParams.toString()}`
  );
  const data = await res.json();

  const hits = data.hits?.hits || [];
  return hits.slice(0, params.limit || 20).map((hit: any) => ({
    id: hit._id,
    entity_name: hit._source?.entity_name || "",
    file_num: hit._source?.file_num || "",
    file_date: hit._source?.file_date || "",
    period_of_report: hit._source?.period_of_report || "",
    form_type: hit._source?.form_type || "",
    file_description: hit._source?.file_description || "",
    display_date_filed: hit._source?.display_date_filed || "",
  }));
}

export async function searchIPOFilings(params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<SearchResult[]> {
  return searchFilings({
    query: "*",
    forms: ["S-1", "S-1/A", "F-1", "F-1/A"],
    startDate: params?.startDate,
    endDate: params?.endDate,
    limit: params?.limit || 50,
  });
}

// ---------------------------------------------------------------------------
// High-Level Report Data Aggregator
// ---------------------------------------------------------------------------

export interface IPOReportData {
  company: {
    name: string;
    cik: string;
    sic: string;
    sicDescription: string;
    stateOfIncorporation: string;
    tickers: string[];
    exchanges: string[];
    fiscalYearEnd: string;
  };
  filings: EdgarFiling[];
  financials: CompanyFinancials;
  ipoFiling: EdgarFiling | null;
}

export async function getIPOReportData(
  tickerOrCik: string
): Promise<IPOReportData> {
  let cik = tickerOrCik;
  if (!/^\d+$/.test(tickerOrCik)) {
    const resolved = await lookupCIK(tickerOrCik);
    if (!resolved) throw new Error(`Could not find CIK for ticker: ${tickerOrCik}`);
    cik = resolved;
  }

  const companyInfo = await getCompanySubmissions(cik);
  const allFilings = await getRecentFilings(cik);
  const ipoFilings = allFilings.filter((f) =>
    ["S-1", "S-1/A", "F-1", "F-1/A"].includes(f.form)
  );
  const ipoFiling = ipoFilings.length > 0 ? ipoFilings[0] : null;
  const financials = await getCompanyFinancials(cik);

  return {
    company: {
      name: companyInfo.name,
      cik: cik.replace(/^0+/, ""),
      sic: companyInfo.sic,
      sicDescription: companyInfo.sicDescription,
      stateOfIncorporation: companyInfo.stateOfIncorporation,
      tickers: companyInfo.tickers,
      exchanges: companyInfo.exchanges,
      fiscalYearEnd: companyInfo.fiscalYearEnd,
    },
    filings: allFilings,
    financials,
    ipoFiling,
  };
}
