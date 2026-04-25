"""
scraper_stubs.py — Stubs for blocked government agency scrapers.

These agencies are confirmed blocked as of April 2026:
  - DPWH:    Cloudflare + Imperva protection
  - COMELEC: No response / connection refused
  - PSA:     403 Forbidden / Cloudflare

Each stub documents:
  - What data it should return
  - Why it's blocked
  - What implementation is needed to unblock it
  - Manual fallback instructions

All stubs follow the same interface as scraper_doe.py and scraper_dot.py:
  async def scrape_*() -> ScrapeResult
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from common import write_error_json, write_csv, OUTPUT_DIR


# ═══════════════════════════════════════════════════════════════════════════════
# STUB A: DPWH — Motorist Volume / Traffic Counts
# ═══════════════════════════════════════════════════════════════════════════════

async def scrape_dpwh_motorist_volume(report_date: str | None = None):
    """
    STUB — DPWH motorist volume / traffic count scraper.

    TARGET DATA:
      - Road traffic counts by municipality (vehicles per day)
      - Vehicle classification: motorcycle, car, truck, bus
      - Measurement points: major national highways through Cebu

    BLOCKED BY:
      - Cloudflare + Imperva WAF on dpwh.gov.ph
      - Even plain curl returns 403 or JS challenge page

    URLS TO TARGET (when unblocked):
      - https://www.dpwh.gov.ph/dpwh/reports_publications/stats_charts
      - https://dpwh.gov.ph/DPWH/reports/traffic_count/region7/
      - DPWH Region 7 District Office Cebu: https://r7.dpwh.gov.ph/

    IMPLEMENTATION NEEDED:
      Option 1 — Playwright (most likely to work):
        1. pip install playwright && playwright install chromium
        2. Navigate to stats_charts page, wait for Cloudflare clearance
        3. Find "Traffic Count" section and download CSV/PDF
        4. Parse: Route | Municipality | AADT (Annual Average Daily Traffic)

      Option 2 — Direct contact:
        Email: r7.dpwh@dpwh.gov.ph (DPWH Region 7)
        Request: Monthly traffic count data for Cebu national roads

      Option 3 — FOI Request:
        File at https://www.foi.gov.ph/ requesting:
        "Monthly traffic count data for national roads in Cebu Province"

    MANUAL FALLBACK:
      If you obtain DPWH traffic count Excel/PDF manually:
        python -c "from scraper_stubs import parse_dpwh_manual; parse_dpwh_manual('/path/to/file.pdf')"
    """
    result = type('Result', (), {
        'dataset_id': 'dpwh',
        'records': [],
        'errors': [
            "DPWH scraper not implemented — site blocked by Cloudflare + Imperva.",
            "See docstring for implementation options: Playwright, direct contact, or FOI request.",
        ],
        'source_url': '',
    })()

    print("\n[DPWH STUB] Motorist volume scraper not yet implemented.")
    print("  Blocked by: Cloudflare + Imperva WAF")
    print("  To implement: Use Playwright or file FOI request")
    print("  Manual: Email r7.dpwh@dpwh.gov.ph for data")

    write_error_json("dpwh", result.errors, {"source": "dpwh.gov.ph blocked"})
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# STUB B: COMELEC — Voter Registration Statistics
# ═══════════════════════════════════════════════════════════════════════════════

async def scrape_comelec_voter_registration(report_date: str | None = None):
    """
    STUB — COMELEC voter registration statistics scraper.

    TARGET DATA:
      - Registered voters per municipality in Cebu Province
      - Breakdown by: active voters, deactivated, senior, PWD
      - Update frequency: per election cycle

    BLOCKED BY:
      - comelec.gov.ph: connection refused from non-PH IPs
      - No public API documented

    URLS TO TARGET (when accessible):
      - https://www.comelec.gov.ph/?r=Statistics/VoterStatistics
      - COMELEC publishes Excel files before elections:
        comelec.gov.ph/php-tpls-attachments/{year}NLE/VoterRegistration/

    IMPLEMENTATION NEEDED:
      Option 1 — PDF/Excel download (most practical):
        COMELEC publishes voter statistics Excel files before elections.
        Steps:
          1. Try cloudscraper on the statistics page
          2. Find links to Excel/PDF voter statistics files
          3. Download and parse with openpyxl or pdfplumber

      Option 2 — FOI Request:
        File at https://www.foi.gov.ph/ requesting:
        "Voter registration count per municipality, Cebu Province, as of [date]"

    NOTE:
      Voter data is public record when aggregated by municipality.
      Individual voter data is protected — we only need municipality totals.
    """
    result = type('Result', (), {
        'dataset_id': 'comelec',
        'records': [],
        'errors': [
            "COMELEC scraper not implemented — site unreachable from non-PH IPs.",
            "See docstring for FOI and Excel download options.",
        ],
        'source_url': '',
    })()

    print("\n[COMELEC STUB] Voter registration scraper not yet implemented.")
    print("  Blocked by: Connection refused (non-PH IP)")
    print("  Best option: Download Excel from comelec.gov.ph before elections")
    print("  Or: File FOI request at https://www.foi.gov.ph/")

    write_error_json("comelec", result.errors, {"source": "comelec.gov.ph unreachable"})
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# STUB C: PSA — Demographic / PSGC Data
# ═══════════════════════════════════════════════════════════════════════════════

async def scrape_psa_demographics(report_date: str | None = None):
    """
    STUB — PSA (Philippine Statistics Authority) demographic data scraper.

    TARGET DATA:
      - Population per municipality (2020 Census)
      - Household count, population density
      - PSGC code lookup (authoritative source)

    BLOCKED BY:
      - psa.gov.ph: 403 Forbidden on all automated requests
      - openstat.psa.gov.ph: Cloudflare protected
      - psgc.gov.ph: Server not responding

    ALTERNATIVE SOURCES (no scraping needed):
      ✅ PSA 2020 Census published results — downloadable Excel files
         https://psa.gov.ph/content/2020-census-population-and-housing-2020-cph
         These are static Excel files, NOT behind Cloudflare

      ✅ addresspinas npm package — community-maintained PSGC hierarchy
         https://github.com/edcranger/addresspinas

    IMPLEMENTATION NEEDED:
      Option 1 — Static Excel download (WORKS, no scraping):
        1. Download 2020 Census Excel from PSA website (not Cloudflare protected)
        2. Parse with openpyxl
        3. Filter to Cebu Province (PSGC 0722)
        This gives static 2020 population data — good for choropleth baseline

      Option 2 — PSA OpenStat API:
        When accessible, use PX-Web API format:
        GET https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/DB__1A/{table_id}.px

    DATA FORMAT: psgc_code, municipality, value (population), date="2020-01-01", source="PSA-Census"
    """
    result = type('Result', (), {
        'dataset_id': 'psa',
        'records': [],
        'errors': [
            "PSA scraper not implemented — site returns 403/Cloudflare.",
            "Use 2020 Census Excel download instead (NOT blocked): psa.gov.ph/content/2020-census-population-and-housing-2020-cph",
            "See docstring for implementation options.",
        ],
        'source_url': '',
    })()

    print("\n[PSA STUB] Demographics scraper not yet implemented.")
    print("  Blocked by: 403 Forbidden / Cloudflare")
    print("  Best option: Download 2020 Census Excel (not blocked)")
    print("  URL: https://psa.gov.ph/content/2020-census-population-and-housing-2020-cph")

    write_error_json("psa", result.errors, {"source": "psa.gov.ph blocked"})
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# STUB D: VECO — Power Monitoring
# ═══════════════════════════════════════════════════════════════════════════════

async def scrape_veco_power(report_date: str | None = None):
    """
    STUB — VECO (Visayan Electric Company) power monitoring scraper.

    TARGET DATA:
      - Current power load per area (MW)
      - Outage schedules by municipality
      - Peak demand data

    BLOCKED BY:
      - veco.com.ph: Connection refused
      - VECO is a private company — no public data API

    APPROACH:
      VECO does not publish machine-readable data publicly.
      Most viable path is a direct partnership request.

      Contact:
        VECO Customer Service: 1-800-10-VECO-00 (1-800-10-8326-00)
        Email: customercare@veco.com.ph

      They may provide:
        - Load shedding schedule API (for apps)
        - Historical demand data (for research)
        - Outage map data

    MANUAL FALLBACK:
      VECO's website may have a load shedding PDF schedule.
      URL to check: https://www.veco.com.ph/advisories/
    """
    result = type('Result', (), {
        'dataset_id': 'veco',
        'records': [],
        'errors': [
            "VECO scraper not implemented — private company, no public API.",
            "Contact customercare@veco.com.ph for data partnership.",
        ],
        'source_url': '',
    })()

    print("\n[VECO STUB] Power monitoring scraper not yet implemented.")
    print("  Blocked by: Private company, connection refused")
    print("  Best option: Contact VECO directly for data partnership")
    print("  Email: customercare@veco.com.ph")

    write_error_json("veco", result.errors, {"source": "veco.com.ph unreachable"})
    return result


# ── Test runner ───────────────────────────────────────────────────────────────

async def _test_all_stubs():
    print("Running all stub scrapers (expected: all return empty with explanatory errors)\n")
    stubs = [
        ("DPWH",    scrape_dpwh_motorist_volume),
        ("COMELEC", scrape_comelec_voter_registration),
        ("PSA",     scrape_psa_demographics),
        ("VECO",    scrape_veco_power),
    ]
    for name, fn in stubs:
        result = await fn()
        status = "✅" if result.records else "⚠  (stub — no records)"
        print(f"  {name}: {status}  errors={len(result.errors)}")
        if result.errors:
            print(f"         {result.errors[0][:80]}")
    print("\nAll stubs complete.")


if __name__ == "__main__":
    import asyncio
    asyncio.run(_test_all_stubs())