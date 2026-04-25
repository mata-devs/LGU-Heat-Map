# 002-Geoboundaries-HDX-Integration.md

# Option B: Geoboundaries & HDX Integration for Authoritative Boundaries

## Overview

This document covers integration with **Geoboundaries** and **Humanitarian Data Exchange (HDX)** — two reliable sources for Philippine administrative boundary GeoJSON data sourced from official government agencies (NAMRIA, PSA).

**Status**: ✅ Working - APIs confirmed functional

---

## Data Sources

### 1. Geoboundaries API

**Why use it**: Crowdsourced but verified boundaries, sourced from official government data, updated regularly.

**Endpoint**: `https://www.geoboundaries.org/api/current/gbOpen/PHL/ADM3/`

**Response**:
```json
{
  "boundaryID": "PHL-ADM3-30758251",
  "boundaryName": "Philippines",
  "boundaryISO": "PHL",
  "boundaryYearRepresented": "2020",
  "boundaryType": "ADM3",
  "boundarySource": "NAMRIA, PSA, OCHA Philippines",
  "admUnitCount": "1647",
  "gjDownloadURL": "https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/PHL/ADM3/geoBoundaries-PHL-ADM3.geojson",
  "simplifiedGeometryGeoJSON": "https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/PHL/ADM3/geoBoundaries-PHL-ADM3_simplified.geojson"
}
```

**Licensing**: Creative Commons Attribution 3.0 Intergovernmental Organisations (CC BY 3.0 IGO)

**Source Data Update**: January 19, 2023 (build date December 12, 2023)

---

### 2. HDX (Humanitarian Data Exchange)

**Why use it**: Gold standard for verified boundaries used in crisis response, maintained by UN OCHA.

**URL**: `https://data.humdata.org/dataset/cod-ab-phl`

**Details**:
- Administrative levels 0-4 (country → barangay)
- 1,642 ADM3 (municipality) features
- 42,048 ADM4 (barangay) features
- Last reviewed: April 2024
- Metadata updated: January 13, 2025

**Sources**: NAMRIA, PSA — LMB (Land Management Bureau) is official source for administrative boundaries

**License**: Creative Commons Attribution for Intergovernmental Organisations (CC BY-IGO)

**Recommended cartographic projection**: Asia South Albers Equal Area Conic

---

## PSGC Hierarchy Reference

| Level | Name | PSGC Prefix | Example | GeoBoundaries | HDX |
|-------|------|-------------|---------|---------------|-----|
| ADM0 | Country | — | Philippines | ✅ | ✅ |
| ADM1 | Region | 07 | Central Visayas | ✅ | ✅ |
| ADM2 | Province | 0722 | Cebu | ✅ | ✅ |
| ADM3 | Municipality/City | 072201-072253 | Alcantara, Cebu City, Lapu-Lapu | ✅ | ✅ |
| ADM4 | Barangay | 0722xxxxxx | individual villages | ❌ | ✅ |

---

## Integration Code

### Fetch Boundaries by Level

```typescript
// src/lib/boundary-sources.ts

export interface BoundarySource {
  name: string;
  url: string;
  license: string;
  lastUpdated: string;
}

export const BOUNDARY_SOURCES: Record<string, BoundarySource> = {
  geoboundaries: {
    name: 'Geoboundaries',
    url: 'https://www.geoboundaries.org/api/current/gbOpen/PHL/ADM{level}/',
    license: 'CC BY 3.0 IGO',
    lastUpdated: '2023-12-12',
  },
  hdx: {
    name: 'HDX (UN OCHA)',
    url: 'https://data.humdata.org/dataset/cod-ab-phl',
    license: 'CC BY-IGO',
    lastUpdated: '2024-04',
  },
};

export type AdminLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Fetch GeoJSON from Geoboundaries API
 * @param level ADM level (0-4)
 */
export async function fetchGeoboundaries(level: AdminLevel): Promise<GeoJSON.FeatureCollection> {
  const url = `https://www.geoboundaries.org/api/current/gbOpen/PHL/ADM${level}/`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geoboundaries API error: ${response.status}`);
  }
  
  const meta = await response.json();
  
  // Fetch the actual GeoJSON
  const geoResponse = await fetch(meta.gjDownloadURL);
  return geoResponse.json();
}

/**
 * Fetch from HDX
 * Note: HDX provides shapefiles, not direct GeoJSON — requires conversion
 */
