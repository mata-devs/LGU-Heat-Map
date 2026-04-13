/**
 * Dynamic Sheet Discovery
 * 
 * Fetches sheets and verifies they have Municipality data.
 * Sheet names are configured in config/dataset-sheets.ts
 */

export interface DiscoveredSheet {
  name: string;
  label: string;
  id: string;
  unit: string;
  source: string;
}

function generateSheetId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
}

/** Convert to Title Case for display */
function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Check if a sheet exists and has valid data */
async function verifySheet(spreadsheetId: string, name: string): Promise<boolean> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
    const res = await fetch(url);
    if (!res.ok) return false;
    const text = await res.text();
    return text.includes('Municipality') || text.includes('municipality');
  } catch {
    return false;
  }
}

/**
 * Discover valid sheets from a spreadsheet
 * @param sheetUrl - The Google Sheet URL
 * @param sheetNames - Array of sheet tab names to check
 */
export async function discoverSheetsFromUrl(
  sheetUrl: string,
  sheetNames: string[]
): Promise<string[]> {
  const match = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match || sheetNames.length === 0) return [];

  const spreadsheetId = match[1];

  // Verify each sheet in parallel
  const results = await Promise.all(
    sheetNames.map(async (name) => {
      const valid = await verifySheet(spreadsheetId, name);
      return valid ? name : null;
    })
  );

  return results.filter((n): n is string => n !== null);
}

/** Default sheet names (matches your actual sheets) */
export const DEFAULT_SHEET_NAMES = [
  'tourist arrivals',
  'motorist volume for fuel allocation',
  'voting population',
  'power situation monitoring',
  'others',
];

/** Map sheet names to display units */
export const SHEET_UNITS: Record<string, string> = {
  'tourist arrivals': 'arrivals',
  'motorist volume for fuel allocation': 'vehicles',
  'voting population': 'voters',
  'power situation monitoring': 'MW',
  'others': 'units',
};

/** Get unit for a sheet name */
export function getSheetUnit(name: string): string {
  return SHEET_UNITS[name] || 'units';
}

export async function getDiscoveredSheets(
  sheetUrl: string,
  sheetNames?: string[]
): Promise<DiscoveredSheet[]> {
  const names = await discoverSheetsFromUrl(sheetUrl, sheetNames || DEFAULT_SHEET_NAMES);
  return names.map(n => ({ 
    name: n, 
    label: toTitleCase(n), 
    id: generateSheetId(n),
    unit: getSheetUnit(n),
    source: '', // Will be filled when we preload data
  }));
}