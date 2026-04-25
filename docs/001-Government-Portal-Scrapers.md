# 001-Government-Portal-Scrapers.md

# Option A: Government Portal Scrapers

## Overview

This document outlines scraping-based data collection from Philippine government agency websites. The goal is to automate data extraction from official portals that publish reports but lack formal APIs.

**Status**: 🔴 Needs Implementation — Government portals frequently block automated access

---

## Target Agencies & Data

| Agency | Data Needed | URL | Status |
|--------|-------------|-----|--------|
| DOT-7 Cebu | Tourist arrivals by municipality | dot7visayas.com | ❌ Blocked |
| DPWH Region 7 | Motorist volume / traffic counts | dpwh.gov.ph | ⚠️ Cloudflare protection |
| COMELEC | Voter registration statistics | comelec.gov.ph | ❌ No response |
| DOE Region 7 | Fuel allocation data | doe.gov.ph | ❌ No response |
| PSA | PSGC codes, demographic data | psa.gov.ph | ⚠️ 403 Forbidden |

---

## Findings

### 1. DOT-7 Cebu (Department of Tourism Region 7)
- **URL**: `https://dot7visayas.com/`
- **Status**: Connection refused — server not reachable
- **Alternative**: Tourism statistics may be available via [DOT Central Office](https://www.tourism.gov.ph/) or PSDS (Philippine Statistics System)

### 2. DPWH (Department of Public Works and Highways)
- **URL**: `https://www.dpwh.gov.ph/`
- **Status**: Blocked by Cloudflare/Imperva protection
- **Notes**: The website redirects to `/dpwh/` but Cloudflare blocks server-side fetches

### 3. COMELEC (Commission on Elections)
- **URL**: `https://www.comelec.gov.ph/`
- **Status**: No response from curl requests
- **Alternative**: COMELEC may publish voter statistics as downloadable PDFs

### 4. DOE (Department of Energy)
- **URL**: `https://www.doe.gov.ph/`
- **Status**: No response
- **Note**: Fuel allocation data may be obtainable via DOE's statistical reports

### 5. PSA (Philippine Statistics Authority)
- **URL**: `https://psa.gov.ph/`
- **Status**: 403 Forbidden
- **PSGC Portal**: `https://psgc.gov.ph/` — unreachable
- **Alternative**: Use [PSA's Open Data API](https://openstat.psa.gov.ph/) or the [Philippine Data Archive](https://psa.gov.ph/psa-statistics/psa-data-archive)

---

## Technical Approach

### Web Scraping Strategy

Since direct API access is blocked, we can use these approaches:

#### 1. HTML Scraping with Cheerio/Playwright
```typescript
// Example: Scraping DOT statistics page
import * as cheerio from 'cheerio';

async function scrapeDOTStats(url: string): Promise<TouristData[]> {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const data: TouristData[] = [];
  $('table.tourist-stats').find('tr').each((_, row) => {
    const municipality = $(row).find('td:first').text();
    const arrivals = parseInt($(row).find('td:nth-child(2)').text());
    data.push({ municipality, arrivals });
  });
  return data;
}
```

#### 2. Playwright for JavaScript-Rendered Pages
```typescript
// For pages that require JavaScript rendering
import { chromium } from 'playwright';

async function scrapeWithBrowser(url: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  
  // Extract data after JS renders
  const content = await page.content();
  await browser.close();
  return content;
}
```

#### 3. PDF Parsing for Reports
Many agencies publish monthly/quarterly PDF reports. Use `pdf-parse` or similar:
```typescript
import * as pdf from 'pdf-parse';

async function extractFromPDF(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const data = await pdf(Buffer.from(buffer));
  return data.text;
}
```

---

## Implementation Plan

### Phase 1: Identify Data Sources
1. Map each dataset (tourist arrivals, motorist volume, etc.) to official PDF/HTML sources
2. Document the URL pattern for each data type
3. Note update frequency (weekly, monthly, quarterly)

### Phase 2: Build Scrapers
1. Create a scraper module for each agency
2. Implement retry logic and error handling
3. Add rate limiting to avoid overwhelming servers

### Phase 3: Data Normalization
1. Map scraped data to standard format: ` municipality | value | date | source `
2. Handle name mismatches (e.g., "City of Cebu" vs "Cebu City")
3. Store raw + normalized versions

---

## Files to Create

```
src/
  lib/
    scrapers/
      dot-scraper.ts      # DOT-7 tourist data
      dpwh-scraper.ts     # DPWH traffic data  
      comelec-scraper.ts   # Voter statistics
      doe-scraper.ts      # Fuel allocation
      psa-scraper.ts      # PSGC/demographic
```

---

## Challenges

| Challenge | Mitigation |
|-----------|------------|
| Cloudflare blocking | Use Playwright with real browser headers |
| No structured data | Parse PDFs or HTML tables |
| Inconsistent naming | Use PSGC as canonical reference |
| Update frequency unknown | Set up monitoring alerts |
| Legal considerations | Check terms of service, use for public interest |

---

## Alternatives to Direct Scraping

1. **Request data directly**: Email/call agency public information offices
2. **FOI requests**: File Freedom of Information requests for datasets
3. **Data sharing agreements**: Partner with LGUs for API access
4. **Third-party aggregators**: Use services that already scrape/aggregate this data

---

## Next Steps

1. [ ] Identify exact URLs for each dataset's published reports
2. [ ] Test Playwright against Cloudflare-protected sites
3. [ ] Build PDF parsing pipeline for monthly reports
4. [ ] Create normalization layer using PSGC codes
5. [ ] Set up cron job for periodic scraping

---

## Related Documents

- [002-Geoboundaries-HDX-Integration.md](./002-Geoboundaries-HDX-Integration.md) — For authoritative boundary data
- [003-Data-Pipeline-Architecture.md](./003-Data-Pipeline-Architecture.md) — For data aggregation strategy
- [004-Agency-API-Investigation.md](./004-Agency-API-Investigation.md) — For formal API discovery