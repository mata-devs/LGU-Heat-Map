/**
 * Dataset Sheet Configuration
 * 
 * Maps each dataset to its Google Sheet URL
 * Each sheet should have 2 columns: Municipality/City Name | Value
 * 
 * Replace the URLs with your actual Google Sheet URLs
 * 
 * To get the CSV export URL:
 * 1. Open your Google Sheet
 * 2. Go to File > Share > Publish to web
 * 3. Select "Comma-separated values (.csv)"
 * 4. Click "Publish" and copy the URL
 * 
 * Or use the direct sheet URL - the code will convert it automatically
 */

import type { DatasetMeta } from '@/data/datasets';

// Sheet URLs for each dataset
// Replace these with your actual Google Sheet URLs
// Leave empty string to use fallback mock data
export const DATASET_SHEET_URLS: Record<string, string> = {
  // Example: Uncomment and replace with your sheet URL
  // tourist_arrivals: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit',
  
  // For now, all datasets will use fallback mock data
  tourist_arrivals: '',
  motorist_volume: '',
  voting_population: '',
  fuel_allocation: '',
  power_monitoring: '',
  municipalities_only: '',
};

/**
 * Get the sheet URL for a dataset
 * Returns empty string if not configured (will use fallback)
 */
export function getSheetUrlForDataset(datasetId: string): string {
  return DATASET_SHEET_URLS[datasetId] || '';
}

/**
 * Check if any dataset has a configured sheet URL
 */
export function hasAnySheetConfigured(): boolean {
  return Object.values(DATASET_SHEET_URLS).some(url => url.length > 0);
}

/**
 * Get all configured dataset IDs
 */
export function getConfiguredDatasets(): string[] {
  return Object.entries(DATASET_SHEET_URLS)
    .filter(([_, url]) => url.length > 0)
    .map(([id]) => id);
}

/**
 * Environment variable override
 * Set VITE_GOOGLE_SHEET_URL in your .env file to override all dataset URLs
 * (useful for development/testing)
 */
export const SHEET_URL_OVERRIDE = import.meta.env.VITE_GOOGLE_SHEET_URL || '';

/**
 * Get effective sheet URL with environment override
 */
export function getEffectiveSheetUrl(datasetId: string): string {
  if (SHEET_URL_OVERRIDE) {
    return SHEET_URL_OVERRIDE;
  }
  return getSheetUrlForDataset(datasetId);
}