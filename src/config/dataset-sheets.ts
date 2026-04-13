/**
 * Dataset Sheet Configuration
 * 
 * FULLY DYNAMIC - Just set your Google Sheet URL below!
 * The app automatically discovers all sheets and creates datasets.
 * No code changes needed when you add/rename/delete sheets in Google Sheets!
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDiscoveredSheets, DEFAULT_SHEET_NAMES, type DiscoveredSheet } from '@/lib/discover-sheets';
import { fetchSheetData, sheetDataToRecord, getDataRange } from '@/lib/google-sheets';

// ============================================================
// SHEET NAMES TO CHECK - Add your new sheet names here!
// ============================================================
// Update this array when you add new sheets in Google Sheets
export const SHEET_NAMES = DEFAULT_SHEET_NAMES;

// ============================================================
// ONE-TIME SETUP: Paste your Google Sheet share link here!
// ============================================================
export const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Dh4o6fimn6BIkJj7M4HYiWY7msMB6k_6fLo2U6ehAXg/edit?usp=sharing';

// ============================================================
// DYNAMIC DATASET HOOK - Auto-discovers + preloads all sheets from your URL
// ============================================================

/** Preloaded data for each dataset */
export interface DatasetData {
  data: Record<string, number>;
  min: number;
  max: number;
  lastUpdated: string;
  source: string;
}

interface DatasetBackup {
  sheets: DiscoveredSheet[];
  datasetData: Record<string, DatasetData>;
  sourceUrl: string;
  timestamp: number;
}

export const DATASET_BACKUP_KEY = 'cebu-insights-datasets-backup-v1';

function saveDatasetBackup(sheets: DiscoveredSheet[], datasetData: Record<string, DatasetData>, sourceUrl: string): void {
  const payload: DatasetBackup = {
    sheets,
    datasetData,
    sourceUrl,
    timestamp: Date.now(),
  };

  localStorage.setItem(DATASET_BACKUP_KEY, JSON.stringify(payload));
}

function loadDatasetBackup(): DatasetBackup | null {
  const raw = localStorage.getItem(DATASET_BACKUP_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DatasetBackup;
  } catch {
    return null;
  }
}

/**
 * React hook that dynamically discovers all datasets from Google Sheets
 * AND preloads all sheet data in parallel for instant switching!
 * 
 * @returns sheets - Array of discovered sheet names/IDs
 * @returns datasetData - Preloaded data for all sheets
 * @returns loading - Whether still discovering/loading
 * @returns error - Any error that occurred
 * @returns refresh - Function to re-discover and reload all sheets
 */
export function useDynamicDatasets() {
  const [sheets, setSheets] = useState<DiscoveredSheet[]>([]);
  const [datasetData, setDatasetData] = useState<Record<string, DatasetData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const datasetDataRef = useRef<Record<string, DatasetData>>({});

  useEffect(() => {
    datasetDataRef.current = datasetData;
  }, [datasetData]);

  const discover = useCallback(async () => {
    setLoading(true);
    setError(null);
    const sourceUrl = getEffectiveSheetUrl();
    
    try {
      // Discover sheets
      const discovered = await getDiscoveredSheets(sourceUrl, SHEET_NAMES);
      if (discovered.length === 0) {
        throw new Error('No valid sheets discovered from configured Google Sheet URL');
      }

      setSheets(discovered);

      // Preload ALL sheets in parallel
      const allData: Record<string, DatasetData> = {};
      
      await Promise.all(
        discovered.map(async (sheet) => {
          try {
            const result = await fetchSheetData(sourceUrl, sheet.name);
            const data = sheetDataToRecord(result.rows);
            const { min, max } = getDataRange(data);
            allData[sheet.id] = {
              data,
              min,
              max,
              lastUpdated: new Date().toISOString(),
              source: result.source,
            };
          } catch (err) {
            console.error(`Failed to preload ${sheet.name}:`, err);

            // Keep previous data for this sheet if available.
            const previousData = datasetDataRef.current[sheet.id];
            if (previousData) {
              allData[sheet.id] = previousData;
            }
          }
        })
      );

      if (Object.keys(allData).length === 0) {
        throw new Error('No sheet data could be loaded from Google Sheets');
      }

      setDatasetData(allData);
      saveDatasetBackup(discovered, allData, sourceUrl);
    } catch (err) {
      const backup = loadDatasetBackup();

      if (backup && Object.keys(backup.datasetData).length > 0 && backup.sheets.length > 0) {
        setSheets(backup.sheets);
        setDatasetData(backup.datasetData);
        setError(`Using backup data: ${err instanceof Error ? err.message : 'Failed to load live sheet data'}`);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to discover sheets');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    discover();
  }, [discover]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      discover();
    }, 10 * 1000);
    return () => clearInterval(interval);
  }, [discover]);

  return { sheets, datasetData, loading, error, refresh: discover };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get the sheet tab name for a dataset ID
 * Used by the data fetcher to know which sheet to query
 */
export function getTabNameForDataset(datasetId: string): string {
  // This function maps dataset ID back to the sheet tab name
  // The datasetId is generated by the discovery function (e.g., "tourist_arrivals" -> "Tourist Arrivals")
  
  // Try to find the sheet by ID and return its name
  // This is automatically generated, no hardcoding needed!
  // Note: This relies on the sheets being loaded, so use after discovery
  return datasetId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get spreadsheet ID from URL
 */
export function getSpreadsheetId(): string {
  const match = GOOGLE_SHEET_URL.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : '';
}

/**
 * Get the base sheet URL
 */
export function getSheetUrl(): string {
  return GOOGLE_SHEET_URL;
}

/**
 * Environment variable override (for development)
 */
export const SHEET_URL_OVERRIDE = import.meta.env.VITE_GOOGLE_SHEET_URL || '';

/**
 * Get effective sheet URL with environment override
 */
export function getEffectiveSheetUrl(): string {
  if (SHEET_URL_OVERRIDE) {
    return SHEET_URL_OVERRIDE;
  }
  return GOOGLE_SHEET_URL;
}

/**
 * Get all dataset IDs (for compatibility)
 * Returns IDs discovered from sheets
 */
export async function getAllDatasetIds(): Promise<string[]> {
  const sheets = await getDiscoveredSheets(GOOGLE_SHEET_URL, SHEET_NAMES);
  return sheets.map(s => s.id);
}