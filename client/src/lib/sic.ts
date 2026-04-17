/**
 * SIC Code → Sector Mapping
 * ──────────────────────────
 * Maps SEC Standard Industrial Classification codes to human-readable
 * sector names and display colors for the IPO card grid.
 *
 * SIC codes are 4-digit numbers. We match on the first 2 digits (division)
 * to keep the mapping manageable while covering all industries.
 */

interface SectorInfo {
  name: string;
  color: string;
}

// Map SIC division prefixes to sector names and colors
const SIC_DIVISIONS: Record<string, SectorInfo> = {
  // Agriculture, Forestry, Fishing (01-09)
  "01": { name: "Agriculture", color: "#22C55E" },
  "02": { name: "Agriculture", color: "#22C55E" },
  "07": { name: "Agriculture", color: "#22C55E" },
  "08": { name: "Forestry", color: "#16A34A" },
  "09": { name: "Fishing", color: "#0EA5E9" },
  // Mining (10-14)
  "10": { name: "Mining", color: "#A16207" },
  "12": { name: "Mining", color: "#A16207" },
  "13": { name: "Oil & Gas", color: "#D97706" },
  "14": { name: "Mining", color: "#A16207" },
  // Construction (15-17)
  "15": { name: "Construction", color: "#EA580C" },
  "16": { name: "Construction", color: "#EA580C" },
  "17": { name: "Construction", color: "#EA580C" },
  // Manufacturing (20-39)
  "20": { name: "Food & Beverage", color: "#F59E0B" },
  "21": { name: "Tobacco", color: "#78716C" },
  "22": { name: "Textiles", color: "#EC4899" },
  "23": { name: "Apparel", color: "#EC4899" },
  "24": { name: "Wood Products", color: "#A16207" },
  "25": { name: "Furniture", color: "#78716C" },
  "26": { name: "Paper", color: "#78716C" },
  "27": { name: "Publishing", color: "#8B5CF6" },
  "28": { name: "Chemicals & Pharma", color: "#10B981" },
  "29": { name: "Petroleum Refining", color: "#D97706" },
  "30": { name: "Rubber & Plastics", color: "#78716C" },
  "31": { name: "Leather", color: "#A16207" },
  "32": { name: "Glass & Concrete", color: "#78716C" },
  "33": { name: "Primary Metals", color: "#64748B" },
  "34": { name: "Fabricated Metals", color: "#64748B" },
  "35": { name: "Industrial Machinery", color: "#64748B" },
  "36": { name: "Electronics", color: "#3B82F6" },
  "37": { name: "Transportation Equipment", color: "#64748B" },
  "38": { name: "Instruments & Devices", color: "#6366F1" },
  "39": { name: "Miscellaneous Manufacturing", color: "#78716C" },
  // Transportation & Utilities (40-49)
  "40": { name: "Transportation", color: "#0EA5E9" },
  "41": { name: "Transportation", color: "#0EA5E9" },
  "42": { name: "Transportation", color: "#0EA5E9" },
  "43": { name: "Postal Services", color: "#64748B" },
  "44": { name: "Water Transport", color: "#0EA5E9" },
  "45": { name: "Air Transport", color: "#0EA5E9" },
  "46": { name: "Pipelines", color: "#D97706" },
  "47": { name: "Travel Services", color: "#EC4899" },
  "48": { name: "Telecommunications", color: "#8B5CF6" },
  "49": { name: "Utilities", color: "#F59E0B" },
  // Wholesale Trade (50-51)
  "50": { name: "Wholesale Trade", color: "#64748B" },
  "51": { name: "Wholesale Trade", color: "#64748B" },
  // Retail Trade (52-59)
  "52": { name: "Retail", color: "#EC4899" },
  "53": { name: "Retail", color: "#EC4899" },
  "54": { name: "Retail", color: "#EC4899" },
  "55": { name: "Automotive Retail", color: "#D97706" },
  "56": { name: "Apparel Retail", color: "#EC4899" },
  "57": { name: "Home Furnishing Retail", color: "#78716C" },
  "58": { name: "Food Service", color: "#F59E0B" },
  "59": { name: "Retail", color: "#EC4899" },
  // Finance, Insurance, Real Estate (60-67)
  "60": { name: "Banking", color: "#0EA5E9" },
  "61": { name: "Credit & Finance", color: "#0EA5E9" },
  "62": { name: "Securities & Investments", color: "#3B82F6" },
  "63": { name: "Insurance", color: "#6366F1" },
  "64": { name: "Insurance", color: "#6366F1" },
  "65": { name: "Real Estate", color: "#A16207" },
  "67": { name: "Investment Holding", color: "#3B82F6" },
  // Services (70-89)
  "70": { name: "Hospitality", color: "#EC4899" },
  "72": { name: "Personal Services", color: "#78716C" },
  "73": { name: "Business Services", color: "#8B5CF6" },
  "75": { name: "Auto Services", color: "#D97706" },
  "76": { name: "Repair Services", color: "#78716C" },
  "78": { name: "Entertainment", color: "#EC4899" },
  "79": { name: "Recreation", color: "#EC4899" },
  "80": { name: "Healthcare", color: "#10B981" },
  "81": { name: "Legal Services", color: "#64748B" },
  "82": { name: "Education", color: "#8B5CF6" },
  "83": { name: "Social Services", color: "#22C55E" },
  "84": { name: "Museums & Galleries", color: "#EC4899" },
  "86": { name: "Membership Organizations", color: "#78716C" },
  "87": { name: "Engineering & Management", color: "#6366F1" },
  "89": { name: "Professional Services", color: "#64748B" },
  // Public Administration (91-99)
  "91": { name: "Government", color: "#64748B" },
  "92": { name: "Government", color: "#64748B" },
  "93": { name: "Government", color: "#64748B" },
  "94": { name: "Government", color: "#64748B" },
  "95": { name: "Government", color: "#64748B" },
  "96": { name: "Government", color: "#64748B" },
  "97": { name: "Government", color: "#64748B" },
  "99": { name: "Nonclassifiable", color: "#78716C" },
};

