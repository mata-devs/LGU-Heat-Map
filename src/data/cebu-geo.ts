/**
 * Minimal GeoJSON loader and utilities
 * Uses accurate Cebu municipalities from public/data/geo/cebu-lgu-boundaries.geojson (53 municipalities)
 * Sourced from GADM v4.1
 */

import type { GeoJSON } from 'geojson';

/**
 * Name normalizer: Maps Google Sheet names to canonical GeoJSON names
 */
export const nameNormalizer: Record<string, string> = {
  // === Direct municipality mappings ===
  'alcantara': 'Alcantara',
  'alcoy': 'Alcoy',
  'alegria': 'Alegria',
  'alegria-cebu': 'Alegria',
  'aloguinsan': 'Aloguinsan',
  'argao': 'Argao',
  'asturias': 'Asturias',
  'badian': 'Badian',
  'balamban': 'Balamban',
  'bantayan': 'Bantayan',
  'barili': 'Barili',
  'boljoon': 'Boljoon',
  'borbon': 'Borbon',
  'catmon': 'Catmon',
  'carmen': 'Carmen',
  'compostela': 'Compostela',
  'consolacion': 'Consolacion',
  'cordova': 'Cordoba',
  'daanbantayan': 'Daanbantayan',
  'dalaguete': 'Dalaguete',
  'dumanjug': 'Dumanjug',
  'ginatilan': 'Ginatilan',
  'liloan': 'Liloan',
  'madridejos': 'Madridejos',
  'malabuyoc': 'Malabuyoc',
  'medellin': 'Medellin',
  'minglanilla': 'Minglanilla',
  'moalboal': 'Moalboal',
  'oslob': 'Oslob',
  'pilar': 'Pilar',
  'pinamungajan': 'Pinamungajan',
  'poro': 'Poro',
  'ronda': 'Ronda',
  'samboan': 'Samboan',
  'san fernando': 'San Fernando',
  'san francisco': 'San Francisco',
  'san remigio': 'San Remigio',
  'santander': 'Santander',
  'santa fe': 'Santa Fe',
  'sibonga': 'Sibonga',
  'sogod': 'Sogod',
  'tabogon': 'Tabogon',
  'tabuelan': 'Tabuelan',
  'tuburan': 'Tuburan',
  'tudela': 'Tudela',
  'tuburan-cebu': 'Tuburan',

  // === City mappings with variations ===
  'bogo': 'Bogo City',
  'bogo city': 'Bogo City',
  'city of bogo': 'Bogo City',
  'bogo-city': 'Bogo City',

  'carcar': 'Carcar City',
  'carcar city': 'Carcar City',
  'city of carcar': 'Carcar City',
  'carcar-city': 'Carcar City',

  'cebu': 'Cebu City',
  'cebu city': 'Cebu City',
  'city of cebu': 'Cebu City',
  'cebu-city': 'Cebu City',
  'cebu city (capital)': 'Cebu City',
  'cebu city, cebu': 'Cebu City',

  'danao': 'Danao City',
  'danao city': 'Danao City',
  'city of danao': 'Danao City',
  'danao-city': 'Danao City',

  'lapu-lapu': 'Lapu-Lapu City',
  'lapu lapu': 'Lapu-Lapu City',
  'lapulapu': 'Lapu-Lapu City',
  'lapu-lapu city': 'Lapu-Lapu City',
  'lapu lapu city': 'Lapu-Lapu City',
  'city of lapu-lapu': 'Lapu-Lapu City',
  'city of lapu lapu': 'Lapu-Lapu City',
  'mactan': 'Lapu-Lapu City',

  'mandaue': 'Mandaue City',
  'mandaue city': 'Mandaue City',
  'city of mandaue': 'Mandaue City',
  'mandaue-city': 'Mandaue City',

  'naga': 'Naga City',
  'naga city': 'Naga City',
  'city of naga': 'Naga City',
  'naga-city': 'Naga City',
  'naga, cebu': 'Naga City',

  'talisay': 'Talisay City',
  'talisay city': 'Talisay City',
  'city of talisay': 'Talisay City',
  'talisay-city': 'Talisay City',
  'talisay, cebu': 'Talisay City',

  'toledo': 'Toledo City',
  'toledo city': 'Toledo City',
  'city of toledo': 'Toledo City',
  'toledo-city': 'Toledo City',
};

/**
 * Normalize a municipality/city name from Google Sheets to match GeoJSON names
 */
export function normalizeLocationName(rawName: string | null | undefined): string | null {
  if (!rawName) return null;

  const lowerName = rawName.toLowerCase().trim();
  const normalized = nameNormalizer[lowerName];
  if (normalized) return normalized;

  const trimmed = rawName.trim();
  const trimmedNormalized = nameNormalizer[trimmed];
  if (trimmedNormalized) return trimmedNormalized;

  const originalNormalized = nameNormalizer[rawName];
  if (originalNormalized) return originalNormalized;

  console.warn(`Unrecognized municipality name: "${rawName}"`);
  return null;
}

/**
 * Approximate Cebu Island bounding box
 */
export const CEBU_BOUNDS: [[number, number], [number, number]] = [
  [9.5, 123.4],
  [11.4, 124.05],
];

/**
 * Cached GeoJSON data
 */
let cebuGeoJSON: GeoJSON.FeatureCollection | null = null;

/**
 * Load Cebu municipalities GeoJSON from public folder (from accurate mbtiles)
 */
export async function loadCebuGeoJSON(): Promise<void> {
  if (cebuGeoJSON) return; // Already loaded

  try {
    const response = await fetch('/data/geo/cebu-lgu-boundaries.geojson');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    cebuGeoJSON = await response.json();
    console.log(`✓ Loaded ${cebuGeoJSON.features.length} Cebu municipalities from GeoJSON`);
  } catch (error) {
    console.error('✗ Failed to load data/geo/cebu-lgu-boundaries.geojson from public folder:', error);
    throw error;
  }
}

/**
 * Get cached GeoJSON (returns null if not yet loaded)
 */
export function getCebuGeoJSON(): GeoJSON.FeatureCollection | null {
  return cebuGeoJSON;
}
