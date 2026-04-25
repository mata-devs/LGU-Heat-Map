# 003-Data-Pipeline-Architecture.md

# Option C: Data Pipeline Architecture

## Overview

This document describes a unified data pipeline that aggregates from multiple sources (Geoboundaries, HDX, government portals, Google Sheets) and normalizes them into a format compatible with the choropleth map visualization.

**Status**: 🔴 Design Phase — needs implementation

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA SOURCES                                   │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┤
│  Geobound-  │     HDX      │  Government │  Google     │    OSM       │
│    aries    │  (UN OCHA)   │   Portals    │   Sheets    │  Overpass    │
│   (ADM3)    │   (ADM4)     │  (Scrapers)  │   (Manual)  │    API       │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴──────┬──────┘
       │              │              │              │              │
       ▼              ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       SOURCE ADAPTERS                                    │
├────────────────┬────────────────┬────────────────┬─────────────────────┤
│ boundary-      │   hdx-         │   portal-      │    sheets-           │
│ fetcher.ts     │   adapter.ts   │   scraper.ts   │    adapter.ts        │
└───────┬────────┴───────┬────────┴───────┬────────┴─────────┬───────────┘
        │                │                │                  │
        ▼                ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        NORMALIZATION LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│  • PSGC code mapping (0722xxx)                                          │
│  • Municipality name normalization (City of X → X)                      │
│  • Unit standardization (visitors, MW, liters)                          │
│  • Date/time normalization (various formats → ISO 8601)                 │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA STORE                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ boundaries  │  │  datasets   │  │  mapping    │  │  cache      │     │
│  │ (GeoJSON)   │  │ (values)    │  │ (PSGC↔name) │  │ (TTL-based) │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API / HOOKS                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  useDynamicDatasets()  │  useChoroplethData()  │  getDataRange()        │
└─────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (ChoroplethMap)                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Source Adapters

### Boundary Fetcher (Geoboundaries)

```typescript
// src/lib/pipeline/boundary-fetcher.ts

import { fetchGeoboundaries } from './boundary-sources';

export interface BoundaryConfig {
  level: 0 | 1 | 2 | 3 | 4;
  filterToCebu?: boolean;
  useSimplified?: boolean;
}

export async function fetchBoundaries(config: BoundaryConfig = { level: 3, filterToCebu: true }) {
  const { level, filterToCebu = true, useSimplified = false } = config;
  
  // Fetch from Geoboundaries
  let geojson = await fetchGeoboundaries(level);
  
  // Optionally use simplified geometries for performance
  if (useSimplified) {
    const meta = await fetch(`${geoboundariesMetaUrl(level)}`).then(r => r.json());
    const simplifiedUrl = meta.simplifiedGeometryGeoJSON;
    geojson = await fetch(simplifiedUrl).then(r => r.json());
  }
  
  // Filter to Cebu if requested
  if (filterToCebu) {
    geojson.features = geojson.features.filter(f => {
      const psgc = f.properties?.pcode || f.properties?.ADM3_PCODE || '';
      return psgc.startsWith('0722');
    });
  }
  
  return geojson;
}
```

### HDX Adapter (for ADM4 Barangay data)

```typescript
// src/lib/pipeline/hdx-adapter.ts

/**
 * HDX provides shapefiles — needs conversion to GeoJSON
 * This adapter handles the download + conversion process
 */
export async function fetchHDXBarangays(): Promise<GeoJSON.FeatureCollection> {
  // Note: In production, you'd use ogr2ogr or similar to convert SHP to GeoJSON
  // For browser usage, consider pre-converted files or server-side conversion
  
  const SHP_URL = 'https://data.humdata.org/dataset/cod-ab-phl/resource/12457689-6a86-4474-8032-5ca9464d38a8/download/phl_adm_psa_namria_20231106_shp.zip';
  
  const response = await fetch(SHP_URL);
  const arrayBuffer = await response.arrayBuffer();
  
  // Would need to:
  // 1. Unzip the shapefile (use admzip or similar)
  // 2. Parse the .shp and .dbf files
  // 3. Convert to GeoJSON
  // 4. Filter to Cebu barangays
  
  // This is complex for browser-based apps — consider server-side processing
  throw new Error('HDX SHP conversion requires server-side processing');
}
```

### Portal Scraper Adapter

```typescript
// src/lib/pipeline/portal-scraper.ts

import { scrapeDOTStats } from '../scrapers/dot-scraper';
import { scrapeDPWHTraffic } from '../scrapers/dpwh-scraper';

export type DatasetType = 'tourist_arrivals' | 'motorist_volume' | 'voting_population' | 'power_monitoring' | 'fuel_allocation';

export interface ScrapedDataset {
  datasetId: DatasetType;
  lastUpdated: string;
  source: string;
  data: Array<{ municipality: string; value: number }>;
}

/**
 * Unified interface for scraping various government portals
 */
export async function scrapeDataset(type: DatasetType): Promise<ScrapedDataset> {
  switch (type) {
    case 'tourist_arrivals':
      return scrapeDOTStats();
    case 'motorist_volume':
      return scrapeDPWHTraffic();
    case 'voting_population':
      return scrapeCOMELECVoters();
    case 'power_monitoring':
      return scrapeVECOPower();
    case 'fuel_allocation':
      return scrapeDOEFuel();
    default:
      throw new Error(`Unknown dataset type: ${type}`);
  }
}
```

