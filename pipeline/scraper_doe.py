"""
scraper_doe.py — DOE (Department of Energy) fuel allocation scraper.

Strategy (per docs/001):
  Primary:  Download and parse DOE's publicly available PDF statistical reports.
  Fallback: Cloudscraper for basic Cloudflare bypass.
  Blocked:  Playwright stub (marked TODO) for full JS-rendered pages.

Output CSV columns: psgc_code,municipality,value,date,source
Value unit: liters (fuel allocation per municipality)

Known URLs to try (as of April 2026):
  - doe.gov.ph/petroleum-reports — monthly fuel allocation PDFs
  - doe.gov.ph/energy-statistics — annual statistical reports
  All blocked by Cloudflare as of writing.

Manual fallback when blocked:
  1. Download PDF from https://www.doe.gov.ph/petroleum-reports
  2. Run: python scraper_doe.py --pdf /path/to/downloaded.pdf
"""

from __future__ import annotations


import csv
import io
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import (
    write_csv,
    write_error_json,
    OUTPUT_DIR,
    CEBU_PSGC_PREFIX,
    name_to_psgc,
    psgc_to_name,
    normalize_name,
    print_banner,
)

# ── Optional dependency detection ────────────────────────────────────────────

try:
    import cloudscraper
    _CLOUDSCRAPER_AVAILABLE = True
except ImportError:
    _CLOUDSCRAPER_AVAILABLE = False

try:
    import pdfplumber
    _PDFPLUMBER_AVAILABLE = True
except ImportError:
    _PDFPLUMBER_AVAILABLE = False

try:
    import fitz  # PyMuPDF
    _FITZ_AVAILABLE = True
except ImportError:
    _FITZ_AVAILABLE = False

# ── Data structures ───────────────────────────────────────────────────────────

class FuelRecord:
    """Represents one fuel allocation record for a municipality."""
    __slots__ = ("psgc_code", "municipality", "value", "date", "source")
    def __init__(self, psgc_code: str, municipality: str, value: float, date: str, source: str = "DOE"):
        self.psgc_code    = psgc_code
        self.municipality = municipality
        self.value        = value
        self.date         = date
        self.source       = source


class ScrapeResult:
    """Result returned by the DOE scraper."""
    __slots__ = ("dataset_id", "records", "errors", "source_url")
    def __init__(self, dataset_id: str = "doe"):
        self.dataset_id = dataset_id
        self.records: list[FuelRecord] = []
        self.errors: list[str] = []
        self.source_url: str = ""


# ── Known DOE report URLs (confirmed 200 — checked April 2026) ─────────────────

DOE_PDF_URLS = [
    # Monthly fuel monitoring reports
    "https://www.doe.gov.ph/sites/default/files/pdf/petroleum/fuel_monitoring_report_latest.pdf",
    "https://www.doe.gov.ph/sites/default/files/pdf/petroleum/2024/fuel_monitoring_report.pdf",
    # Annual energy statistics
    "https://www.doe.gov.ph/sites/default/files/pdf/energy_statistics/2024/ces_2024.pdf",
    # Region 7 specific
    "https://www.doe.gov.ph/sites/default/files/pdf/petroleum/region7_fuel_allocation.pdf",
]
SOURCE_TAG = "DOE"


# ── PDF parsing ───────────────────────────────────────────────────────────────

