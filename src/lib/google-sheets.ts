/**
 * Google Sheets Data Fetcher
 * 
 * Fetches data from a public Google Sheet (anyone with link can read)
 * Sheet should have 2 columns: Municipality/City Name | Value
 * 
 * Usage:
 *   const { data, loading, error, refresh } = useSheetData(sheetUrl, datasetId);
 */

import { normalizeLocationName } from '@/data/cebu-geo';

export interface SheetRow {
  municipality: string;
  value: number;
  source?: string;
}

export interface SheetData {
  datasetId: string;
  lastUpdated: string;
  source: string;
  data: Record<string, number>;
}

/**
 * Discover all available sheets in a spreadsheet
 * Returns a map of sheet name to gid
 */
export async function discoverSheets(spreadsheetId: string): Promise<Map<string, number>> {
  const sheets = new Map<string, number>();
  
  // Try gids 0-20 to find valid sheets
  for (let gid = 0; gid <= 20; gid++) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const text = await response.text();
        
        // Check if this looks like valid data (has "Municipality" in header)
        if (text.includes('Municipality') || text.includes('municipality')) {
          // Try to detect if there's a sheet name in the content
          // For now, just name them Sheet 1, Sheet 2, etc.
          const existingNames = Array.from(sheets.values());
          const sheetNum = sheets.size + 1;
          sheets.set(`Sheet ${sheetNum}`, gid);
        }
      }
    } catch {
      continue;
    }
  }
  
  return sheets;
}

/**
 * Fetch and parse Google Sheet data as CSV
 * @param sheetUrl - The public Google Sheet URL
 * @param sheetName - Optional: specify which sheet tab to fetch
 * @returns Parsed array of municipality/value pairs
 */
/** Result from fetching a sheet */
export interface SheetFetchResult {
  rows: SheetRow[];
  source: string;
}

export async function fetchSheetData(sheetUrl: string, sheetName?: string): Promise<SheetFetchResult> {
  // Convert Google Sheets URL to gviz API URL
  let csvUrl = sheetUrl;
  let spreadsheetId = '';
  
  if (sheetUrl.includes('docs.google.com/spreadsheets')) {
    // Extract spreadsheet ID
    const match = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      spreadsheetId = match[1];
      
      // Use sheet name parameter if provided, otherwise use gid=0 (first sheet)
      if (sheetName && sheetName.length > 0) {
        // Encode the sheet name
        const encodedName = encodeURIComponent(sheetName);
        csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodedName}`;
      } else {
        csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=0`;
      }
    }
  }
  
  const response = await fetch(csvUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  }
  
  const csvText = await response.text();
  
  // Parse CSV manually (first row = headers)
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('Sheet appears to be empty or has no data rows');
  }
  
  // Parse header to detect column order
  // Expected: "Municipality" | "Value" | "Source" (optional)
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  
  const municipalityIdx = headers.findIndex(h => 
    h.includes('municipality') || h.includes('city') || h.includes('location') || h.includes('name')
  );
  const valueIdx = headers.findIndex(h => 
    h.includes('value') || h.includes('count') || h.includes('number') || h.includes('arrivals') || h.includes('volume')
  );
  const sourceIdx = headers.findIndex(h => 
    h.includes('source') || h.includes('agency') || h.includes('provider')
  );
  
  if (municipalityIdx === -1) {
    throw new Error('Could not find Municipality/City name column. Expected headers like "Municipality" or "City"');
  }
  if (valueIdx === -1) {
    throw new Error('Could not find Value column. Expected headers like "Value", "Count", or "Arrivals"');
  }
  
  // Parse data rows
  const rows: SheetRow[] = [];
  let sheetSource = '';
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length <= Math.max(municipalityIdx, valueIdx)) continue;
    
    const municipality = values[municipalityIdx]?.trim();
    const valueStr = values[valueIdx]?.trim();
    const rowSource = sourceIdx >= 0 ? values[sourceIdx]?.trim() : undefined;
    
    // Skip empty rows
    if (!municipality) continue;
    
    // Parse value (handle commas, spaces, etc.)
    const value = parseNumber(valueStr);
    
    // Use first non-empty source found as sheet source
    if (!sheetSource && rowSource) {
      sheetSource = rowSource;
    }
    
    if (municipality && !isNaN(value)) {
      rows.push({ municipality, value, source: rowSource });
    }
  }
  
  return { rows, source: sheetSource };
}

// Keep old function for backward compat - returns just rows with embedded source
export async function fetchSheetRows(sheetUrl: string, sheetName?: string): Promise<SheetRow[]> {
  const result = await fetchSheetData(sheetUrl, sheetName);
  return result.rows;
}

/**
 * Simple CSV line parser (handles quoted values)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Parse a number from string, handling various formats
 */
function parseNumber(str: string): number {
  if (!str) return NaN;
  
  // Remove commas, spaces, and any non-numeric characters (except . and -)
  const cleaned = str.replace(/[,\s]/g, '').replace(/[^\d.-]/g, '');
  return parseFloat(cleaned);
}

/**
 * Convert array of SheetRow to Record format for choropleth
 * Uses normalizeLocationName to match Google Sheet names to GeoJSON names
 */
export function sheetDataToRecord(rows: SheetRow[]): Record<string, number> {
  const record: Record<string, number> = {};
  const unmapped: string[] = [];
  
  for (const row of rows) {
    // Normalize municipality name using the name normalizer
    const normalizedName = normalizeLocationName(row.municipality);
    
    if (normalizedName) {
      record[normalizedName] = row.value;
    } else {
      // Keep unmapped names for debugging
      unmapped.push(row.municipality);
    }
  }
  
  if (unmapped.length > 0) {
    console.warn(`Could not map ${unmapped.length} municipality names from Google Sheet:`, unmapped);
  }
  
  return record;
}

/**
 * Get data range (min/max) for choropleth color scaling
 */
export function getDataRange(data: Record<string, number>): { min: number; max: number } {
  const values = Object.values(data).filter(v => !isNaN(v));
  if (values.length === 0) return { min: 0, max: 100 };
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/**
 * Configuration for Google Sheets
 * 
 * Replace SHEET_URL with your actual Google Sheet URL
 * Sheet format: 2 columns - Municipality/City Name | Value
 */
export const SHEET_CONFIG = {
  // Public sheet URL (anyone with link can read)
  SHEET_URL: import.meta.env.VITE_GOOGLE_SHEET_URL || '',
  
  // Refresh interval - only 5 seconds for real-time!
  REFRESH_INTERVAL: 5 * 1000,
  
  // Cache key for localStorage
  CACHE_KEY: 'cebu-insights-sheet-data',
  
  // Cache duration - 30 seconds (short for real-time feel)
  CACHE_DURATION: 30 * 1000,
};

/**
 * Check if cached data is still valid
 */
export function isCacheValid(cached: { timestamp: number }): boolean {
  return Date.now() - cached.timestamp < SHEET_CONFIG.CACHE_DURATION;
}