### Google Sheets Adapter

```typescript
// src/lib/pipeline/sheets-adapter.ts

// Already implemented in google-sheets.ts — this is the pipeline wrapper

import { fetchSheetData, sheetDataToRecord, SHEET_CONFIG } from '../google-sheets';

export interface SheetDataset {
  datasetId: string;
  data: Record<string, number>;
  lastUpdated: string;
  source: string;
}

export async function loadSheetDataset(spreadsheetId: string, sheetName?: string): Promise<SheetDataset> {
  const { rows, source } = await fetchSheetData(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, sheetName);
  
  return {
    datasetId: sheetName || 'default',
    data: sheetDataToRecord(rows),
    lastUpdated: new Date().toISOString(),
    source,
  };
}
```

---

## Normalization Layer

```typescript
// src/lib/pipeline/normalizer.ts

import type { Feature } from 'geojson';

const CEBU_PSGC_PREFIX = '0722';

/**
 * PSGC code mapping for Cebu municipalities
 * Used to join data from different sources that may use different naming
 */
export const PSGC_MAPPING: Record<string, { pcode: string; altNames: string[] }> = {
  'cebu city': { pcode: '072201', altNames: ['city of cebu', 'cebu'] },
  'lapu-lapu city': { pcode: '072202', altNames: ['lapulapu city', 'lapu lapu'] },
  'mandaue city': { pcode: '072203', altNames: ['city of mandaue', 'mandaue'] },
  // ... add all 53 municipalities
};

/**
 * Normalize municipality name to PSGC code
 */
export function normalizeToPSGC(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  
  for (const [canonical, meta] of Object.entries(PSGC_MAPPING)) {
    if (normalized === canonical || meta.altNames.includes(normalized)) {
      return meta.pcode;
    }
  }
  
  return null;
}

/**
 * Normalize scraped data to standard format
 */
export interface NormalizedRecord {
  pcode: string;
  value: number;
  date: string;
  source: string;
}

export function normalizeData(
  rawData: Array<{ municipality: string; value: number }>,
  datasetId: string,
  source: string
): NormalizedRecord[] {
  const results: NormalizedRecord[] = [];
  
  for (const row of rawData) {
    const pcode = normalizeToPSGC(row.municipality);
    if (pcode) {
      results.push({
        pcode,
        value: row.value,
        date: new Date().toISOString().split('T')[0],
        source: `${datasetId}@${source}`,
      });
    }
  }
  
  return results;
}
```

---

## Data Store

```typescript
// src/lib/pipeline/data-store.ts

import type { FeatureCollection } from 'geojson';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DataStore {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  // Boundaries — cache for 7 days
  cacheBoundaries(geojson: FeatureCollection): void {
    this.set('boundaries:cebu:adm3', geojson, 7 * 24 * 60 * 60 * 1000);
  }
  
  getBoundaries(): FeatureCollection | null {
    return this.get('boundaries:cebu:adm3');
  }
  
  // Datasets — cache based on update frequency
  cacheDataset(datasetId: string, data: Record<string, number>, ttlMinutes: number): void {
    this.set(`dataset:${datasetId}`, data, ttlMinutes * 60 * 1000);
  }
  
  getDataset(datasetId: string): Record<string, number> | null {
    return this.get(`dataset:${datasetId}`);
  }
}

export const dataStore = new DataStore();

// Cache TTLs based on data update frequency
export const CACHE_TTL = {
  tourist_arrivals: 60 * 60 * 1000,      // 1 hour (DOT updates weekly but may have daily)
  motorist_volume: 30 * 60 * 1000,        // 30 minutes (DPWH may update more frequently)
  voting_population: 24 * 60 * 60 * 1000, // 1 day (COMELEC updates monthly)
  power_monitoring: 5 * 60 * 1000,         // 5 minutes (VECO real-time)
  fuel_allocation: 60 * 60 * 1000,        // 1 hour (DOE updates weekly)
  boundaries: 7 * 24 * 60 * 60 * 1000,   // 7 days (boundaries rarely change)
};
```

---

## Pipeline Orchestrator