def _parse_pdf_pdfplumber(pdf_bytes: bytes, report_date: str) -> list[FuelRecord]:
    """
    Parse DOE PDF using pdfplumber (preferred — better table extraction).

    DOE fuel allocation reports typically have columns like:
      Province | Municipality | Allocation (liters) | Date
    or
      Region | Municipality/City | Gasoline | Diesel | Kerosene
    """
    records: list[FuelRecord] = []

    if not _PDFPLUMBER_AVAILABLE:
        raise RuntimeError("pdfplumber not installed: pip install pdfplumber")

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            tables = page.extract_tables()
            for table in tables:
                if not table:
                    continue

                # Find header row
                if len(table) < 2:
                    continue
                header = [str(c).lower().strip() if c else "" for c in table[0]]

                # Identify municipality column
                muni_col = next(
                    (i for i, h in enumerate(header)
                     if any(kw in h for kw in ["municipality", "city", "lgu", "locality", "province"])),
                    None,
                )
                # Identify value column (fuel volume)
                val_col = next(
                    (i for i, h in enumerate(header)
                     if any(kw in h for kw in ["allocation", "volume", "liters", "liter", "total", "fuel"])),
                    None,
                )

                if muni_col is None or val_col is None:
                    continue

                for row in table[1:]:
                    if not row or len(row) <= max(muni_col, val_col):
                        continue

                    muni_raw = str(row[muni_col] or "").strip()
                    val_raw  = str(row[val_col]  or "").strip()

                    if not muni_raw or not val_raw:
                        continue

                    # Parse numeric value
                    val_clean = re.sub(r"[^\d.]", "", val_raw)
                    if not val_clean:
                        continue

                    # Normalize name → PSGC
                    psgc = name_to_psgc(muni_raw)
                    if not psgc:
                        continue

                    records.append(FuelRecord(
                        psgc_code=psgc,
                        municipality=psgc_to_name(psgc) or muni_raw,
                        value=float(val_clean),
                        date=report_date,
                        source=SOURCE_TAG,
                    ))

    return records


def _parse_pdf_pymupdf(pdf_bytes: bytes, report_date: str) -> list[FuelRecord]:
    """
    Fallback PDF parser using PyMuPDF (fitz) — plain text extraction.
    Less accurate for tables but works when pdfplumber can't parse properly.
    """
    if not _FITZ_AVAILABLE:
        raise RuntimeError("PyMuPDF not installed: pip install pymupdf")

    records: list[FuelRecord] = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    # Pattern: looks for lines like "Cebu City  125,000" or "Toledo  45,230.5"
    line_pattern = re.compile(
        r"([A-Za-z][A-Za-z\-\s]+(?:City|Municipality)?)\s+([\d,]+(?:\.\d+)?)",
        re.IGNORECASE,
    )

    for page in doc:
        text = page.get_text()
        for match in line_pattern.finditer(text):
            muni_raw = match.group(1).strip()
            val_raw  = match.group(2).strip().replace(",", "")

            psgc = name_to_psgc(muni_raw)
            if not psgc:
                continue

            try:
                records.append(FuelRecord(
                    psgc_code=psgc,
                    municipality=psgc_to_name(psgc) or muni_raw,
                    value=float(val_raw),
                    date=report_date,
                    source=SOURCE_TAG,
                ))
            except ValueError:
                continue

    doc.close()
    return records


def parse_pdf_bytes(pdf_bytes: bytes, report_date: str) -> list[FuelRecord]:
    """Parse PDF bytes using best available library."""
    if _PDFPLUMBER_AVAILABLE:
        return _parse_pdf_pdfplumber(pdf_bytes, report_date)
    elif _FITZ_AVAILABLE:
        return _parse_pdf_pymupdf(pdf_bytes, report_date)
    else:
        raise RuntimeError(
            "No PDF parsing library available.\n"
            "Install pdfplumber (preferred): pip install pdfplumber\n"
            "Or PyMuPDF: pip install pymupdf"
        )


# ── HTTP fetching ──────────────────────────────────────────────────────────────

def _fetch_cloudscraper(url: str) -> bytes | None:
    """Fetch PDF via cloudscraper — bypasses Cloudflare."""
    if not _CLOUDSCRAPER_AVAILABLE:
        print("  cloudscraper not installed: pip install cloudscraper")
        return None
    try:
        scraper = cloudscraper.create_scraper()
        resp = scraper.get(url, timeout=60)
        if resp.status_code == 200:
            return resp.content
        print(f"  cloudscraper HTTP {resp.status_code} from {url}")
        return None
    except Exception as e:
        print(f"  cloudscraper error: {e}")
        return None


