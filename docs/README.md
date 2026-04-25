# Real Data Sources Documentation

This folder contains documentation for integrating real, up-to-date data sources into the LGU Heat Map application.

---

## Documents Overview

| # | Document | Description | Status |
|---|----------|-------------|--------|
| 001 | [Government Portal Scrapers](./001-Government-Portal-Scrapers.md) | Scraping data from DOT-7, DPWH, COMELEC, DOE, PSA websites | 🔴 Needs Implementation |
| 002 | [Geoboundaries & HDX Integration](./002-Geoboundaries-HDX-Integration.md) | Authoritative boundary data from Geoboundaries API and UN OCHA HDX | ✅ Works |
| 003 | [Data Pipeline Architecture](./003-Data-Pipeline-Architecture.md) | Unified pipeline design for multi-source data aggregation | 🔴 Design Phase |
| 004 | [Agency API Investigation](./004-Agency-API-Investigation.md) | Findings on official government APIs and why they don't work | 🔴 Limited Success |

---

## Quick Summary

### What Works ✅

| Source | Data Type | Integration |
|--------|-----------|-------------|
| **Geoboundaries API** | Municipal boundaries (GeoJSON) | Direct API call |
| **HDX (UN OCHA)** | Barangay-level boundaries | Shapefile download + conversion |
| **OSM Overpass** | Live boundary data | Already implemented in `fetch-osm.ts` |
| **Google Sheets** | Any tabular data | Already implemented in `google-sheets.ts` |

### What Doesn't Work ❌

| Agency | Data Needed | Problem |
|--------|-------------|---------|
| PSA | PSGC codes, demographics | Cloudflare blocked |
| DOT-7 | Tourist arrivals | Server unreachable |
| DPWH | Traffic counts | Cloudflare + Imperva protection |
| COMELEC | Voter statistics | No response |
| DOE | Fuel allocation | Cloudflare blocked |
| VECO | Power monitoring | Connection refused |

---

## Recommended Path Forward

### Phase 1: Boundaries (Do First)
1. ✅ Use **Geoboundaries API** for ADM3 (municipal) boundaries
2. ✅ Use **HDX** for ADM4 (barangay) boundaries if needed
3. ✅ Keep OSM Overpass as live fallback

### Phase 2: Data Collection
1. 🔄 File **FOI requests** for official data from DOT-7, DPWH, DOE
2. 🔄 Contact **VECO** directly for power data partnership
3. 🔄 Build **PDF parsers** for monthly agency reports
4. 🔄 Set up **manual update workflow** via Google Sheets as fallback

### Phase 3: Automation
1. 🔴 Implement scraper module for accessible reports
2. 🔴 Build normalization layer with PSGC mapping
3. 🔴 Set up cron-based pipeline updates

---

## Data Flow Architecture

```
Official Sources (Goal)          Alternative Sources (Current)
─────────────────────            ────────────────────────────
PSA/NAMRIA boundaries  ──────►   Geoboundaries API ✅
DOT-7 tourist data   ──────►   FOI requests / Manual
DPWH traffic data    ──────►   Contact agency directly
COMELEC voter data   ──────►   FOI requests / Manual
DOE fuel allocation  ──────►   FOI requests / Manual
VECO power data      ──────►   Partner with VECO

All sources funnel into:
┌─────────────────────────────────┐
│      Normalization Layer        │
│  (PSGC codes, name matching)    │
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│       Google Sheets             │
│   (Current implementation)      │
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│      ChoroplethMap.tsx          │
└─────────────────────────────────┘
```

---

## Key PSGC Reference for Cebu

```
PSGC Code: 0722 (Cebu Province)
ADM3 Municipalities: 072201 - 072253
ADM4 Barangays: 0722xxxxxx

All data must be joinable via PSGC codes.
```

---

## Environment Variables Needed

```env
# Google Sheets (current)
VITE_GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_ID

# Future: Agency API keys (when available)
VITE_DOT_API_KEY=
VITE_DPWH_API_KEY=
VITE_DOE_API_KEY=

# Data pipeline config
VITE_DATA_REFRESH_INTERVAL=300000  # 5 minutes in ms
```

---

## Related Project Files

- `src/lib/google-sheets.ts` — Current Google Sheets integration
- `src/lib/fetch-osm.ts` — OSM Overpass boundary fetching
- `src/data/datasets.ts` — Dataset metadata and configurations
- `src/data/cebu-geo.ts` — Cebu geographic utilities (check for normalizeLocationName)

---

## External Resources

- [Geoboundaries API](https://www.geoboundaries.org/api/current/gbOpen/PHL/ADM3/)
- [HDX Philippines Boundaries](https://data.humdata.org/dataset/cod-ab-phl)
- [Philippine Open Data Portal](https://data.gov.ph/)
- [PSGC Browser](https://psgc.gov.ph/) (currently unreachable)
- [FOI Philippines](https://www.foi.gov.ph/)

---

## Questions to Answer

1. Should we prioritize official API access or scraping capability?
2. Do you want to file FOI requests for specific datasets?
3. Should we contact VECO/CEBECO directly for power data partnership?
4. Is there budget for data purchase from government agencies?

---

Last Updated: April 2026