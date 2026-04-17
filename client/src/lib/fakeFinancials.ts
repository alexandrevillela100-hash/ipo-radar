/**
 * Fake Financial Data Generator
 * ─────────────────────────────
 * Generates realistic-looking placeholder financial data for IPO detail pages.
 * Uses the company CIK as a seed so the same company always gets the same numbers.
 * These will be replaced with real data extracted from S-1 filings later.
 */

export interface FinancialMetrics {
  revenue: number;
  revenueGrowth: number;
  costOfRevenue: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
  netMargin: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashAndEquivalents: number;
  totalDebt: number;
  employeeCount: number;
}

export interface OfferingDetails {
  sharesOffered: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  estimatedProceeds: number;
  useOfProceeds: string[];
  underwriters: string[];
  lockupPeriod: string;
}

export interface RiskFactor {
  title: string;
  severity: "High" | "Medium" | "Low";
}

export interface FakeFinancialData {
  metrics: FinancialMetrics;
  historicalRevenue: { year: string; revenue: number }[];
  offering: OfferingDetails;
  riskFactors: RiskFactor[];
}

/**
 * Simple seeded pseudo-random number generator.
 * Takes a CIK string and produces deterministic "random" numbers.
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  let state = Math.abs(hash) || 12345;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/** Round to millions for display */
function toMillions(n: number): number {
  return Math.round(n / 100000) * 100000;
}

const UNDERWRITER_POOLS = [
  ["Goldman Sachs", "Morgan Stanley", "J.P. Morgan"],
  ["Morgan Stanley", "BofA Securities", "Citigroup"],
  ["J.P. Morgan", "Goldman Sachs", "Barclays"],
  ["Citigroup", "Deutsche Bank", "UBS"],
  ["BofA Securities", "Credit Suisse", "Jefferies"],
  ["Goldman Sachs", "Citigroup", "Wells Fargo"],
  ["Morgan Stanley", "J.P. Morgan", "RBC Capital Markets"],
  ["Barclays", "Goldman Sachs", "Piper Sandler"],
  ["J.P. Morgan", "BofA Securities", "William Blair"],
  ["UBS", "Morgan Stanley", "Stifel"],
];

const USE_OF_PROCEEDS_OPTIONS = [
  "General corporate purposes and working capital",
  "Research and development activities",
  "Sales and marketing expansion",
  "Potential acquisitions and strategic investments",
  "Repayment of outstanding indebtedness",
  "Capital expenditures and infrastructure",
  "International market expansion",
  "Technology platform development",
  "Hiring additional personnel",
  "Regulatory compliance and licensing",
];

const RISK_FACTOR_POOL: RiskFactor[] = [
  { title: "Limited operating history with significant accumulated deficit", severity: "High" },
  { title: "Dependence on a small number of key customers for revenue", severity: "High" },
  { title: "Intense competition from well-capitalized incumbents", severity: "High" },
  { title: "Regulatory uncertainty in primary operating markets", severity: "High" },
  { title: "History of net losses with no assurance of future profitability", severity: "High" },
  { title: "Reliance on third-party suppliers and service providers", severity: "Medium" },
  { title: "Cybersecurity risks and data privacy obligations", severity: "Medium" },
  { title: "Foreign currency exchange rate fluctuations", severity: "Medium" },
  { title: "Potential dilution from future equity issuances", severity: "Medium" },
  { title: "Concentration of voting power among founders and insiders", severity: "Medium" },
  { title: "Seasonal fluctuations may affect quarterly results", severity: "Low" },
  { title: "Dependence on intellectual property protections", severity: "Low" },
  { title: "Potential impact of macroeconomic conditions on demand", severity: "Medium" },
  { title: "Integration risks from recent or planned acquisitions", severity: "Medium" },
  { title: "Evolving accounting standards may affect reported results", severity: "Low" },
];

/**
 * Generate fake financial data for a company.
 * The CIK is used as a seed so the same company always gets the same numbers.
 */