```typescript
// src/lib/pipeline/orchestrator.ts

import { fetchBoundaries } from './boundary-fetcher';
import { scrapeDataset, DatasetType } from './portal-scraper';
import { loadSheetDataset } from './sheets-adapter';
import { normalizeData, normalizeToPSGC } from './normalizer';
import { dataStore, CACHE_TTL } from './data-store';

export interface PipelineConfig {
  datasets: DatasetType[];
  useSheetFallback?: boolean;
  sheetSpreadsheetId?: string;
}

export interface PipelineResult {
  boundaries: FeatureCollection;
  datasets: Record<string, Record<string, number>>;
  errors: Array<{ dataset: string; error: string }>;
}

/**
 * Run the complete data pipeline
 */
export async function runPipeline(config: PipelineConfig): Promise<PipelineResult> {
  const results: PipelineResult = {
    boundaries: { type: 'FeatureCollection', features: [] },
    datasets: {},
    errors: [],
  };
  
  // 1. Load boundaries (with cache)
  const cachedBoundaries = dataStore.getBoundaries();
  if (cachedBoundaries) {
    results.boundaries = cachedBoundaries;
  } else {
    try {
      results.boundaries = await fetchBoundaries({ level: 3, filterToCebu: true });
      dataStore.cacheBoundaries(results.boundaries);
    } catch (err) {
      results.errors.push({ dataset: 'boundaries', error: String(err) });
    }
  }
  
  // 2. Load each dataset
  for (const datasetId of config.datasets) {
    // Try cache first
    const cachedData = dataStore.getDataset(datasetId);
    if (cachedData) {
      results.datasets[datasetId] = cachedData;
      continue;
    }
    
    // Try scraping
    try {
      const scraped = await scrapeDataset(datasetId);
      const normalized = normalizeData(scraped.data, datasetId, scraped.source);
      
      // Convert to record format (pcode → value)
      const record: Record<string, number> = {};
      for (const item of normalized) {
        record[item.pcode] = item.value;
      }
      
      results.datasets[datasetId] = record;
      dataStore.cacheDataset(datasetId, record, CACHE_TTL[datasetId]);
    } catch (err) {
      // Fall back to Google Sheets if enabled
      if (config.useSheetFallback && config.sheetSpreadsheetId) {
        try {
          const sheetData = await loadSheetDataset(config.sheetSpreadsheetId, datasetId);
          results.datasets[datasetId] = sheetData.data;
          dataStore.cacheDataset(datasetId, sheetData.data, CACHE_TTL[datasetId]);
        } catch (sheetErr) {
          results.errors.push({ dataset: datasetId, error: `Scraper: ${err}, Sheet: ${sheetErr}` });
        }
      } else {
        results.errors.push({ dataset: datasetId, error: String(err) });
      }
    }
  }
  
  return results;
}
```

---

## Frontend Integration

```typescript
// src/hooks/useDynamicDatasets.ts

import { useState, useEffect } from 'react';
import { runPipeline, PipelineConfig } from '../lib/pipeline/orchestrator';

export function useDynamicDatasets(datasetIds: string[]) {
  const [data, setData] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let cancelled = false;
    
    async function load() {
      try {
        setLoading(true);
        
        const config: PipelineConfig = {
          datasets: datasetIds as DatasetType[],
          useSheetFallback: true,
          sheetSpreadsheetId: import.meta.env.VITE_GOOGLE_SHEET_ID,
        };
        
        const result = await runPipeline(config);
        
        if (!cancelled) {
          setData(result.datasets);
          setError(result.errors.length > 0 ? result.errors.map(e => e.error).join('; ') : null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    load();
    return () => { cancelled = true; };
  }, [datasetIds.join(',')]); // Re-run if dataset list changes
  
  return { data, loading, error };
}
```

---

## Error Handling Strategy

| Error Type | Handling |
|------------|----------|
| Scraper fails | Fall back to cached data, then Google Sheets |
| All sources fail | Use last cached data with warning indicator |
| Partial data | Show available datasets, hide unavailable ones |
| Name mismatch | Log warning, attempt fuzzy matching |

---

## Monitoring & Alerts

```typescript
// src/lib/pipeline/monitor.ts

interface PipelineMetrics {
  lastRun: Date;
  duration: number;
  datasetsLoaded: string[];
  errors: Array<{ dataset: string; error: string; timestamp: Date }>;
}

export async function runPipelineWithMonitoring(config: PipelineConfig): Promise<PipelineResult & { metrics: PipelineMetrics }> {
  const start = Date.now();
  const errors: Array<{ dataset: string; error: string; timestamp: Date }> = [];
  
  // Wrap each dataset load in try-catch to capture individual errors
  // ...
  
  return {
    ...result,
    metrics: {
      lastRun: new Date(),
      duration: Date.now() - start,
      datasetsLoaded: Object.keys(result.datasets),
      errors,
    },
  };
}
```

---

## File Structure

```
src/
  lib/
    pipeline/
      boundary-fetcher.ts    # Geoboundaries/HDX fetching
      hdx-adapter.ts         # HDX-specific handling
      portal-scraper.ts      # Government portal scrapers
      sheets-adapter.ts      # Google Sheets adapter
      normalizer.ts          # PSGC mapping + name normalization
      data-store.ts          # In-memory cache
      orchestrator.ts        # Pipeline coordination
      monitor.ts             # Metrics + alerting
  hooks/
    useDynamicDatasets.ts   # React hook for pipeline
```

---

## Related Documents

- [001-Government-Portal-Scrapers.md](./001-Government-Portal-Scrapers.md) — For scraper implementation
- [002-Geoboundaries-HDX-Integration.md](./002-Geoboundaries-HDX-Integration.md) — For boundary sources
- [004-Agency-API-Investigation.md](./004-Agency-API-Investigation.md) — For formal API discovery