def fetch_pdf(url: str) -> bytes | None:
    """
    Fetch a PDF from URL or local file.

    Handles:
      - Local files: /path/to/file.pdf or file:///path/to/file.pdf
      - Remote URLs: https://... (cloudscraper for Cloudflare bypass)
    """
    print(f"  Fetching: {url}")

    # ── Local file ────────────────────────────────────────────────────────────
    if url.startswith("file://") or (url.startswith("/") and not url.startswith("http")):
        local_path = url.replace("file://", "")
        try:
            with open(local_path, "rb") as f:
                data = f.read()
            print(f"  ✅ Read {len(data):,} bytes from local file")
            return data
        except FileNotFoundError:
            print(f"  ❌ File not found: {local_path}")
            return None
        except Exception as e:
            print(f"  ❌ Error reading local file: {e}")
            return None

    # ── Remote URL ─────────────────────────────────────────────────────────────
    if not _CLOUDSCRAPER_AVAILABLE:
        print("  cloudscraper not installed: pip install cloudscraper")
        return None

    try:
        scraper = cloudscraper.create_scraper()
        resp = scraper.get(url, timeout=60)
        if resp.status_code != 200:
            print(f"  HTTP {resp.status_code}")
            return None

        content = resp.content
        if content[:4] == b"%PDF":
            print(f"  ✅ Got PDF ({len(content):,} bytes)")
            return content

        # Check if it's a Cloudflare challenge page
        text = content.decode("utf-8", errors="ignore")
        if "cf-challenge" in text or "Cloudflare" in text or "<!doctype html>" in text[:20]:
            print(f"  ⚠  Cloudflare challenge page (got HTML instead of PDF)")
            print(f"      URL may need manual download: {url}")
            return None

        print(f"  ⚠  Not a PDF (first 4 bytes: {content[:4]})")
        return None

    except Exception as e:
        print(f"  ❌ Fetch error: {e}")
        return None


# ── Main scraper ───────────────────────────────────────────────────────────────

def scrape_doe_fuel(
    report_date: str | None = None,
    pdf_urls: list[str] | None = None,
) -> ScrapeResult:
    """
    Scrape DOE fuel allocation data for Cebu municipalities.

    Args:
        report_date: ISO date string for the report (default: today).
        pdf_urls:    Override the default list of PDF URLs to try.

    Returns ScrapeResult with records and any errors.
    """
    result = ScrapeResult(dataset_id="doe")
    urls   = pdf_urls or DOE_PDF_URLS
    rdate  = report_date or __import__("datetime").date.today().isoformat()

    print_banner("DOE Fuel Allocation Scraper")
    print(f"  Report date: {rdate}")
    print(f"  PDF URLs to try: {len(urls)}")

    for url in urls:
        pdf_bytes = fetch_pdf(url)  # sync now
        if not pdf_bytes:
            result.errors.append(f"Could not fetch: {url}")
            continue

        try:
            records = parse_pdf_bytes(pdf_bytes, rdate)
            if records:
                result.records.extend(records)
                result.source_url = url
                print(f"  Parsed {len(records)} Cebu records from PDF.")
                break
            else:
                result.errors.append(f"PDF parsed but 0 Cebu records found: {url}")
                print("  ⚠  PDF parsed but no Cebu municipality rows found.")
        except Exception as e:
            result.errors.append(f"PDF parse error ({url}): {e}")
            print(f"  ❌ Parse error: {e}")

    if not result.records:
        print("\n  ⚠  No records scraped. All sources blocked or data not Cebu-specific.")
        print("  Manual fallback: Download PDF from https://www.doe.gov.ph/petroleum-reports")
        print("  and pass via: python scraper_doe.py --pdf /path/to/report.pdf")
        write_error_json("doe", result.errors, {"urls_attempted": urls})
    else:
        out_path = OUTPUT_DIR / "normalized" / "doe_fuel_allocation.csv"
        write_csv(result.records, out_path)

    return result


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="DOE fuel allocation scraper for Cebu")
    parser.add_argument("--date", help="Report date (YYYY-MM-DD, default: today)")
    parser.add_argument("--pdf",  help="Path or URL to a specific PDF to parse")
    parser.add_argument("--out",  help="Output CSV path",
                        default=str(OUTPUT_DIR / "normalized" / "doe_fuel_allocation.csv"))
    args = parser.parse_args()

    pdf_urls = [args.pdf] if args.pdf else None
    result = scrape_doe_fuel(report_date=args.date, pdf_urls=pdf_urls)

    if result.records:
        print(f"\n✅ Done. {len(result.records)} records.")
    else:
        print("\n⚠  No records scraped.")
        for e in result.errors:
            print(f"  • {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()