export function generateFakeFinancials(
  cik: string,
  sectorName: string
): FakeFinancialData {
  const rand = seededRandom(cik);

  // Determine company scale based on sector and random seed
  const isLargeCompany = rand() > 0.6;
  const baseRevenue = isLargeCompany
    ? 100_000_000 + rand() * 900_000_000  // $100M - $1B
    : 10_000_000 + rand() * 90_000_000;   // $10M - $100M

  const revenue = toMillions(baseRevenue);
  const revenueGrowth = Math.round((15 + rand() * 85) * 10) / 10; // 15% - 100%

  // Historical revenue (3 years back)
  const currentYear = new Date().getFullYear();
  const historicalRevenue = [];
  let histRev = revenue;
  for (let i = 0; i < 4; i++) {
    historicalRevenue.unshift({
      year: `FY${currentYear - i}`,
      revenue: toMillions(histRev),
    });
    histRev = histRev / (1 + (revenueGrowth / 100) * (0.8 + rand() * 0.4));
  }

  // Cost structure varies by sector
  const isTech = ["Technology Services", "Electronics", "Telecommunications"].includes(sectorName);
  const isBiotech = ["Chemicals & Pharma", "Healthcare"].includes(sectorName);
  const isFinance = ["Banking", "Securities & Investments", "Insurance", "Investment Services"].includes(sectorName);

  const grossMarginBase = isTech ? 0.60 : isBiotech ? 0.55 : isFinance ? 0.70 : 0.40;
  const grossMargin = grossMarginBase + rand() * 0.15;
  const costOfRevenue = toMillions(revenue * (1 - grossMargin));
  const grossProfit = revenue - costOfRevenue;

  // Most IPO companies are not yet profitable
  const isProfitable = rand() > 0.7;
  const opexRatio = isProfitable ? 0.25 + rand() * 0.15 : 0.45 + rand() * 0.25;
  const operatingExpenses = toMillions(revenue * opexRatio);
  const operatingIncome = grossProfit - operatingExpenses;
  const netIncome = toMillions(operatingIncome * (0.75 + rand() * 0.2));
  const netMargin = Math.round((netIncome / revenue) * 1000) / 10;

  // Balance sheet
  const totalAssets = toMillions(revenue * (1.5 + rand() * 2.5));
  const debtRatio = 0.3 + rand() * 0.35;
  const totalLiabilities = toMillions(totalAssets * debtRatio);
  const totalEquity = totalAssets - totalLiabilities;
  const cashAndEquivalents = toMillions(totalAssets * (0.1 + rand() * 0.25));
  const totalDebt = toMillions(totalLiabilities * (0.4 + rand() * 0.4));

  const employeeCount = Math.round(
    isLargeCompany ? 500 + rand() * 4500 : 50 + rand() * 450
  );

  // Offering details
  const sharePrice = Math.round((12 + rand() * 28) * 100) / 100;
  const priceRangeLow = Math.round((sharePrice * 0.85) * 100) / 100;
  const priceRangeHigh = Math.round((sharePrice * 1.15) * 100) / 100;
  const sharesOffered = Math.round((revenue * (0.15 + rand() * 0.2)) / sharePrice / 100000) * 100000;
  const estimatedProceeds = toMillions(sharesOffered * sharePrice);

  // Pick underwriters
  const underwriterIdx = Math.floor(rand() * UNDERWRITER_POOLS.length);
  const underwriters = UNDERWRITER_POOLS[underwriterIdx];

  // Pick use of proceeds (3-5 items)
  const numUses = 3 + Math.floor(rand() * 3);
  const shuffledUses = [...USE_OF_PROCEEDS_OPTIONS].sort(() => rand() - 0.5);
  const useOfProceeds = shuffledUses.slice(0, numUses);

  // Pick risk factors (4-6 items)
  const numRisks = 4 + Math.floor(rand() * 3);
  const shuffledRisks = [...RISK_FACTOR_POOL].sort(() => rand() - 0.5);
  const riskFactors = shuffledRisks.slice(0, numRisks);

  const lockupOptions = ["180 days", "180 days", "180 days", "150 days", "120 days", "365 days"];
  const lockupPeriod = lockupOptions[Math.floor(rand() * lockupOptions.length)];

  return {
    metrics: {
      revenue,
      revenueGrowth,
      costOfRevenue,
      grossProfit,
      grossMargin: Math.round(grossMargin * 1000) / 10,
      operatingExpenses,
      operatingIncome,
      netIncome,
      netMargin,
      totalAssets,
      totalLiabilities,
      totalEquity,
      cashAndEquivalents,
      totalDebt,
      employeeCount,
    },
    historicalRevenue,
    offering: {
      sharesOffered,
      priceRangeLow,
      priceRangeHigh,
      estimatedProceeds,
      useOfProceeds,
      underwriters,
      lockupPeriod,
    },
    riskFactors,
  };
}

/** Format a number as currency (e.g., $123.4M or $1.2B) */
export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

/** Format a number with commas */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