// Fallback sector
const DEFAULT_SECTOR: SectorInfo = { name: "Technology", color: "#14B8A6" };

/**
 * Resolve a SIC code to a sector name and color.
 * Falls back to the SIC description if no mapping exists,
 * and ultimately to "Technology" as the default.
 */
export function getSectorFromSic(
  sic?: string | null,
  sicDescription?: string | null
): SectorInfo {
  if (sic) {
    const prefix = sic.slice(0, 2);
    const match = SIC_DIVISIONS[prefix];
    if (match) return match;
  }
  // Try to infer from description
  if (sicDescription) {
    const desc = sicDescription.toLowerCase();
    if (desc.includes("pharma") || desc.includes("biotech"))
      return { name: "Biotech & Pharma", color: "#10B981" };
    if (desc.includes("software") || desc.includes("computer"))
      return { name: "Technology", color: "#14B8A6" };
    if (desc.includes("bank") || desc.includes("financ"))
      return { name: "Financial Services", color: "#3B82F6" };
    return { name: sicDescription.slice(0, 30), color: "#64748B" };
  }
  return DEFAULT_SECTOR;
}

// ─── Sector → Real Photo CDN Mapping ─────────────────────────────────────
// Each sector is mapped to a high-quality photograph from CDN
const SECTOR_IMAGE_MAP: Record<string, string> = {
  // Technology & Software
  "Technology": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-tech_0d9c6e2c.jpg",
  "Electronics": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-tech_0d9c6e2c.jpg",
  "Telecommunications": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-fintech_222de0ae.jpg",
  "Business Services": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-office_2eba51e8.jpg",

  // Healthcare & Biotech
  "Healthcare": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-biotech_8a742b89.jpg",
  "Chemicals & Pharma": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-biotech_8a742b89.jpg",
  "Biotech & Pharma": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-biotech_8a742b89.jpg",
  "Instruments & Devices": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-biotech_8a742b89.jpg",

  // Energy
  "Oil & Gas": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-energy_360fc5d7.jpg",
  "Utilities": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-energy_360fc5d7.jpg",
  "Petroleum Refining": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-energy_360fc5d7.jpg",
  "Pipelines": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-energy_360fc5d7.jpg",

  // Manufacturing
  "Industrial Machinery": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-manufacturing_ffc2c505.jpg",
  "Primary Metals": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-manufacturing_ffc2c505.jpg",
  "Fabricated Metals": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-manufacturing_ffc2c505.jpg",
  "Transportation Equipment": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-manufacturing_ffc2c505.jpg",
  "Miscellaneous Manufacturing": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-manufacturing_ffc2c505.jpg",
  "Construction": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-manufacturing_ffc2c505.jpg",

  // Finance
  "Banking": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-wallstreet_20cd5add.jpg",
  "Credit & Finance": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-wallstreet_20cd5add.jpg",
  "Securities & Investments": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-finance_2870feb6.jpg",
  "Insurance": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-finance_2870feb6.jpg",
  "Investment Holding": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-finance_2870feb6.jpg",
  "Financial Services": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-finance_2870feb6.jpg",
  "Real Estate": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-wallstreet_20cd5add.jpg",

  // Professional & Services
  "Engineering & Management": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-fintech_222de0ae.jpg",
  "Professional Services": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-office_2eba51e8.jpg",
  "Education": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-office_2eba51e8.jpg",
  "Legal Services": "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-office_2eba51e8.jpg",
};

// Default fallback image for unmapped sectors
const DEFAULT_SECTOR_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/sector-fintech_222de0ae.jpg";

/**
 * Get a high-quality photograph for a sector.
 * Maps sector names to real CDN-hosted images.
 */
export function getSectorImagePlaceholder(sectorName: string): string {
  return SECTOR_IMAGE_MAP[sectorName] || DEFAULT_SECTOR_IMAGE;
}
