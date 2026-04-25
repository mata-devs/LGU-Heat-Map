# 004-Agency-API-Investigation.md

# Option D: Agency API Investigation

## Overview

This document details attempts to discover and utilize formal APIs from Philippine government agencies for machine-readable data access. The goal is to find official data endpoints that don't require web scraping.

**Status**: 🔴 Limited Success — Most agencies lack public APIs, Cloudflare protection is common

---

## Agencies Investigated

| Agency | URL | API Status | Data Available | Notes |
|--------|-----|------------|----------------|-------|
| PSA (Philippine Statistics Authority) | psa.gov.ph | ❌ Blocked | PSGC, demographics, census | Cloudflare protection |
| PSA OpenStat | openstat.psa.gov.ph | ❌ Blocked | Statistical tables | Cloudflare protection |
| PSGC Portal | psgc.gov.ph | ❌ Unreachable | PSGC codes | Server not responding |
| DOE | doe.gov.ph | ❌ Blocked | Energy data, fuel allocation | Cloudflare + redirects |
| VECO | veco.com.ph | ❌ No response | Power data | Connection refused |
| Energy Philippines | energy.gov.ph | ❌ Unreachable | Energy statistics | No response |
| COMELEC | comelec.gov.ph | ❌ No response | Voter data | Connection refused |
| DPWH | dpwh.gov.ph | ❌ Blocked | Traffic data | Cloudflare protection |
| DOT Central | tourism.gov.ph | ⚠️ Unknown | Tourism statistics | Not fully tested |

---

## Detailed Findings

### 1. PSA (Philippine Statistics Authority)

**URL**: `https://psa.gov.ph/`
**Status**: 403 Forbidden

The PSA website blocks all automated requests. Even the main page returns 403.

**What data exists**:
- PSGC (Philippine Standard Geographic Code) — hierarchical codes for all administrative divisions
- Census data — population, housing
- National statistics — economic indicators, trade

**Potential Alternative Endpoints**:
- PSA OpenStat: `https://openstat.psa.gov.ph/` — Cloudflare blocked
- Philippine Statistics System API — not publicly documented
- Data.gov.ph integration — may have PSA datasets

### 2. PSGC Portal

**URL**: `https://psgc.gov.ph/`
**Status**: Connection refused

The PSGC (Philippine Standard Geographic Code) portal is not reachable from external requests.

**Note**: PSGC codes are critical for data joining. Without direct API access, we rely on:
- Manual lookup tables
- Geoboundaries/HDX which include PSGC codes
- Community-maintained PSGC datasets (e.g., addresspinas npm package)

### 3. DOE (Department of Energy)

**URL**: `https://www.doe.gov.ph/`
**Status**: 301 redirect to `https://doe.gov.ph/` — Cloudflare protected

The DOE website uses Cloudflare protection, blocking automated access.

**What data exists**:
- Fuel allocation per region/municipality
- Power generation statistics
- Renewable energy data
- Oil company inventory reports

