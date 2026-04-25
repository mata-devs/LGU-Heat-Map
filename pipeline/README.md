# Cebu LGU Data Pipeline

Python data pipeline for the Cebu LGU choropleth map. Fetches real data from government sources and outputs CSVs + GeoJSON.

## Quick Start

```bash
cd pipeline/
pip install -r requirements.txt

# Try fetching all available data (DOE/DOT URLs may be Cloudflare-blocked)
python pipeline.py

# Fetch boundaries only (always works — Geoboundaries API is reliable)
python pipeline.py --boundaries-only

# Run specific datasets
python pipeline.py --datasets doe dot

# Dry run — see what would run
python pipeline.py --dry-run
```

## Important: Cloudflare Protection

Most government sites (DOE, DOT, PSA) use Cloudflare which blocks automated scraping.
**The scrapers work correctly** — they just can't fetch remote PDFs when Cloudflare is active.

### Solution: Download PDFs Manually

When the pipeline reports "No records scraped" or "Cloudflare challenge page":

```bash
# 1. Download the PDF from the website (browser can access it)
# 2. Run the scraper against the local file:

# DOE fuel allocation
python -c "from scraper_doe import scrape_doe_fuel; scrape_doe_fuel()" 
# then: python scraper_doe.py --pdf /path/to/downloaded.pdf

# DOT tourist arrivals  
python scraper_dot.py --url /path/to/downloaded.pdf
```

## Output

```
data/
├── raw/                     # raw downloads, error logs
│   ├── doe_error.json
│   ├── dot_error.json
│   └── ...
├── normalized/             # PSGC-normalized CSVs (ready for Google Sheets)
│   ├── doe_fuel_allocation.csv
│   ├── dot_tourist_arrivals.csv
│   └── ...
├── boundaries/             # Cebu ADM3 GeoJSON
│   └── boundaries_cebu.geojson
└── cebu_lgu_data.json    # combined JSON for choropleth map
```

## CSV Format

```csv
psgc_code,municipality,value,date,source
072201,Cebu City,125000,2026-04-01,DOE
072202,Lapu-Lapu City,45000,2026-04-01,DOE
```

## Combined JSON Format

```json
{
  "meta": { "generated_at": "2026-04-22T...", "datasets": [...] },
  "data": {
    "072201": { "municipality": "Cebu City", "doe": 125000, "dot": 45230 },
    ...
  }
}
```

## Dataset Status (April 2026)

| ID       | Source | Data | Status |
|----------|--------|------|--------|
| `doe`    | DOE | Fuel allocation | 🟡 Works with local PDFs |
| `dot`    | DOT-7 | Tourist arrivals | 🟡 Works with local PDFs |
| `dpwh`   | DPWH | Motorist volume | 🔴 Stub — use FOI request |
| `comelec` | COMELEC | Voter registration | 🔴 Stub — use FOI request |
| `psa`    | PSA | Population | 🔴 Stub — download 2020 Census Excel manually |
| `veco`   | VECO | Power monitoring | 🔴 Stub — needs partnership |

## Manual Download URLs

When automated scraping is blocked, download these files manually:

### DOE Fuel Allocation
1. Go to: `https://www.doe.gov.ph/petroleum-reports`
2. Find the latest "Fuel Monitoring Report" PDF
3. Download it
4. Run: `python scraper_doe.py --pdf /path/to/fuel_report.pdf`

### DOT Tourist Arrivals
1. Go to: `https://www.tourism.gov.ph/tourism_dem_sup_pub.aspx`
2. Find visitor statistics PDF
3. Run: `python scraper_dot.py --url /path/to/visitors.pdf`

### PSA Population (2020 Census — NOT blocked)
Direct Excel download (no Cloudflare):
```
https://psa.gov.ph/content/2020-census-population-and-housing-2020-cph
```

### DPWH Traffic Counts
- File FOI request: `https://www.foi.gov.ph/`
- Or email: `r7.dpwh@dpwh.gov.ph`

### COMELEC Voter Stats
- Check before election periods for Excel downloads
- Or file FOI request

## Individual Scraper Usage

```bash
# DOE — try remote URLs first, fall back to local file
python scraper_doe.py
python scraper_doe.py --pdf /path/to/doe_report.pdf
python scraper_doe.py --date 2026-03-01

# DOT — try remote URLs first, fall back to local file
python scraper_dot.py
python scraper_dot.py --url /path/to/dot_report.pdf

# Boundaries
python geoboundaries.py --list
python geoboundaries.py --check

# Stubs test
python scraper_stubs.py
```

## Files

```
pipeline/
├── common.py             # Shared types, PSGC table, CSV/JSON helpers
├── psgc.py               # PSGC lookup (re-exports from common.py)
├── geoboundaries.py      # Fetch Cebu ADM3 boundaries (always works)
├── scraper_doe.py        # DOE fuel allocation scraper
├── scraper_dot.py        # DOT-7 tourist arrivals scraper
├── scraper_stubs.py      # DPWH, COMELEC, PSA, VECO stubs
├── pipeline.py           # Orchestrator — runs all, outputs combined JSON
└── requirements.txt
```

## Dependencies

```
aiohttp>=3.9.0           # async HTTP (boundaries fetcher)
pdfplumber>=0.10.0      # table extraction from PDFs
beautifulsoup4>=4.12.0   # HTML table parsing
lxml>=5.0.0             # fast HTML parser for bs4
cloudscraper>=1.2.71    # Cloudflare bypass (DOE, DOT)
# playwright (optional)   # pip install playwright && playwright install chromium
```