export async function fetchHDXBoundaries(level: AdminLevel): Promise<Blob> {
  // HDX doesn't provide direct GeoJSON download
  // You'll need to download SHP and convert, or use pre-converted files
  const baseUrl = 'https://data.humdata.org/dataset/cod-ab-phl';
  
  // For ADM3, we can use the shapefile and convert with ogr2ogr or similar
  const shpUrl = `${baseUrl}/resource/12457689-6a86-4474-8032-5ca9464d38a8/download/phl_adm_psa_namria_20231106_shp.zip`;
  
  const response = await fetch(shpUrl);
  return response.blob();
}
```

### Filter Cebu Municipalities

```typescript
// src/lib/cebu-boundaries.ts

import type { Feature, FeatureCollection } from 'geojson';

const CEBU_PSGC_PREFIX = '0722';

/**
 * Filter features to only Cebu Province municipalities
 */
export function filterCebuMunicipalities(features: Feature[]): Feature[] {
  return features.filter(f => {
    const psgc = f.properties?.psgc || f.properties?.ADM3_PCODE || f.properties?.pcode || '';
    return psgc.startsWith(CEBU_PSGC_PREFIX);
  });
}

/**
 * Extract Cebu ADM3 features from Geoboundaries response
 */
export async function getCebuMunicipalities(): Promise<FeatureCollection> {
  const allMunicipalities = await fetchGeoboundaries(3);
  
  return {
    type: 'FeatureCollection',
    features: filterCebuMunicipalities(allMunicipalities.features),
  };
}

/**
 * Get municipality name to PSGC mapping for data joining
 */
export function getMunicipalityPSGCMap(features: Feature[]): Map<string, string> {
  const map = new Map<string, string>();
  
  for (const f of features) {
    const name = f.properties?.ADM3_EN || f.properties?.name || f.properties?.ADM3_PCODE || '';
    const psgc = f.properties?.pcode || f.properties?.ADM3_PCODE || '';
    
    if (name && psgc) {
      map.set(name.toLowerCase(), psgc);
    }
  }
  
  return map;
}
```

---

## Comparison: Geoboundaries vs HDX

| Aspect | Geoboundaries | HDX |
|--------|---------------|-----|
| **Data format** | Direct GeoJSON ✅ | Shapefile (needs conversion) |
| **Update frequency** | As needed | As needed |
| **ADM4 support** | ❌ No | ✅ Yes (42,048 barangays) |
| **Source verification** | Via NAMRIA/PSA | Via NAMRIA/PSA + ITOS vetting |
| **Ease of use** | ✅ Easy (one API call) | ⚠️ Requires SHP→GeoJSON conversion |
| **Licensing** | CC BY 3.0 IGO | CC BY-IGO |

**Recommendation**: Use **Geoboundaries for ADM3** (municipalities) since it provides direct GeoJSON. Use **HDX if you need ADM4** (barangay-level boundaries).

---

## Coordinate System Recommendation

From the research PDFs:

> **EPSG:32651** (WGS 84 / UTM zone 51N) is highly suitable for the longitudinal positioning of the central and eastern Philippines, allowing for highly accurate, localized area and boundary calculations.

```typescript
// For accurate distance/area calculations in Cebu
export const CEBU_CRS = 'EPSG:32651';
```

---

## Implementation Checklist

- [ ] Integrate `fetchGeoboundaries()` into `fetch-osm.ts` or create new boundary fetcher
- [ ] Add fallback to HDX if Geoboundaries fails
- [ ] Filter to Cebu Province (PSGC prefix `0722`)
- [ ] Implement cache for boundary data (changes infrequently)
- [ ] Consider simplified geometries for performance (mobile)

---

## File Structure

```
src/
  lib/
    boundary-sources.ts    # API fetching logic
    cebu-boundaries.ts     # Cebu-specific filtering
  data/
    cebu-geo.ts           # Add PSGC-based name normalization
```

---

## Related Documents

- [001-Government-Portal-Scrapers.md](./001-Government-Portal-Scrapers.md) — For socioeconomic data scraping
- [003-Data-Pipeline-Architecture.md](./003-Data-Pipeline-Architecture.md) — For data aggregation strategy
- [004-Agency-API-Investigation.md](./004-Agency-API-Investigation.md) — For formal API discovery