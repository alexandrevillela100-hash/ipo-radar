/**
 * Sector utility wrapper for page components.
 * Provides a consistent interface for getting sector info from SIC codes.
 */
import { getSectorFromSic } from "./sic";

export interface SectorDisplayInfo {
  sector: string;
  color: string;
  description: string;
}

/**
 * Get display-friendly sector info from a SIC code.
 */
export function getSectorInfo(sicCode?: string | null, sicDescription?: string | null): SectorDisplayInfo {
  const info = getSectorFromSic(sicCode, sicDescription);
  return {
    sector: info.name,
    color: info.color,
    description: sicDescription || `${info.name} industry`,
  };
}

/**
 * All known sector names for filter dropdowns.
 */
export const ALL_SECTORS = [
  "Agriculture", "Air Transport", "Apparel", "Apparel Retail", "Auto Dealers",
  "Auto Services", "Banking", "Chemicals & Pharma", "Construction", "Credit Services",
  "Education", "Electronics", "Engineering & Management", "Entertainment",
  "Fabricated Metals", "Fishing", "Food & Beverage", "Forestry", "Furniture",
  "Glass & Concrete", "Government", "Grocery & Food Retail", "Healthcare",
  "Home Furnishing Retail", "Hospitality", "Industrial Machinery", "Insurance",
  "Investment Services", "Leather", "Legal Services", "Manufacturing",
  "Membership Organizations", "Mining", "Non-Classifiable", "Oil & Gas",
  "Paper", "Personal Services", "Petroleum Refining", "Pipelines",
  "Postal Services", "Primary Metals", "Professional Services", "Publishing",
  "Railroads", "Real Estate", "Recreation", "Repair Services", "Restaurants",
  "Retail", "Rubber & Plastics", "Securities & Investments", "Social Services",
  "Technology Services", "Telecommunications", "Textiles", "Tobacco",
  "Transit", "Transportation Equipment", "Transportation Services", "Trucking",
  "Utilities", "Water Transport", "Wholesale Trade", "Wood Products",
];