**Note**: The [addresspinas GitHub repo](https://github.com/edcranger/addresspinas) includes administrative region hierarchies that may help with DOE data mapping.

### 4. VECO (Visayan Electric Company)

**URL**: `https://www.veco.com.ph/`
**Status**: No response (connection refused)

VECO is a private utility company, not a government agency. They may have:
- Real-time power outage maps
- Load shedding schedules
- Peak demand data

**Alternative**: Contact VECO directly for data sharing. They may have an API for partners/developers.

### 5. COMELEC (Commission on Elections)

**URL**: `https://www.comelec.gov.ph/`
**Status**: No response

COMELEC is typically very secretive with data. Voter registration statistics may be available through:
- COMELEC Resolution documents (PDFs)
- Request through their Public Information Office
- Freedom of Information (FOI) request

**Note**: Voter data is sensitive — direct API access is unlikely.

### 6. DPWH (Department of Public Works and Highways)

**URL**: `https://www.dpwh.gov.ph/`
**Status**: Cloudflare + Imperva protection

DPWH has a modern website but blocks all automated access.

**What data exists**:
- Road traffic counts (classified by vehicle type)
- Bridge load limits
- Infrastructure project status
- Road inventory

**Note**: DPWH Region 7 specifically covers Central Visayas including Cebu.

---

## Alternative Discovery Methods

### 1. CKAN API (data.gov.ph)

Philippine's open data portal uses CKAN, which has a standard API:

```
https://data.gov.ph/api/3/action/package_search?q=<query>
```

**Test results**: The API endpoint returns HTML instead of JSON (not functioning properly as of April 2026).

### 2. Government Backend Systems

Many agencies have backend systems that aren't publicly documented:
- PhilHealth API — for health data
- DSWD API — for social welfare data
- NEDA API — for economic data

These typically require formal agreements to access.

### 3. Third-Party APIs

| Service | Data | Cost | Reliability |
|---------|------|------|-------------|
| RapidAPI Government | Various PH data | Paid | Unknown |
| API Hub (public) | Mixed | Varies | Unknown |
| Government APIs | Aggregated | Unknown | Unknown |

---

## Data Sources That DO Work

Based on research, these are reliable sources for Philippine data:

| Source | Type | API/Access | Data |
|--------|------|------------|------|
| Geoboundaries | Boundaries | Direct GeoJSON ✅ | ADM3 municipal boundaries |
| HDX | Boundaries | Direct SHP ✅ | ADM0-4 boundaries |
| OSM Overpass | Boundaries | Direct API ✅ | Live OSM data |
| World Bank | Statistics | API ✅ | Economic indicators |
| UN Data | Statistics | API ✅ | Demographic, trade |

---

## FOI (Freedom of Information) Requests

For agencies that don't have APIs, FOI requests are an option:

**Philippine FOI Program**:
- Website: `https://www.foi.gov.ph/`
- Email: `foi@粗c.gov.ph`
- Process: Online request → agency response within 5-15 working days

**Data you can request**:
- DOT-7 tourist arrival statistics
- DPWH traffic count data
- DOE fuel allocation reports
- COMELEC voter statistics (aggregated)

**Note**: FOI responses may be in PDF/Excel format, requiring additional parsing.

---

## Recommendations

### Short Term (Implemented in other docs)
1. Use **Geoboundaries API** for municipal boundaries (works ✅)
2. Use **HDX** for barangay-level boundaries (works ✅)
3. Fall back to **Google Sheets** with manual data entry

### Medium Term
1. File **FOI requests** for official data
2. Contact agencies directly via Public Information Offices
3. Build **scrapers** for publicly accessible PDF reports
4. Partner with **LGUs** for direct data sharing

### Long Term
1. Negotiate **data sharing agreements** with agencies (DOT-7, DPWH, DOE)
2. Push for **open data policies** in regional government
3. Build **community-maintained datasets** that agencies can reference

---

## Implementation Priorities

Given the challenges with direct API access, prioritize in this order:

1. **Boundary data** ✅ Done — Geoboundaries works
2. **Power monitoring** — Contact VECO directly
3. **Tourist data** — File FOI request to DOT-7
4. **Traffic data** — Contact DPWH Region 7 directly
5. **Voter/fuel data** — Use FOI process or manual updates

---

## File Structure

```
src/
  lib/
    api/
      psa-client.ts        # PSA data client (when available)
      doe-client.ts        # DOE data client (when available)
      dot-client.ts        # DOT data client (when available)
    foia/
      foi-request.ts      # FOI request automation
      response-parser.ts   # Parse PDF/Excel FOI responses
```

---

## Related Documents

- [001-Government-Portal-Scrapers.md](./001-Government-Portal-Scrapers.md) — For scraping approach
- [002-Geoboundaries-HDX-Integration.md](./002-Geoboundaries-HDX-Integration.md) — For boundary sources
- [003-Data-Pipeline-Architecture.md](./003-Data-Pipeline-Architecture.md) — For data aggregation